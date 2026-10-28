from datetime import datetime
from typing import Optional, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.schemas.incident import IncidentResponse


class SimulationTriggerRequest(BaseModel):
    scenario_type: str
    target: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None


class SimulationScenarioResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    scenario_type: str
    parameters: Dict[str, Any]
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SimulationResponse(BaseModel):
    scenario_type: str
    target: str
    incident: IncidentResponse
    message: str
