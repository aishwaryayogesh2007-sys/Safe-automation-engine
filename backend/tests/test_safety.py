import hashlib
import uuid
from datetime import datetime, timedelta, timezone
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import create_access_token
from app.db.base import Base
from app.db.session import get_db
from app.db.seed import seed_database
from app.main import app
from app.models.approval import Approval
from app.models.audit_event import AuditEvent
from app.models.incident import Incident
from app.models.policy import Policy
from app.models.remediation import Remediation
from app.models.runbook import Runbook
from app.models.user import User
from app.services.execution_engine import execution_engine
from app.simulator.infrastructure import simulator

# In-memory SQLite for test isolation
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="function")
def db_session():
    """Create fresh database tables and seed baseline data for each test."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    seed_database(session)
    simulator.reset()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db_session):
    """FastAPI TestClient with overridden get_db dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


def get_auth_headers(db_session, username: str) -> dict:
    user = db_session.query(User).filter(User.username == username).first()
    token = create_access_token({"sub": user.id, "username": user.username, "role": user.role})
    return {"Authorization": f"Bearer {token}"}


# --------------------------------------------------------------------------
# Test 1: Low-Risk Auto Execute
# --------------------------------------------------------------------------
def test_low_risk_auto_execute(client, db_session):
    headers = get_auth_headers(db_session, "operator")
    runbook = db_session.query(Runbook).filter(Runbook.name == "disk-cleanup").first()
    assert runbook is not None
    assert runbook.risk_tier == "low"

    # Inject disk fault into simulator
    simulator.set_metric("worker-service", "disk_pct", 92.0)
    simulator.set_metric("worker-service", "status", "degraded")

    # Create incident
    inc_resp = client.post(
        "/api/incidents",
        json={
            "title": "Disk usage threshold breached",
            "incident_type": "disk_alert",
            "affected_service": "worker-service",
            "affected_target": "worker-service",
            "severity": "medium",
            "assigned_runbook_id": runbook.id,
        },
        headers=headers,
    )
    assert inc_resp.status_code == 201
    incident_id = inc_resp.json()["id"]

    # Trigger remediation
    rem_resp = client.post(
        "/api/remediations",
        json={"incident_id": incident_id, "runbook_id": runbook.id},
        headers=headers,
    )
    assert rem_resp.status_code == 201
    rem_data = rem_resp.json()
    assert rem_data["status"] == "succeeded"
    assert rem_data["verification_result"]["success"] is True
    assert rem_data["post_metrics"]["disk_pct"] < 85.0


