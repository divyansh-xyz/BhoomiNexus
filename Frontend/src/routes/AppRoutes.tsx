import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import GovernmentLayout from '../layouts/GovernmentLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import RoleGuard, { getRoleHomeDashboard } from '../components/auth/RoleGuard';
import { useAuth } from '../hooks/useAuth';
import LoginPage from '../pages/auth/LoginPage';
import LandingPage from '../pages/public/LandingPage';
import BossDashboardPage from '../pages/boss/BossDashboardPage';
import BossProjectReviewPage from '../pages/boss/BossProjectReviewPage';
import BossParcelDeterminationPage from '../pages/boss/BossParcelDeterminationPage';
import BossWorkflowConfigPage from '../pages/boss/BossWorkflowConfigPage';
import BossWorkflowBuilderPage from '../pages/boss/BossWorkflowBuilderPage';
import ProponentProjectsPage from '../pages/proponent/ProponentProjectsPage';
import CreateProjectPage from '../pages/proponent/CreateProjectPage';
import ProponentProjectDetailPage from '../pages/proponent/ProponentProjectDetailPage';
import OfficerDashboardPage from '../pages/officer/OfficerDashboardPage';
import OfficerTaskDetailPage from '../pages/officer/OfficerTaskDetailPage';
import DocumentListPage from '../pages/documents/DocumentListPage';
import DocumentDetailPage from '../pages/documents/DocumentDetailPage';
import NationalDashboardPage from '../pages/dashboards/NationalDashboardPage';
import StateDashboardPage from '../pages/dashboards/StateDashboardPage';
import DistrictDashboardPage from '../pages/dashboards/DistrictDashboardPage';
import CompensationDashboardPage from '../pages/compensation/CompensationDashboardPage';
import CompensationTaskDetailPage from '../pages/compensation/CompensationTaskDetailPage';
import PossessionDashboardPage from '../pages/possession/PossessionDashboardPage';
import PossessionTaskDetailPage from '../pages/possession/PossessionTaskDetailPage';
import NotificationCenterPage from '../pages/notifications/NotificationCenterPage';

const AdminOnlyPlaceholder: React.FC = () => (
  <div style={{ padding: '2rem' }}>
    <h2>Admin Module</h2>
    <p>Administrative control settings.</p>
  </div>
);

const DashboardRedirect: React.FC = () => {
  const { user } = useAuth();
  return <Navigate to={getRoleHomeDashboard(user?.role)} replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
      </Route>

      {/* Sovereign Officer Authentication Portal */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Government Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<GovernmentLayout />}>
          <Route path="/dashboard" element={<DashboardRedirect />} />

          {/* Requesting Authority / Proponent Routes */}
          <Route element={<RoleGuard allowedRoles={['REQUESTING_AUTHORITY']} />}>
            <Route path="/projects" element={<ProponentProjectsPage />} />
            <Route path="/projects/new" element={<CreateProjectPage />} />
            <Route path="/projects/:projectId" element={<ProponentProjectDetailPage />} />
          </Route>
          
          {/* BOSS Scrutiny, Cadastral Determination & Workflow Config */}
          <Route element={<RoleGuard allowedRoles={['BOSS']} />}>
            <Route path="/boss/dashboard" element={<BossDashboardPage />} />
            <Route path="/boss/projects/:projectId" element={<BossProjectReviewPage />} />
            <Route path="/boss/projects/:projectId/parcels" element={<BossParcelDeterminationPage />} />
            <Route path="/boss/projects/:projectId/workflow" element={<BossWorkflowConfigPage />} />
            <Route path="/boss/projects/:projectId/workflow/templates" element={<BossWorkflowConfigPage initialSelectTemplate={true} />} />
            <Route path="/boss/projects/:projectId/workflow-builder" element={<BossWorkflowBuilderPage />} />
          </Route>

          {/* Officer Dashboard & Tasks */}
          <Route element={<RoleGuard allowedRoles={['PROCESSING_OFFICER']} />}>
            <Route path="/officer/dashboard" element={<OfficerDashboardPage />} />
            <Route path="/officer/tasks/:taskId" element={<OfficerTaskDetailPage />} />
          </Route>

          {/* National Authority Route */}
          <Route element={<RoleGuard allowedRoles={['NATIONAL_AUTHORITY', 'ADMIN']} />}>
            <Route path="/dashboard/national" element={<NationalDashboardPage />} />
          </Route>

          {/* State Authority Route */}
          <Route element={<RoleGuard allowedRoles={['STATE_AUTHORITY', 'NATIONAL_AUTHORITY', 'ADMIN']} />}>
            <Route path="/dashboard/state" element={<StateDashboardPage />} />
          </Route>

          {/* District Authority Route */}
          <Route element={<RoleGuard allowedRoles={['DISTRICT_AUTHORITY', 'STATE_AUTHORITY', 'NATIONAL_AUTHORITY', 'ADMIN']} />}>
            <Route path="/dashboard/district" element={<DistrictDashboardPage />} />
          </Route>

          {/* Compensation Officer Route */}
          <Route element={<RoleGuard allowedRoles={['COMPENSATION_OFFICER', 'DISTRICT_AUTHORITY', 'ADMIN']} />}>
            <Route path="/compensation/dashboard" element={<CompensationDashboardPage />} />
            <Route path="/compensation/tasks/:taskId" element={<CompensationTaskDetailPage />} />
            <Route path="/dashboard/compensation" element={<CompensationDashboardPage />} />
          </Route>

          {/* Possession Officer Route */}
          <Route element={<RoleGuard allowedRoles={['POSSESSION_OFFICER', 'DISTRICT_AUTHORITY', 'ADMIN']} />}>
            <Route path="/possession/dashboard" element={<PossessionDashboardPage />} />
            <Route path="/possession/tasks/:taskId" element={<PossessionTaskDetailPage />} />
            <Route path="/dashboard/possession" element={<PossessionDashboardPage />} />
          </Route>

          <Route
            path="/dashboard/admin"
            element={
              <RoleGuard allowedRoles={['ADMIN']}>
                <AdminOnlyPlaceholder />
              </RoleGuard>
            }
          />

          {/* Global Document Repository */}
          <Route path="/documents" element={<DocumentListPage />} />
          <Route path="/documents/:documentId" element={<DocumentDetailPage />} />

          {/* V2 Notification & Statutory Lifecycle Event Center */}
          <Route path="/notifications" element={<NotificationCenterPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
