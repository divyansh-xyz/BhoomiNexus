import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import BhoomiLogo from '../components/common/BhoomiLogo';
import NotificationBell from '../components/common/NotificationBell';

import { getRoleHomeDashboard } from '../components/auth/RoleGuard';
import type { UserRole } from '../types/auth.types';

export const GovernmentLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const homePath = getRoleHomeDashboard(user?.role);

  // Determine if current route is the user's primary/main dashboard
  const isMainDashboard =
    location.pathname === homePath ||
    location.pathname === `${homePath}/` ||
    location.pathname === '/dashboard' ||
    location.pathname === '/projects' ||
    location.pathname === '/boss/dashboard' ||
    location.pathname === '/officer/dashboard';

  // Sign out button displayed on the primary/main dashboard
  const showSignOut = isMainDashboard;

  const hideMastheadActions =
    location.pathname.includes('/workflow') ||
    location.pathname.includes('/parcels') ||
    location.pathname.startsWith('/boss/projects');

  const getHeaderInfo = () => {
    switch (user?.role) {
      case 'NATIONAL_AUTHORITY':
        return {
          ministry: 'Ministry of Rural Development • DoLR',
          sub: 'Central Cadastre & Federal Land Acquisition Command',
        };
      case 'STATE_AUTHORITY':
        return {
          ministry: `${user.state || user.administrativeScope?.state || 'State'} Revenue & Land Reforms Directorate`,
          sub: 'State Cadastral Registry & Inter-District Monitoring',
        };
      case 'DISTRICT_AUTHORITY':
        return {
          ministry: `Office of the District Collector & Magistrate (${user.district || user.administrativeScope?.district || 'District'})`,
          sub: 'District Competent Authority • RFCTLARR 2013',
        };
      case 'COMPENSATION_OFFICER':
        return {
          ministry: 'Special Land Acquisition Office (SLAO)',
          sub: 'Statutory Awards & Direct Benefit Disbursal (Sec 26-30)',
        };
      case 'POSSESSION_OFFICER':
        return {
          ministry: 'Tehsil & Revenue Field Division',
          sub: 'Cadastral Demarcation & Physical Possession Vesting (Sec 38-40)',
        };
      case 'BOSS':
        return {
          ministry: 'Central Land Acquisition Oversight Directorate',
          sub: 'Pre-Activation Scrutiny & Workflow Architecture • BOSS',
        };
      case 'PROCESSING_OFFICER':
        return {
          ministry: 'Field Operations Directorate',
          sub: 'Cadastre Verification & Evidence Scrutiny • Officer Terminal',
        };
      case 'REQUESTING_AUTHORITY':
      default:
        return {
          ministry: 'National Infrastructure Authorities',
          sub: 'Statutory Proponent Intake Portal • RFCTLARR 2013',
        };
    }
  };

  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'NATIONAL_AUTHORITY':
        return { label: 'NATIONAL', bg: '#f3e8ff', color: '#6b21a8' };
      case 'STATE_AUTHORITY':
        return { label: 'STATE AUTH', bg: '#dbeafe', color: '#1e40af' };
      case 'DISTRICT_AUTHORITY':
        return { label: 'COLLECTOR', bg: '#d1fae5', color: '#065f46' };
      case 'COMPENSATION_OFFICER':
        return { label: 'COMPENSATION', bg: '#fef3c7', color: '#92400e' };
      case 'POSSESSION_OFFICER':
        return { label: 'POSSESSION', bg: '#ccfbf1', color: '#115e59' };
      case 'BOSS':
        return { label: 'BOSS', bg: '#eff6ff', color: '#1d4ed8' };
      case 'PROCESSING_OFFICER':
        return { label: 'OFFICER', bg: '#fef3c7', color: '#b45309' };
      case 'REQUESTING_AUTHORITY':
      default:
        return { label: 'PROPONENT', bg: '#f0fdf4', color: '#15803d' };
    }
  };

  const getScopeLabel = () => {
    if (!user) return null;
    const scope = user.administrativeScope;
    if (scope?.level === 'NATIONAL') return '🌐 Pan-India';
    if (scope?.level === 'STATE') return `🏛️ State: ${scope.state || user.state}`;
    if (scope?.level === 'DISTRICT') return `📍 ${scope.district || user.district}, ${scope.state || user.state}`;
    if (scope?.department || user.authority) return `🏢 ${scope?.department || user.authority}`;
    if (user.district) return `📍 ${user.district}`;
    if (user.state) return `🏛️ ${user.state}`;
    return null;
  };

  const headerInfo = getHeaderInfo();
  const roleBadge = getRoleBadge(user?.role);
  const scopeLabel = getScopeLabel();

  return (
    <div className={`gov-workspace-shell ${location.pathname.startsWith('/projects') ? 'theme-things-requestor' : location.pathname.startsWith('/boss') ? 'theme-things-boss' : location.pathname.startsWith('/officer') ? 'theme-things-officer' : ''}`}>
      {/* Sovereign Official Top Masthead */}
      <header className="gov-top-masthead">
        <div className="gov-masthead-inner">
          {/* Top Left Corner Content */}
          <div className="gov-masthead-left">
            <Link to={homePath} className="gov-masthead-brand">
              <BhoomiLogo size={22} strokeWidth={2.4} />
              <span className="gov-brand-title">BhoomiNexus</span>
            </Link>
            <div className="gov-brand-divider" />
            <div className="gov-brand-agency">
              <span className="gov-ministry-name">{headerInfo.ministry}</span>
              <span className="gov-sub-label">{headerInfo.sub}</span>
            </div>
          </div>

          {/* Top Right */}
          <div className="gov-masthead-right" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user && (
              <>
                {user.role !== 'BOSS' && <NotificationBell />}
                {!hideMastheadActions && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {scopeLabel && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: '#f1f5f9',
                          color: '#475569',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        {scopeLabel}
                      </span>
                    )}
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-carbon-ink)' }}>
                      {user.name}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        padding: '2px 6px',
                        backgroundColor: roleBadge.bg,
                        color: roleBadge.color,
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                    >
                      {roleBadge.label}
                    </span>
                  </div>
                )}
              </>
            )}
            {showSignOut && (
              <button
                type="button"
                onClick={logout}
                className="gov-signout-btn"
                title="Sign Out from Sovereign Terminal"
              >
                Sign Out &rarr;
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Administrative Workspace Content Floor */}
      <main className="gov-main-canvas">
        <Outlet />
      </main>
    </div>
  );
};

export default GovernmentLayout;
