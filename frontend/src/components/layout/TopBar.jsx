import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Menu,
  Bell,
  Clock,
  AlertOctagon,
  ShieldAlert,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getKillSwitch } from '../../services/api';

const routeTitles = {
  '/dashboard': 'Operations Dashboard',
  '/incidents': 'Incident Management',
  '/runbooks': 'Runbook Catalogue',
  '/remediations': 'Autonomous Remediations',
  '/approvals': 'Approval Center',
  '/audit': 'Tamper-Evident Audit Trail',
  '/simulation': 'Fault Injection & Chaos Lab',
  '/safety': 'Safety Guardrails & Kill Switch',
  '/analytics': 'KPIs & Reliability Analytics',
};

const TopBar = ({ onOpenMobileMenu }) => {
  const location = useLocation();
  const { user } = useAuth();
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Derive title
  const pathname = location.pathname;
  let title = routeTitles[pathname];
  if (!title) {
    if (pathname.startsWith('/incidents/')) title = 'Incident Details';
    else if (pathname.startsWith('/runbooks/')) title = 'Runbook Specification';
    else if (pathname.startsWith('/remediations/')) title = 'Remediation Trace';
    else title = 'Safe Autonomous IT Platform';
  }

  // Poll kill switch status
  const checkKillSwitch = async () => {
    try {
      const data = await getKillSwitch();
      setKillSwitchActive(Boolean(data.kill_switch_active));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    checkKillSwitch();
    const ksInterval = setInterval(checkKillSwitch, 15000);
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => {
      clearInterval(ksInterval);
      clearInterval(clockInterval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-dark-900/90 backdrop-blur-md border-b border-gray-800">
      {/* Kill Switch Animated Emergency Banner */}
      {killSwitchActive && (
        <div className="bg-red-950 border-b border-brand-red/80 px-4 py-2 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2.5 text-red-200 text-xs sm:text-sm font-semibold tracking-wide">
            <AlertOctagon className="w-4 h-4 sm:w-5 sm:h-5 text-brand-red animate-spin" />
            <span>
              EMERGENCY KILL SWITCH ACTIVE — All autonomous remediations are halted fail-closed.
            </span>
          </div>
          <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-red-900 text-red-100 border border-red-700">
            FAIL_SAFE_ENGAGED
          </span>
        </div>
      )}

      {/* Main Top Navigation */}
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-800 lg:hidden"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {title}
            </h1>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* UTC Clock */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-gray-400 font-mono bg-dark-800/80 px-3 py-1.5 rounded-lg border border-gray-800">
            <Clock className="w-3.5 h-3.5 text-brand-cyan" />
            <span>{currentTime.toISOString().substring(11, 19)} UTC</span>
          </div>

          {/* User badge */}
          <div className="flex items-center gap-2.5 pl-2 sm:border-l sm:border-gray-800">
            <div className="w-8 h-8 rounded-full bg-dark-700 border border-gray-700 flex items-center justify-center text-gray-300">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-gray-200 leading-none">
                {user?.username || 'Admin'}
              </div>
              <span className="text-[10px] font-mono uppercase text-brand-blue tracking-wider">
                {user?.role || 'operator'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
