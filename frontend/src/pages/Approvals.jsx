import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  Check,
  X,
  Clock,
  ShieldAlert,
  AlertTriangle,
  RotateCcw,
  Zap,
  Filter,
  ExternalLink,
  Shield,
  FileCheck,
} from 'lucide-react';
import {
  getApprovals,
  approveAction,
  rejectAction,
  getRemediation,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/common/StatusBadge';
import RiskBadge from '../components/common/RiskBadge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

const Approvals = () => {
  const { isOperator, role } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'all'
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [completedApprovals, setCompletedApprovals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [decisionDialog, setDecisionDialog] = useState({
    isOpen: false,
    approvalId: null,
    action: 'approve', // 'approve' | 'reject'
    loading: false,
  });

  // Countdown timer trigger
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchApprovalsData = useCallback(async () => {
    try {
      const pending = await getApprovals({ status: 'pending' });
      setPendingApprovals(pending || []);

      const [approved, rejected] = await Promise.all([
        getApprovals({ status: 'approved' }).catch(() => []),
        getApprovals({ status: 'rejected' }).catch(() => []),
      ]);

      const completed = [...(approved || []), ...(rejected || [])].sort(
        (a, b) => new Date(b.requested_at) - new Date(a.requested_at)
      );
      setCompletedApprovals(completed);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchApprovalsData();
  }, [fetchApprovalsData]);

  const handleDecision = async (reason) => {
    const { approvalId, action } = decisionDialog;
    setDecisionDialog((prev) => ({ ...prev, loading: true }));

    try {
      if (action === 'approve') {
        await approveAction(approvalId, reason || 'Approved by operator via console');
        showToast('Approval granted. Remediation pipeline dispatched.', 'success');
      } else {
        await rejectAction(approvalId, reason || 'Rejected by operator via console');
        showToast('Remediation action rejected and cancelled.', 'warning');
      }
      setDecisionDialog({ isOpen: false, approvalId: null, action: 'approve', loading: false });
      fetchApprovalsData();
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Operation failed.';
      showToast(detail, 'error');
      setDecisionDialog((prev) => ({ ...prev, loading: false }));
    }
  };

  const getRemainingTime = (expiresAt) => {
    const exp = new Date(expiresAt).getTime();
    const diff = exp - now;
    if (diff <= 0) return { label: 'Expired', isExpired: true };
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return {
      label: `${mins}m ${secs < 10 ? '0' : ''}${secs}s`,
      isExpired: false,
    };
  };

  if (loading) {
    return <LoadingSpinner message="Checking operator approval queues..." />;
  }

  const allApprovals = [...pendingApprovals, ...completedApprovals];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Operator Approval Center</h2>
          <p className="text-xs text-gray-400">
            Mandatory human authorization gates for high-risk actions, cryptographic action hashes, and rate overrides
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-400 bg-dark-900 px-3 py-1.5 rounded-lg border border-gray-800">
            Queue Role: <span className="text-brand-blue uppercase font-bold">{role}</span>
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'border-brand-blue text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <span>Pending Approvals</span>
          {pendingApprovals.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-brand-amber text-dark-950 font-bold">
              {pendingApprovals.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'all'
              ? 'border-brand-blue text-white'
              : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <span>All Decision Records</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-800 text-gray-300">
            {allApprovals.length}
          </span>
        </button>
      </div>

      {/* Pending Approvals Grid */}
      {activeTab === 'pending' && (
        <div className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No pending approvals"
              description="All autonomous operations are within safe low-risk boundaries. No action required."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {pendingApprovals.map((app) => {
                const countdown = getRemainingTime(app.expires_at);

                return (
                  <div
                    key={app.id}
                    className="card p-5 bg-gradient-to-br from-dark-800 to-dark-900 border-amber-900/60 rounded-xl shadow-lg relative overflow-hidden"
                  >
                    {/* Top amber accent line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-amber via-brand-red to-brand-amber" />

                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <RiskBadge tier="high" size="small" />
                          <span className="text-[11px] font-mono text-gray-400">
                            v{app.runbook_version} &bull; Policy {app.policy_version}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white mt-1">
                          Approval Required: Runbook Action
                        </h3>
                      </div>

                      {/* Expiration Timer */}
                      <div
                        className={`text-xs font-mono px-2.5 py-1 rounded-lg border flex items-center gap-1.5 shrink-0 ${
                          countdown.isExpired
                            ? 'bg-red-950 text-red-300 border-red-800'
                            : 'bg-amber-950/80 text-amber-300 border-amber-800 animate-pulse'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{countdown.label}</span>
                      </div>
                    </div>

                    {/* Body details */}
                    <div className="space-y-2 text-xs py-2 border-y border-gray-800/80">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Remediation ID:</span>
                        <Link
                          to={`/remediations/${app.remediation_id}`}
                          className="font-mono text-brand-blue hover:underline"
                        >
                          {app.remediation_id.substring(0, 12)}...
                        </Link>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-400">Cryptographic Action Hash:</span>
                        <span className="font-mono text-gray-300 text-[11px]">
                          {app.action_hash ? `${app.action_hash.substring(0, 12)}...` : 'sha256'}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-400">Requested At:</span>
                        <span className="font-mono text-gray-400 text-[11px]">
                          {new Date(app.requested_at).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="mt-2 p-2.5 rounded bg-dark-950/80 border border-gray-900 text-[11px] text-gray-300">
                        <span className="text-amber-400 font-semibold block mb-0.5">
                          Safety Constraint Notice:
                        </span>
                        Execution involves elevated risk tier operations. Authorizing confirms acceptance of target blast radius and automated rollback criteria.
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <Link
                        to={`/remediations/${app.remediation_id}`}
                        className="text-xs text-brand-blue hover:underline flex items-center gap-1"
                      >
                        <span>Inspect Remediation</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>

                      {isOperator ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              setDecisionDialog({
                                isOpen: true,
                                approvalId: app.id,
                                action: 'reject',
                                loading: false,
                              })
                            }
                            className="btn-danger text-xs py-1.5 px-3"
                          >
                            <X className="w-3.5 h-3.5" /> Reject
                          </button>
                          <button
                            onClick={() =>
                              setDecisionDialog({
                                isOpen: true,
                                approvalId: app.id,
                                action: 'approve',
                                loading: false,
                              })
                            }
                            className="btn-success text-xs py-1.5 px-3"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500 italic">Operator authorization required</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Completed / All Approvals Tab */}
      {activeTab === 'all' && (
        <div className="card p-0 overflow-hidden border border-gray-800">
          {allApprovals.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No approval records logged"
              description="All approval events will be indexed here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-dark-900 text-gray-400 uppercase text-[10px] border-b border-gray-800">
                  <tr>
                    <th className="py-3 px-4">Approval ID</th>
                    <th className="py-3 px-4">Remediation</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Decided By</th>
                    <th className="py-3 px-4">Decision Reason</th>
                    <th className="py-3 px-4">Requested At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {allApprovals.map((item) => (
                    <tr key={item.id} className="hover:bg-dark-900/40">
                      <td className="py-3 px-4 font-bold text-gray-200">
                        {item.id.substring(0, 8)}...
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          to={`/remediations/${item.remediation_id}`}
                          className="text-brand-blue hover:underline"
                        >
                          {item.remediation_id.substring(0, 8)}
                        </Link>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {item.approved_by || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-400 max-w-xs truncate font-sans">
                        {item.reason || '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-400 whitespace-nowrap">
                        {new Date(item.requested_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Decision Confirm Dialog */}
      <ConfirmDialog
        isOpen={decisionDialog.isOpen}
        title={decisionDialog.action === 'approve' ? 'Authorize High-Risk Action' : 'Reject Remediation Action'}
        message={
          decisionDialog.action === 'approve'
            ? 'You are about to authorize an elevated risk remediation. The action hash will be validated against active policy.'
            : 'Rejecting this request will immediately cancel the remediation pipeline and record an audit rejection trail.'
        }
        confirmText={decisionDialog.action === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
        variant={decisionDialog.action === 'approve' ? 'success' : 'danger'}
        requireReason={true}
        reasonPlaceholder={
          decisionDialog.action === 'approve'
            ? 'e.g. Target health confirmed, operator on-call approving action.'
            : 'e.g. Inopportune timing, manual remediation preferred.'
        }
        loading={decisionDialog.loading}
        onConfirm={handleDecision}
        onCancel={() =>
          setDecisionDialog({ isOpen: false, approvalId: null, action: 'approve', loading: false })
        }
      />
    </div>
  );
};

export default Approvals;
