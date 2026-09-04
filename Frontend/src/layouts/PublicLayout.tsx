import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import BhoomiLogo from '../components/common/BhoomiLogo';

export const PublicLayout: React.FC = () => {
  return (
    <div className="layout-public">
      {/* Top Editorial Broadsheet Navigation Bar */}
      <header className="site-nav">
        <div className="nav-inner">
          <div className="nav-brand-group">
            <Link to="/" className="nav-wordmark">
              <BhoomiLogo size={22} strokeWidth={2.4} />
              <span>BhoomiNexus</span>
            </Link>
          </div>

          <nav className="nav-links-wrapper" aria-label="Main Navigation">
            <ul className="nav-links-list" style={{ gap: '14px' }}>
              <li>
                <a href="#map-explorer" className="btn-cta-outline" style={{ padding: '6px 16px', fontSize: '13px' }}>
                  Cadastral Explorer &darr;
                </a>
              </li>
              <li>
                <Link to="/login" className="btn-cta-black" style={{ padding: '6px 16px', fontSize: '13px', color: '#ffffff' }}>
                  Officer Sign In &rarr;
                </Link>
              </li>
            </ul>
          </nav>


        </div>
      </header>

      {/* Hairline Divider Rule under Navigation */}
      <div className="hairline-divider-nav" />

      <main className="main-content-flow">
        <Outlet />
      </main>

      {/* Editorial Broadsheet Footer */}
      <footer className="site-footer">
        <div className="footer-container">
          {/* Circular Outlined Institutional Badges */}
          <div className="footer-badge-row">
            <div className="badge-circle" title="Government of India">IN</div>
            <div className="badge-circle" title="Department of Land Resources">DoLR</div>
            <div className="badge-circle" title="National Informatics Centre">NIC</div>
            <div className="badge-circle" title="PM GatiShakti NMP">NMP</div>
            <div className="badge-circle" title="ISRO Bhuvan Spatial">GIS</div>
          </div>

          <div className="footer-hairline" />

          {/* Four Equal Columns of Broadsheet Links */}
          <div className="footer-columns-grid">
            <div className="footer-col">
              <h4 className="footer-col-title">Spatial Cadastre</h4>
              <ul className="footer-link-list">
                <li><a href="#map-explorer">Bhu-Aadhaar (ULPIN) Registry</a></li>
                <li><a href="#map-explorer">State Cadastral Vector Maps</a></li>
                <li><a href="#map-explorer">Digital Record of Rights (RoR)</a></li>
                <li><a href="#map-explorer">High-Res Drone GIS Surveys</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">Statutory & Legal</h4>
              <ul className="footer-link-list">
                <li><a href="#statutory-pillars">RFCTLARR Act 2013 Directives</a></li>
                <li><a href="#statutory-pillars">Social Impact Assessment (SIA)</a></li>
                <li><a href="#inquiry-portal">Section 11 Gazette Notices</a></li>
                <li><a href="#inquiry-portal">Section 19 Declaration & Awards</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">Ministries & Portals</h4>
              <ul className="footer-link-list">
                <li><a href="https://rural.gov.in" target="_blank" rel="noreferrer">Ministry of Rural Development</a></li>
                <li><a href="https://dolr.gov.in" target="_blank" rel="noreferrer">Department of Land Resources</a></li>
                <li><a href="https://www.isro.gov.in" target="_blank" rel="noreferrer">ISRO Bhuvan Spatial Portal</a></li>
                <li><a href="https://dpiit.gov.in" target="_blank" rel="noreferrer">PM GatiShakti National Master Plan</a></li>
              </ul>
            </div>

            <div className="footer-col">
              <h4 className="footer-col-title">Platform & Governance</h4>
              <ul className="footer-link-list">
                <li><Link to="/login">Officer SSO Authorization</Link></li>
                <li><a href="#statutory-pillars">Direct Benefit Transfer (DBT)</a></li>
                <li><a href="#inquiry-portal">Grievance Redressal Mechanism</a></li>
                <li><a href="#statutory-pillars">Cryptographic Survey Audit Log</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-hairline" />

          {/* Bottom Colophon / Attribution */}
          <div className="footer-colophon">
            <p className="colophon-title">
              © {new Date().getFullYear()} BhoomiNexus. Sovereign Spatial Land Acquisition & Cadastral Intelligence Platform.
            </p>
            <p className="colophon-sub">
              Department of Land Resources (DoLR) & Ministry of Rural Development, Government of India.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
