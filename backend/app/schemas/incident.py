from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict


class IncidentBase(BaseModel):
    title: str
    description: Optional[str] = None
    severity: str = "medium"
    incident_type: str
    affected_service: str
    affected_target: str
    metrics_snapshot: Dict[str, Any] = {}
    assigned_runbook_id: Optional[str] = None


class IncidentCreate(IncidentBase):
    pass


class IncidentStatusUpdate(BaseModel):
    status: str
    reason: Optional[str] = None


class IncidentResponse(IncidentBase):
    id: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentFilter(BaseModel):
    severity: Optional[str] = None
    status: Optional[str] = None
    incident_type: Optional[str] = None
    search: Optional[str] = None
    skip: int = 0
    limit: int = 50
