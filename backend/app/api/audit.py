from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.permissions import require_viewer
from app.db.session import get_db
from app.models.user import User
from app.schemas.audit import AuditEventResponse
from app.services.audit_service import audit_service

router = APIRouter(prefix="/audit", tags=["Audit Trail"])


@router.get("", response_model=List[AuditEventResponse])
def list_audit_events(
    event_type: Optional[str] = Query(None),
    remediation_id: Optional[str] = Query(None),
    incident_id: Optional[str] = Query(None),
    actor_id: Optional[str] = Query(None),
    from_date: Optional[datetime] = Query(None),
    to_date: Optional[datetime] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Retrieve paginated immutable audit trail events."""
    filters = {
        "event_type": event_type,
        "remediation_id": remediation_id,
        "incident_id": incident_id,
        "actor_id": actor_id,
        "from_date": from_date,
        "to_date": to_date,
    }
    events = audit_service.get_events(db=db, filters=filters, skip=skip, limit=limit)
    return [AuditEventResponse.model_validate(e) for e in events]
