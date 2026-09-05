import * as React from 'react';
import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import BhoomiLogo from '../common/BhoomiLogo';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types/auth.types';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  placeholder?: string;
  icon?: React.ReactNode;
}

const AppInput: React.FC<InputProps> = ({ label, placeholder, icon, ...rest }) => {
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div className="login-input-container">
      {label && <label className="login-input-label">{label}</label>}
      <div className="login-input-relative" onMouseMove={handleMouseMove} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
        <input
          className="login-interactive-input"
          placeholder={placeholder}
          {...rest}
        />
        {isHovering && (
          <>
            <div
              className="login-input-glow-top"
              style={{
                background: `radial-gradient(45px circle at ${mousePosition.x}px 0px, var(--color-signal-blue) 0%, transparent 75%)`,
              }}
            />
            <div
              className="login-input-glow-bottom"
              style={{
                background: `radial-gradient(45px circle at ${mousePosition.x}px 2px, var(--color-signal-blue) 0%, transparent 75%)`,
              }}
            />
          </>
        )}
        {icon && <div className="login-input-icon-slot">{icon}</div>}
      </div>
    </div>
  );
};

export const Component: React.FC = () => {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get('redirect');

  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [mapMode, setMapMode] = useState<'blueprint' | 'satellite'>('blueprint');

  const [email, setEmail] = useState('boss@bhoomi.gov.in');
  const [password, setPassword] = useState('Demo@123');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    const leftSection = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - leftSection.left,
      y: e.clientY - leftSection.top,
    });
  };

  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => setIsHovering(false);

  const routeByRole = (role: UserRole): string => {
    if (redirectParam) return redirectParam;
    switch (role) {
      case 'BOSS':
        return '/boss/dashboard';
      case 'PROCESSING_OFFICER':
        return '/officer/dashboard';
      case 'ADMIN':
        return '/dashboard/admin';
      case 'REQUESTING_AUTHORITY':
      default:
        return '/dashboard';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      let inferredRole: UserRole = 'PROCESSING_OFFICER';
      const lower = email.toLowerCase();
      if (lower.includes('nhai') || lower.includes('proponent') || lower.includes('request')) {
        inferredRole = 'REQUESTING_AUTHORITY';
      } else if (lower.includes('boss') || lower.includes('central')) {
        inferredRole = 'BOSS';
      } else if (lower.includes('admin')) {
        inferredRole = 'ADMIN';
      }
      await login(email, password, inferredRole);
      navigate(routeByRole(inferredRole));
    } catch (err: any) {
      setErrorMsg(err?.message || 'Authentication failed. Please check your credentials.');
    }
  };


  const handleSSOLogin = async (provider: string) => {
    setErrorMsg(null);
    try {
      const ssoEmail = `officer.${provider.toLowerCase().replace(/[^a-z]/g, '')}@nic.in`;
      setEmail(ssoEmail);
      await login(ssoEmail, 'Demo@123', 'PROCESSING_OFFICER');
      navigate(routeByRole('PROCESSING_OFFICER'));
    } catch (err: any) {
      setErrorMsg(err?.message || `${provider} SSO authentication failed.`);
    }
  };

  const governmentSsoList = [
    {
      name: 'Jan Parichay SSO',
      abbr: 'JP',
      title: 'Jan Parichay National Single Sign-On',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      ),
      action: () => handleSSOLogin('JanParichay'),
    },
    {
      name: 'MeriPehchan Digital ID',
      abbr: 'MP',
      title: 'MeriPehchan Citizen & Officer Identity',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M7 7h10" />
          <path d="M7 12h10" />
          <path d="M7 17h10" />
        </svg>
      ),
      action: () => handleSSOLogin('MeriPehchan'),
    },
    {
      name: 'NIC Gov Exchange',
      abbr: 'NIC',
      title: 'National Informatics Centre Gov Identity',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="m4.93 4.93 4.24 4.24" />
          <path d="m14.83 9.17 4.24-4.24" />
          <path d="m14.83 14.83 4.24 4.24" />
          <path d="m9.17 14.83-4.24 4.24" />
          <circle cx="12" cy="12" r="4" />
        </svg>
      ),
      action: () => handleSSOLogin('NIC'),
    },
  ];

  return (
    <div className="login-outer-viewport">
      {/* Split Dual-Panel Card */}
      <div className="login-split-card">
        {/* Left Interactive Form Side */}
        <div
          className="login-left-pane"
          onMouseMove={handleMouseMove}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* Mouse-following dynamic ambient glow */}
          <div
            className={`login-cursor-ambient-glow ${isHovering ? 'opacity-active' : 'opacity-hidden'}`}
            style={{
              transform: `translate(${mousePosition.x - 250}px, ${mousePosition.y - 250}px)`,
            }}
          />

          <div className="login-form-container">
            {/* Brand Header */}
            <div className="login-card-brand-row">
              <BhoomiLogo size={32} strokeWidth={2.4} />
              <span className="login-card-sovereign-tag">MoRD &bull; Gov of India</span>
            </div>

            <h1 className="login-card-headline">Officer Sign in</h1>

            {/* Sovereign Identity SSO Row */}
            <div className="login-social-row">
              <span className="login-social-label">Sign in via Sovereign Identity Provider</span>
              <ul className="login-social-list">
                {governmentSsoList.map((item, idx) => (
                  <li key={idx} className="login-social-item">
                    <button
                      type="button"
                      onClick={item.action}
                      title={item.title}
                      className="login-social-circle group"
                    >
                      <div className="login-social-fill-sweep" />
                      <span className="login-social-icon-glyph group-hover-rotate">
                        {item.icon}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Divider Rule */}
            <div className="login-subtle-divider">
              <div className="login-divider-hairline" />
              <span className="login-divider-label">or use official credentials</span>
              <div className="login-divider-hairline" />
            </div>

            {errorMsg && (
              <div className="login-error-callout">
                {errorMsg}
              </div>
            )}

            {/* Interactive Form */}
            <form onSubmit={handleSubmit} className="login-main-form">
              <div className="login-inputs-stack">
                <AppInput
                  label="Official Email / Employee ID"
                  placeholder="boss@bhoomi.gov.in"
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  }
                />

                <AppInput
                  label="Security Password"
                  placeholder="Demo@123"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="login-pwd-toggle-btn"
                    >
                      {showPassword ? 'Hide' : 'Show'}
                    </button>
                  }
                />
              </div>

              <div className="login-options-row">
                <label className="login-remember-option">
                  <input type="checkbox" defaultChecked className="login-square-checkbox" />
                  <span>Remember terminal</span>
                </label>
                <a
                  href="#recovery"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Statutory Credential Recovery: Please contact your State NIC Nodal Officer or DoLR Systems Admin.');
                  }}
                  className="login-forgot-password-link"
                >
                  Forgot your password?
                </a>
              </div>

              {/* Shimmer / Diagonal Sweep Submit Button */}
              <button type="submit" disabled={isLoading} className="login-shimmer-submit-btn group/button">
                <span className="login-submit-label">
                  {isLoading ? 'Authenticating with Ledger...' : 'Sign In to Sovereign System \u2192'}
                </span>
                <div className="login-shimmer-sweep" />
              </button>
            </form>

            {/* Back link */}
            <div className="login-bottom-link-row">
              <Link to="/" className="btn-cta-link" style={{ fontSize: '12.5px' }}>
                &larr; Return to National Geospatial Cadastre
              </Link>
            </div>
          </div>
        </div>

        {/* Right Editorial Cartographic Showcase Side */}
        <div className="login-right-pane">
          <img
            src={mapMode === 'blueprint' ? '/cadastral-blueprint.jpg' : '/cadastral-satellite.jpg'}
            alt={mapMode === 'blueprint' ? 'Sovereign Cadastral GIS Vector Blueprint' : 'Sovereign Cadastral Satellite Survey'}
            className="login-showcase-image"
          />
          {/* Subtle perimeter vignette overlay preserving high image clarity */}
          <div className="login-showcase-overlay" />

          {/* Institutional Stamp & Telemetry Controls */}
          <div className="login-showcase-content">
            <div className="login-showcase-topbar">
              <div className="login-showcase-badge">
                <BhoomiLogo size={20} strokeWidth={2.4} />
                <span className="login-showcase-badge-text">Sovereign Cadastre</span>
              </div>
              <div className="login-map-switcher">
                <button
                  type="button"
                  className={`login-map-switch-btn ${mapMode === 'blueprint' ? 'active' : ''}`}
                  onClick={() => setMapMode('blueprint')}
                  title="Switch to Vector Cadastral Demarcation Blueprint"
                >
                  Blueprint
                </button>
                <button
                  type="button"
                  className={`login-map-switch-btn ${mapMode === 'satellite' ? 'active' : ''}`}
                  onClick={() => setMapMode('satellite')}
                  title="Switch to High-Resolution Satellite Orthophoto"
                >
                  Satellite
                </button>
              </div>
            </div>

            <div className="login-showcase-footer">
              <div className="login-showcase-footer-row">
                <div className="login-showcase-layer-label">
                  <span className="status-dot-pulse" />
                  <span>{mapMode === 'blueprint' ? 'Vector Parcel Demarcation' : 'High-Res Orthophoto Survey'}</span>
                </div>
                <span className="login-showcase-coord">
                  {mapMode === 'blueprint' ? '28°36\'48"N 77°13\'48"E' : 'EPSG:3857 • WGS84'}
                </span>
              </div>
              <p className="login-showcase-subtext">
                RFCTLARR 2013 Statutory Compliance &bull; 3D Parcel Geometry across 36 States &amp; UTs
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Component;
export const Page = Component;
export const Login1 = Component;
