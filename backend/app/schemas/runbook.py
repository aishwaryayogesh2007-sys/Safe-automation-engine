from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict


class RunbookBase(BaseModel):
    name: str
    version: int = 1
    description: Optional[str] = None
    trigger_conditions: Dict[str, Any] = {}
    preconditions: Dict[str, Any] = {}
    allowed_actions: List[str] = []
    risk_tier: str = "medium"
    target_restrictions: Dict[str, Any] = {}
    execution_timeout_seconds: int = 300
    max_retries: int = 3
    cooldown_seconds: int = 60
    max_changes: int = 5
    required_approvals: int = 1
    verification_criteria: Dict[str, Any] = {}
    rollback_action: Optional[str] = None
    escalation_rules: Dict[str, Any] = {}
    is_active: bool = True


class RunbookCreate(RunbookBase):
    pass


class RunbookResponse(BaseModel):
    id: str
    name: str
    version: int
    description: Optional[str]
    risk_tier: str
    allowed_actions: List[str]
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RunbookDetail(RunbookBase):
    id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
