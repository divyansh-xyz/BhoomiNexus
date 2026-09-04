import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import BhoomiLogo from '../components/common/BhoomiLogo';

export const GovernmentLayout: React.FC = () => {
  const { logout } = useAuth();

  return (
    <div className="gov-workspace-shell">
      {/* Sovereign Official Top Masthead */}
      <header className="gov-top-masthead">
        <div className="gov-masthead-inner">
          {/* Top Left Corner Content */}
          <div className="gov-masthead-left">
            <Link to="/boss/dashboard" className="gov-masthead-brand">
              <BhoomiLogo size={22} strokeWidth={2.4} />
              <span className="gov-brand-title">BhoomiNexus</span>
            </Link>
            <div className="gov-brand-divider" />
            <div className="gov-brand-agency">
              <span className="gov-ministry-name">
                {window.location.pathname.startsWith('/projects')
                  ? 'National Infrastructure Authorities'
                  : 'Ministry of Rural Development'}
              </span>
              <span className="gov-sub-label">
                {window.location.pathname.startsWith('/projects')
                  ? 'Statutory Proponent Intake Portal • RFCTLARR'
                  : 'Central Land Acquisition Oversight • BOSS'}
              </span>
            </div>
          </div>

          {/* Top Right: Only Sign Out Button */}
          <div className="gov-masthead-right">
            <button
              type="button"
              onClick={logout}
              className="gov-signout-btn"
              title="Sign Out from Sovereign Terminal"
            >
              Sign Out &rarr;
            </button>
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
