import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import BhoomiLogo from '../components/common/BhoomiLogo';
import NotificationBell from '../components/common/NotificationBell';

export const GovernmentLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const homePath =
    user?.role === 'BOSS'
      ? '/boss/dashboard'
      : user?.role === 'PROCESSING_OFFICER'
      ? '/officer/dashboard'
      : '/projects';

  // Determine if current route is the user's primary/main dashboard
  const isProponentMainDashboard = location.pathname === '/projects' || location.pathname === '/projects/';
  const isBossMainDashboard = location.pathname === '/boss/dashboard' || location.pathname === '/boss/dashboard/';
  const isOfficerMainDashboard = location.pathname === '/officer/dashboard' || location.pathname === '/officer/dashboard/';

  // Sign out button must ONLY be displayed on the primary/main dashboard per sovereign guidelines
  const showSignOut =
    user?.role === 'REQUESTING_AUTHORITY'
      ? isProponentMainDashboard
      : user?.role === 'BOSS'
      ? isBossMainDashboard
      : user?.role === 'PROCESSING_OFFICER'
      ? isOfficerMainDashboard
      : false;

  const hideMastheadActions =
    location.pathname.includes('/workflow') ||
    location.pathname.includes('/parcels') ||
    location.pathname.startsWith('/boss/projects');

  return (
    <div className="gov-workspace-shell">
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
              <span className="gov-ministry-name">
                {location.pathname.startsWith('/projects')
                  ? 'National Infrastructure Authorities'
                  : location.pathname.startsWith('/officer')
                  ? 'Field Operations Directorate'
                  : 'Ministry of Rural Development'}
              </span>
              <span className="gov-sub-label">
                {location.pathname.startsWith('/projects')
                  ? 'Statutory Proponent Intake Portal • RFCTLARR'
                  : location.pathname.startsWith('/officer')
                  ? 'Cadastre & Evidence Scrutiny • Officer Terminal'
                  : 'Central Land Acquisition Oversight • BOSS'}
              </span>
            </div>
          </div>

          {/* Top Right */}
          <div className="gov-masthead-right" style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {user && (
              <>
                <NotificationBell />
                {!hideMastheadActions && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--color-carbon-ink)' }}>
                      {user.name}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        padding: '2px 6px',
                        backgroundColor:
                          user.role === 'BOSS'
                            ? '#eff6ff'
                            : user.role === 'PROCESSING_OFFICER'
                            ? '#fef3c7'
                            : '#f0fdf4',
                        color:
                          user.role === 'BOSS'
                            ? '#1d4ed8'
                            : user.role === 'PROCESSING_OFFICER'
                            ? '#b45309'
                            : '#15803d',
                        border: '1px solid rgba(0,0,0,0.1)',
                      }}
                    >
                      {user.role === 'BOSS' ? 'BOSS' : user.role === 'PROCESSING_OFFICER' ? 'OFFICER' : 'PROPONENT'}
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
