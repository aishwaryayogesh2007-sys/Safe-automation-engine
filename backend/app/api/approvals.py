import hashlib
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.permissions import require_operator, require_viewer
from app.db.session import get_db
from app.models.approval import Approval
from app.models.remediation import Remediation
from app.models.user import User
from app.schemas.approval import ApprovalDecision, ApprovalResponse
from app.services.execution_engine import execution_engine
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/approvals", tags=["Approvals"])


@router.get("", response_model=List[ApprovalResponse])
def list_approvals(
    status_filter: Optional[str] = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    """List pending or filtered approvals (operator or admin)."""
    query = db.query(Approval)
    if status_filter:
        query = query.filter(Approval.status == status_filter)
    else:
        query = query.filter(Approval.status == "pending")

    approvals = query.order_by(Approval.requested_at.desc()).offset(skip).limit(limit).all()
    return [ApprovalResponse.model_validate(a) for a in approvals]


@router.get("/{approval_id}", response_model=ApprovalResponse)
def get_approval(
    approval_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    """Retrieve details of a specific approval request."""
    approval = db.query(Approval).filter(Approval.id == approval_id).first()
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Approval request with ID '{approval_id}' not found.",
        )
    return ApprovalResponse.model_validate(approval)


@router.post("/{approval_id}/approve", response_model=ApprovalResponse)
def approve_remediation(
    approval_id: str,
    decision: Optional[ApprovalDecision] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    """Authorize a remediation execution. Validates action hash and expiration."""
    approval = db.query(Approval).filter(Approval.id == approval_id).first()
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Approval request with ID '{approval_id}' not found.",
        )

    if approval.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Approval request is already '{approval.status}'.",
        )

    # Check expiration
    now = datetime.now(timezone.utc)
    exp = approval.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if now > exp:
        approval.status = "expired"
        remediation = approval.remediation
        if remediation:
            remediation.status = "blocked"
            remediation.error_message = "Approval window expired without operator confirmation."
        db.commit()
        audit_service.log(
            event_type="approval_expired",
            db=db,
            approval_id=approval.id,
            remediation_id=approval.remediation_id,
            actor_id=current_user.id,
            details={"expired_at": exp.isoformat()},
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Approval request has expired.",
        )

    # Validate action hash against current runbook & target
    remediation = approval.remediation
    runbook = remediation.runbook
    incident = remediation.incident

    action_str = ",".join(runbook.allowed_actions or [])
    expected_hash = hashlib.sha256(
        f"{action_str}:{incident.affected_target}:{runbook.id}".encode()
    ).hexdigest()

    if approval.action_hash != expected_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Action hash mismatch: runbook configuration or target changed since approval was requested.",
        )

    # Mark approved
    approval.status = "approved"
    approval.approved_by = current_user.id
    approval.reason = decision.reason if decision else "Approved by operator"
    db.commit()

    audit_service.log(
        event_type="approval_granted",
        db=db,
        incident_id=incident.id if incident else None,
        remediation_id=remediation.id,
        approval_id=approval.id,
        actor_id=current_user.id,
        details={"reason": approval.reason},
    )

    # Execute approved remediation
    execution_engine.execute(remediation_id=remediation.id, db=db)
    db.refresh(approval)

    return ApprovalResponse.model_validate(approval)


@router.post("/{approval_id}/reject", response_model=ApprovalResponse)
def reject_remediation(
    approval_id: str,
    decision: Optional[ApprovalDecision] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    """Reject a proposed remediation action."""
    approval = db.query(Approval).filter(Approval.id == approval_id).first()
    if not approval:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Approval request with ID '{approval_id}' not found.",
        )

    if approval.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Approval request is already '{approval.status}'.",
        )

    approval.status = "rejected"
    approval.approved_by = current_user.id
    approval.reason = (decision.reason if decision and decision.reason else "Rejected by operator.")

    remediation = approval.remediation
    if remediation:
        status_before = remediation.status
        remediation.status = "cancelled"
        remediation.error_message = f"Remediation rejected: {approval.reason}"
        if remediation.incident:
            remediation.incident.status = "cancelled"

    db.commit()

    audit_service.log(
        event_type="approval_rejected",
        db=db,
        incident_id=remediation.incident_id if remediation else None,
        remediation_id=approval.remediation_id,
        approval_id=approval.id,
        actor_id=current_user.id,
        status_after="cancelled",
        details={"reason": approval.reason},
    )

    return ApprovalResponse.model_validate(approval)
