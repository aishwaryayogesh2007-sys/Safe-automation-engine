import copy
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


def utcnow_iso():
    return datetime.now(timezone.utc).isoformat()


INITIAL_SERVICES_STATE: Dict[str, Dict[str, Any]] = {
    "api-gateway": {
        "status": "healthy",
        "cpu_pct": 25.0,
        "memory_pct": 35.0,
        "disk_pct": 40.0,
        "worker_count": 4,
        "queue_size": 0,
        "cert_days_remaining": 90,
        "temp_files_count": 120,
        "failed_jobs_count": 0,
        "connection_pool_pct": 20.0,
        "last_health_check": utcnow_iso(),
    },
    "worker-service": {
        "status": "healthy",
        "cpu_pct": 45.0,
        "memory_pct": 50.0,
        "disk_pct": 45.0,
        "worker_count": 8,
        "queue_size": 12,
        "cert_days_remaining": 90,
        "temp_files_count": 250,
        "failed_jobs_count": 0,
        "connection_pool_pct": 35.0,
        "last_health_check": utcnow_iso(),
    },
    "queue-processor": {
        "status": "healthy",
        "cpu_pct": 30.0,
        "memory_pct": 40.0,
        "disk_pct": 30.0,
        "worker_count": 5,
        "queue_size": 25,
        "cert_days_remaining": 90,
        "temp_files_count": 80,
        "failed_jobs_count": 0,
        "connection_pool_pct": 25.0,
        "last_health_check": utcnow_iso(),
    },
    "db-service": {
        "status": "healthy",
        "cpu_pct": 40.0,
        "memory_pct": 60.0,
        "disk_pct": 55.0,
        "worker_count": 10,
        "queue_size": 0,
        "cert_days_remaining": 90,
        "temp_files_count": 15,
        "failed_jobs_count": 0,
        "connection_pool_pct": 30.0,
        "last_health_check": utcnow_iso(),
    },
    "auth-service": {
        "status": "healthy",
        "cpu_pct": 20.0,
        "memory_pct": 30.0,
        "disk_pct": 25.0,
        "worker_count": 3,
        "queue_size": 0,
        "cert_days_remaining": 90,
        "temp_files_count": 50,
        "failed_jobs_count": 0,
        "connection_pool_pct": 15.0,
        "last_health_check": utcnow_iso(),
    },
    "cache-service": {
        "status": "healthy",
        "cpu_pct": 15.0,
        "memory_pct": 45.0,
        "disk_pct": 20.0,
        "worker_count": 2,
        "queue_size": 0,
        "cert_days_remaining": 90,
        "temp_files_count": 10,
        "failed_jobs_count": 0,
        "connection_pool_pct": 10.0,
        "last_health_check": utcnow_iso(),
    },
    "scheduler-service": {
        "status": "healthy",
        "cpu_pct": 18.0,
        "memory_pct": 28.0,
        "disk_pct": 35.0,
        "worker_count": 2,
        "queue_size": 0,
        "cert_days_remaining": 90,
        "temp_files_count": 95,
        "failed_jobs_count": 0,
        "connection_pool_pct": 15.0,
        "last_health_check": utcnow_iso(),
    },
    "cert-manager": {
        "status": "healthy",
        "cpu_pct": 10.0,
        "memory_pct": 20.0,
        "disk_pct": 15.0,
        "worker_count": 1,
        "queue_size": 0,
        "cert_days_remaining": 120,
        "temp_files_count": 5,
        "failed_jobs_count": 0,
        "connection_pool_pct": 5.0,
        "last_health_check": utcnow_iso(),
    },
}


