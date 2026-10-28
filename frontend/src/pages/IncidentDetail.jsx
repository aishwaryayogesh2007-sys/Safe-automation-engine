import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Zap,
  Server,
  BookOpen,
  ChevronRight,
  Loader2,
  FileCode,
  FileText,
} from 'lucide-react';
import {
  getIncident,
  getRemediations,
  getRunbooks,
  createRemediation,
  getAuditLogs,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/common/StatusBadge';
import RiskBadge from '../components/common/RiskBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

const IncidentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOperator } = useAuth();
  const { showToast } = useToast();

  const [incident, setIncident] = useState(null);
  const [remediations, setRemediations] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [runbooks, setRunbooks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Remediation modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRunbookId, setSelectedRunbookId] = useState('');
  const [triggering, setTriggering] = useState(false);

  const fetchDetails = useCallback(async () => {
    try {
      const [incData, remsData, auditData] = await Promise.all([
        getIncident(id),
        getRemediations({ incident_id: id }),
        getAuditLogs({ incident_id: id }),
      ]);
      setIncident(incData);
      setRemediations(remsData || []);
      setAuditEvents(auditData || []);
      setSelectedRunbookId(incData.assigned_runbook_id || '');
    } catch (err) {
      console.error(err);
      showToast('Failed to load incident detail', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const handleOpenRemediationModal = async () => {
    if (runbooks.length === 0) {
      try {
        const rbs = await getRunbooks();
        setRunbooks(rbs || []);
      } catch (err) {
        console.error(err);
      }
    }
    setIsModalOpen(true);
  };

  const handleExecuteRemediation = async () => {
    setTriggering(true);
    try {
      const res = await createRemediation({
        incident_id: id,
        runbook_id: selectedRunbookId || undefined,
      });
      showToast(`Remediation pipeline started (${res.status})`, 'success');
      setIsModalOpen(false);
      navigate(`/remediations/${res.id}`);
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Failed to dispatch remediation.';
      showToast(detail, 'error');
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading incident diagnostic context..." />;
  }

  if (!incident) {
    return (
      <div className="card text-center py-12">
        <AlertTriangle className="w-8 h-8 text-brand-amber mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">Incident Not Found</h3>
        <p className="text-xs text-gray-400 mt-1">The incident requested does not exist or was deleted.</p>
        <Link to="/incidents" className="btn-primary text-xs mt-4 inline-flex">
          Back to Incidents
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link to="/incidents" className="hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Incidents
        </Link>
        <ChevronRight className="w-3 h-3 text-gray-600" />
        <span className="font-mono text-gray-300">{incident.id.substring(0, 8)}</span>
      </div>

      {/* Incident Header Card */}
      <div className="card p-6 bg-dark-800 border-gray-800 rounded-2xl shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-gray-800/80">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <RiskBadge tier={incident.severity} />
              <StatusBadge status={incident.status} />
              <span className="text-xs font-mono text-gray-400 bg-dark-900 px-2 py-0.5 rounded border border-gray-800">
                ID: {incident.id}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              {incident.title}
            </h1>
            {incident.description && (
              <p className="text-xs sm:text-sm text-gray-300 max-w-3xl leading-relaxed">
                {incident.description}
              </p>
            )}
          </div>

          {/* Action button */}
          <div className="flex items-center gap-3 self-start lg:self-center">
            {isOperator && (
              <button
                onClick={handleOpenRemediationModal}
                className="btn-primary text-xs shadow-lg shadow-blue-500/20"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Submit for Remediation</span>
              </button>
            )}
          </div>
        </div>

        {/* Target and Timing Meta Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 text-xs">
          <div>
            <span className="text-gray-400 block mb-1">Affected Service</span>
            <div className="flex items-center gap-1.5 font-mono font-semibold text-gray-200">
              <Server className="w-3.5 h-3.5 text-brand-blue" />
              <span>{incident.affected_service}</span>
            </div>
          </div>

          <div>
            <span className="text-gray-400 block mb-1">Target Pod / Node</span>
            <div className="font-mono font-semibold text-gray-200">
              {incident.affected_target}
            </div>
          </div>

          <div>
            <span className="text-gray-400 block mb-1">Incident Type</span>
            <div className="font-mono text-brand-cyan">
              {incident.incident_type}
            </div>
          </div>

          <div>
            <span className="text-gray-400 block mb-1">Created At</span>
            <div className="font-mono text-gray-300">
              {new Date(incident.created_at).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Assigned Runbook and Telemetry row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Runbook Binding Card */}
        <div className="card p-5 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-brand-purple" />
              Assigned Runbook
            </h3>
            {incident.assigned_runbook_id && (
              <Link
                to={`/runbooks/${incident.assigned_runbook_id}`}
                className="text-xs text-brand-blue hover:underline"
              >
                Inspect
              </Link>
            )}
          </div>

          {incident.assigned_runbook_id ? (
            <div className="p-4 rounded-xl bg-dark-900 border border-gray-800 space-y-2 text-xs">
              <div className="font-semibold text-gray-200">
                Runbook ID: <span className="font-mono text-brand-blue">{incident.assigned_runbook_id}</span>
              </div>
              <p className="text-gray-400 text-[11px]">
                Matches incident classification pattern. Policy will enforce idempotency and blast radius limits prior to execution.
              </p>
              <Link
                to={`/runbooks/${incident.assigned_runbook_id}`}
                className="inline-flex items-center gap-1 text-brand-purple hover:underline text-[11px] font-medium pt-1"
              >
                View Runbook Criteria &rarr;
              </Link>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-900/60 text-amber-300 text-xs">
              <p className="font-semibold mb-1">No Runbook Bound</p>
              <p className="text-[11px] text-amber-400/90">
                This incident has escalated to operator review because no automated runbook matches the incident type.
              </p>
            </div>
          )}
        </div>

        {/* Telemetry Snapshot JSON Viewer */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileCode className="w-4 h-4 text-brand-cyan" />
              Diagnostic Metrics Snapshot
            </h3>
            <span className="text-[11px] font-mono text-gray-400">JSON Payload</span>
          </div>
          <div className="bg-dark-950 rounded-xl p-4 border border-gray-900 font-mono text-xs text-emerald-400 max-h-52 overflow-auto">
            <pre className="whitespace-pre-wrap">
              {JSON.stringify(incident.metrics_snapshot || {}, null, 2)}
            </pre>
          </div>
        </div>
      </div>

      {/* Associated Remediations List */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-brand-blue" />
            Remediation Executions ({remediations.length})
          </h3>
          {isOperator && (
            <button
              onClick={handleOpenRemediationModal}
              className="text-xs text-brand-blue hover:underline"
            >
              + Dispatch Remediation
            </button>
          )}
        </div>

        {remediations.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400">
            No remediation runs have been initiated for this incident yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-gray-400 font-semibold border-b border-gray-800 text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3">Remediation ID</th>
                  <th className="py-2.5 px-3">Runbook</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Triggered By</th>
                  <th className="py-2.5 px-3">Started</th>
                  <th className="py-2.5 px-3">Completed</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {remediations.map((rem) => (
                  <tr key={rem.id} className="hover:bg-dark-900/40">
                    <td className="py-3 px-3 font-mono text-gray-300">
                      {rem.id.substring(0, 8)}...
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-400">
                      v{rem.runbook_version}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={rem.status} />
                    </td>
                    <td className="py-3 px-3 text-gray-400">
                      {rem.triggered_by || 'autonomous'}
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-400">
                      {rem.started_at
                        ? new Date(rem.started_at).toLocaleTimeString()
                        : '-'}
                    </td>
                    <td className="py-3 px-3 font-mono text-gray-400">
                      {rem.completed_at
                        ? new Date(rem.completed_at).toLocaleTimeString()
                        : '-'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to={`/remediations/${rem.id}`}
                        className="text-brand-blue hover:underline font-medium"
                      >
                        Trace &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Incident Audit Events */}
      <div className="card p-5">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-brand-cyan" />
          Incident Audit History ({auditEvents.length})
        </h3>
        {auditEvents.length === 0 ? (
          <div className="text-center py-6 text-xs text-gray-400">
            No audit records linked directly to this incident.
          </div>
        ) : (
          <div className="space-y-2">
            {auditEvents.map((evt) => (
              <div
                key={evt.id}
                className="p-3 rounded-lg bg-dark-900 border border-gray-800 flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <span className="font-bold text-gray-200 uppercase">{evt.event_type}</span>
                  <span className="text-gray-400 text-[11px] block mt-0.5">
                    Actor: {evt.actor_id || 'system'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {evt.status_after && <StatusBadge status={evt.status_after} />}
                  <span className="text-gray-400 text-[11px]">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Select Runbook & Remediation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-dark-800 border border-gray-800 rounded-2xl shadow-2xl p-6">
            <h3 className="text-base font-bold text-white flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-brand-blue" />
              Dispatch Remediation
            </h3>
            <p className="text-xs text-gray-400 mb-4">
              Select a safe runbook definition to execute against target{' '}
              <span className="font-mono text-gray-200">{incident.affected_target}</span>.
            </p>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-gray-300 mb-1">
                  Target Runbook
                </label>
                <select
                  className="select font-mono"
                  value={selectedRunbookId}
                  onChange={(e) => setSelectedRunbookId(e.target.value)}
                >
                  <option value="">-- Choose runbook --</option>
                  {runbooks.map((rb) => (
                    <option key={rb.id} value={rb.id}>
                      {rb.name} (Risk: {rb.risk_tier}, v{rb.version})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-dark-900 rounded-xl border border-gray-800 text-[11px] text-gray-400 space-y-1">
                <p className="font-semibold text-gray-300">Safety Guardrails:</p>
                <p>&bull; Preconditions verified against live cluster state</p>
                <p>&bull; High risk actions will require human operator sign-off</p>
                <p>&bull; Rollback procedure executed if post-check verifications fail</p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-ghost"
                  disabled={triggering}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRemediation}
                  disabled={triggering || !selectedRunbookId}
                  className="btn-primary"
                >
                  {triggering && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Execute Pipeline</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentDetail;
