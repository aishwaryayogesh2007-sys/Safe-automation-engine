import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy.orm import Session
from app.models.incident import Incident
from app.models.runbook import Runbook
from app.models.policy import Policy
from app.models.remediation import Remediation
from app.models.user import User
from app.services.risk_classifier import risk_classifier

logger = logging.getLogger(__name__)


@dataclass
class PolicyDecision:
    allowed: bool
    risk_tier: str
    requires_approval: bool
    reason: str
    policy_version: str


class PolicyEngine:
    def validate_remediation(
        self,
        incident: Incident,
        runbook: Runbook,
        user: Optional[User],
        db: Session,
        idempotency_key: Optional[str] = None,
    ) -> PolicyDecision:
        """Validate safety constraints, rate limits, blast radius, and approval rules."""
        now = datetime.now(timezone.utc)

        # 1. Active policy retrieval
        policy = db.query(Policy).filter(Policy.is_active == True).order_by(Policy.created_at.desc()).first()
        if not policy:
            # Create a baseline policy if none exists
            policy_version = "v1.0"
            kill_switch = False
        else:
            policy_version = policy.version
            kill_switch = policy.kill_switch_active

        # 2. Kill switch check (fail-closed immediately)
        if kill_switch:
            return PolicyDecision(
                allowed=False,
                risk_tier=runbook.risk_tier or "high",
                requires_approval=True,
                reason="Safety kill switch is active. All autonomous remediation actions are blocked.",
                policy_version=policy_version,
            )

        # 3. Duplicate request (idempotency)
        if idempotency_key:
            existing_remediation = (
                db.query(Remediation)
                .filter(Remediation.idempotency_key == idempotency_key)
                .first()
            )
            if existing_remediation:
                return PolicyDecision(
                    allowed=False,
                    risk_tier=runbook.risk_tier or "medium",
                    requires_approval=False,
                    reason=f"Duplicate request: idempotency key '{idempotency_key}' already processed.",
                    policy_version=policy_version,
                )

        # 4. Runbook allowlist / active state
        if not runbook.is_active:
            return PolicyDecision(
                allowed=False,
                risk_tier=runbook.risk_tier or "high",
                requires_approval=True,
                reason=f"Runbook '{runbook.name}' is inactive and not permitted on execution allowlist.",
                policy_version=policy_version,
            )

        # 5. Target environment restrictions
        target_restrictions = runbook.target_restrictions or {}
        disallowed_services = target_restrictions.get("disallowed_services", [])
        if incident.affected_service in disallowed_services:
            return PolicyDecision(
                allowed=False,
                risk_tier="high",
                requires_approval=True,
                reason=f"Service '{incident.affected_service}' is protected by target restrictions.",
                policy_version=policy_version,
            )

        allowed_services = target_restrictions.get("allowed_services")
        if allowed_services and incident.affected_service not in allowed_services:
            return PolicyDecision(
                allowed=False,
                risk_tier="high",
                requires_approval=True,
                reason=f"Service '{incident.affected_service}' is not in runbook's allowed services list.",
                policy_version=policy_version,
            )

        # 6. Rate limits (max 5 remediations per hour per runbook)
        one_hour_ago = now - timedelta(hours=1)
        recent_count = (
            db.query(Remediation)
            .filter(
                Remediation.runbook_id == runbook.id,
                Remediation.created_at >= one_hour_ago,
            )
            .count()
        )
        max_per_hour = (policy.rules.get("rate_limits", {}).get("max_per_runbook_hour", 5) if policy and policy.rules else 5)
        if recent_count >= max_per_hour:
            return PolicyDecision(
                allowed=False,
                risk_tier=runbook.risk_tier or "medium",
                requires_approval=True,
                reason=f"Rate limit exceeded: {recent_count} remediations executed for runbook '{runbook.name}' within past hour (max: {max_per_hour}).",
                policy_version=policy_version,
            )

        # 7. Cooldown check (min seconds between same runbook executions)
        cooldown_seconds = runbook.cooldown_seconds or 60
        last_remediation = (
            db.query(Remediation)
            .filter(Remediation.runbook_id == runbook.id)
            .order_by(Remediation.created_at.desc())
            .first()
        )
        if last_remediation and last_remediation.created_at:
            # Handle timezone awareness comparison safely
            last_time = last_remediation.created_at
            if last_time.tzinfo is None:
                last_time = last_time.replace(tzinfo=timezone.utc)
            elapsed_seconds = (now - last_time).total_seconds()
            if elapsed_seconds < cooldown_seconds:
                return PolicyDecision(
                    allowed=False,
                    risk_tier=runbook.risk_tier or "medium",
                    requires_approval=True,
                    reason=f"Cooldown violation: wait {int(cooldown_seconds - elapsed_seconds)}s before re-executing '{runbook.name}'.",
                    policy_version=policy_version,
                )

        # 8. Blast radius (max concurrent active remediations: 3)
        concurrent_active = (
            db.query(Remediation)
            .filter(Remediation.status.in_(["executing", "verifying", "rolling_back"]))
            .count()
        )
        max_concurrent = (policy.rules.get("blast_radius", {}).get("max_concurrent_remediations", 3) if policy and policy.rules else 3)
        if concurrent_active >= max_concurrent:
            return PolicyDecision(
                allowed=False,
                risk_tier=runbook.risk_tier or "high",
                requires_approval=True,
                reason=f"Blast radius limit: {concurrent_active} active remediations running (concurrency ceiling: {max_concurrent}).",
                policy_version=policy_version,
            )

        # 9. Risk Classification and Approval determination
        assessment = risk_classifier.classify(runbook, incident)

        return PolicyDecision(
            allowed=True,
            risk_tier=assessment.risk_tier,
            requires_approval=assessment.requires_approval,
            reason=assessment.reason,
            policy_version=policy_version,
        )


policy_engine = PolicyEngine()