class SimulatedInfrastructure:
    _instance: Optional["SimulatedInfrastructure"] = None

    def __init__(self):
        self.services: Dict[str, Dict[str, Any]] = copy.deepcopy(INITIAL_SERVICES_STATE)

    @classmethod
    def get_instance(cls) -> "SimulatedInfrastructure":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def reset(self):
        """Reset all services back to default clean states."""
        self.services = copy.deepcopy(INITIAL_SERVICES_STATE)
        for s in self.services.values():
            s["last_health_check"] = utcnow_iso()

    def get_metrics(self, service_name: Optional[str] = None) -> Dict[str, Any]:
        """Return metrics snapshot for a specific service or all services."""
        if service_name:
            if service_name not in self.services:
                return {}
            metrics = copy.deepcopy(self.services[service_name])
            metrics["service"] = service_name
            return metrics
        return copy.deepcopy(self.services)

    def set_metric(self, service: str, metric: str, value: Any):
        """Set a specific metric value on a target service."""
        if service not in self.services:
            self.services[service] = copy.deepcopy(INITIAL_SERVICES_STATE.get("worker-service", {}))
        self.services[service][metric] = value
        self.services[service]["last_health_check"] = utcnow_iso()

    def get_health_status(self) -> Dict[str, Any]:
        """Return high level summary of healthy vs degraded services."""
        total = len(self.services)
        healthy = 0
        degraded = 0
        services_summary = {}

        for name, data in self.services.items():
            status = data.get("status", "healthy")
            if status == "healthy":
                healthy += 1
            else:
                degraded += 1
            services_summary[name] = {
                "status": status,
                "cpu_pct": data.get("cpu_pct"),
                "memory_pct": data.get("memory_pct"),
                "disk_pct": data.get("disk_pct"),
            }

        return {
            "total_services": total,
            "healthy_services": healthy,
            "degraded_services": degraded,
            "overall_status": "healthy" if degraded == 0 else "degraded",
            "services": services_summary,
        }

    def simulate_fault(self, scenario_type: str, target: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Inject a simulated fault into a target service."""
        params = params or {}
        if target not in self.services:
            target = "worker-service"

        state = self.services[target]
        state["last_health_check"] = utcnow_iso()

        if scenario_type == "disk_usage_spike":
            val = params.get("disk_pct", 92.0)
            state["disk_pct"] = float(val)
            state["status"] = "degraded"
        elif scenario_type == "worker_stuck":
            state["worker_count"] = 0
            state["status"] = "unhealthy"
            state["cpu_pct"] = 90.0
        elif scenario_type == "queue_backlog":
            val = params.get("queue_size", 5500)
            state["queue_size"] = int(val)
            state["status"] = "degraded"
        elif scenario_type == "cert_expiry":
            val = params.get("cert_days_remaining", 3)
            state["cert_days_remaining"] = int(val)
            state["status"] = "degraded"
        elif scenario_type == "service_unhealthy":
            state["status"] = "unhealthy"
            state["cpu_pct"] = 85.0
        elif scenario_type == "memory_pressure":
            val = params.get("memory_pct", 95.0)
            state["memory_pct"] = float(val)
            state["status"] = "degraded"
        elif scenario_type == "scheduled_job_failure":
            state["failed_jobs_count"] = params.get("failed_jobs_count", 15)
            state["status"] = "failed"
        elif scenario_type == "db_connection_exhaustion":
            state["connection_pool_pct"] = 99.0
            state["status"] = "degraded"
        elif scenario_type == "temp_file_accumulation":
            state["temp_files_count"] = params.get("temp_files_count", 25000)
            state["disk_pct"] = 88.0
            state["status"] = "degraded"
        elif scenario_type == "resource_limit_violation":
            state["cpu_pct"] = 98.0
            state["memory_pct"] = 92.0
            state["status"] = "degraded"
        else:
            state["status"] = "degraded"

        return copy.deepcopy(state)

    def apply_remediation(self, action: str, target: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Apply a corrective action to target service and return the resulting state."""
        params = params or {}
        if target not in self.services:
            target = "worker-service"

        state = self.services[target]
        state["last_health_check"] = utcnow_iso()

        # Execute remediation actions
        if action == "cleanup_disk":
            state["disk_pct"] = 42.0
            state["temp_files_count"] = 50
            state["status"] = "healthy"
        elif action == "cleanup_temp_files":
            state["temp_files_count"] = 20
            state["disk_pct"] = 40.0
            state["status"] = "healthy"
        elif action == "restart_workers":
            state["worker_count"] = 8
            state["status"] = "healthy"
            state["cpu_pct"] = 35.0
        elif action in ("scale_queue_consumers", "drain_queue"):
            state["queue_size"] = 15
            state["worker_count"] = 8
            state["status"] = "healthy"
        elif action == "rotate_certificate":
            state["cert_days_remaining"] = 90
            state["status"] = "healthy"
        elif action == "restart_service":
            state["status"] = "healthy"
            state["cpu_pct"] = 28.0
            state["memory_pct"] = 38.0
        elif action == "recover_scheduled_jobs":
            state["failed_jobs_count"] = 0
            state["status"] = "healthy"
        elif action == "reset_db_connection_pool":
            state["connection_pool_pct"] = 25.0
            state["status"] = "healthy"
        elif action == "reset_resource_limits":
            state["cpu_pct"] = 30.0
            state["memory_pct"] = 40.0
            state["status"] = "healthy"
        # Rollback actions
        elif action == "restore_disk_backup":
            state["disk_pct"] = 65.0
            state["status"] = "degraded"
        elif action == "revert_worker_restart":
            state["worker_count"] = 4
            state["status"] = "degraded"
        elif action == "revert_queue_scale":
            state["worker_count"] = 4
            state["status"] = "degraded"
        elif action == "revert_certificate":
            state["cert_days_remaining"] = 10
            state["status"] = "degraded"
        elif action == "stop_service":
            state["status"] = "stopped"
        else:
            logger.warning("Unrecognized action '%s' applied on %s", action, target)

        return copy.deepcopy(state)


simulator = SimulatedInfrastructure.get_instance()
