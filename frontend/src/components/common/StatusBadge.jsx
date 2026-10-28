import React from 'react';
import { Loader2 } from 'lucide-react';

const StatusBadge = ({ status = 'unknown' }) => {
  const normStatus = (status || '').toLowerCase().trim();

  switch (normStatus) {
    case 'detected':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-800 text-gray-300 border border-gray-700">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          Detected
        </span>
      );

    case 'evaluating':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-900/40 text-blue-400 border border-blue-700 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          Evaluating
        </span>
      );

    case 'awaiting_approval':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-900/40 text-amber-300 border border-amber-700">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping opacity-75" />
          Awaiting Approval
        </span>
      );

    case 'blocked':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-red-900/40 text-red-400 border border-red-700">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Blocked
        </span>
      );

    case 'ready':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-cyan-900/40 text-cyan-300 border border-cyan-700">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          Ready
        </span>
      );

    case 'executing':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-900/50 text-blue-300 border border-blue-600 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
          Executing
        </span>
      );

    case 'verifying':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-purple-900/40 text-purple-300 border border-purple-700 animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          Verifying
        </span>
      );

    case 'succeeded':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Succeeded
        </span>
      );

    case 'rolling_back':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-950 text-amber-300 border border-amber-600 animate-pulse">
          <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
          Rolling Back
        </span>
      );

    case 'escalated':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-orange-900/40 text-orange-300 border border-orange-700">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
          Escalated
        </span>
      );

    case 'failed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-red-950 text-red-300 border border-red-700">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Failed
        </span>
      );

    case 'cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-800 text-gray-400 border border-gray-700">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
          Cancelled
        </span>
      );

    case 'pending':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-900/40 text-amber-300 border border-amber-700">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Pending
        </span>
      );

    case 'approved':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-900/40 text-emerald-300 border border-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Approved
        </span>
      );

    case 'rejected':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-red-950 text-red-400 border border-red-800">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Rejected
        </span>
      );

    case 'expired':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-800 text-gray-400 border border-gray-700">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
          Expired
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full bg-gray-800 text-gray-300 border border-gray-700">
          <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
          {status}
        </span>
      );
  }
};

export default StatusBadge;
