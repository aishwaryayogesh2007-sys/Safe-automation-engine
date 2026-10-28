import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from sqlalchemy import String, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


def utcnow():
    return datetime.now(timezone.utc)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    incident_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("incidents.id", ondelete="SET NULL"),
        nullable=True,
    )
    remediation_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("remediations.id", ondelete="SET NULL"),
        nullable=True,
    )
    approval_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("approvals.id", ondelete="SET NULL"),
        nullable=True,
    )
    event_type: Mapped[str] = mapped_column(
        String(100),
        index=True,
        nullable=False,
    )
    actor_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        index=True,
        nullable=False,
    )
    details: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
    runbook_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("runbooks.id", ondelete="SET NULL"),
        nullable=True,
    )
    runbook_version: Mapped[Optional[int]] = mapped_column(
        Integer,
        nullable=True,
    )
    policy_version: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    risk_tier: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    status_before: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )
    status_after: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
    )

    # Relationships
    actor = relationship("User", back_populates="audit_events")
    incident = relationship("Incident", back_populates="audit_events")
    remediation = relationship("Remediation", back_populates="audit_events")
    approval = relationship("Approval", back_populates="audit_events")
    runbook = relationship("Runbook", back_populates="audit_events")
