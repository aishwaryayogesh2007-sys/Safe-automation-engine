import uuid
from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


def utcnow():
    return datetime.now(timezone.utc)


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    remediation_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("remediations.id", ondelete="CASCADE"),
        nullable=False,
    )
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utcnow,
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    approved_by: Mapped[Optional[str]] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="pending",
        nullable=False,
    )  # pending, approved, rejected, expired
    reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
    )
    runbook_version: Mapped[int] = mapped_column(
        Integer,
        default=1,
        nullable=False,
    )
    policy_version: Mapped[str] = mapped_column(
        String(50),
        default="v1.0",
        nullable=False,
    )
    action_hash: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
    )

    # Relationships
    remediation = relationship("Remediation", back_populates="approvals")
    approved_by_user = relationship("User", back_populates="approvals")
    audit_events = relationship("AuditEvent", back_populates="approval")
