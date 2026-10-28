import React from 'react';
import {
  ShieldAlert,
  Zap,
  CheckCircle,
  XCircle,
  AlertTriangle,
  PlayCircle,
  FileCheck,
  AlertOctagon,
  Clock,
} from 'lucide-react';
import StatusBadge from '../common/StatusBadge';

const ActivityFeed = ({ events = [], loading = false }) => {
  const getEventIcon = (eventType) => {
    switch (eventType) {
      case 'remediation_executed':
      case 'remediation_started':
        return <PlayCircle className="w-4 h-4 text-brand-blue" />;
      case 'remediation_succeeded':
      case 'verification_passed':
        return <CheckCircle className="w-4 h-4 text-brand-green" />;
      case 'remediation_failed':
      case 'verification_failed':
        return <XCircle className="w-4 h-4 text-brand-red" />;
      case 'remediation_blocked':
      case 'policy_violation':
        return <ShieldAlert className="w-4 h-4 text-brand-red" />;
      case 'kill_switch_activated':
        return <AlertOctagon className="w-4 h-4 text-brand-red animate-pulse" />;
      case 'approval_requested':
        return <Clock className="w-4 h-4 text-brand-amber" />;
      case 'approval_granted':
        return <FileCheck className="w-4 h-4 text-brand-green" />;
      case 'approval_rejected':
        return <XCircle className="w-4 h-4 text-brand-red" />;
      default:
        return <Zap className="w-4 h-4 text-brand-cyan" />;
    }
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '';
    try {
      const date = new Date(ts);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return ts;
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-dark-900 rounded-lg">
            <div className="w-8 h-8 rounded-lg bg-gray-800" />
            <div className="flex-1 space-y-1">
              <div className="h-3 bg-gray-800 rounded w-1/3" />
              <div className="h-2 bg-gray-800 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No recent audit events recorded.
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {events.map((event) => {
        const detailText =
          event.details?.reason ||
          event.details?.message ||
          event.details?.action ||
          (event.details && typeof event.details === 'object'
            ? Object.entries(event.details)
                .slice(0, 2)
                .map(([k, v]) => `${k}: ${v}`)
                .join(', ')
            : '');

        return (
          <div
            key={event.id}
            className="flex items-start justify-between gap-3 p-3 bg-dark-900/60 hover:bg-dark-900 rounded-lg border border-gray-800/80 transition-colors"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2 rounded-lg bg-dark-800 border border-gray-700/60 shrink-0 mt-0.5">
                {getEventIcon(event.event_type)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-gray-200 uppercase">
                    {(event.event_type || 'event').replace(/_/g, ' ')}
                  </span>
                  {event.status_after && (
                    <StatusBadge status={event.status_after} />
                  )}
                </div>
                {detailText && (
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {detailText}
                  </p>
                )}
                {event.remediation_id && (
                  <span className="text-[10px] font-mono text-brand-blue/80">
                    Remediation: {event.remediation_id.substring(0, 8)}
                  </span>
                )}
              </div>
            </div>

            <div className="text-[11px] font-mono text-gray-400 whitespace-nowrap shrink-0">
              {formatTimestamp(event.timestamp)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ActivityFeed;
