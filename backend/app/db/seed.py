import logging
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.models.user import User
from app.models.policy import Policy
from app.models.runbook import Runbook
from app.models.simulation import SimulationScenario
from app.simulator.scenarios import SCENARIOS

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def seed_database(db: Session) -> None:
    """Populate default users, policies, runbooks, and simulation scenarios."""
    # Ensure tables exist
    Base.metadata.create_all(bind=engine)

    # 1. Default Users
    users_data = [
        {"username": "admin", "email": "admin@ao04.example.com", "password": "admin123", "role": "admin"},
        {"username": "operator", "email": "operator@ao04.example.com", "password": "operator123", "role": "operator"},
        {"username": "viewer", "email": "viewer@ao04.example.com", "password": "viewer123", "role": "viewer"},
    ]

    for u_info in users_data:
        existing = db.query(User).filter(User.username == u_info["username"]).first()
        if not existing:
            user = User(
                username=u_info["username"],
                email=u_info["email"],
                hashed_password=get_password_hash(u_info["password"]),
                role=u_info["role"],
                is_active=True,
            )
            db.add(user)
            logger.info("Created user: %s (%s)", u_info["username"], u_info["role"])

    db.commit()

    # 2. Active Safety Policy v1.0
    existing_policy = db.query(Policy).filter(Policy.version == "v1.0").first()
    if not existing_policy:
        policy = Policy(
            version="v1.0",
            name="Autonomous IT Remediation Safety Baseline v1.0",
            rules={
                "rate_limits": {
                    "max_per_runbook_hour": 5,
                    "max_per_service_hour": 10,
                },
                "blast_radius": {
                    "max_concurrent_remediations": 3,
                    "max_impacted_services_pct": 25.0,
                },
                "approvals": {
                    "low_risk_auto_execute": True,
                    "medium_risk_approval_required": True,
                    "high_risk_approval_required": True,
                    "approval_expiry_hours": 24,
                },
            },
            is_active=True,
            kill_switch_active=False,
        )
        db.add(policy)
        logger.info("Created policy: %s (v1.0)", policy.name)
        db.commit()

    # 3. 10 Seeded Runbooks
    runbooks_data = [
        {
            "name": "disk-cleanup",
            "version": 1,
            "description": "Low risk autonomous cleanup of disk space exceeding 85%",
            "trigger_conditions": {"incident_type": "disk_alert", "disk_pct_gt": 85.0},
            "preconditions": {},
            "allowed_actions": ["cleanup_disk"],
            "risk_tier": "low",
            "target_restrictions": {"disallowed_services": []},
            "execution_timeout_seconds": 120,
            "max_retries": 2,
            "cooldown_seconds": 60,
            "max_changes": 5,
            "required_approvals": 0,
            "verification_criteria": {"disk_pct_lt": 85.0, "status_eq": "healthy"},
            "rollback_action": "restore_disk_backup",
            "escalation_rules": {"escalate_on_verify_fail": True},
        },
        {
            "name": "worker-recovery",
            "version": 1,
            "description": "Medium risk recovery of stuck or inactive worker process pools",
            "trigger_conditions": {"incident_type": "worker_alert", "worker_count_eq": 0},
            "preconditions": {},
            "allowed_actions": ["restart_workers"],
            "risk_tier": "medium",
            "target_restrictions": {},
            "execution_timeout_seconds": 300,
            "max_retries": 3,
            "cooldown_seconds": 60,
            "max_changes": 3,
            "required_approvals": 1,
            "verification_criteria": {"worker_count_gte": 1, "status_eq": "healthy"},
            "rollback_action": "revert_worker_restart",
            "escalation_rules": {"escalate_on_verify_fail": True},
        },
        {
            "name": "queue-scaling",
            "version": 1,
            "description": "Medium risk scaling of queue workers to process backlogged messages",
            "trigger_conditions": {"incident_type": "queue_alert", "queue_size_gt": 1000},
            "preconditions": {},
            "allowed_actions": ["scale_queue_consumers"],
            "risk_tier": "medium",
            "target_restrictions": {},
            "execution_timeout_seconds": 300,
            "max_retries": 2,
            "cooldown_seconds": 60,
            "max_changes": 5,
            "required_approvals": 1,
            "verification_criteria": {"queue_size_lt": 100, "status_eq": "healthy"},
            "rollback_action": "revert_queue_scale",
            "escalation_rules": {"escalate_on_verify_fail": True},
        },
        {
            "name": "cert-rotation",
            "version": 1,
            "description": "High risk automated rotation of expiring TLS certificates",
            "trigger_conditions": {"incident_type": "cert_alert", "cert_days_remaining_lt": 7},
            "preconditions": {},
            "allowed_actions": ["rotate_certificate"],
            "risk_tier": "high",
            "target_restrictions": {},
            "execution_timeout_seconds": 600,
            "max_retries": 1,
            "cooldown_seconds": 120,
            "max_changes": 1,
            "required_approvals": 1,
            "verification_criteria": {"cert_days_remaining_gt": 30, "status_eq": "healthy"},
            "rollback_action": "revert_certificate",
            "escalation_rules": {"escalate_on_verify_fail": True},
        },
        {
            "name": "service-recovery",
            "version": 1,
            "description": "High risk graceful restart and recovery of failing critical services",
            "trigger_conditions": {"incident_type": "service_alert", "status_eq": "unhealthy"},
            "preconditions": {},
            "allowed_actions": ["restart_service"],
            "risk_tier": "high",
            "target_restrictions": {},
            "execution_timeout_seconds": 300,
            "max_retries": 2,
            "cooldown_seconds": 120,
            "max_changes": 2,
            "required_approvals": 1,
            "verification_criteria": {"status_eq": "healthy", "cpu_pct_lt": 80.0},
            "rollback_action": "stop_service",
            "escalation_rules": {"escalate_on_verify_fail": True},
        },
        {
            "name": "temp-cleanup",
            "version": 1,
            "description": "Low risk purging of orphaned temporary files and inodes",
            "trigger_conditions": {"incident_type": "temp_file_alert", "temp_files_count_gt": 10000},
            "preconditions": {},
            "allowed_actions": ["cleanup_temp_files"],
            "risk_tier": "low",
            "target_restrictions": {},
            "execution_timeout_seconds": 120,
            "max_retries": 3,
            "cooldown_seconds": 30,
            "max_changes": 5,
            "required_approvals": 0,
            "verification_criteria": {"temp_files_count_lt": 1000, "status_eq": "healthy"},
            "rollback_action": "restore_disk_backup",
            "escalation_rules": {},
        },
        {
            "name": "job-recovery",
            "version": 1,
            "description": "Medium risk recovery and state reset for failing scheduled cron jobs",
            "trigger_conditions": {"incident_type": "job_alert", "failed_jobs_count_gt": 5},
            "preconditions": {},
            "allowed_actions": ["recover_scheduled_jobs"],
            "risk_tier": "medium",
            "target_restrictions": {},
            "execution_timeout_seconds": 180,
            "max_retries": 2,
            "cooldown_seconds": 60,
            "max_changes": 2,
            "required_approvals": 1,
            "verification_criteria": {"failed_jobs_count_eq": 0, "status_eq": "healthy"},
            "rollback_action": None,
            "escalation_rules": {},
        },
        {
            "name": "queue-backlog-recovery",
            "version": 1,
            "description": "Medium risk queue backlog drain and dead-letter queue routing",
            "trigger_conditions": {"incident_type": "queue_backlog_alert", "queue_size_gt": 5000},
            "preconditions": {},
            "allowed_actions": ["drain_queue"],
            "risk_tier": "medium",
            "target_restrictions": {},
            "execution_timeout_seconds": 300,
            "max_retries": 2,
            "cooldown_seconds": 90,
            "max_changes": 3,
            "required_approvals": 1,
            "verification_criteria": {"queue_size_lt": 50, "status_eq": "healthy"},
            "rollback_action": None,
            "escalation_rules": {},
        },
        {
            "name": "db-pool-diagnostics",
            "version": 1,
            "description": "High risk database connection pool reset and diagnostics",
            "trigger_conditions": {"incident_type": "db_pool_alert", "connection_pool_pct_gt": 90.0},
            "preconditions": {},
            "allowed_actions": ["reset_db_connection_pool"],
            "risk_tier": "high",
            "target_restrictions": {},
            "execution_timeout_seconds": 300,
            "max_retries": 1,
            "cooldown_seconds": 180,
            "max_changes": 1,
            "required_approvals": 1,
            "verification_criteria": {"connection_pool_pct_lt": 50.0, "status_eq": "healthy"},
            "rollback_action": None,
            "escalation_rules": {},
        },
        {
            "name": "resource-limit-recovery",
            "version": 1,
            "description": "Medium risk recovery from excessive CPU and memory consumption",
            "trigger_conditions": {"incident_type": "resource_limit_alert", "cpu_pct_gt": 90.0},
            "preconditions": {},
            "allowed_actions": ["reset_resource_limits"],
            "risk_tier": "medium",
            "target_restrictions": {},
            "execution_timeout_seconds": 180,
            "max_retries": 2,
            "cooldown_seconds": 60,
            "max_changes": 2,
            "required_approvals": 1,
            "verification_criteria": {"cpu_pct_lt": 70.0, "status_eq": "healthy"},
            "rollback_action": None,
            "escalation_rules": {},
        },
    ]

    for rb_dict in runbooks_data:
        existing_rb = db.query(Runbook).filter(Runbook.name == rb_dict["name"]).first()
        if not existing_rb:
            rb = Runbook(**rb_dict, is_active=True)
            db.add(rb)
            logger.info("Created runbook: %s (%s risk)", rb_dict["name"], rb_dict["risk_tier"])

    db.commit()

    # 4. 10 Simulation Scenarios
    for key, sc_data in SCENARIOS.items():
        existing_sc = db.query(SimulationScenario).filter(SimulationScenario.name == sc_data["name"]).first()
        if not existing_sc:
            sc = SimulationScenario(
                name=sc_data["name"],
                description=sc_data["description"],
                scenario_type=key,
                parameters=sc_data["params"],
                is_active=True,
            )
            db.add(sc)
            logger.info("Created simulation scenario: %s", sc_data["name"])

    db.commit()
    logger.info("Seeding completed successfully.")


if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