# --------------------------------------------------------------------------
# Test 2: Missing Runbook Escalation
# --------------------------------------------------------------------------
def test_missing_runbook_escalation(client, db_session):
    headers = get_auth_headers(db_session, "operator")

    # Create incident with unknown type that cannot match any runbook
    resp = client.post(
        "/api/incidents",
        json={
            "title": "Unknown Kernel Anomaly",
            "incident_type": "unrecognized_hardware_failure",
            "affected_service": "db-service",
            "affected_target": "db-service",
            "severity": "high",
        },
        headers=headers,
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["status"] == "escalated"
    assert data["assigned_runbook_id"] is None


# --------------------------------------------------------------------------
# Test 3: Policy Violation Rejected (Kill Switch)
# --------------------------------------------------------------------------
def test_policy_violation_rejected(client, db_session):
    admin_headers = get_auth_headers(db_session, "admin")
    operator_headers = get_auth_headers(db_session, "operator")

    # Activate kill switch
    ks_resp = client.post(
        "/api/policies/kill-switch/activate",
        json={"reason": "Emergency security maintenance"},
        headers=admin_headers,
    )
    assert ks_resp.status_code == 200
    assert ks_resp.json()["kill_switch_active"] is True

    # Try to trigger remediation
    runbook = db_session.query(Runbook).filter(Runbook.name == "disk-cleanup").first()
    inc = Incident(
        title="Disk full",
        incident_type="disk_alert",
        affected_service="worker-service",
        affected_target="worker-service",
        severity="medium",
        assigned_runbook_id=runbook.id,
    )
    db_session.add(inc)
    db_session.commit()

    rem_resp = client.post(
        "/api/remediations",
        json={"incident_id": inc.id, "runbook_id": runbook.id},
        headers=operator_headers,
    )
    assert rem_resp.status_code == 400
    assert "kill switch is active" in rem_resp.json()["detail"].lower()


# --------------------------------------------------------------------------
# Test 4: Approval Required for Medium Risk
# --------------------------------------------------------------------------
def test_approval_required_medium_risk(client, db_session):
    headers = get_auth_headers(db_session, "operator")
    runbook = db_session.query(Runbook).filter(Runbook.name == "worker-recovery").first()
    assert runbook.risk_tier == "medium"

    inc = Incident(
        title="Worker process stuck",
        incident_type="worker_alert",
        affected_service="worker-service",
        affected_target="worker-service",
        severity="medium",
        assigned_runbook_id=runbook.id,
    )
    db_session.add(inc)
    db_session.commit()

    rem_resp = client.post(
        "/api/remediations",
        json={"incident_id": inc.id, "runbook_id": runbook.id},
        headers=headers,
    )
    assert rem_resp.status_code == 201
    rem_data = rem_resp.json()
    assert rem_data["status"] == "awaiting_approval"

    # Verify pending approval record was created
    approval = db_session.query(Approval).filter(Approval.remediation_id == rem_data["id"]).first()
    assert approval is not None
    assert approval.status == "pending"


# --------------------------------------------------------------------------
# Test 5: Unauthorized Approval (Viewer cannot approve)
# --------------------------------------------------------------------------
def test_unauthorized_approval(client, db_session):
    op_headers = get_auth_headers(db_session, "operator")
    viewer_headers = get_auth_headers(db_session, "viewer")

    runbook = db_session.query(Runbook).filter(Runbook.name == "worker-recovery").first()
    inc = Incident(
        title="Worker process hung",
        incident_type="worker_alert",
        affected_service="worker-service",
        affected_target="worker-service",
        severity="medium",
        assigned_runbook_id=runbook.id,
    )
    db_session.add(inc)
    db_session.commit()

    rem_resp = client.post(
        "/api/remediations",
        json={"incident_id": inc.id, "runbook_id": runbook.id},
        headers=op_headers,
    )
    rem_id = rem_resp.json()["id"]
    approval = db_session.query(Approval).filter(Approval.remediation_id == rem_id).first()

    # Viewer attempts to approve -> HTTP 403 Forbidden
    app_resp = client.post(
        f"/api/approvals/{approval.id}/approve",
        json={"decision": "approved", "reason": "Looks good"},
        headers=viewer_headers,
    )
    assert app_resp.status_code == 403


# --------------------------------------------------------------------------
# Test 6: Expired Approval Rejected
# --------------------------------------------------------------------------
def test_expired_approval(client, db_session):
    op_headers = get_auth_headers(db_session, "operator")
    runbook = db_session.query(Runbook).filter(Runbook.name == "worker-recovery").first()

    inc = Incident(
        title="Worker hung",
        incident_type="worker_alert",
        affected_service="worker-service",
        affected_target="worker-service",
        severity="medium",
        assigned_runbook_id=runbook.id,
    )
    db_session.add(inc)
    db_session.commit()

    rem = Remediation(
        incident_id=inc.id,
        runbook_id=runbook.id,
        runbook_version=1,
        status="awaiting_approval",
        idempotency_key="exp-test-key",
    )
    db_session.add(rem)
    db_session.commit()

    action_str = ",".join(runbook.allowed_actions)
    action_hash = hashlib.sha256(f"{action_str}:{inc.affected_target}:{runbook.id}".encode()).hexdigest()

    # Approval expired 2 hours ago
    approval = Approval(
        remediation_id=rem.id,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=2),
        status="pending",
        runbook_version=1,
        policy_version="v1.0",
        action_hash=action_hash,
    )
    db_session.add(approval)
    db_session.commit()

    # Attempt to approve expired record
    resp = client.post(
        f"/api/approvals/{approval.id}/approve",
        json={"decision": "approved"},
        headers=op_headers,
    )
    assert resp.status_code == 400
    assert "expired" in resp.json()["detail"].lower()


