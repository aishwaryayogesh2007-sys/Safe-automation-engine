import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


def utcnow():
    return datetime.now(timezone.utc)


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    title: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    severity: Mapped[str] = mapped_column(
        String(50),
        default="medium",
        nullable=False,
    )  # critical, high, medium, low
    status: Mapped[str] = mapped_column(
        String(50),
        default="detected",
        nullable=False,
    )  # detected, evaluating, awaiting_approval, blocked, ready, executing, verifying, succeeded, rolling_back, escalated, failed, cancelled
    incident_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    affected_service: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    affected_target: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    metrics_snapshot: Mapped[Dict[str, Any]] = mapped_column(
        JSON,
        default=dict,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        onupdate=utcnow,
        nullable=False,
    )
    assigned_runbook_id: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("runbooks.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Relationships
    assigned_runbook = relationship("Runbook", back_populates="incidents")
    remediations = relationship("Remediation", back_populates="incident", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="incident")
