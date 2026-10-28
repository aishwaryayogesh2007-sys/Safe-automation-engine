from fastapi import APIRouter
from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.incidents import router as incidents_router
from app.api.runbooks import router as runbooks_router
from app.api.remediations import router as remediations_router
from app.api.approvals import router as approvals_router
from app.api.audit import router as audit_router
from app.api.policies import router as policies_router
from app.api.simulations import router as simulations_router
from app.api.analytics import router as analytics_router

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router)
api_router.include_router(dashboard_router)
api_router.include_router(incidents_router)
api_router.include_router(runbooks_router)
api_router.include_router(remediations_router)
api_router.include_router(approvals_router)
api_router.include_router(audit_router)
api_router.include_router(policies_router)
api_router.include_router(simulations_router)
api_router.include_router(analytics_router)

__all__ = ["api_router"]
