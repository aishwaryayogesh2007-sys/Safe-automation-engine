import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, desc
from sqlalchemy.orm import Session
from app.core.permissions import require_operator, require_viewer
from app.db.session import get_db
from app.models.incident import Incident
from app.models.runbook import Runbook
from app.models.user import User
from app.schemas.incident import (
    IncidentCreate,
    IncidentResponse,
    IncidentStatusUpdate,
)
from app.services.audit_service import audit_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/incidents", tags=["Incidents"])


@router.get("", response_model=List[IncidentResponse])
def list_incidents(
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    incident_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """List and filter incidents with search support."""
    query = db.query(Incident)

    if severity:
        query = query.filter(Incident.severity == severity)
    if status:
        query = query.filter(Incident.status == status)
    if incident_type:
        query = query.filter(Incident.incident_type == incident_type)
    if search:
        query = query.filter(
            or_(
                Incident.title.ilike(f"%{search}%"),
                Incident.description.ilike(f"%{search}%"),
                Incident.affected_service.ilike(f"%{search}%"),
                Incident.affected_target.ilike(f"%{search}%"),
            )
        )

    incidents = query.order_by(desc(Incident.created_at)).offset(skip).limit(limit).all()
    return [IncidentResponse.model_validate(inc) for inc in incidents]


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Retrieve detailed information for a single incident."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{incident_id}' not found.",
        )
    return IncidentResponse.model_validate(incident)


@router.post("", response_model=IncidentResponse, status_code=status.HTTP_201_CREATED)
def create_incident(
    data: IncidentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    """Create a new operational incident (operator or admin)."""
    assigned_runbook_id = data.assigned_runbook_id
    initial_status = "detected"

    # Auto-match runbook if none explicitly specified
    if not assigned_runbook_id:
        matching_runbook = (
            db.query(Runbook)
            .filter(Runbook.is_active == True)
            .all()
        )
        for rb in matching_runbook:
            trig = rb.trigger_conditions or {}
            if trig.get("incident_type") == data.incident_type:
                assigned_runbook_id = rb.id
                break

    # If still no runbook found, escalate immediately for human intervention
    if not assigned_runbook_id:
        initial_status = "escalated"

    incident = Incident(
        title=data.title,
        description=data.description,
        severity=data.severity,
        status=initial_status,
        incident_type=data.incident_type,
        affected_service=data.affected_service,
        affected_target=data.affected_target,
        metrics_snapshot=data.metrics_snapshot,
        assigned_runbook_id=assigned_runbook_id,
    )

    db.add(incident)
    db.commit()
    db.refresh(incident)

    audit_service.log(
        event_type="incident_created" if initial_status != "escalated" else "incident_escalated_no_runbook",
        db=db,
        incident_id=incident.id,
        actor_id=current_user.id,
        status_after=initial_status,
        details={
            "title": incident.title,
            "incident_type": incident.incident_type,
            "assigned_runbook_id": assigned_runbook_id,
            "reason": "No approved runbook matched incident signature." if initial_status == "escalated" else "Incident registered.",
        },
    )

    return IncidentResponse.model_validate(incident)


@router.patch("/{incident_id}/status", response_model=IncidentResponse)
def update_incident_status(
    incident_id: str,
    update_data: IncidentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    """Manually update an incident status (operator+)."""
    incident = db.query(Incident).filter(Incident.id == incident_id).first()
    if not incident:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Incident with ID '{incident_id}' not found.",
        )

    status_before = incident.status
    incident.status = update_data.status
    db.commit()
    db.refresh(incident)

    audit_service.log(
        event_type="incident_status_updated",
        db=db,
        incident_id=incident.id,
        actor_id=current_user.id,
        status_before=status_before,
        status_after=incident.status,
        details={"reason": update_data.reason},
    )

    return IncidentResponse.model_validate(incident)
