import logging
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.remediation import Remediation
from app.models.incident import Incident
from app.models.runbook import Runbook
from app.models.policy import Policy
from app.simulator.infrastructure import simulator
from app.services.verification_service import verification_service
from app.services.rollback_service import rollback_service
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)


class ExecutionEngine:
    def execute(self, remediation_id: str, db: Session) -> Remediation:
        """Execute the state-machine driven safe remediation workflow."""
        remediation = db.query(Remediation).filter(Remediation.id == remediation_id).first()
        if not remediation:
            raise ValueError(f"Remediation with ID '{remediation_id}' not found.")

        runbook = remediation.runbook
        incident = remediation.incident
        target_service = incident.affected_service if incident else "worker-service"

        # 1. Kill switch check FIRST
        policy = db.query(Policy).filter(Policy.is_active == True).order_by(Policy.created_at.desc()).first()
        if policy and policy.kill_switch_active:
            status_before = remediation.status
            remediation.status = "blocked"
            remediation.error_message = "Safety kill switch active: autonomous execution halted."
            if incident:
                incident.status = "blocked"
            audit_service.log(
                event_type="remediation_blocked",
                db=db,
                incident_id=incident.id if incident else None,
                remediation_id=remediation.id,
                runbook_id=runbook.id if runbook else None,
                status_before=status_before,
                status_after="blocked",
                details={"reason": "kill_switch_active", "policy_version": policy.version},
            )
            db.commit()
            return remediation

        # 2. Baseline metrics capture
        baseline = simulator.get_metrics(target_service)
        remediation.baseline_metrics = baseline

        # 3. Preconditions validation
        preconditions = runbook.preconditions or {}
        preconditions_met = True
        for k, v in preconditions.items():
            if k in baseline and baseline[k] != v:
                preconditions_met = False
                break

        if not preconditions_met:
            status_before = remediation.status
            remediation.status = "blocked"
            remediation.error_message = f"Preconditions validation failed: {preconditions} vs actual {baseline}"
            if incident:
                incident.status = "blocked"
            audit_service.log(
                event_type="remediation_blocked",
                db=db,
                incident_id=incident.id if incident else None,
                remediation_id=remediation.id,
                runbook_id=runbook.id if runbook else None,
                status_before=status_before,
                status_after="blocked",
                details={"reason": "preconditions_failed", "baseline": baseline, "preconditions": preconditions},
            )
            db.commit()
            return remediation

        # 4. State transition: READY -> EXECUTING
        status_before = remediation.status
        remediation.status = "executing"
        remediation.started_at = datetime.now(timezone.utc)
        if incident:
            incident.status = "executing"
        audit_service.log(
            event_type="remediation_state_change",
            db=db,
            incident_id=incident.id if incident else None,
            remediation_id=remediation.id,
            runbook_id=runbook.id if runbook else None,
            status_before=status_before,
            status_after="executing",
            details={"started_at": remediation.started_at.isoformat()},
        )
        db.commit()

        # 5. Apply remediation action via simulator
        action = runbook.allowed_actions[0] if (runbook.allowed_actions and len(runbook.allowed_actions) > 0) else "diagnose"
        try:
            exec_res = simulator.apply_remediation(action=action, target=target_service)
            remediation.execution_result = {
                "action": action,
                "target": target_service,
                "metrics": exec_res,
                "status": "completed",
            }
        except Exception as exc:
            remediation.status = "failed"
            remediation.error_message = f"Execution action error: {str(exc)}"
            if incident:
                incident.status = "failed"
            db.commit()
            return remediation

        # 6. State transition: EXECUTING -> VERIFYING
        remediation.status = "verifying"
        if incident:
            incident.status = "verifying"
        audit_service.log(
            event_type="remediation_state_change",
            db=db,
            incident_id=incident.id if incident else None,
            remediation_id=remediation.id,
            runbook_id=runbook.id if runbook else None,
            status_before="executing",
            status_after="verifying",
            details={"action_executed": action},
        )
        db.commit()

        # 7. Verification phase
        v_res = verification_service.verify(remediation=remediation, runbook=runbook, db=db)
        remediation.post_metrics = v_res.metrics_after
        remediation.verification_result = {
            "success": v_res.success,
            "criteria_results": v_res.criteria_results,
        }

        # 8. Success / Rollback Branching
        if v_res.success:
            remediation.status = "succeeded"
            remediation.completed_at = datetime.now(timezone.utc)
            if incident:
                incident.status = "succeeded"
            audit_service.log(
                event_type="remediation_succeeded",
                db=db,
                incident_id=incident.id if incident else None,
                remediation_id=remediation.id,
                runbook_id=runbook.id if runbook else None,
                status_before="verifying",
                status_after="succeeded",
                details={
                    "metrics_after": v_res.metrics_after,
                    "verification": v_res.criteria_results,
                },
            )
            db.commit()
            return remediation
        else:
            # Verification failed -> Rollback
            remediation.status = "rolling_back"
            if incident:
                incident.status = "rolling_back"
            audit_service.log(
                event_type="remediation_rolling_back",
                db=db,
                incident_id=incident.id if incident else None,
                remediation_id=remediation.id,
                runbook_id=runbook.id if runbook else None,
                status_before="verifying",
                status_after="rolling_back",
                details={"verification_failure": v_res.criteria_results},
            )
            db.commit()

            # Execute Rollback
            rb_res = rollback_service.rollback(remediation=remediation, runbook=runbook, db=db)
            remediation.rollback_result = {
                "success": rb_res.success,
                "is_compensating": rb_res.is_compensating,
                "details": rb_res.details,
            }
            remediation.completed_at = datetime.now(timezone.utc)

            if rb_res.success:
                remediation.status = "failed"
                remediation.error_message = "Verification failed: compensating rollback executed successfully."
                if incident:
                    incident.status = "failed"
                audit_service.log(
                    event_type="remediation_rollback_succeeded",
                    db=db,
                    incident_id=incident.id if incident else None,
                    remediation_id=remediation.id,
                    runbook_id=runbook.id if runbook else None,
                    status_before="rolling_back",
                    status_after="failed",
                    details=rb_res.details,
                )
            else:
                remediation.status = "escalated"
                remediation.error_message = "Verification and rollback both failed. Automated escalation triggered."
                if incident:
                    incident.status = "escalated"
                audit_service.log(
                    event_type="remediation_escalated",
                    db=db,
                    incident_id=incident.id if incident else None,
                    remediation_id=remediation.id,
                    runbook_id=runbook.id if runbook else None,
                    status_before="rolling_back",
                    status_after="escalated",
                    details=rb_res.details,
                )

            db.commit()
            return remediation


execution_engine = ExecutionEngine()
