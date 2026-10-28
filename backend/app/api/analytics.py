from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.permissions import require_viewer
from app.db.session import get_db
from app.models.user import User
from app.schemas.analytics import KPIResponse
from app.services.metrics_service import metrics_service

router = APIRouter(prefix="/analytics", tags=["Analytics & KPIs"])


@router.get("/kpis", response_model=KPIResponse)
def get_kpis(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Retrieve operational KPIs calculated directly from live platform records."""
    return metrics_service.get_kpis(db)
