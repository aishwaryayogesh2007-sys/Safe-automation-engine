import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Calendar,
  Lock,
  X,
  ExternalLink,
} from 'lucide-react';
import { getAuditLogs } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import RiskBadge from '../components/common/RiskBadge';
import Pagination from '../components/common/Pagination';
import EmptyState from '../components/common/EmptyState';

const EVENT_TYPES = [
  'auth_login_success',
  'auth_login_failed',
  'incident_created',
  'remediation_started',
  'remediation_executed',
  'remediation_succeeded',
  'remediation_failed',
  'remediation_blocked',
  'verification_passed',
  'verification_failed',
  'rollback_executed',
  'approval_requested',
  'approval_granted',
  'approval_rejected',
  'kill_switch_activated',
  'kill_switch_deactivated',
  'simulation_triggered',
];

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [remediationIdSearch, setRemediationIdSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const fetchLogs = useCallback(async () => {
    try {
      const params = {};
      if (eventTypeFilter) params.event_type = eventTypeFilter;
      if (remediationIdSearch.trim()) params.remediation_id = remediationIdSearch.trim();
      params.skip = (currentPage - 1) * pageSize;
      params.limit = pageSize;

      const data = await getAuditLogs(params);
      setLogs(data || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventTypeFilter, remediationIdSearch, currentPage]);

  useEffect(() => {
    setLoading(true);
    fetchLogs();
  }, [fetchLogs]);

  const toggleExpand = (id) => {
    setExpandedRow((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Tamper-Evident Audit Trail
          </h2>
          <p className="text-xs text-gray-400">
            Append-only cryptographic record of system lifecycle events, decisions, and guardrail actions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchLogs();
            }}
            disabled={refreshing}
            className="btn-ghost text-xs border border-gray-700 bg-dark-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-blue' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        </div>
      </div>

      {/* Compliance Notice Banner */}
      <div className="p-4 rounded-xl bg-dark-900/90 border border-gray-800 flex items-start gap-3">
        <Lock className="w-5 h-5 text-brand-cyan shrink-0 mt-0.5" />
        <div className="text-xs text-gray-300 leading-relaxed">
          <span className="font-semibold text-white">Append-Only Assurance: </span>
          Audit records are append-only in the application layer. Every entry logs timestamp, actor identity, action hashes, and state transitions. For cryptographic tamper-evidence, integrate an immutable audit backend.
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="card-sm bg-dark-900/80 border-gray-800 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            className="input pl-9 text-xs py-2 font-mono"
            placeholder="Search by Remediation ID..."
            value={remediationIdSearch}
            onChange={(e) => {
              setRemediationIdSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
          {remediationIdSearch && (
            <button
              onClick={() => setRemediationIdSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="w-full sm:w-64">
          <select
            className="select text-xs py-2"
            value={eventTypeFilter}
            onChange={(e) => {
              setEventTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Event Types</option>
            {EVENT_TYPES.map((et) => (
              <option key={et} value={et}>
                {et.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="card p-0 overflow-hidden border border-gray-800">
        {loading ? (
          <div className="p-12 space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-dark-900 rounded-lg" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No audit events matched"
            description="Clear filters or execute actions to generate audit events."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-dark-900/90 text-gray-400 font-semibold border-b border-gray-800 uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Incident ID</th>
                  <th className="py-3 px-4">Remediation ID</th>
                  <th className="py-3 px-4">State Transition</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {logs.map((log) => {
                  const isExpanded = expandedRow === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => toggleExpand(log.id)}
                        className={`hover:bg-dark-900/60 transition-colors cursor-pointer ${
                          isExpanded ? 'bg-dark-900/80' : ''
                        }`}
                      >
                        <td className="py-3 px-4 text-gray-400 whitespace-nowrap text-[11px]">
                          {new Date(log.timestamp).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap font-bold text-gray-200">
                          {log.event_type}
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-[11px]">
                          {log.actor_id || 'system:engine'}
                        </td>
                        <td className="py-3 px-4 text-gray-400 text-[11px]">
                          {log.incident_id ? log.incident_id.substring(0, 8) : '-'}
                        </td>
                        <td className="py-3 px-4 text-brand-blue text-[11px]">
                          {log.remediation_id ? log.remediation_id.substring(0, 8) : '-'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {log.status_before || log.status_after ? (
                            <div className="flex items-center gap-1.5 font-sans">
                              {log.status_before && <StatusBadge status={log.status_before} />}
                              {log.status_before && log.status_after && <span>&rarr;</span>}
                              {log.status_after && <StatusBadge status={log.status_after} />}
                            </div>
                          ) : (
                            <span className="text-gray-500 font-mono text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            className="p-1 rounded text-gray-400 hover:text-white"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable JSON Row */}
                      {isExpanded && (
                        <tr className="bg-dark-950/90 border-b border-gray-800">
                          <td colSpan={7} className="p-4 font-mono text-xs text-gray-300">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-gray-400 text-[11px]">
                                <span>Event ID: {log.id}</span>
                                <span>Policy: {log.policy_version || 'v1.0'}</span>
                              </div>
                              <div className="bg-dark-900 p-3 rounded-lg border border-gray-800 overflow-auto max-h-56 text-emerald-400">
                                <pre className="whitespace-pre-wrap">
                                  {JSON.stringify(
                                    {
                                      id: log.id,
                                      event_type: log.event_type,
                                      timestamp: log.timestamp,
                                      actor_id: log.actor_id,
                                      incident_id: log.incident_id,
                                      remediation_id: log.remediation_id,
                                      approval_id: log.approval_id,
                                      status_before: log.status_before,
                                      status_after: log.status_after,
                                      details: log.details,
                                    },
                                    null,
                                    2
                                  )}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={logs.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default AuditLogs;
