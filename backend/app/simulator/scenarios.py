from typing import Dict, Any, Optional
from app.simulator.infrastructure import simulator

SCENARIOS: Dict[str, Dict[str, Any]] = {
    "disk_usage_spike": {
        "name": "Disk Usage Spike",
        "description": "Target server disk usage surges to critical 92% threshold",
        "default_target": "worker-service",
        "severity": "high",
        "incident_type": "disk_alert",
        "title": "Critical disk space shortage detected on target",
        "params": {"disk_pct": 92.0},
    },
    "worker_stuck": {
        "name": "Worker Pool Freeze",
        "description": "Background workers hang or crash, zero active workers remain",
        "default_target": "worker-service",
        "severity": "critical",
        "incident_type": "worker_alert",
        "title": "Worker pool unresponsive and inactive",
        "params": {"worker_count": 0},
    },
    "queue_backlog": {
        "name": "Message Queue Congestion",
        "description": "Queue size exceeds 5000 unprocessed items due to consumer delay",
        "default_target": "queue-processor",
        "severity": "medium",
        "incident_type": "queue_alert",
        "title": "Message queue backlog threshold exceeded",
        "params": {"queue_size": 5500},
    },
    "cert_expiry": {
        "name": "TLS Certificate Impending Expiry",
        "description": "TLS certificate expires in less than 72 hours (3 days remaining)",
        "default_target": "cert-manager",
        "severity": "high",
        "incident_type": "cert_alert",
        "title": "TLS certificate expiring imminently",
        "params": {"cert_days_remaining": 3},
    },
    "service_unhealthy": {
        "name": "Service Health Check Failure",
        "description": "Core service endpoint failing consecutive liveness probes",
        "default_target": "api-gateway",
        "severity": "critical",
        "incident_type": "service_alert",
        "title": "Service failed liveness probe checks",
        "params": {"status": "unhealthy"},
    },
    "memory_pressure": {
        "name": "Memory Utilization Near OOM",
        "description": "Target service memory consumption reaches 95%",
        "default_target": "cache-service",
        "severity": "high",
        "incident_type": "memory_alert",
        "title": "Service approaching out-of-memory threshold",
        "params": {"memory_pct": 95.0},
    },
    "scheduled_job_failure": {
        "name": "Scheduled Cron Job Failures",
        "description": "Cron scheduler accumulating repeated execution failures",
        "default_target": "scheduler-service",
        "severity": "medium",
        "incident_type": "job_alert",
        "title": "Repeated scheduled job execution failures",
        "params": {"failed_jobs_count": 15},
    },
    "db_connection_exhaustion": {
        "name": "Database Connection Pool Exhaustion",
        "description": "Database connection pool reached 99% capacity",
        "default_target": "db-service",
        "severity": "critical",
        "incident_type": "db_pool_alert",
        "title": "Database connection pool saturated",
        "params": {"connection_pool_pct": 99.0},
    },
    "temp_file_accumulation": {
        "name": "Temporary File Leak",
        "description": "Orphaned temporary files rapidly eating file system inodes",
        "default_target": "worker-service",
        "severity": "low",
        "incident_type": "temp_file_alert",
        "title": "Temporary directory file accumulation detected",
        "params": {"temp_files_count": 25000, "disk_pct": 88.0},
    },
    "resource_limit_violation": {
        "name": "CPU Throttling & Resource Limit Breach",
        "description": "CPU usage pinned at 98% causing severe request throttling",
        "default_target": "auth-service",
        "severity": "high",
        "incident_type": "resource_limit_alert",
        "title": "Sustained high CPU throttling violation",
        "params": {"cpu_pct": 98.0, "memory_pct": 92.0},
    },
}


def trigger_scenario(
    scenario_type: str,
    target: Optional[str] = None,
    parameters: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Execute a scenario by applying fault in the simulator and preparing incident fields."""
    if scenario_type not in SCENARIOS:
        raise ValueError(f"Unknown scenario type: {scenario_type}. Available: {list(SCENARIOS.keys())}")

    config = SCENARIOS[scenario_type]
    actual_target = target or config["default_target"]
    combined_params = {**config["params"], **(parameters or {})}

    # Inject into simulator
    affected_metrics = simulator.simulate_fault(scenario_type, actual_target, combined_params)

    incident_data = {
        "title": config["title"],
        "description": config["description"],
        "severity": config["severity"],
        "incident_type": config["incident_type"],
        "affected_service": actual_target,
        "affected_target": actual_target,
        "metrics_snapshot": affected_metrics,
        "status": "detected",
    }

    return {
        "scenario_type": scenario_type,
        "target": actual_target,
        "parameters": combined_params,
        "incident_data": incident_data,
        "affected_metrics": affected_metrics,
    }
