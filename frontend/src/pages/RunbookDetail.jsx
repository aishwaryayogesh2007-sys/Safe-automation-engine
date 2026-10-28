import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Shield,
  Clock,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  FileCode,
  Sliders,
  Users,
} from 'lucide-react';
import { getRunbook } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';

const AccordionSection = ({ title, icon: Icon, children, defaultOpen = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="card p-0 overflow-hidden border border-gray-800 rounded-xl bg-dark-850">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-dark-900/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-dark-800 border border-gray-700/60 text-brand-blue">
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold text-white tracking-wide">{title}</span>
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {isOpen && (
        <div className="px-5 pb-5 pt-1 border-t border-gray-800/60 text-xs text-gray-300">
          {children}
        </div>
      )}
    </div>
  );
};

const RunbookDetail = () => {
  const { id } = useParams();
  const [runbook, setRunbook] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getRunbook(id);
        setRunbook(data);
      } catch (err) {
        console.error('Failed to load runbook:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) {
    return <LoadingSpinner message="Inspecting runbook declarative specification..." />;
  }

  if (!runbook) {
    return (
      <div className="card text-center py-12">
        <AlertTriangle className="w-8 h-8 text-brand-amber mx-auto mb-3" />
        <h3 className="text-base font-bold text-white">Runbook Not Found</h3>
        <p className="text-xs text-gray-400 mt-1">The specified runbook definition does not exist.</p>
        <Link to="/runbooks" className="btn-primary text-xs mt-4 inline-flex">
          Back to Catalogue
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link to="/runbooks" className="hover:text-white flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Catalogue
        </Link>
        <ChevronRight className="w-3 h-3 text-gray-600" />
        <span className="font-mono text-gray-300">{runbook.id}</span>
      </div>

      {/* Header Banner */}
      <div className="card p-6 bg-gradient-to-br from-dark-800 to-dark-900 border-gray-800 rounded-2xl shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <RiskBadge tier={runbook.risk_tier} />
              <span className="text-xs font-mono text-gray-400 bg-dark-950 px-2 py-0.5 rounded border border-gray-800">
                Version {runbook.version}
              </span>
              <span className="text-xs font-mono text-gray-400 bg-dark-950 px-2 py-0.5 rounded border border-gray-800">
                ID: {runbook.id}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {runbook.name}
            </h1>
            <p className="text-xs sm:text-sm text-gray-300 max-w-3xl leading-relaxed">
              {runbook.description}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-dark-950 p-4 rounded-xl border border-gray-800 text-xs">
            <div>
              <span className="text-gray-400 block text-[11px]">Approvals Required</span>
              <span className="font-mono font-bold text-white text-sm">
                {runbook.required_approvals > 0 ? `${runbook.required_approvals} Operator(s)` : '0 (Autonomous)'}
              </span>
            </div>
            <div className="sm:border-l sm:border-gray-800 sm:pl-4">
              <span className="text-gray-400 block text-[11px]">Timeout</span>
              <span className="font-mono font-bold text-brand-cyan text-sm">
                {runbook.execution_timeout_seconds}s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Specification Sections */}
      <div className="space-y-4">
        {/* Trigger Conditions */}
        <AccordionSection title="Trigger Conditions" icon={Clock}>
          <div className="space-y-2">
            <p className="text-gray-400">
              Conditions that automatically bind an incoming incident to this workflow:
            </p>
            <div className="bg-dark-950 p-3 rounded-lg border border-gray-900 font-mono text-emerald-400 overflow-auto">
              <pre>{JSON.stringify(runbook.trigger_conditions || {}, null, 2)}</pre>
            </div>
          </div>
        </AccordionSection>

        {/* Preconditions */}
        <AccordionSection title="Preconditions (Safety Invariants)" icon={Shield}>
          <div className="space-y-2">
            <p className="text-gray-400">
              Safety checks evaluated prior to executing actions. If any assertion fails, execution is immediately blocked:
            </p>
            <div className="bg-dark-950 p-3 rounded-lg border border-gray-900 font-mono text-emerald-400 overflow-auto">
              <pre>{JSON.stringify(runbook.preconditions || {}, null, 2)}</pre>
            </div>
          </div>
        </AccordionSection>

        {/* Allowed Actions */}
        <AccordionSection title="Allowed Actions" icon={FileCode}>
          <div className="space-y-2">
            <p className="text-gray-400">
              Whitelisted autonomous operations permitted under this runbook:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {runbook.allowed_actions?.map((act) => (
                <div
                  key={act}
                  className="px-3 py-1.5 rounded-lg bg-dark-950 font-mono text-brand-blue border border-blue-900/60 font-semibold text-xs"
                >
                  {act}
                </div>
              ))}
            </div>
          </div>
        </AccordionSection>

        {/* Target Restrictions */}
        <AccordionSection title="Target Restrictions & Blast Radius" icon={Sliders}>
          <div className="space-y-2">
            <p className="text-gray-400">
              Boundaries restricting which clusters, namespaces, and node tags can be modified:
            </p>
            <div className="bg-dark-950 p-3 rounded-lg border border-gray-900 font-mono text-emerald-400 overflow-auto">
              <pre>{JSON.stringify(runbook.target_restrictions || {}, null, 2)}</pre>
            </div>
          </div>
        </AccordionSection>

        {/* Execution Parameters */}
        <AccordionSection title="Execution Parameters" icon={Clock}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
            <div className="p-3 rounded-lg bg-dark-900 border border-gray-800">
              <span className="text-gray-400 block text-[11px]">Execution Timeout</span>
              <span className="font-mono text-sm font-bold text-white">
                {runbook.execution_timeout_seconds} seconds
              </span>
            </div>
            <div className="p-3 rounded-lg bg-dark-900 border border-gray-800">
              <span className="text-gray-400 block text-[11px]">Max Retries</span>
              <span className="font-mono text-sm font-bold text-white">
                {runbook.max_retries} attempts
              </span>
            </div>
            <div className="p-3 rounded-lg bg-dark-900 border border-gray-800">
              <span className="text-gray-400 block text-[11px]">Cooldown Window</span>
              <span className="font-mono text-sm font-bold text-white">
                {runbook.cooldown_seconds} seconds
              </span>
            </div>
            <div className="p-3 rounded-lg bg-dark-900 border border-gray-800">
              <span className="text-gray-400 block text-[11px]">Max Rate Changes</span>
              <span className="font-mono text-sm font-bold text-white">
                {runbook.max_changes} per hour
              </span>
            </div>
          </div>
        </AccordionSection>

        {/* Verification Criteria */}
        <AccordionSection title="Post-Execution Verification Criteria" icon={CheckCircle}>
          <div className="space-y-2">
            <p className="text-gray-400">
              Telemetry gates that must normalize after action completion to confirm incident resolution:
            </p>
            <div className="bg-dark-950 p-3 rounded-lg border border-gray-900 font-mono text-emerald-400 overflow-auto">
              <pre>{JSON.stringify(runbook.verification_criteria || {}, null, 2)}</pre>
            </div>
          </div>
        </AccordionSection>

        {/* Rollback Procedure */}
        <AccordionSection title="Rollback Action" icon={RotateCcw}>
          <div className="space-y-2">
            <p className="text-gray-400">
              Automated rollback executed if verification fails or safety invariants are breached:
            </p>
            <div className="p-3 rounded-lg bg-dark-950 border border-gray-900 font-mono text-brand-amber font-semibold">
              {runbook.rollback_action || 'No rollback configured'}
            </div>
          </div>
        </AccordionSection>

        {/* Escalation Rules */}
        <AccordionSection title="Escalation Rules" icon={AlertTriangle}>
          <div className="space-y-2">
            <p className="text-gray-400">
              Conditions that transfer incident custody to on-call human engineers:
            </p>
            <div className="bg-dark-950 p-3 rounded-lg border border-gray-900 font-mono text-emerald-400 overflow-auto">
              <pre>{JSON.stringify(runbook.escalation_rules || {}, null, 2)}</pre>
            </div>
          </div>
        </AccordionSection>
      </div>
    </div>
  );
};

export default RunbookDetail;
