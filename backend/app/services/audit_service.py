import logging
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.models.audit_event import AuditEvent

logger = logging.getLogger(__name__)

SENSITIVE_KEYS = {
    "password",
    "token",
    "secret",
    "hashed_password",
    "access_token",
    "authorization",
    "key",
}


def sanitize_payload(obj: Any) -> Any:
    """Recursively strip sensitive credentials, passwords, and tokens."""
    if isinstance(obj, dict):
        cleaned = {}
        for k, v in obj.items():
            if any(s in k.lower() for s in SENSITIVE_KEYS):
                cleaned[k] = "[REDACTED]"
            else:
                cleaned[k] = sanitize_payload(v)
        return cleaned
    elif isinstance(obj, list):
        return [sanitize_payload(item) for item in obj]
    return obj


class AuditService:
    def log(
        self,
        event_type: str,
        db: Session,
        incident_id: Optional[str] = None,
        remediation_id: Optional[str] = None,
        approval_id: Optional[str] = None,
        actor_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        runbook_id: Optional[str] = None,
        runbook_version: Optional[int] = None,
        policy_version: Optional[str] = None,
        risk_tier: Optional[str] = None,
        status_before: Optional[str] = None,
        status_after: Optional[str] = None,
    ) -> AuditEvent:
        """Create and persist an immutable audit trail entry."""
        sanitized_details = sanitize_payload(details or {})

        event = AuditEvent(
            incident_id=incident_id,
            remediation_id=remediation_id,
            approval_id=approval_id,
            event_type=event_type,
            actor_id=actor_id,
            timestamp=datetime.now(timezone.utc),
            details=sanitized_details,
            runbook_id=runbook_id,
            runbook_version=runbook_version,
            policy_version=policy_version,
            risk_tier=risk_tier,
            status_before=status_before,
            status_after=status_after,
        )

        db.add(event)
        try:
            db.commit()
            db.refresh(event)
        except Exception as exc:
            db.rollback()
            logger.error("Failed to persist audit event %s: %s", event_type, exc)
            raise exc

        return event

    def get_events(
        self,
        db: Session,
        filters: Optional[Dict[str, Any]] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[AuditEvent]:
        """Fetch audit events matching filter criteria with pagination."""
        filters = filters or {}
        query = db.query(AuditEvent)

        if filters.get("event_type"):
            query = query.filter(AuditEvent.event_type == filters["event_type"])
        if filters.get("remediation_id"):
            query = query.filter(AuditEvent.remediation_id == filters["remediation_id"])
        if filters.get("incident_id"):
            query = query.filter(AuditEvent.incident_id == filters["incident_id"])
        if filters.get("actor_id"):
            query = query.filter(AuditEvent.actor_id == filters["actor_id"])
        if filters.get("from_date"):
            query = query.filter(AuditEvent.timestamp >= filters["from_date"])
        if filters.get("to_date"):
            query = query.filter(AuditEvent.timestamp <= filters["to_date"])

        return query.order_by(desc(AuditEvent.timestamp)).offset(skip).limit(limit).all()


audit_service = AuditService()
