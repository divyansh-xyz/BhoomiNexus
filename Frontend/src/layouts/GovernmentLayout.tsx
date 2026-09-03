import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const GovernmentLayout: React.FC = () => {
  const { user, logout, switchRole } = useAuth();

  return (
    <div className="layout-government">
      <header className="gov-header">
        <div className="gov-title">
          <h3>BhoomiNexus — Official Government Workspace</h3>
          <span>Role: {user?.role || 'Guest'}</span>
        </div>
        <div className="gov-user-actions">
          <span>{user?.name} ({user?.email})</span>
          <button onClick={logout}>Sign Out</button>
        </div>
      </header>

      <div className="gov-body">
        <aside className="gov-sidebar">
          <nav>
            <ul>
              <li><Link to="/dashboard">Dashboard Overview</Link></li>
              <li><Link to="/dashboard/projects">Projects</Link></li>
              <li><Link to="/dashboard/tasks">Tasks</Link></li>
            </ul>
          </nav>

          <div className="dev-role-switcher" style={{ marginTop: '2rem', padding: '0.5rem', border: '1px dashed #ccc' }}>
            <small>Dev Role Switcher:</small>
            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.5rem' }}>
              <button onClick={() => switchRole('REQUESTING_AUTHORITY')}>RA</button>
              <button onClick={() => switchRole('BOSS')}>BOSS</button>
              <button onClick={() => switchRole('PROCESSING_OFFICER')}>Officer</button>
              <button onClick={() => switchRole('ADMIN')}>Admin</button>
            </div>
          </div>
        </aside>

        <main className="gov-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default GovernmentLayout;
