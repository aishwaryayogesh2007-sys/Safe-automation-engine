from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class PolicyResponse(BaseModel):
    id: str
    version: str
    name: str
    rules: Dict[str, Any]
    is_active: bool
    kill_switch_active: bool
    kill_switch_activated_by: Optional[str]
    kill_switch_activated_at: Optional[datetime]
    kill_switch_reason: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class KillSwitchRequest(BaseModel):
    reason: str


class KillSwitchStatus(BaseModel):
    kill_switch_active: bool
    activated_by: Optional[str]
    activated_at: Optional[datetime]
    reason: Optional[str]
