import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export const PublicLayout: React.FC = () => {
  return (
    <div className="layout-public">
      <header className="site-nav">
        <div className="nav-inner">
          <Link to="/" className="nav-wordmark">
            Bhoomi<span>Nexus</span>
          </Link>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <p>© {new Date().getFullYear()} BhoomiNexus. National Land Acquisition & Management System.</p>
          <p>Ministry of Rural Development & Department of Land Resources</p>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
