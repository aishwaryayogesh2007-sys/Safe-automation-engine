import React from 'react';
import { Server, Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const DEFAULT_SERVICES = {
  'api-gateway': { status: 'healthy', cpu_pct: 25, memory_pct: 35, disk_pct: 40 },
  'worker-service': { status: 'healthy', cpu_pct: 45, memory_pct: 50, disk_pct: 45 },
  'queue-processor': { status: 'healthy', cpu_pct: 30, memory_pct: 40, disk_pct: 30 },
  'db-service': { status: 'healthy', cpu_pct: 40, memory_pct: 60, disk_pct: 55 },
  'auth-service': { status: 'healthy', cpu_pct: 20, memory_pct: 30, disk_pct: 25 },
  'cache-service': { status: 'healthy', cpu_pct: 15, memory_pct: 45, disk_pct: 20 },
  'scheduler-service': { status: 'healthy', cpu_pct: 18, memory_pct: 28, disk_pct: 35 },
  'cert-manager': { status: 'healthy', cpu_pct: 10, memory_pct: 20, disk_pct: 15 },
};

const InfrastructureHealth = ({ services = {}, loading = false }) => {
  const serviceList = Object.keys(services).length > 0 ? services : DEFAULT_SERVICES;

  const getStatusColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'healthy':
        return {
          dot: 'bg-brand-green',
          badge: 'bg-emerald-950/60 text-emerald-400 border-emerald-800',
          border: 'border-gray-800',
        };
      case 'degraded':
      case 'warning':
        return {
          dot: 'bg-brand-amber animate-pulse',
          badge: 'bg-amber-950/60 text-amber-400 border-amber-800',
          border: 'border-amber-800/60 shadow-amber-950/20',
        };
      case 'critical':
      case 'unhealthy':
      case 'failed':
        return {
          dot: 'bg-brand-red animate-ping',
          badge: 'bg-red-950/80 text-red-300 border-red-700',
          border: 'border-red-800/80 shadow-red-950/30',
        };
      default:
        return {
          dot: 'bg-gray-400',
          badge: 'bg-gray-800 text-gray-300 border-gray-700',
          border: 'border-gray-800',
        };
    }
  };

  const getMetricBarColor = (pct) => {
    if (pct >= 85) return 'bg-brand-red';
    if (pct >= 70) return 'bg-brand-amber';
    return 'bg-brand-blue';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="card p-4 bg-dark-900 animate-pulse h-36 rounded-xl border border-gray-800" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Object.entries(serviceList).map(([name, data]) => {
        const statusConfig = getStatusColor(data.status);
        const cpu = Math.round(data.cpu_pct || 0);
        const mem = Math.round(data.memory_pct || 0);
        const disk = Math.round(data.disk_pct || 0);

        return (
          <div
            key={name}
            className={`card p-4 bg-dark-800/90 rounded-xl border ${statusConfig.border} transition-all duration-200 hover:border-gray-700`}
          >
            {/* Header: Name and Status */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusConfig.dot}`} />
                <span className="font-mono text-xs font-bold text-gray-200 truncate">
                  {name}
                </span>
              </div>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border shrink-0 ${statusConfig.badge}`}
              >
                {data.status || 'healthy'}
              </span>
            </div>

            {/* Metrics Mini-bars */}
            <div className="space-y-2 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>CPU</span>
                  <span className="font-mono text-gray-300">{cpu}%</span>
                </div>
                <div className="w-full bg-dark-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getMetricBarColor(cpu)}`}
                    style={{ width: `${Math.min(100, cpu)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Memory</span>
                  <span className="font-mono text-gray-300">{mem}%</span>
                </div>
                <div className="w-full bg-dark-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getMetricBarColor(mem)}`}
                    style={{ width: `${Math.min(100, mem)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                  <span>Disk</span>
                  <span className="font-mono text-gray-300">{disk}%</span>
                </div>
                <div className="w-full bg-dark-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${getMetricBarColor(disk)}`}
                    style={{ width: `${Math.min(100, disk)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Footer with last check */}
            <div className="mt-3 pt-2 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-500 font-mono">
              <span>Healthcheck</span>
              <span>
                {data.last_health_check
                  ? new Date(data.last_health_check).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'Live'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default InfrastructureHealth;
