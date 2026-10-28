from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.permissions import require_viewer
from app.db.session import get_db
from app.models.runbook import Runbook
from app.models.user import User
from app.schemas.runbook import RunbookDetail, RunbookResponse

router = APIRouter(prefix="/runbooks", tags=["Runbooks"])


@router.get("", response_model=List[RunbookResponse])
def list_runbooks(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """List all available runbooks with pagination."""
    runbooks = db.query(Runbook).order_by(Runbook.name).offset(skip).limit(limit).all()
    return [RunbookResponse.model_validate(rb) for rb in runbooks]


@router.get("/{runbook_id}", response_model=RunbookDetail)
def get_runbook(
    runbook_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Retrieve full configuration and execution criteria for a specific runbook."""
    runbook = db.query(Runbook).filter(Runbook.id == runbook_id).first()
    if not runbook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Runbook with ID '{runbook_id}' not found.",
        )
    return RunbookDetail.model_validate(runbook)
