import React from 'react';
import { Outlet, Link } from 'react-router-dom';

export const PublicLayout: React.FC = () => {
  return (
    <div className="layout-public">
      <header className="public-header">
        <div className="brand">
          <h2>BhoomiNexus — Public Portal</h2>
        </div>
        <nav className="nav-links">
          <Link to="/">Home</Link>
          <Link to="/login">Officer Login</Link>
        </nav>
      </header>

      <main className="public-content">
        <Outlet />
      </main>

      <footer className="public-footer">
        <p>© {new Date().getFullYear()} BhoomiNexus. Government of India.</p>
      </footer>
    </div>
  );
};

export default PublicLayout;
