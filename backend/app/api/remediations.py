import hashlib
import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session
from app.core.permissions import require_operator, require_viewer
from app.db.session import get_db
from app.models.incident import Incident
from app.models.runbook import Runbook
from app.models.remediation import Remediation
from app.models.approval import Approval
from app.models.audit_event import AuditEvent
from app.models.user import User
from app.schemas.remediation import (
    RemediationCreate,
    RemediationResponse,
    RemediationTimeline,
)
from app.schemas.audit import AuditEventResponse
from app.services.policy_engine import policy_engine
from app.services.execution_engine import execution_engine
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/remediations", tags=["Remediations"])


@router.get("", response_model=List[RemediationResponse])
def list_remediations(
    status: Optional[str] = Query(None),
    incident_id: Optional[str] = Query(None),
    runbook_id: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """List remediations with status, incident, and runbook filters."""
    query = db.query(Remediation)
    if status:
        query = query.filter(Remediation.status == status)
    if incident_id:
        query = query.filter(Remediation.incident_id == incident_id)
    if runbook_id:
        query = query.filter(Remediation.runbook_id == runbook_id)

    rems = query.order_by(desc(Remediation.created_at)).offset(skip).limit(limit).all()
    return [RemediationResponse.model_validate(r) for r in rems]


@router.get("/{remediation_id}", response_model=RemediationResponse)
def get_remediation(
    remediation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Retrieve complete remediation details."""
    remediation = db.query(Remediation).filter(Remediation.id == remediation_id).first()
    if not remediation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Remediation with ID '{remediation_id}' not found.",
        )
    return RemediationResponse.model_validate(remediation)


@router.get("/{remediation_id}/timeline", response_model=RemediationTimeline)
def get_remediation_timeline(
    remediation_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Retrieve ordered audit timeline events for this remediation."""
    remediation = db.query(Remediation).filter(Remediation.id == remediation_id).first()
    if not remediation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Remediation with ID '{remediation_id}' not found.",
        )

    events = (
        db.query(AuditEvent)
        .filter(AuditEvent.remediation_id == remediation_id)
        .order_by(AuditEvent.timestamp.asc())
        .all()
    )

    return RemediationTimeline(
        remediation_id=remediation.id,
        status=remediation.status,
        events=[AuditEventResponse.model_validate(e) for e in events],
    )


@router.post("", response_model=RemediationResponse, status_code=status.HTTP_201_CREATED)
def trigger_remediation(
    data: RemediationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    """Trigger a remediation. Enforces policy checks, approvals, or autonomous execution."""
    incident = db.query(Incident).filter(Incident.id == data.incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{data.incident_id}' not found.",
        )

    runbook_id = data.runbook_id or incident.assigned_runbook_id
    if not runbook_id:
        incident.status = "escalated"
        db.commit()
        audit_service.log(
            event_type="incident_escalated_no_runbook",
            db=db,
            incident_id=incident.id,
            actor_id=current_user.id,
            status_after="escalated",
            details={"error": "No assigned runbook found for incident."},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incident does not have an assigned runbook and none was specified. Escalated to on-call.",
        )

    runbook = db.query(Runbook).filter(Runbook.id == runbook_id).first()
    if not runbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Runbook with ID '{runbook_id}' not found.",
        )

    idempotency_key = data.idempotency_key or f"rem-{uuid.uuid4().hex[:16]}"

    # Policy validation
    decision = policy_engine.validate_remediation(
        incident=incident,
        runbook=runbook,
        user=current_user,
        db=db,
        idempotency_key=idempotency_key,
    )

    if not decision.allowed:
        audit_service.log(
            event_type="remediation_blocked",
            db=db,
            incident_id=incident.id,
            actor_id=current_user.id,
            runbook_id=runbook.id,
            runbook_version=runbook.version,
            policy_version=decision.policy_version,
            risk_tier=decision.risk_tier,
            status_before=incident.status,
            status_after="blocked",
            details={"reason": decision.reason},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=decision.reason,
        )

    # Determine initial remediation status based on policy approval requirement
    initial_status = "awaiting_approval" if decision.requires_approval else "ready"
    incident.status = initial_status

    remediation = Remediation(
        incident_id=incident.id,
        runbook_id=runbook.id,
        runbook_version=runbook.version,
        status=initial_status,
        triggered_by=current_user.id,
        idempotency_key=idempotency_key,
        policy_version=decision.policy_version,
    )
    db.add(remediation)
    db.commit()
    db.refresh(remediation)

    audit_service.log(
        event_type="remediation_created",
        db=db,
        incident_id=incident.id,
        remediation_id=remediation.id,
        actor_id=current_user.id,
        runbook_id=runbook.id,
        runbook_version=runbook.version,
        policy_version=decision.policy_version,
        risk_tier=decision.risk_tier,
        status_after=initial_status,
        details={
            "requires_approval": decision.requires_approval,
            "risk_tier": decision.risk_tier,
            "idempotency_key": idempotency_key,
        },
    )

    if decision.requires_approval:
        # Create approval record
        action_str = ",".join(runbook.allowed_actions or [])
        action_hash = hashlib.sha256(
            f"{action_str}:{incident.affected_target}:{runbook.id}".encode()
        ).hexdigest()

        approval = Approval(
            remediation_id=remediation.id,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
            status="pending",
            runbook_version=runbook.version,
            policy_version=decision.policy_version,
            action_hash=action_hash,
        )
        db.add(approval)
        db.commit()
        db.refresh(approval)

        audit_service.log(
            event_type="approval_requested",
            db=db,
            incident_id=incident.id,
            remediation_id=remediation.id,
            approval_id=approval.id,
            actor_id=current_user.id,
            details={"action_hash": action_hash, "expires_at": approval.expires_at.isoformat()},
        )
        return RemediationResponse.model_validate(remediation)
    else:
        # Auto-execute low-risk remediation immediately
        executed_rem = execution_engine.execute(remediation.id, db)
        return RemediationResponse.model_validate(executed_rem)
