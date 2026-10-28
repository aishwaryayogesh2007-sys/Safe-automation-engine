import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const KPICard = ({
  icon: Icon,
  label,
  value,
  trend = null,
  trendDirection = 'up',
  color = 'blue',
  subtitle = null,
}) => {
  const getColorStyles = () => {
    switch (color) {
      case 'green':
        return {
          iconBg: 'bg-emerald-950/60 text-brand-green border-emerald-800/60',
          hoverGlow: 'hover:border-brand-green/40 hover:shadow-emerald-950/40',
        };
      case 'amber':
        return {
          iconBg: 'bg-amber-950/60 text-brand-amber border-amber-800/60',
          hoverGlow: 'hover:border-brand-amber/40 hover:shadow-amber-950/40',
        };
      case 'red':
        return {
          iconBg: 'bg-red-950/60 text-brand-red border-red-800/60',
          hoverGlow: 'hover:border-brand-red/40 hover:shadow-red-950/40',
        };
      case 'purple':
        return {
          iconBg: 'bg-purple-950/60 text-brand-purple border-purple-800/60',
          hoverGlow: 'hover:border-brand-purple/40 hover:shadow-purple-950/40',
        };
      case 'cyan':
        return {
          iconBg: 'bg-cyan-950/60 text-brand-cyan border-cyan-800/60',
          hoverGlow: 'hover:border-brand-cyan/40 hover:shadow-cyan-950/40',
        };
      default:
        return {
          iconBg: 'bg-blue-950/60 text-brand-blue border-blue-800/60',
          hoverGlow: 'hover:border-brand-blue/40 hover:shadow-blue-950/40',
        };
    }
  };

  const style = getColorStyles();

  return (
    <div
      className={`card p-5 bg-gradient-to-br from-dark-800 to-dark-900 border border-gray-800 rounded-xl transition-all duration-200 hover:shadow-xl ${style.hoverGlow}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {label}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-lg border ${style.iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          {value}
        </div>

        {trend !== null && (
          <div
            className={`flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${
              trendDirection === 'up'
                ? 'bg-emerald-950/60 text-brand-green border border-emerald-800'
                : trendDirection === 'down'
                ? 'bg-red-950/60 text-brand-red border border-red-800'
                : 'bg-gray-800 text-gray-400 border border-gray-700'
            }`}
          >
            {trendDirection === 'up' && <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" />}
            {trendDirection === 'down' && <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
            {trendDirection === 'neutral' && <Minus className="w-3.5 h-3.5 mr-0.5" />}
            <span>{trend}</span>
          </div>
        )}
      </div>

      {subtitle && (
        <div className="mt-2 text-xs text-gray-400 font-medium">
          {subtitle}
        </div>
      )}
    </div>
  );
};

export default KPICard;
