import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  AlertTriangle,
  BookOpen,
  Zap,
  CheckSquare,
  FileText,
  FlaskConical,
  BarChart2,
  LogOut,
  Radio,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getApprovals, getKillSwitch } from '../../services/api';

const Sidebar = ({ isMobileOpen, setIsMobileOpen }) => {
  const { user, logout, isOperator } = useAuth();
  const navigate = useNavigate();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);
  const [killSwitchActive, setKillSwitchActive] = useState(false);

  const fetchBadgeData = async () => {
    try {
      if (isOperator) {
        const approvals = await getApprovals({ status: 'pending' });
        setPendingApprovalsCount(approvals.length);
      }
      const ks = await getKillSwitch();
      setKillSwitchActive(Boolean(ks.kill_switch_active));
    } catch {
      // silently handle background badge fetch failures
    }
  };

  useEffect(() => {
    fetchBadgeData();
    const interval = setInterval(fetchBadgeData, 15000);
    return () => clearInterval(interval);
  }, [isOperator]);

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/incidents', label: 'Incidents', icon: AlertTriangle },
    { to: '/runbooks', label: 'Runbooks', icon: BookOpen },
    { to: '/remediations', label: 'Remediations', icon: Zap },
    {
      to: '/approvals',
      label: 'Approvals',
      icon: CheckSquare,
      badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : null,
      badgeColor: 'bg-brand-amber text-dark-950 font-bold',
    },
    { to: '/audit', label: 'Audit Logs', icon: FileText },
    { to: '/simulation', label: 'Simulation Lab', icon: FlaskConical },
    { to: '/safety', label: 'Safety Policies', icon: Shield },
    { to: '/analytics', label: 'Analytics', icon: BarChart2 },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 left-0 bottom-0 z-40 w-64 bg-dark-900 border-r border-gray-800 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-16 flex items-center justify-between px-6 border-b border-gray-800/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-brand-blue to-brand-cyan flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-white tracking-wide text-base">
                  SafeOps Platform
                </span>
                <span className="block text-[10px] text-gray-400 font-mono tracking-wider uppercase">
                  Safe IT Autonomous
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-brand-blue text-white shadow-lg shadow-blue-600/30'
                        : 'text-gray-300 hover:text-white hover:bg-dark-800'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer info: Kill Switch Indicator & User Profile */}
        <div className="p-4 border-t border-gray-800/80 space-y-3 bg-dark-900/60">
          {/* Kill switch badge */}
          <div
            className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
              killSwitchActive
                ? 'bg-red-950/60 border-brand-red text-red-200 animate-pulse'
                : 'bg-dark-800 border-gray-800 text-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Radio
                className={`w-3.5 h-3.5 ${
                  killSwitchActive ? 'text-brand-red animate-ping' : 'text-brand-green'
                }`}
              />
              <span className="font-semibold uppercase tracking-wider text-[11px]">
                Kill Switch:
              </span>
            </div>
            <span
              className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${
                killSwitchActive
                  ? 'bg-brand-red text-white'
                  : 'bg-emerald-900/50 text-emerald-400'
              }`}
            >
              {killSwitchActive ? 'ACTIVE (HALT)' : 'STANDBY'}
            </span>
          </div>

          {/* User Profile & Logout */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-brand-blue/20 border border-brand-blue/40 flex items-center justify-center text-brand-blue font-semibold text-xs shrink-0">
                {(user?.username || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0 truncate">
                <p className="text-xs font-semibold text-gray-200 truncate">
                  {user?.username || 'operator'}
                </p>
                <p className="text-[11px] text-gray-400 font-mono capitalize">
                  {user?.role || 'viewer'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-gray-400 hover:text-brand-red hover:bg-dark-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
