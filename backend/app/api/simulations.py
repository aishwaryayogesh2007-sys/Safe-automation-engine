from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.permissions import require_operator, require_viewer
from app.db.session import get_db
from app.models.incident import Incident
from app.models.runbook import Runbook
from app.models.simulation import SimulationScenario
from app.models.user import User
from app.schemas.incident import IncidentResponse
from app.schemas.simulation import (
    SimulationResponse,
    SimulationScenarioResponse,
    SimulationTriggerRequest,
)
from app.simulator.scenarios import trigger_scenario
from app.services.audit_service import audit_service

router = APIRouter(prefix="/simulations", tags=["Chaos & Fault Simulations"])


@router.get("/scenarios", response_model=List[SimulationScenarioResponse])
def list_scenarios(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_viewer),
):
    """List all available chaos and fault injection simulation scenarios."""
    scenarios = db.query(SimulationScenario).filter(SimulationScenario.is_active == True).all()
    return [SimulationScenarioResponse.model_validate(s) for s in scenarios]


@router.post("/trigger", response_model=SimulationResponse, status_code=status.HTTP_201_CREATED)
def trigger_fault_simulation(
    request: SimulationTriggerRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_operator),
):
    """Inject a simulated infrastructure fault and register the resulting incident."""
    try:
        scenario_result = trigger_scenario(
            scenario_type=request.scenario_type,
            target=request.target,
            parameters=request.parameters,
        )
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(err),
        )

    inc_data = scenario_result["incident_data"]

    # Match assigned runbook
    assigned_runbook_id = None
    active_runbooks = db.query(Runbook).filter(Runbook.is_active == True).all()
    for rb in active_runbooks:
        trig = rb.trigger_conditions or {}
        if trig.get("incident_type") == inc_data["incident_type"]:
            assigned_runbook_id = rb.id
            break

    incident = Incident(
        title=inc_data["title"],
        description=inc_data["description"],
        severity=inc_data["severity"],
        status="detected",
        incident_type=inc_data["incident_type"],
        affected_service=inc_data["affected_service"],
        affected_target=inc_data["affected_target"],
        metrics_snapshot=inc_data["metrics_snapshot"],
        assigned_runbook_id=assigned_runbook_id,
    )

    db.add(incident)
    db.commit()
    db.refresh(incident)

    audit_service.log(
        event_type="simulation_fault_injected",
        db=db,
        incident_id=incident.id,
        actor_id=current_user.id,
        runbook_id=assigned_runbook_id,
        details={
            "scenario_type": request.scenario_type,
            "target": scenario_result["target"],
            "parameters": scenario_result["parameters"],
        },
    )

    return SimulationResponse(
        scenario_type=request.scenario_type,
        target=scenario_result["target"],
        incident=IncidentResponse.model_validate(incident),
        message=f"Simulation '{request.scenario_type}' injected successfully on target '{scenario_result['target']}'.",
    )
