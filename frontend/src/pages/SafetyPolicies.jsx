import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  AlertOctagon,
  Power,
  RotateCcw,
  CheckCircle2,
  Lock,
  Sliders,
  Check,
  AlertTriangle,
  FileCode,
  Flame,
  Radio,
  FileText,
} from 'lucide-react';
import {
  getPolicies,
  getKillSwitch,
  activateKillSwitch,
  deactivateKillSwitch,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';

const SafetyPolicies = () => {
  const { isAdmin, role } = useAuth();
  const { showToast } = useToast();

  const [policy, setPolicy] = useState(null);
  const [killSwitch, setKillSwitch] = useState({
    kill_switch_active: false,
    activated_by: null,
    activated_at: null,
    reason: null,
  });
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    action: 'activate', // 'activate' | 'deactivate'
    loading: false,
  });

  const fetchPolicyData = useCallback(async () => {
    try {
      const [policyData, ksData] = await Promise.all([
        getPolicies().catch(() => null),
        getKillSwitch(),
      ]);
      setPolicy(policyData);
      setKillSwitch(ksData);
    } catch (err) {
      console.error('Failed to load policy data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPolicyData();
  }, [fetchPolicyData]);

  const handleToggleKillSwitch = async (reason) => {
    const isActivating = dialogState.action === 'activate';
    setDialogState((prev) => ({ ...prev, loading: true }));

    try {
      if (isActivating) {
        await activateKillSwitch(reason || 'Emergency halt initiated by Administrator');
        showToast('EMERGENCY KILL SWITCH ACTIVATED. All autonomous remediations halted.', 'error');
      } else {
        await deactivateKillSwitch();
        showToast('Kill switch deactivated. Autonomous safety policy restored.', 'success');
      }
      setDialogState({ isOpen: false, action: 'activate', loading: false });
      fetchPolicyData();
    } catch (err) {
      console.error(err);
      const detail = err.response?.data?.detail || 'Kill switch operation failed.';
      showToast(detail, 'error');
      setDialogState((prev) => ({ ...prev, loading: false }));
    }
  };

  if (loading) {
    return <LoadingSpinner message="Auditing active safety guardrails and policy configuration..." />;
  }

  const isKSActive = Boolean(killSwitch.kill_switch_active);
  const rules = policy?.rules || {};

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Safety Guardrails & Emergency Controls
          </h2>
          <p className="text-xs text-gray-400">
            Fail-closed invariant enforcement, rate limiting blast radius, and emergency platform halt
          </p>
        </div>
        <div className="text-xs font-mono text-gray-400 bg-dark-900 px-3 py-1.5 rounded-lg border border-gray-800">
          User Privilege: <span className="text-brand-blue uppercase font-bold">{role}</span>
        </div>
      </div>

      {/* KILL SWITCH STATUS CARD */}
      <div
        className={`card p-6 rounded-2xl border transition-all duration-300 ${
          isKSActive
            ? 'bg-gradient-to-r from-red-950/80 via-dark-900 to-red-950/80 border-brand-red glow-red'
            : 'bg-gradient-to-r from-dark-800 via-dark-900 to-dark-800 border-gray-800'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-5">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border ${
                isKSActive
                  ? 'bg-brand-red text-white border-red-400 shadow-xl shadow-red-600/40 animate-pulse'
                  : 'bg-emerald-950 text-brand-green border-emerald-800/80'
              }`}
            >
              <AlertOctagon className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-xs font-mono font-extrabold uppercase px-2.5 py-0.5 rounded ${
                    isKSActive
                      ? 'bg-brand-red text-white'
                      : 'bg-emerald-900/60 text-emerald-400 border border-emerald-800'
                  }`}
                >
                  {isKSActive ? 'KILL SWITCH ENGAGED' : 'NORMAL ENFORCEMENT'}
                </span>
                <span className="text-xs font-mono text-gray-400">
                  Policy: {policy?.version || 'v1.0'}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {isKSActive
                  ? 'Autonomous Operations Globally Suspended'
                  : 'Autonomous Remediation Engine Active & Armed'}
              </h3>

              <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
                {isKSActive
                  ? `Halted by ${killSwitch.activated_by || 'admin'} at ${
                      killSwitch.activated_at
                        ? new Date(killSwitch.activated_at).toLocaleString()
                        : 'recent timestamp'
                    }. Reason: "${killSwitch.reason || 'Manual emergency stop'}"`
                  : 'Autonomous remediations execute within verified preconditions. In case of unexpected anomalies, engage the emergency kill switch to immediately freeze all remediation workers.'}
              </p>
            </div>
          </div>

          {/* Action button */}
          <div className="flex items-center gap-3 self-start lg:self-center shrink-0">
            {isAdmin ? (
              isKSActive ? (
                <button
                  type="button"
                  onClick={() => setDialogState({ isOpen: true, action: 'deactivate', loading: false })}
                  className="btn-success text-xs py-2.5 px-4 shadow-lg shadow-emerald-500/20"
                >
                  <Power className="w-4 h-4" />
                  <span>Deactivate Kill Switch</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setDialogState({ isOpen: true, action: 'activate', loading: false })}
                  className="btn-danger text-xs py-2.5 px-4 shadow-lg shadow-red-500/30"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>Activate Emergency Kill Switch</span>
                </button>
              )
            ) : (
              <span className="text-xs text-gray-500 italic p-2 border border-gray-800 rounded bg-dark-900">
                Administrator credentials required to toggle kill switch
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Safety Policy Rules & Guardrails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Policy Rules */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand-blue" />
              Active Policy Specification ({policy?.version || 'v1.0'})
            </h3>
            <span className="text-[11px] font-mono text-brand-green bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              Active
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Rate Limits */}
            <div className="p-3 rounded-xl bg-dark-900 border border-gray-800">
              <span className="font-semibold text-gray-200 block mb-1">
                Rate Limiting & Cooldown Guardrails
              </span>
              <div className="grid grid-cols-2 gap-2 text-gray-400 font-mono text-[11px] mt-2">
                <div>Max runs per runbook/hr: <span className="text-white">5</span></div>
                <div>Global cooldown: <span className="text-white">60s</span></div>
                <div>Max concurrent remediations: <span className="text-white">3</span></div>
                <div>Approval timeout: <span className="text-white">300s</span></div>
              </div>
            </div>

            {/* Blast Radius */}
            <div className="p-3 rounded-xl bg-dark-900 border border-gray-800">
              <span className="font-semibold text-gray-200 block mb-1">
                Blast Radius & Scope Restrictions
              </span>
              <p className="text-gray-400 leading-relaxed">
                Remediations are strictly bound to target single node/pod instances. Operations altering cluster control planes or multi-tenant networks fail policy validation.
              </p>
            </div>

            {/* Allowed Runbook Classes */}
            <div className="p-3 rounded-xl bg-dark-900 border border-gray-800">
              <span className="font-semibold text-gray-200 block mb-1">
                Runbook Allowlist Enforcement
              </span>
              <p className="text-gray-400 leading-relaxed">
                Only cryptographic runbook versions registered in the declarative catalog with pre-verified checksums are executed. Unregistered script execution is strictly forbidden.
              </p>
            </div>
          </div>
        </div>

        {/* Safety Guarantees & Invariants */}
        <div className="card p-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-brand-green" />
            Core Architectural Safety Guarantees
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-dark-900 border border-gray-800">
              <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-gray-200">No Arbitrary Command Execution</span>
                <p className="text-gray-400 mt-0.5">
                  The engine exclusively invokes pre-compiled declarative handler routines with strict schema typing. No arbitrary bash, shell, or remote execution is permitted.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-dark-900 border border-gray-800">
              <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-gray-200">Precondition & Verification Invariants</span>
                <p className="text-gray-400 mt-0.5">
                  Every runbook enforces pre-execution preconditions and post-execution verification gates. If verification fails, automated rollback triggers fail-closed.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-dark-900 border border-gray-800">
              <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-gray-200">Fail-Closed & Operator In-The-Loop</span>
                <p className="text-gray-400 mt-0.5">
                  High-risk actions require dual authorization by an operator with cryptographic action hashes. Expired or unconfirmed actions default to cancellation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-dark-900 border border-gray-800">
              <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-gray-200">Immutable Audit Trail</span>
                <p className="text-gray-400 mt-0.5">
                  All state transitions, policy checks, approvals, and rollback results are persisted in an append-only audit stream.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Toggle */}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        title={dialogState.action === 'activate' ? 'ACTIVATE EMERGENCY KILL SWITCH' : 'Deactivate Kill Switch'}
        message={
          dialogState.action === 'activate'
            ? 'WARNING: Activating the emergency kill switch will immediately halt all autonomous remediation pipelines across the entire platform. Operator review will be required to clear.'
            : 'Restoring autonomous policy will permit the engine to evaluate and execute low-risk automated remediations as incidents arrive.'
        }
        confirmText={dialogState.action === 'activate' ? 'Engage Global Halt' : 'Restore Operations'}
        variant={dialogState.action === 'activate' ? 'danger' : 'success'}
        requireReason={dialogState.action === 'activate'}
        reasonPlaceholder="e.g. Unscheduled cluster maintenance or suspicious remediation pattern observed."
        loading={dialogState.loading}
        onConfirm={handleToggleKillSwitch}
        onCancel={() => setDialogState({ isOpen: false, action: 'activate', loading: false })}
      />
    </div>
  );
};

export default SafetyPolicies;
