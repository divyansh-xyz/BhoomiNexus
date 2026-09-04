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

          <nav className="nav-links-list" aria-label="Main Navigation">
            <Link to="/">National Map</Link>
            <a href="#map-explorer">State Registry</a>
            <a href="https://landrecords.gov.in" target="_blank" rel="noreferrer">
              Digital India Land Records
            </a>
          </nav>

          <div className="nav-actions">
            <Link to="/login" className="btn-primary" style={{ padding: '8px 18px', fontSize: '14px' }}>
              Officer Login
            </Link>
          </div>
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
