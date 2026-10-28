import React from 'react';
import { ShieldCheck, AlertTriangle, Flame } from 'lucide-react';

const RiskBadge = ({ tier = 'low', size = 'normal' }) => {
  const normTier = (tier || '').toLowerCase().trim();
  const iconSize = size === 'small' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  switch (normTier) {
    case 'low':
      return (
        <span className="badge-low inline-flex items-center gap-1">
          <ShieldCheck className={iconSize} />
          <span>Low Risk</span>
        </span>
      );

    case 'medium':
      return (
        <span className="badge-medium inline-flex items-center gap-1">
          <AlertTriangle className={iconSize} />
          <span>Medium Risk</span>
        </span>
      );

    case 'high':
      return (
        <span className="badge-high inline-flex items-center gap-1">
          <Flame className={iconSize} />
          <span>High Risk</span>
        </span>
      );

    case 'critical':
      return (
        <span className="badge-critical inline-flex items-center gap-1">
          <Flame className={iconSize} />
          <span>Critical</span>
        </span>
      );

    default:
      return (
        <span className="badge-low inline-flex items-center gap-1">
          <ShieldCheck className={iconSize} />
          <span>{tier}</span>
        </span>
      );
  }
};

export default RiskBadge;
