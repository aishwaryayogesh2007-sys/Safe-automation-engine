import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FlaskConical,
  AlertTriangle,
  HardDrive,
  Cpu,
  Layers,
  Shield,
  Activity,
  Server,
  Database,
  Calendar,
  FileMinus,
  Zap,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import {
  getScenarios,
  triggerSimulation,
  getDashboardSummary,
  getIncidents,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import InfrastructureHealth from '../components/dashboard/InfrastructureHealth';
import RiskBadge from '../components/common/RiskBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';

const PREDEFINED_SCENARIOS = [
  {
    scenario_type: 'disk_usage_spike',
    name: 'Disk Usage Spike',
    description: 'Target server disk usage surges to critical 92% threshold.',
    default_target: 'worker-service',
    severity: 'high',
    icon: HardDrive,
  },
  {
    scenario_type: 'worker_stuck',
    name: 'Worker Pool Freeze',
    description: 'Background workers hang or crash, leaving zero active workers.',
    default_target: 'worker-service',
    severity: 'critical',
    icon: Cpu,
  },
  {
    scenario_type: 'queue_backlog',
    name: 'Message Queue Congestion',
    description: 'Queue size exceeds 5000 unprocessed items due to consumer delay.',
    default_target: 'queue-processor',
    severity: 'medium',
    icon: Layers,
  },
  {
    scenario_type: 'cert_expiry',
    name: 'TLS Certificate Impending Expiry',
    description: 'TLS certificate expires in less than 72 hours (3 days remaining).',
    default_target: 'cert-manager',
    severity: 'high',
    icon: Shield,
  },
  {
    scenario_type: 'service_unhealthy',
    name: 'Service Health Check Failure',
    description: 'Core service endpoint failing consecutive liveness probes.',
    default_target: 'api-gateway',
    severity: 'critical',
    icon: Activity,
  },
  {
    scenario_type: 'memory_pressure',
    name: 'Memory Utilization Near OOM',
    description: 'Target service memory consumption reaches 95%.',
    default_target: 'cache-service',
    severity: 'high',
    icon: Server,
  },
  {
    scenario_type: 'scheduled_job_failure',
    name: 'Scheduled Cron Job Failures',
    description: 'Cron scheduler accumulating repeated execution failures.',
    default_target: 'scheduler-service',
    severity: 'medium',
    icon: Calendar,
  },
  {
    scenario_type: 'db_connection_exhaustion',
    name: 'Database Connection Pool Exhaustion',
    description: 'Database connection pool reaches 99% saturation capacity.',
    default_target: 'db-service',
    severity: 'critical',
    icon: Database,
  },
  {
    scenario_type: 'temp_file_accumulation',
    name: 'Temporary File Leak',
    description: 'Orphaned temporary files rapidly consume file system inodes.',
    default_target: 'worker-service',
    severity: 'low',
    icon: FileMinus,
  },
  {
    scenario_type: 'resource_limit_violation',
    name: 'CPU Throttling & Limit Breach',
    description: 'CPU usage pinned at 98% causing severe request throttling.',
    default_target: 'auth-service',
    severity: 'high',
    icon: Zap,
  },
];

const SERVICES = [
  'api-gateway',
  'worker-service',
  'queue-processor',
  'db-service',
  'auth-service',
  'cache-service',
  'scheduler-service',
  'cert-manager',
];

const SimulationLab = () => {
  const { isOperator } = useAuth();
  const { showToast } = useToast();

  const [targets, setTargets] = useState({});
  const [systemHealth, setSystemHealth] = useState({});
  const [recentIncidents, setRecentIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [triggerResult, setTriggerResult] = useState(null);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    scenario: null,
    target: '',
    loading: false,
  });

  // Initialize targets
  useEffect(() => {
    const initialTargets = {};
    PREDEFINED_SCENARIOS.forEach((sc) => {
      initialTargets[sc.scenario_type] = sc.default_target;
    });
    setTargets(initialTargets);
  }, []);

  const fetchLiveStatus = useCallback(async () => {
    try {
      const summary = await getDashboardSummary();
      setSystemHealth(summary?.system_health || {});
      const incs = await getIncidents({ limit: 5 });
      setRecentIncidents(incs || []);
    } catch (err) {
      console.error('Failed to update live health:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiveStatus();
    const interval = setInterval(fetchLiveStatus, 5000);
    return () => clearInterval(interval);
  }, [fetchLiveStatus]);

  const handleTargetChange = (scenarioType, value) => {
    setTargets((prev) => ({
      ...prev,
      [scenarioType]: value,
    }));
  };

  const handleOpenConfirm = (scenario) => {
    const target = targets[scenario.scenario_type] || scenario.default_target;
    setConfirmDialog({
      isOpen: true,
      scenario,
      target,
      loading: false,
    });
  };

  const handleConfirmTrigger = async () => {
    const { scenario, target } = confirmDialog;
    setConfirmDialog((prev) => ({ ...prev, loading: true }));

    try {
      const res = await triggerSimulation({
        scenario_type: scenario.scenario_type,
        target_service: target,
      });

      setTriggerResult(res);
      showToast(`Fault injected: ${scenario.name} on ${target}`, 'success');
      setConfirmDialog({ isOpen: false, scenario: null, target: '', loading: false });
      fetchLiveStatus();
    } catch (err) {
      console.error('Simulation fault injection failed:', err);
      const detail = err.response?.data?.detail || 'Fault injection failed.';
      showToast(detail, 'error');
      setConfirmDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  if (loading && Object.keys(systemHealth).length === 0) {
    return <LoadingSpinner message="Connecting to simulated fault injection harness..." />;
  }

  return (
    <div className="space-y-6">
      {/* Simulation Environment Warning Banner */}
      <div className="p-4 rounded-xl bg-amber-950/40 border border-brand-amber/60 flex items-start gap-3 shadow-lg">
        <FlaskConical className="w-5 h-5 text-brand-amber shrink-0 mt-0.5 animate-bounce" />
        <div className="flex-1 text-xs">
          <span className="font-bold text-amber-200">
            Chaos & Fault Injection Lab — Simulated Environment Only
          </span>
          <p className="text-amber-300/90 mt-0.5 leading-relaxed">
            All disruptions injected through this lab target isolated in-memory telemetry and service models.
            Autonomous remediation pipelines, precondition checks, and kill switch rules will immediately react to induced states.
          </p>
        </div>
      </div>

      {/* Trigger Success Result Alert */}
      {triggerResult && (
        <div className="p-4 rounded-xl bg-emerald-950/70 border border-brand-green text-emerald-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-brand-green shrink-0" />
            <div>
              <span className="font-bold">{triggerResult.message}</span>
              <p className="text-emerald-300 text-[11px] font-mono mt-0.5">
                Target: {triggerResult.target} &bull; Scenario: {triggerResult.scenario_type}
              </p>
            </div>
          </div>
          {triggerResult.incident && (
            <Link
              to={`/incidents/${triggerResult.incident.id}`}
              className="btn-success text-xs py-1 px-3"
            >
              <span>View Created Incident</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Live Cluster Health Telemetry */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-brand-cyan" />
            <h3 className="text-sm font-bold text-white">
              Live Cluster Telemetry (Polling every 5s)
            </h3>
          </div>
          <button
            onClick={fetchLiveStatus}
            className="text-xs text-gray-400 hover:text-white flex items-center gap-1 font-mono"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        <InfrastructureHealth services={systemHealth} />
      </div>

      {/* 10 Chaos Scenarios Grid */}
      <div>
        <div className="mb-4">
          <h3 className="text-base font-bold text-white">
            Available Fault Injection Scenarios (10 Scenarios)
          </h3>
          <p className="text-xs text-gray-400">
            Select a target service and dispatch fault simulation to test autonomous self-healing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {PREDEFINED_SCENARIOS.map((scenario) => {
            const Icon = scenario.icon;
            const currentTarget = targets[scenario.scenario_type] || scenario.default_target;

            return (
              <div
                key={scenario.scenario_type}
                className="card p-5 bg-gradient-to-br from-dark-800 to-dark-900 border-gray-800 rounded-xl flex flex-col justify-between hover:border-gray-700 transition-all duration-200"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="p-2.5 rounded-lg bg-dark-950 border border-gray-800 text-brand-cyan">
                      <Icon className="w-4 h-4" />
                    </div>
                    <RiskBadge tier={scenario.severity} size="small" />
                  </div>

                  <h4 className="text-sm font-bold text-white mb-1">{scenario.name}</h4>
                  <p className="text-xs text-gray-300 leading-relaxed mb-4">
                    {scenario.description}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-gray-800/80 text-xs">
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-1">
                      Target Service:
                    </label>
                    <select
                      className="select text-xs py-1.5 font-mono"
                      value={currentTarget}
                      onChange={(e) =>
                        handleTargetChange(scenario.scenario_type, e.target.value)
                      }
                      disabled={!isOperator}
                    >
                      {SERVICES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenConfirm(scenario)}
                    disabled={!isOperator}
                    className="w-full btn-primary text-xs py-2 shadow-md shadow-blue-500/15"
                  >
                    <FlaskConical className="w-3.5 h-3.5" />
                    <span>Inject Fault</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={`Trigger Fault: ${confirmDialog.scenario?.name}`}
        message={`This will inject a fault into the simulated service '${confirmDialog.target}'. The platform will generate an incident and trigger autonomous recovery policies. Proceed?`}
        confirmText="Inject Simulated Fault"
        variant="warning"
        loading={confirmDialog.loading}
        onConfirm={handleConfirmTrigger}
        onCancel={() =>
          setConfirmDialog({ isOpen: false, scenario: null, target: '', loading: false })
        }
      />
    </div>
  );
};

export default SimulationLab;
