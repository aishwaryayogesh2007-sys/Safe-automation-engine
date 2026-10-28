import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Zap,
  Eye,
  RefreshCw,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { getIncidents, createIncident, createRemediation, getRunbooks } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/common/StatusBadge';
import RiskBadge from '../components/common/RiskBadge';
import Pagination from '../components/common/Pagination';
import EmptyState from '../components/common/EmptyState';
import ConfirmDialog from '../components/common/ConfirmDialog';

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

const INCIDENT_TYPES = [
  'high_cpu',
  'memory_leak',
  'disk_pressure',
  'connection_spike',
  'stale_worker',
  'cert_expiry_warning',
  'queue_backlog',
  'slow_queries',
];

const Incidents = () => {
  const { isOperator } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // New incident modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [runbooks, setRunbooks] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    severity: 'medium',
    incident_type: 'high_cpu',
    affected_service: 'api-gateway',
    affected_target: 'pod-api-gateway-0',
    assigned_runbook_id: '',
  });

  // Remediate confirm dialog
  const [remediateDialog, setRemediateDialog] = useState({
    isOpen: false,
    incident: null,
    loading: false,
  });

  const fetchIncidentsList = useCallback(async () => {
    try {
      const params = {};
      if (severityFilter) params.severity = severityFilter;
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();
      params.skip = (currentPage - 1) * pageSize;
      params.limit = pageSize;

      const data = await getIncidents(params);
      setIncidents(data || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch incidents', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [severityFilter, statusFilter, search, currentPage, showToast]);

  useEffect(() => {
    setLoading(true);
    fetchIncidentsList();
  }, [fetchIncidentsList]);

  // Load runbooks for modal selection
  useEffect(() => {
    if (isModalOpen && runbooks.length === 0) {
      getRunbooks().then(setRunbooks).catch(console.error);
    }
  }, [isModalOpen, runbooks.length]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      showToast('Title is required', 'warning');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        severity: form.severity,
        incident_type: form.incident_type,
        affected_service: form.affected_service,
        affected_target: form.affected_target || `${form.affected_service}-0`,
        assigned_runbook_id: form.assigned_runbook_id || undefined,
        metrics_snapshot: {
          timestamp: new Date().toISOString(),
          simulated: true,
        },
      };

      const newInc = await createIncident(payload);
      showToast(`Incident "${newInc.title}" registered successfully`, 'success');
      setIsModalOpen(false);
      setForm({
        title: '',
        description: '',
        severity: 'medium',
        incident_type: 'high_cpu',
        affected_service: 'api-gateway',
        affected_target: 'pod-api-gateway-0',
        assigned_runbook_id: '',
      });
      fetchIncidentsList();
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Failed to create incident.';
      showToast(detail, 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleTriggerRemediation = async () => {
    const inc = remediateDialog.incident;
    if (!inc) return;

    setRemediateDialog((prev) => ({ ...prev, loading: true }));
    try {
      const res = await createRemediation({
        incident_id: inc.id,
        runbook_id: inc.assigned_runbook_id || undefined,
      });
      showToast(`Remediation triggered: status is ${res.status}`, 'success');
      setRemediateDialog({ isOpen: false, incident: null, loading: false });
      fetchIncidentsList();
      navigate(`/remediations/${res.id}`);
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Failed to dispatch remediation.';
      showToast(detail, 'error');
      setRemediateDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Active & Historical Incidents</h2>
          <p className="text-xs text-gray-400">
            Detected infrastructure anomalies, fault triggers, and remediation assignments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchIncidentsList();
            }}
            disabled={refreshing}
            className="btn-ghost text-xs border border-gray-700 bg-dark-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-blue' : ''}`} />
            <span>Refresh</span>
          </button>
          {isOperator && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn-primary text-xs shadow-md shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>New Incident</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-sm bg-dark-900/80 border-gray-800 flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            className="input pl-9 text-xs py-2"
            placeholder="Search by title, description, or service..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Severity Filter */}
        <div className="w-full md:w-44">
          <select
            className="select text-xs py-2"
            value={severityFilter}
            onChange={(e) => {
              setSeverityFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-48">
          <select
            className="select text-xs py-2"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="detected">Detected</option>
            <option value="evaluating">Evaluating</option>
            <option value="awaiting_approval">Awaiting Approval</option>
            <option value="executing">Executing</option>
            <option value="verifying">Verifying</option>
            <option value="succeeded">Succeeded</option>
            <option value="blocked">Blocked</option>
            <option value="escalated">Escalated</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="card p-0 overflow-hidden border border-gray-800">
        {loading ? (
          <div className="p-12">
            <div className="space-y-4 animate-pulse">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-10 bg-dark-900 rounded-lg" />
              ))}
            </div>
          </div>
        ) : incidents.length === 0 ? (
          <EmptyState
            icon={AlertTriangle}
            title="No incidents matched your query"
            description="Try modifying search keywords or clearing status/severity filters."
            action={
              isOperator && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="btn-primary text-xs mt-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Register Incident
                </button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-900/90 text-gray-400 font-semibold border-b border-gray-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-4">Title & Description</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Affected Target</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Detected At</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {incidents.map((inc) => (
                  <tr
                    key={inc.id}
                    className="hover:bg-dark-900/60 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/incidents/${inc.id}`)}
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <RiskBadge tier={inc.severity} size="small" />
                    </td>
                    <td className="py-3.5 px-4 min-w-[200px] max-w-xs">
                      <div className="font-semibold text-gray-200 group-hover:text-brand-blue transition-colors">
                        {inc.title}
                      </div>
                      {inc.description && (
                        <div className="text-gray-400 text-[11px] truncate mt-0.5">
                          {inc.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-300">
                      {inc.incident_type}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-gray-200 text-[11px]">
                        {inc.affected_service}
                      </div>
                      <div className="font-mono text-gray-400 text-[10px]">
                        {inc.affected_target}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={inc.status} />
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-gray-400 font-mono text-[11px]">
                      {new Date(inc.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td
                      className="py-3.5 px-4 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {isOperator && inc.status !== 'succeeded' && inc.status !== 'executing' && (
                          <button
                            onClick={() =>
                              setRemediateDialog({
                                isOpen: true,
                                incident: inc,
                                loading: false,
                              })
                            }
                            title="Trigger Remediation"
                            className="px-2 py-1 bg-brand-blue/20 hover:bg-brand-blue/30 text-brand-blue border border-brand-blue/40 rounded text-[11px] font-medium flex items-center gap-1 transition-colors"
                          >
                            <Zap className="w-3 h-3" /> Remediate
                          </button>
                        )}
                        <Link
                          to={`/incidents/${inc.id}`}
                          className="p-1 rounded text-gray-400 hover:text-white hover:bg-dark-800 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={incidents.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* New Incident Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-dark-800 border border-gray-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-brand-amber" />
                Register New Operational Incident
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 mt-4 text-xs">
              <div>
                <label className="block font-medium text-gray-300 mb-1">
                  Incident Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Memory Spike in queue-processor"
                  className="input"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Observed anomalous metric patterns or degraded response times..."
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-300 mb-1">Severity</label>
                  <select
                    className="select"
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-gray-300 mb-1">Incident Type</label>
                  <select
                    className="select"
                    value={form.incident_type}
                    onChange={(e) => setForm({ ...form, incident_type: e.target.value })}
                  >
                    {INCIDENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-gray-300 mb-1">Affected Service</label>
                  <select
                    className="select"
                    value={form.affected_service}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        affected_service: e.target.value,
                        affected_target: `${e.target.value}-0`,
                      })
                    }
                  >
                    {SERVICES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-gray-300 mb-1">Affected Target Pod / Host</label>
                  <input
                    type="text"
                    required
                    className="input font-mono"
                    value={form.affected_target}
                    onChange={(e) => setForm({ ...form, affected_target: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-gray-300 mb-1">
                  Assigned Runbook (Optional - auto-matches if blank)
                </label>
                <select
                  className="select font-mono"
                  value={form.assigned_runbook_id}
                  onChange={(e) => setForm({ ...form, assigned_runbook_id: e.target.value })}
                >
                  <option value="">-- Automatic matching by incident type --</option>
                  {runbooks.map((rb) => (
                    <option key={rb.id} value={rb.id}>
                      {rb.name} (v{rb.version}) [{rb.risk_tier}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-ghost"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary shadow-md shadow-blue-500/20"
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Register Incident</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Trigger Remediation Confirm Dialog */}
      <ConfirmDialog
        isOpen={remediateDialog.isOpen}
        title="Dispatch Autonomous Remediation"
        message={`Are you sure you want to execute remediation for "${remediateDialog.incident?.title}"? Policy guardrails, rate limits, and approval rules will be automatically verified.`}
        confirmText="Trigger Remediation"
        variant="primary"
        loading={remediateDialog.loading}
        onConfirm={handleTriggerRemediation}
        onCancel={() => setRemediateDialog({ isOpen: false, incident: null, loading: false })}
      />
    </div>
  );
};

export default Incidents;
