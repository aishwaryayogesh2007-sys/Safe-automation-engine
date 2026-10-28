import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.incident import Incident
from app.models.remediation import Remediation
from app.models.approval import Approval
from app.models.audit_event import AuditEvent
from app.models.policy import Policy
from app.schemas.analytics import KPIResponse, DashboardSummary
from app.schemas.incident import IncidentResponse
from app.schemas.remediation import RemediationResponse
from app.simulator.infrastructure import simulator

logger = logging.getLogger(__name__)


class MetricsService:
    def get_kpis(self, db: Session) -> KPIResponse:
        """Query real DB records to calculate operational KPIs."""
        total_incidents = db.query(Incident).count()
        total_remediations = db.query(Remediation).count()
        succeeded = db.query(Remediation).filter(Remediation.status == "succeeded").count()
        failed = db.query(Remediation).filter(Remediation.status == "failed").count()
        escalated_count = db.query(Remediation).filter(Remediation.status == "escalated").count()
        pending_approvals = db.query(Approval).filter(Approval.status == "pending").count()

        # Success rate
        success_rate = (
            round((succeeded / total_remediations) * 100.0, 2)
            if total_remediations > 0
            else 0.0
        )

        # Rollback success rate
        remediations_with_rollback = (
            db.query(Remediation)
            .filter(Remediation.rollback_result.isnot(None))
            .all()
        )
        total_rollbacks = 0
        successful_rollbacks = 0
        for r in remediations_with_rollback:
            rb_res = r.rollback_result or {}
            if rb_res:
                total_rollbacks += 1
                if rb_res.get("success") is True:
                    successful_rollbacks += 1

        rollback_success_rate = (
            round((successful_rollbacks / total_rollbacks) * 100.0, 2)
            if total_rollbacks > 0
            else 100.0
        )

        # Mean time to remediation (MTTR in seconds)
        completed_remediations = (
            db.query(Remediation)
            .filter(
                Remediation.status == "succeeded",
                Remediation.started_at.isnot(None),
                Remediation.completed_at.isnot(None),
            )
            .all()
        )
        total_duration = 0.0
        for r in completed_remediations:
            start = r.started_at
            end = r.completed_at
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
            if end.tzinfo is None:
                end = end.replace(tzinfo=timezone.utc)
            duration = (end - start).total_seconds()
            if duration > 0:
                total_duration += duration

        mttr = (
            round(total_duration / len(completed_remediations), 2)
            if len(completed_remediations) > 0
            else 0.0
        )

        # Blocked / unsafe actions
        blocked_remediations = (
            db.query(Remediation).filter(Remediation.status == "blocked").count()
        )
        blocked_audit_events = (
            db.query(AuditEvent)
            .filter(AuditEvent.event_type.in_(["remediation_blocked", "policy_violation"]))
            .count()
        )
        unsafe_actions_blocked = max(blocked_remediations, blocked_audit_events)

        # Auto-resolved percentage (remediations that succeeded without requiring manual approvals)
        auto_resolved_count = 0
        for r in completed_remediations:
            if not r.approvals or len(r.approvals) == 0:
                auto_resolved_count += 1
        auto_resolved_pct = (
            round((auto_resolved_count / total_remediations) * 100.0, 2)
            if total_remediations > 0
            else 0.0
        )

        # Audit completeness percentage
        remediations_with_audit = 0
        if total_remediations > 0:
            all_rems = db.query(Remediation.id).all()
            for (rem_id,) in all_rems:
                has_audit = (
                    db.query(AuditEvent)
                    .filter(AuditEvent.remediation_id == rem_id)
                    .first()
                    is not None
                )
                if has_audit:
                    remediations_with_audit += 1
            audit_completeness_pct = round(
                (remediations_with_audit / total_remediations) * 100.0, 2
            )
        else:
            audit_completeness_pct = 100.0

        # Average approval wait time
        decided_approvals = (
            db.query(Approval)
            .filter(Approval.status.in_(["approved", "rejected"]))
            .all()
        )
        wait_times = []
        for a in decided_approvals:
            # Look up approval decision audit event timestamp
            decision_event = (
                db.query(AuditEvent)
                .filter(
                    AuditEvent.approval_id == a.id,
                    AuditEvent.event_type.in_(["approval_granted", "approval_rejected"]),
                )
                .first()
            )
            if decision_event and decision_event.timestamp and a.requested_at:
                req = a.requested_at
                dec = decision_event.timestamp
                if req.tzinfo is None:
                    req = req.replace(tzinfo=timezone.utc)
                if dec.tzinfo is None:
                    dec = dec.replace(tzinfo=timezone.utc)
                diff = (dec - req).total_seconds()
                if diff >= 0:
                    wait_times.append(diff)

        approval_wait_time_avg = (
            round(sum(wait_times) / len(wait_times), 2) if wait_times else 0.0
        )

        return KPIResponse(
            total_incidents=total_incidents,
            total_remediations=total_remediations,
            succeeded=succeeded,
            failed=failed,
            pending_approvals=pending_approvals,
            success_rate=success_rate,
            rollback_success_rate=rollback_success_rate,
            mean_time_to_remediation=mttr,
            unsafe_actions_blocked=unsafe_actions_blocked,
            auto_resolved_pct=auto_resolved_pct,
            escalated_count=escalated_count,
            audit_completeness_pct=audit_completeness_pct,
            approval_wait_time_avg=approval_wait_time_avg,
        )

    def get_dashboard_summary(self, db: Session) -> DashboardSummary:
        """Aggregate KPIs, recent incidents, active remediations, and live infrastructure status."""
        kpis = self.get_kpis(db)

        recent_incidents = (
            db.query(Incident)
            .order_by(Incident.created_at.desc())
            .limit(10)
            .all()
        )
        active_remediations = (
            db.query(Remediation)
            .filter(Remediation.status.in_(["evaluating", "awaiting_approval", "ready", "executing", "verifying", "rolling_back"]))
            .order_by(Remediation.created_at.desc())
            .limit(10)
            .all()
        )

        active_policy = db.query(Policy).filter(Policy.is_active == True).order_by(Policy.created_at.desc()).first()
        kill_switch_active = bool(active_policy.kill_switch_active) if active_policy else False

        system_health = simulator.get_health_status()

        return DashboardSummary(
            kpis=kpis,
            recent_incidents=[IncidentResponse.model_validate(inc) for inc in recent_incidents],
            active_remediations=[RemediationResponse.model_validate(rem) for rem in active_remediations],
            system_health=system_health,
            kill_switch_active=kill_switch_active,
        )


metrics_service = MetricsService()