# --------------------------------------------------------------------------
# Test 7: Failed Verification Triggers Rollback
# --------------------------------------------------------------------------
def test_failed_verification_triggers_rollback(client, db_session):
    # Create runbook with unattainable verification criteria
    strict_runbook = Runbook(
        name="strict-disk-cleanup",
        version=1,
        description="Runbook with impossible verification threshold",
        trigger_conditions={"incident_type": "disk_alert"},
        preconditions={},
        allowed_actions=["cleanup_disk"],
        risk_tier="low",
        required_approvals=0,
        verification_criteria={"disk_pct_lt": 5.0},  # Cleanup reduces to 42%, so < 5.0 will fail
        rollback_action="restore_disk_backup",
        is_active=True,
    )
    db_session.add(strict_runbook)
    db_session.commit()

    inc = Incident(
        title="High disk usage",
        incident_type="disk_alert",
        affected_service="worker-service",
        affected_target="worker-service",
        severity="medium",
        assigned_runbook_id=strict_runbook.id,
    )
    db_session.add(inc)
    db_session.commit()

    rem = Remediation(
        incident_id=inc.id,
        runbook_id=strict_runbook.id,
        runbook_version=1,
        status="ready",
        idempotency_key="verify-fail-key",
    )
    db_session.add(rem)
    db_session.commit()

    # Execute
    executed_rem = execution_engine.execute(rem.id, db_session)

    # Verification must have failed, triggering rollback
    assert executed_rem.verification_result["success"] is False
    assert executed_rem.rollback_result is not None
    assert executed_rem.rollback_result["success"] is True


# --------------------------------------------------------------------------
# Test 8: Successful Rollback
# --------------------------------------------------------------------------
def test_successful_rollback(client, db_session):
    runbook = db_session.query(Runbook).filter(Runbook.name == "disk-cleanup").first()
    inc = Incident(
        title="Disk alert",
        incident_type="disk_alert",
        affected_service="worker-service",
        affected_target="worker-service",
        severity="medium",
        assigned_runbook_id=runbook.id,
    )
    db_session.add(inc)
    db_session.commit()

    # Create runbook that intentionally fails verification to test rollback
    rb_fail_verify = Runbook(
        name="disk-cleanup-fail-verify",
        version=1,
        allowed_actions=["cleanup_disk"],
        risk_tier="low",
        required_approvals=0,
        verification_criteria={"disk_pct_lt": 10.0},
        rollback_action="restore_disk_backup",
        is_active=True,
    )
    db_session.add(rb_fail_verify)
    db_session.commit()

    rem = Remediation(
        incident_id=inc.id,
        runbook_id=rb_fail_verify.id,
        runbook_version=1,
        status="ready",
        idempotency_key="rollback-success-key",
    )
    db_session.add(rem)
    db_session.commit()

    executed = execution_engine.execute(rem.id, db_session)
    assert executed.status == "failed"
    assert executed.rollback_result["success"] is True
    assert executed.rollback_result["is_compensating"] is True


