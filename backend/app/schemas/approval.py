from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ApprovalDecision(BaseModel):
    decision: str  # approved, rejected
    reason: Optional[str] = None


class ApprovalResponse(BaseModel):
    id: str
    remediation_id: str
    requested_at: datetime
    expires_at: datetime
    approved_by: Optional[str]
    status: str
    reason: Optional[str]
    runbook_version: int
    policy_version: str
    action_hash: str

    model_config = ConfigDict(from_attributes=True)
