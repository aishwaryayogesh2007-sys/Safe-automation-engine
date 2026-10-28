import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import String, Integer, Boolean, Text, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


def utcnow():
    return datetime.now(timezone.utc)


class Runbook(Base):
    __tablename__ = "runbooks"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    name: Mapped[str] = mapped_column(
        String(150),
        unique=True,
        index=True,
        nullable=False,
    )
    version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    trigger_conditions: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
    preconditions: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
    allowed_actions: Mapped[List[str]] = mapped_column(
        JSON,
        default=list,
        nullable=False,
    )
    risk_tier: Mapped[str] = mapped_column(
        String(50),
        default="medium",
        nullable=False,
    )  # low, medium, high
    target_restrictions: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
    execution_timeout_seconds: Mapped[int] = mapped_column(
        Integer,
        default=300,
        nullable=False,
    )
    max_retries: Mapped[int] = mapped_column(
        Integer,
        default=3,
        nullable=False,
    )
    cooldown_seconds: Mapped[int] = mapped_column(
        Integer,
        default=60,
        nullable=False,
    )
    max_changes: Mapped[int] = mapped_column(
        Integer,
        default=5,
        nullable=False,
    )
    required_approvals: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    verification_criteria: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
    rollback_action: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    escalation_rules: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )

    # Relationships
    incidents = relationship("Incident", back_populates="assigned_runbook")
    remediations = relationship("Remediation", back_populates="runbook")
    audit_events = relationship("AuditEvent", back_populates="runbook")
