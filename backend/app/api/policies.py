from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.permissions import require_admin, require_viewer
from app.db.session import get_db
from app.models.policy import Policy
from app.models.user import User
from app.schemas.policy import KillSwitchRequest, KillSwitchStatus, PolicyResponse
from app.services.audit_service import audit_service

router = APIRouter(prefix="/policies", tags=["Safety Policies"])


@router.get("", response_model=PolicyResponse)
def get_active_policy(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Retrieve current active safety policy and rules."""
    policy = (
        db.query(Policy)
        .filter(Policy.is_active == True)
        .order_by(Policy.created_at.desc())
        .first()
    )
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active safety policy found in platform.",
        )
    return PolicyResponse.model_validate(policy)


@router.get("/kill-switch", response_model=KillSwitchStatus)
def get_kill_switch_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Check current state of the emergency kill switch."""
    policy = (
        db.query(Policy)
        .filter(Policy.is_active == True)
        .order_by(Policy.created_at.desc())
        .first()
    )
    if not policy:
        return KillSwitchStatus(
            kill_switch_active=False,
            activated_by=None,
            activated_at=None,
            reason=None,
        )

    return KillSwitchStatus(
        kill_switch_active=policy.kill_switch_active,
        activated_by=policy.kill_switch_activated_by,
        activated_at=policy.kill_switch_activated_at,
        reason=policy.kill_switch_reason,
    )


@router.post("/kill-switch/activate", response_model=KillSwitchStatus)
def activate_kill_switch(
    request: KillSwitchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Emergency halt: Immediately block all autonomous remediations across the platform."""
    policy = (
        db.query(Policy)
        .filter(Policy.is_active == True)
        .order_by(Policy.created_at.desc())
        .first()
    )
    if not policy:
        # Create default policy
        policy = Policy(
            version="v1.0",
            name="Default Platform Safety Policy",
            rules={"rate_limits": {"max_per_runbook_hour": 5}, "blast_radius": {"max_concurrent_remediations": 3}},
            is_active=True,
        )
        db.add(policy)

    policy.kill_switch_active = True
    policy.kill_switch_activated_by = current_user.id
    policy.kill_switch_activated_at = datetime.now(timezone.utc)
    policy.kill_switch_reason = request.reason
    db.commit()
    db.refresh(policy)

    audit_service.log(
        event_type="kill_switch_activated",
        db=db,
        actor_id=current_user.id,
        policy_version=policy.version,
        details={"reason": request.reason},
    )

    return KillSwitchStatus(
        kill_switch_active=True,
        activated_by=policy.kill_switch_activated_by,
        activated_at=policy.kill_switch_activated_at,
        reason=policy.kill_switch_reason,
    )


@router.post("/kill-switch/deactivate", response_model=KillSwitchStatus)
def deactivate_kill_switch(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Deactivate emergency kill switch and restore normal autonomous policy enforcement."""
    policy = (
        db.query(Policy)
        .filter(Policy.is_active == True)
        .order_by(Policy.created_at.desc())
        .first()
    )
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active policy found.",
        )

    policy.kill_switch_active = False
    policy.kill_switch_activated_by = None
    policy.kill_switch_activated_at = None
    policy.kill_switch_reason = None
    db.commit()
    db.refresh(policy)

    audit_service.log(
        event_type="kill_switch_deactivated",
        db=db,
        actor_id=current_user.id,
        policy_version=policy.version,
        details={"message": "Emergency kill switch cleared by administrator."},
    )

    return KillSwitchStatus(
        kill_switch_active=False,
        activated_by=None,
        activated_at=None,
        reason=None,
    )
