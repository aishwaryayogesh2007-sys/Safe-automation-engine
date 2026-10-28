from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.permissions import require_viewer
from app.db.session import get_db
from app.models.user import User
from app.schemas.analytics import DashboardSummary
from app.services.metrics_service import metrics_service

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """Retrieve aggregate platform summary including KPIs, live incidents, and system status."""
    return metrics_service.get_dashboard_summary(db)
