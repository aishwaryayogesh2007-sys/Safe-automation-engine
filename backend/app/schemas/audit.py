from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class AuditEventResponse(BaseModel):
    id: str
    incident_id: Optional[str]
    remediation_id: Optional[str]
    approval_id: Optional[str]
    event_type: str
    actor_id: Optional[str]
    timestamp: datetime
    details: Dict[str, Any]
    runbook_id: Optional[str]
    runbook_version: Optional[int]
    policy_version: Optional[str]
    risk_tier: Optional[str]
    status_before: Optional[str]
    status_after: Optional[str]

    model_config = ConfigDict(from_attributes=True)


class AuditFilter(BaseModel):
    event_type: Optional[str] = None
    remediation_id: Optional[str] = None
    incident_id: Optional[str] = None
    actor_id: Optional[str] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    skip: int = 0
    limit: int = 50
