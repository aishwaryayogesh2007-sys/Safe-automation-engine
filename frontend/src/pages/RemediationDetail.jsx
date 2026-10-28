import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Zap,
  ArrowLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Layers,
  FileCode,
  Shield,
  Activity,
  User,
} from 'lucide-react';
import { getRemediation, getRemediationTimeline } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import RiskBadge from '../components/common/RiskBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

const RemediationDetail = () => {
  const { id } = useParams();
  const [remediation, setRemediation] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [rem, tl] = await Promise.all([
          getRemediation(id),
          getRemediationTimeline(id),
        ]);
        setRemediation(rem);
        setTimeline(tl?.events || []);
      } catch (err) {
        console.error('Failed to load remediation detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Reconstructing remediation audit timeline..." />;
  }

  if (!remediation) {
    return (
      <div className="card text-center py-12">
        <AlertTriangle className="w-8 h-8 text-brand-amber mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">Remediation Record Not Found</h3>
        <p className="text-xs text-gray-400 mt-1">The specified execution ID does not exist in the platform registry.</p>
        <Link to="/remediations" className="btn-primary text-xs mt-4 inline-flex">
          Back to Remediations
        </Link>
      </div>
    );
  }

  const baselineKeys = Object.keys(remediation.baseline_metrics || {});
  const postKeys = Object.keys(remediation.post_metrics || {});
  const allMetricKeys = Array.from(new Set([...baselineKeys, ...postKeys]));

  const getStepColor = (eventType, statusAfter) => {
    if (eventType?.includes('fail') || eventType?.includes('blocked') || statusAfter === 'failed') {
      return {
        dot: 'bg-brand-red border-red-500 shadow-red-500/30',
        badge: 'text-brand-red bg-red-950/60 border-red-800',
      };
    }
    if (eventType?.includes('succeed') || eventType?.includes('pass') || statusAfter === 'succeeded') {
      return {
        dot: 'bg-brand-green border-emerald-500 shadow-emerald-500/30',
        badge: 'text-brand-green bg-emerald-950/60 border-emerald-800',
      };
    }
    if (eventType?.includes('rollback') || eventType?.includes('approval')) {
      return {
        dot: 'bg-brand-amber border-amber-500 shadow-amber-500/30',
        badge: 'text-brand-amber bg-amber-950/60 border-amber-800',
      };
    }
    return {
      dot: 'bg-brand-blue border-blue-500 shadow-blue-500/30',
      badge: 'text-brand-blue bg-blue-950/60 border-blue-800',
    };
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link to="/remediations" className="hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Remediations
        </Link>
        <ChevronRight className="w-3 h-3 text-gray-600" />
        <span className="font-mono text-gray-300">{remediation.id.substring(0, 8)}</span>
      </div>

      {/* Main Execution Header */}
      <div className="card p-6 bg-gradient-to-br from-dark-800 to-dark-900 border-gray-800 rounded-2xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-800/80">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusBadge status={remediation.status} />
              <span className="text-xs font-mono text-gray-400 bg-dark-950 px-2.5 py-1 rounded border border-gray-800">
                Remediation: {remediation.id}
              </span>
              <span className="text-xs font-mono text-gray-400 bg-dark-950 px-2.5 py-1 rounded border border-gray-800">
                Policy: {remediation.policy_version}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Workflow: {remediation.runbook_id || 'System Autonomous Runbook'}
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Incident Link:</span>
              <Link
                to={`/incidents/${remediation.incident_id}`}
                className="text-brand-blue hover:underline font-mono"
              >
                {remediation.incident_id}
              </Link>
            </div>
          </div>

          <div className="bg-dark-950 p-4 rounded-xl border border-gray-800 flex items-center gap-6 text-xs font-mono">
            <div>
              <span className="text-gray-400 block text-[10px] uppercase">Started</span>
              <span className="text-gray-200">
                {remediation.started_at
                  ? new Date(remediation.started_at).toLocaleTimeString()
                  : 'Queued'}
              </span>
            </div>
            <div className="border-l border-gray-800 pl-4">
              <span className="text-gray-400 block text-[10px] uppercase">Completed</span>
              <span className="text-gray-200">
                {remediation.completed_at
                  ? new Date(remediation.completed_at).toLocaleTimeString()
                  : 'In Flight'}
              </span>
            </div>
          </div>
        </div>

        {remediation.error_message && (
          <div className="mt-4 p-3 bg-red-950/70 border border-brand-red/80 rounded-xl text-xs text-red-200 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Execution Error / Blocked Rationale:</span>
              <p className="mt-0.5 font-mono text-[11px]">{remediation.error_message}</p>
            </div>
          </div>
        )}
      </div>

      {/* Baseline vs Post-Remediation Telemetry Delta Table */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <Activity className="w-4 h-4 text-brand-cyan" />
          Pre vs. Post Remediation Telemetry Comparison
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Verification gate compares pre-execution baseline metrics with post-execution observations to guarantee recovery.
        </p>

        {allMetricKeys.length === 0 ? (
          <div className="text-xs text-gray-500 py-4 text-center">
            No diagnostic metrics captured for this pipeline step.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-dark-900 text-gray-400 uppercase text-[10px] border-b border-gray-800">
                <tr>
                  <th className="py-2.5 px-3">Metric Attribute</th>
                  <th className="py-2.5 px-3">Baseline (Pre-Check)</th>
                  <th className="py-2.5 px-3">Post-Action (Post-Check)</th>
                  <th className="py-2.5 px-3">Delta / Evaluation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {allMetricKeys.map((k) => {
                  const bVal = remediation.baseline_metrics?.[k];
                  const pVal = remediation.post_metrics?.[k];
                  const isNum = typeof bVal === 'number' && typeof pVal === 'number';
                  const diff = isNum ? pVal - bVal : null;

                  return (
                    <tr key={k} className="hover:bg-dark-900/40">
                      <td className="py-2.5 px-3 font-semibold text-gray-300">{k}</td>
                      <td className="py-2.5 px-3 text-amber-300">
                        {bVal !== undefined ? JSON.stringify(bVal) : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-emerald-400">
                        {pVal !== undefined ? JSON.stringify(pVal) : '-'}
                      </td>
                      <td className="py-2.5 px-3">
                        {isNum ? (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                              diff < 0
                                ? 'bg-emerald-950 text-emerald-400'
                                : diff > 0
                                ? 'bg-amber-950 text-amber-400'
                                : 'text-gray-400'
                            }`}
                          >
                            {diff > 0 ? `+${diff.toFixed(1)}` : diff.toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-gray-500">State Normal</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Execution Results JSON Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Execution Result */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-brand-blue" />
              Execution Result
            </h3>
            <span className="text-[10px] font-mono text-gray-400">Output Payload</span>
          </div>
          <div className="bg-dark-950 rounded-xl p-3 border border-gray-900 font-mono text-xs text-blue-300 max-h-52 overflow-auto">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(remediation.execution_result || {}, null, 2)}
            </pre>
          </div>
        </div>

        {/* Verification Result */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-brand-green" />
              Verification Invariant Result
            </h3>
            <span className="text-[10px] font-mono text-gray-400">Health Gate</span>
          </div>
          <div className="bg-dark-950 rounded-xl p-3 border border-gray-900 font-mono text-xs text-emerald-300 max-h-52 overflow-auto">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(remediation.verification_result || {}, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Rollback Result if applicable */}
      {remediation.rollback_result && Object.keys(remediation.rollback_result).length > 0 && (
        <div className="card p-5 border-amber-900/60 bg-amber-950/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-brand-amber" />
              Compensating Rollback Procedure Result
            </h3>
            <span className="text-[10px] font-mono text-amber-400">Auto-Reversion</span>
          </div>
          <div className="bg-dark-950 rounded-xl p-3 border border-gray-900 font-mono text-xs text-amber-300 max-h-52 overflow-auto">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(remediation.rollback_result, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Vertical Stepper Timeline */}
      <div className="card p-6">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-blue" />
          Execution Audit Timeline ({timeline.length} Steps)
        </h3>

        {timeline.length === 0 ? (
          <div className="text-xs text-gray-400 py-6 text-center">
            No audit events captured for this remediation run.
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-800">
            {timeline.map((step, idx) => {
              const style = getStepColor(step.event_type, step.status_after);

              return (
                <div key={step.id || idx} className="relative group">
                  {/* Stepper Dot */}
                  <div
                    className={`absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full border-2 bg-dark-950 ${style.dot}`}
                  />

                  {/* Step content */}
                  <div className="bg-dark-900/70 p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-gray-200 uppercase">
                          {step.event_type?.replace(/_/g, ' ')}
                        </span>
                        {step.status_after && (
                          <StatusBadge status={step.status_after} />
                        )}
                      </div>

                      <span className="text-[11px] font-mono text-gray-400">
                        {step.timestamp
                          ? new Date(step.timestamp).toLocaleString([], {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>

                    {step.actor_id && (
                      <div className="text-[11px] text-gray-400 flex items-center gap-1 mb-1 font-mono">
                        <User className="w-3 h-3" /> Actor: {step.actor_id}
                      </div>
                    )}

                    {step.details && Object.keys(step.details).length > 0 && (
                      <div className="mt-2 bg-dark-950 p-2.5 rounded-lg border border-gray-900 font-mono text-[11px] text-gray-300 max-h-36 overflow-auto">
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify(step.details, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RemediationDetail;