# --------------------------------------------------------------------------
# Test 9: Failed Rollback Escalates
# --------------------------------------------------------------------------
def test_failed_rollback_escalates(client, db_session):
    # Runbook where rollback action fails
    runbook = Runbook(
        name="failing-rollback-runbook",
        version=1,
        allowed_actions=["cleanup_disk"],
        risk_tier="low",
        required_approvals=0,
        verification_criteria={"disk_pct_lt": 10.0},
        rollback_action="fail_rollback_action",  # Explicit failure trigger
        is_active=True,
    )
    db_session.add(runbook)
    db_session.commit()

    inc = Incident(
        title="Critical disk outage",
        incident_type="disk_alert",
        affected_service="worker-service",
        affected_target="worker-service",
        severity="critical",
        assigned_runbook_id=runbook.id,
    )
    db_session.add(inc)
    db_session.commit()

    rem = Remediation(
        incident_id=inc.id,
        runbook_id=runbook.id,
        runbook_version=1,
        status="ready",
        idempotency_key="failed-rollback-key",
    )
    db_session.add(rem)
    db_session.commit()

    executed = execution_engine.execute(rem.id, db_session)
    assert executed.status == "escalated"
    assert executed.rollback_result["success"] is False
    assert inc.status == "escalated"


# --------------------------------------------------------------------------
# Test 10: Kill Switch Enforcement
# --------------------------------------------------------------------------
def test_kill_switch_enforcement(client, db_session):
    admin_headers = get_auth_headers(db_session, "admin")
    operator_headers = get_auth_headers(db_session, "operator")

    # 1. Activate kill switch
    act_resp = client.post(
        "/api/policies/kill-switch/activate",
        json={"reason": "Emergency security drill"},
        headers=admin_headers,
    )
    assert act_resp.status_code == 200
    assert act_resp.json()["kill_switch_active"] is True

    # 2. Verify check endpoint returns active
    ks_check = client.get("/api/policies/kill-switch", headers=operator_headers)
    assert ks_check.json()["kill_switch_active"] is True

    # 3. New remediation should be blocked
    rb = db_session.query(Runbook).filter(Runbook.name == "disk-cleanup").first()
    inc = Incident(
        title="Disk high",
        incident_type="disk_alert",
        affected_service="worker-service",
        affected_target="worker-service",
        severity="medium",
        assigned_runbook_id=rb.id,
    )
    db_session.add(inc)
    db_session.commit()

    rem_resp = client.post(
        "/api/remediations",
        json={"incident_id": inc.id, "runbook_id": rb.id},
        headers=operator_headers,
    )
    assert rem_resp.status_code == 400

    # 4. Deactivate kill switch
    deact_resp = client.post(
        "/api/policies/kill-switch/deactivate",
        headers=admin_headers,
    )
    assert deact_resp.status_code == 200
    assert deact_resp.json()["kill_switch_active"] is False


# --------------------------------------------------------------------------
# Test 11: Duplicate Request (Idempotency)
# --------------------------------------------------------------------------
def test_duplicate_request(client, db_session):
    headers = get_auth_headers(db_session, "operator")
    runbook = db_session.query(Runbook).filter(Runbook.name == "disk-cleanup").first()

    inc = Incident(
        title="Disk incident",
        incident_type="disk_alert",
        affected_service="worker-service",
        affected_target="worker-service",
        severity="medium",
        assigned_runbook_id=runbook.id,
    )
    db_session.add(inc)
    db_session.commit()

    idem_key = "unique-idem-token-12345"

    # First attempt: succeeds
    resp1 = client.post(
        "/api/remediations",
        json={"incident_id": inc.id, "runbook_id": runbook.id, "idempotency_key": idem_key},
        headers=headers,
    )
    assert resp1.status_code == 201

    # Second attempt with identical idempotency key: rejected
    resp2 = client.post(
        "/api/remediations",
        json={"incident_id": inc.id, "runbook_id": runbook.id, "idempotency_key": idem_key},
        headers=headers,
    )
    assert resp2.status_code == 400
    assert "duplicate" in resp2.json()["detail"].lower()


