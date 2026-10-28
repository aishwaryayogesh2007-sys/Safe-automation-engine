import logging
from dataclasses import dataclass
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.remediation import Remediation
from app.models.runbook import Runbook
from app.simulator.infrastructure import simulator

logger = logging.getLogger(__name__)


@dataclass
class RollbackResult:
    success: bool
    is_compensating: bool
    details: Dict[str, Any]


class RollbackService:
    def rollback(
        self,
        remediation: Remediation,
        runbook: Runbook,
        db: Session,
    ) -> RollbackResult:
        """Execute automated compensating rollback when remediation fails verification."""
        target_service = (
            remediation.incident.affected_service if remediation.incident else "worker-service"
        )
        rollback_action = runbook.rollback_action

        if not rollback_action:
            return RollbackResult(
                success=False,
                is_compensating=False,
                details={
                    "error": f"Runbook '{runbook.name}' has no defined rollback_action. Escalation required."
                },
            )

        # Check for simulated rollback failure trigger (e.g. action == "unsupported_fail" or params)
        if rollback_action == "fail_rollback_action":
            return RollbackResult(
                success=False,
                is_compensating=True,
                details={
                    "action": rollback_action,
                    "target": target_service,
                    "error": "Compensating rollback action execution encountered critical failure.",
                },
            )

        try:
            resulting_state = simulator.apply_remediation(
                action=rollback_action,
                target=target_service,
            )
            return RollbackResult(
                success=True,
                is_compensating=True,
                details={
                    "action": rollback_action,
                    "target": target_service,
                    "metrics_snapshot": resulting_state,
                    "message": "Rollback action successfully applied compensating controls.",
                },
            )
        except Exception as exc:
            logger.error("Error executing rollback action '%s': %s", rollback_action, exc)
            return RollbackResult(
                success=False,
                is_compensating=True,
                details={"action": rollback_action, "error": str(exc)},
            )


rollback_service = RollbackService()
