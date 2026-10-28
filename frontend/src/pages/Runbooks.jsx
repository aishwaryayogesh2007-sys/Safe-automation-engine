import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Filter,
  Clock,
  ShieldCheck,
  CheckCircle,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { getRunbooks } from '../services/api';
import RiskBadge from '../components/common/RiskBadge';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';

const Runbooks = () => {
  const [runbooks, setRunbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getRunbooks();
        setRunbooks(data || []);
      } catch (err) {
        console.error('Failed to fetch runbooks:', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const filtered = runbooks.filter((rb) => {
    const matchesSearch =
      rb.name.toLowerCase().includes(search.toLowerCase()) ||
      (rb.description && rb.description.toLowerCase().includes(search.toLowerCase()));
    const matchesRisk = !riskFilter || rb.risk_tier === riskFilter;
    return matchesSearch && matchesRisk;
  });

  if (loading) {
    return <LoadingSpinner message="Loading automated remediation runbook catalog..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Runbook Catalogue</h2>
          <p className="text-xs text-gray-400">
            Validated declarative remediation workflows, action constraints, and verification specs
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-gray-400 bg-dark-900 px-3 py-1.5 rounded-lg border border-gray-800">
          <ShieldCheck className="w-4 h-4 text-brand-green" />
          <span>{runbooks.length} Active Runbooks</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-sm bg-dark-900/80 border-gray-800 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            className="input pl-9 text-xs py-2"
            placeholder="Search runbooks by name, keywords, or actions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            className="select text-xs py-2"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="">All Risk Tiers</option>
            <option value="low">Low Risk (Autonomous)</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk (Human Approval)</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Runbooks Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No runbooks found"
          description="Adjust your search filters to find available operational runbooks."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((rb) => (
            <div
              key={rb.id}
              className="card p-5 bg-gradient-to-br from-dark-800 to-dark-900 border-gray-800 rounded-xl flex flex-col justify-between hover:border-gray-700 transition-all duration-200 group hover:shadow-lg"
            >
              <div>
                {/* Header: Title and Risk */}
                <div className="flex items-start justify-between gap-3 mb-2.5">
                  <div className="min-w-0">
                    <span className="text-[11px] font-mono text-gray-400">
                      v{rb.version} &bull; ID: {rb.id}
                    </span>
                    <h3 className="text-sm font-bold text-white group-hover:text-brand-blue transition-colors line-clamp-1 mt-0.5">
                      {rb.name}
                    </h3>
                  </div>
                  <RiskBadge tier={rb.risk_tier} size="small" />
                </div>

                {/* Excerpt */}
                <p className="text-xs text-gray-300 line-clamp-2 leading-relaxed mb-4">
                  {rb.description || 'Declarative autonomous recovery workflow designed for safe fail-closed execution.'}
                </p>

                {/* Actions tags preview */}
                {rb.allowed_actions?.length > 0 && (
                  <div className="mb-4">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 block mb-1">
                      Allowed Actions
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {rb.allowed_actions.map((act) => (
                        <span
                          key={act}
                          className="text-[10px] font-mono bg-dark-950 px-2 py-0.5 rounded text-gray-300 border border-gray-800"
                        >
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs">
                <span className="text-gray-400 font-mono text-[11px]">
                  {rb.is_active ? (
                    <span className="text-brand-green flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-green" /> Enabled
                    </span>
                  ) : (
                    <span className="text-gray-500">Disabled</span>
                  )}
                </span>

                <Link
                  to={`/runbooks/${rb.id}`}
                  className="btn-ghost text-xs py-1 px-2.5 text-brand-blue hover:text-white hover:bg-brand-blue/20 flex items-center gap-1 font-medium"
                >
                  <span>Inspect Spec</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Runbooks;