# --------------------------------------------------------------------------
# Test 12: Rate Limit Enforcement (>5 per hour per runbook)
# --------------------------------------------------------------------------
def test_rate_limit(client, db_session):
    headers = get_auth_headers(db_session, "operator")
    runbook = db_session.query(Runbook).filter(Runbook.name == "disk-cleanup").first()
    now = datetime.now(timezone.utc)

    # Pre-populate 5 completed remediations in the last 10 minutes
    inc = Incident(
        title="Disk alerts",
        incident_type="disk_alert",
        affected_service="worker-service",
        affected_target="worker-service",
        severity="medium",
        assigned_runbook_id=runbook.id,
    )
    db_session.add(inc)
    db_session.commit()

    for i in range(5):
        r = Remediation(
            incident_id=inc.id,
            runbook_id=runbook.id,
            runbook_version=1,
            status="succeeded",
            idempotency_key=f"rate-limit-seed-{i}",
            created_at=now - timedelta(minutes=5 * (i + 1)),
        )
        db_session.add(r)
    db_session.commit()

    # 6th remediation attempt should be blocked by rate limiter
    resp = client.post(
        "/api/remediations",
        json={"incident_id": inc.id, "runbook_id": runbook.id, "idempotency_key": "rate-limit-6th-attempt"},
        headers=headers,
    )
    assert resp.status_code == 400
    assert "rate limit exceeded" in resp.json()["detail"].lower()


# --------------------------------------------------------------------------
# Test 13: Audit Completeness
# --------------------------------------------------------------------------
def test_audit_completeness(client, db_session):
    headers = get_auth_headers(db_session, "operator")
    runbook = db_session.query(Runbook).filter(Runbook.name == "disk-cleanup").first()

    inc = Incident(
        title="Disk issue",
        incident_type="disk_alert",
        affected_service="worker-service",
        affected_target="worker-service",
        severity="medium",
        assigned_runbook_id=runbook.id,
    )
    db_session.add(inc)
    db_session.commit()

    resp = client.post(
        "/api/remediations",
        json={"incident_id": inc.id, "runbook_id": runbook.id},
        headers=headers,
    )
    rem_id = resp.json()["id"]

    # Verify audit events recorded for this remediation
    audit_events = db_session.query(AuditEvent).filter(AuditEvent.remediation_id == rem_id).all()
    assert len(audit_events) >= 2  # created, executing, verifying, succeeded

    event_types = [e.event_type for e in audit_events]
    assert "remediation_created" in event_types
    assert "remediation_succeeded" in event_types

    # Ensure no passwords or secret tokens leaked in audit details
    for e in audit_events:
        details_str = str(e.details).lower()
        assert "admin123" not in details_str
        assert "password" not in details_str or "[redacted]" in details_str


# --------------------------------------------------------------------------
# Test 14: KPI Calculation from Live Records
# --------------------------------------------------------------------------
def test_kpi_calculation(client, db_session):
    headers = get_auth_headers(db_session, "viewer")

    # Populate sample operational records
    rb = db_session.query(Runbook).filter(Runbook.name == "disk-cleanup").first()
    inc = Incident(
        title="Sample incident",
        incident_type="disk_alert",
        affected_service="worker-service",
        affected_target="worker-service",
        severity="medium",
        assigned_runbook_id=rb.id,
    )
    db_session.add(inc)
    db_session.commit()

    now = datetime.now(timezone.utc)
    rem_success = Remediation(
        incident_id=inc.id,
        runbook_id=rb.id,
        runbook_version=1,
        status="succeeded",
        idempotency_key="kpi-succ-1",
        started_at=now - timedelta(seconds=20),
        completed_at=now,
    )
    rem_failed = Remediation(
        incident_id=inc.id,
        runbook_id=rb.id,
        runbook_version=1,
        status="failed",
        idempotency_key="kpi-fail-1",
        rollback_result={"success": True},
    )
    db_session.add_all([rem_success, rem_failed])
    db_session.commit()

    kpi_resp = client.get("/api/analytics/kpis", headers=headers)
    assert kpi_resp.status_code == 200
    kpis = kpi_resp.json()

    assert kpis["total_incidents"] >= 1
    assert kpis["total_remediations"] >= 2
    assert kpis["succeeded"] >= 1
    assert kpis["failed"] >= 1
    assert kpis["success_rate"] > 0.0
    assert kpis["rollback_success_rate"] == 100.0
