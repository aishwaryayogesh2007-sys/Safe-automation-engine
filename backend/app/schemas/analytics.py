from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict
from app.schemas.incident import IncidentResponse
from app.schemas.remediation import RemediationResponse


class KPIResponse(BaseModel):
    total_incidents: int = 0
    total_remediations: int = 0
    succeeded: int = 0
    failed: int = 0
    pending_approvals: int = 0
    success_rate: float = 0.0
    rollback_success_rate: float = 0.0
    mean_time_to_remediation: float = 0.0
    unsafe_actions_blocked: int = 0
    auto_resolved_pct: float = 0.0
    escalated_count: int = 0
    audit_completeness_pct: float = 100.0
    approval_wait_time_avg: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class DashboardSummary(BaseModel):
    kpis: KPIResponse
    recent_incidents: List[IncidentResponse]
    active_remediations: List[RemediationResponse]
    system_health: Dict[str, Any]
    kill_switch_active: bool

    model_config = ConfigDict(from_attributes=True)
