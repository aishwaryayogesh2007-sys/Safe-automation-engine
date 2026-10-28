from dataclasses import dataclass
from typing import Optional
from app.models.incident import Incident
from app.models.runbook import Runbook

LOW_RISK_ACTIONS = {"cleanup_disk", "cleanup_temp_files", "health_check", "diagnose"}
MEDIUM_RISK_ACTIONS = {
    "restart_workers",
    "scale_queue_consumers",
    "drain_queue",
    "recover_scheduled_jobs",
    "reset_resource_limits",
}
HIGH_RISK_ACTIONS = {
    "restart_service",
    "rotate_certificate",
    "reset_db_connection_pool",
    "drop_connections",
    "failover",
}


@dataclass
class RiskAssessment:
    risk_tier: str  # low, medium, high
    requires_approval: bool
    reason: str
    auto_executable: bool
    confidence_score: float


class RiskClassifier:
    def classify(self, runbook: Runbook, incident: Optional[Incident] = None) -> RiskAssessment:
        """Classify the operational risk tier and determine approval necessity."""
        actions = set(runbook.allowed_actions or [])
        severity = (incident.severity.lower() if incident and incident.severity else "medium")

        # High risk checks
        if runbook.risk_tier == "high" or any(a in HIGH_RISK_ACTIONS for a in actions):
            return RiskAssessment(
                risk_tier="high",
                requires_approval=True,
                reason="High-risk remediation action or explicit high-tier runbook requires operator approval.",
                auto_executable=False,
                confidence_score=0.95,
            )

        # Explicit runbook requires approval configuration
        if runbook.required_approvals > 0 and runbook.risk_tier != "low":
            return RiskAssessment(
                risk_tier="medium",
                requires_approval=True,
                reason="Medium-risk action with approval mandate requires operator authorization.",
                auto_executable=False,
                confidence_score=0.90,
            )

        # Medium risk actions
        if runbook.risk_tier == "medium" or any(a in MEDIUM_RISK_ACTIONS for a in actions):
            # Critical severity incidents require approval even on medium actions
            requires_approval = severity == "critical" or runbook.required_approvals > 0
            reason = (
                "Critical incident severity escalates medium-risk action to require approval."
                if severity == "critical"
                else "Medium risk action classified within allowable bounds."
            )
            return RiskAssessment(
                risk_tier="medium",
                requires_approval=requires_approval,
                reason=reason,
                auto_executable=not requires_approval,
                confidence_score=0.85,
            )

        # Low risk actions: auto execute
        if any(a in LOW_RISK_ACTIONS for a in actions) or runbook.risk_tier == "low":
            return RiskAssessment(
                risk_tier="low",
                requires_approval=False,
                reason="Low-risk, idempotent operational maintenance safe for autonomous execution.",
                auto_executable=True,
                confidence_score=0.98,
            )

        # Default fallback
        return RiskAssessment(
            risk_tier="high",
            requires_approval=True,
            reason="Unrecognized action set defaults to high risk for safety fail-closed policy.",
            auto_executable=False,
            confidence_score=0.70,
        )


risk_classifier = RiskClassifier()
