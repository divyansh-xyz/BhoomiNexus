import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import GovernmentLayout from '../layouts/GovernmentLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import RoleGuard from '../components/auth/RoleGuard';
import LoginPage from '../pages/auth/LoginPage';

// Simple placeholder page components
const HomePagePlaceholder: React.FC = () => (
  <div style={{ padding: '2rem' }}>
    <h1>BhoomiNexus Public Portal (Boilerplate)</h1>
    <p>Landing page placeholder for Phase 0.</p>
  </div>
);

const DashboardPlaceholder: React.FC = () => (
  <div style={{ padding: '1rem' }}>
    <h2>Government Workspace Dashboard (Boilerplate)</h2>
    <p>Dashboard placeholder for Phase 0.</p>
  </div>
);

const AdminOnlyPlaceholder: React.FC = () => (
  <div style={{ padding: '1rem' }}>
    <h2>Admin Module (Boilerplate)</h2>
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePagePlaceholder />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Protected Government Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<GovernmentLayout />}>
          <Route path="/dashboard" element={<DashboardPlaceholder />} />
          <Route
            path="/dashboard/admin"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <AdminOnlyPlaceholder />
              </RoleGuard>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
