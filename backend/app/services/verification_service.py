import logging
from dataclasses import dataclass
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.remediation import Remediation
from app.models.runbook import Runbook
from app.simulator.infrastructure import simulator

logger = logging.getLogger(__name__)


@dataclass
class VerificationResult:
    success: bool
    metrics_before: Dict[str, Any]
    metrics_after: Dict[str, Any]
    criteria_results: Dict[str, Any]


class VerificationService:
    def verify(
        self,
        remediation: Remediation,
        runbook: Runbook,
        db: Session,
    ) -> VerificationResult:
        """Evaluate post-remediation metrics against defined verification criteria."""
        target_service = (
            remediation.incident.affected_service if remediation.incident else "worker-service"
        )
        metrics_before = remediation.baseline_metrics or {}
        metrics_after = simulator.get_metrics(target_service)

        criteria = runbook.verification_criteria or {}
        criteria_results: Dict[str, Any] = {}
        all_passed = True

        if not criteria:
            # Default check: service status must be healthy
            status = metrics_after.get("status", "healthy")
            passed = status == "healthy"
            criteria_results["default_health_check"] = {
                "passed": passed,
                "expected": "healthy",
                "actual": status,
            }
            if not passed:
                all_passed = False

        for rule, expected in criteria.items():
            # Parse rule syntax: e.g. disk_pct_lt, worker_count_gte, status_eq
            passed = False
            actual_val = None

            if rule.endswith("_lt"):
                metric_name = rule[:-3]
                actual_val = metrics_after.get(metric_name)
                passed = actual_val is not None and float(actual_val) < float(expected)
            elif rule.endswith("_lte"):
                metric_name = rule[:-4]
                actual_val = metrics_after.get(metric_name)
                passed = actual_val is not None and float(actual_val) <= float(expected)
            elif rule.endswith("_gt"):
                metric_name = rule[:-3]
                actual_val = metrics_after.get(metric_name)
                passed = actual_val is not None and float(actual_val) > float(expected)
            elif rule.endswith("_gte"):
                metric_name = rule[:-4]
                actual_val = metrics_after.get(metric_name)
                passed = actual_val is not None and float(actual_val) >= float(expected)
            elif rule.endswith("_eq"):
                metric_name = rule[:-3]
                actual_val = metrics_after.get(metric_name)
                passed = actual_val == expected
            else:
                # Direct match
                actual_val = metrics_after.get(rule)
                passed = actual_val == expected

            criteria_results[rule] = {
                "passed": passed,
                "expected": expected,
                "actual": actual_val,
            }

            if not passed:
                all_passed = False

        return VerificationResult(
            success=all_passed,
            metrics_before=metrics_before,
            metrics_after=metrics_after,
            criteria_results=criteria_results,
        )


verification_service = VerificationService()
