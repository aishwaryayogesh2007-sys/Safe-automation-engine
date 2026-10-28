from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict
from app.schemas.audit import AuditEventResponse


class RemediationCreate(BaseModel):
    incident_id: str
    runbook_id: Optional[str] = None
    idempotency_key: Optional[str] = None


class RemediationResponse(BaseModel):
    id: str
    incident_id: str
    runbook_id: str
    runbook_version: int
    status: str
    triggered_by: Optional[str]
    baseline_metrics: Dict[str, Any]
    post_metrics: Dict[str, Any]
    execution_result: Dict[str, Any]
    verification_result: Dict[str, Any]
    rollback_result: Dict[str, Any]
    idempotency_key: str
    policy_version: str
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    error_message: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class RemediationTimeline(BaseModel):
    remediation_id: str
    status: str
    events: List[AuditEventResponse]
