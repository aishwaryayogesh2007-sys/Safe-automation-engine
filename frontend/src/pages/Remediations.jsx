import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Zap,
  Filter,
  Eye,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { getRemediations } from '../services/api';
import StatusBadge from '../components/common/StatusBadge';
import RiskBadge from '../components/common/RiskBadge';
import Pagination from '../components/common/Pagination';
import EmptyState from '../components/common/EmptyState';

const Remediations = () => {
  const navigate = useNavigate();
  const [remediations, setRemediations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const fetchRemediationsList = useCallback(async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      params.skip = (currentPage - 1) * pageSize;
      params.limit = pageSize;

      const data = await getRemediations(params);
      setRemediations(data || []);
    } catch (err) {
      console.error('Failed to load remediations:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, currentPage]);

  useEffect(() => {
    setLoading(true);
    fetchRemediationsList();
  }, [fetchRemediationsList]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Autonomous Remediations
          </h2>
          <p className="text-xs text-gray-400">
            Pipeline traces, execution state transitions, and audit telemetry for all automated actions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRefreshing(true);
              fetchRemediationsList();
            }}
            disabled={refreshing}
            className="btn-ghost text-xs border border-gray-700 bg-dark-800"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-brand-blue' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card-sm bg-dark-900/80 border-gray-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Filter className="w-3.5 h-3.5" />
          <span>Status Filter:</span>
        </div>
        <div className="w-64">
          <select
            className="select text-xs py-2"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="evaluating">Evaluating Policy</option>
            <option value="awaiting_approval">Awaiting Approval</option>
            <option value="executing">Executing</option>
            <option value="verifying">Verifying</option>
            <option value="succeeded">Succeeded</option>
            <option value="rolling_back">Rolling Back</option>
            <option value="blocked">Blocked</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Remediations Table */}
      <div className="card p-0 overflow-hidden border border-gray-800">
        {loading ? (
          <div className="p-12 space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-dark-900 rounded-lg" />
            ))}
          </div>
        ) : remediations.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No remediation executions found"
            description="Remediation executions triggered by policy or operators will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-dark-900/90 text-gray-400 font-semibold border-b border-gray-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Remediation ID</th>
                  <th className="py-3 px-4">Incident ID</th>
                  <th className="py-3 px-4">Runbook Spec</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Trigger Mode</th>
                  <th className="py-3 px-4">Started At</th>
                  <th className="py-3 px-4">Completed At</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {remediations.map((rem) => (
                  <tr
                    key={rem.id}
                    className="hover:bg-dark-900/60 transition-colors cursor-pointer group"
                    onClick={() => navigate(`/remediations/${rem.id}`)}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-200 group-hover:text-brand-blue">
                      {rem.id.substring(0, 8)}...
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-400">
                      <Link
                        to={`/incidents/${rem.incident_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="hover:text-white underline text-[11px]"
                      >
                        {rem.incident_id.substring(0, 8)}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-300">
                      {rem.runbook_id ? `${rem.runbook_id} (v${rem.runbook_version})` : 'Auto-detected'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={rem.status} />
                    </td>
                    <td className="py-3.5 px-4 capitalize font-mono text-gray-400 text-[11px]">
                      {rem.triggered_by || 'Autonomous'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-400 text-[11px] whitespace-nowrap">
                      {rem.started_at
                        ? new Date(rem.started_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-400 text-[11px] whitespace-nowrap">
                      {rem.completed_at
                        ? new Date(rem.completed_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <Link
                        to={`/remediations/${rem.id}`}
                        className="btn-ghost py-1 px-2.5 text-xs text-brand-blue hover:text-white inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Trace</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalItems={remediations.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default Remediations;
