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
import AdvancedGISPage from '../pages/gis/AdvancedGISPage';
import ParcelPassportPage from '../pages/parcels/ParcelPassportPage';

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

          {/* Requesting Authority / Proponent Project Creation */}
          <Route element={<RoleGuard allowedRoles={['REQUESTING_AUTHORITY']} />}>
            <Route path="/projects" element={<ProponentProjectsPage />} />
            <Route path="/projects/new" element={<CreateProjectPage />} />
          </Route>

          {/* Phase 18: Shared Project View & Project GIS (Reused across Proponent & Institutional Authorities) */}
          <Route element={<RoleGuard allowedRoles={['REQUESTING_AUTHORITY', 'NATIONAL_AUTHORITY', 'STATE_AUTHORITY', 'DISTRICT_AUTHORITY', 'ADMIN', 'BOSS', 'PROCESSING_OFFICER']} />}>
            <Route path="/projects/:projectId" element={<ProponentProjectDetailPage />} />
            <Route path="/projects/:projectId/gis" element={<AdvancedGISPage />} />
          </Route>

          {/* Phase 18 / 19: Standard Common Parcel Passport (Reused across all roles) */}
          <Route element={<RoleGuard allowedRoles={['REQUESTING_AUTHORITY', 'NATIONAL_AUTHORITY', 'STATE_AUTHORITY', 'DISTRICT_AUTHORITY', 'ADMIN', 'BOSS', 'PROCESSING_OFFICER', 'COMPENSATION_OFFICER', 'POSSESSION_OFFICER']} />}>
            <Route path="/parcels/:parcelId" element={<ParcelPassportPage />} />
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
            <Route path="/national-dashboard" element={<NationalDashboardPage />} />
            <Route path="/dashboard/national/gis" element={<AdvancedGISPage />} />
            <Route path="/national-dashboard/gis" element={<AdvancedGISPage />} />
          </Route>

          {/* State Authority Route */}
          <Route element={<RoleGuard allowedRoles={['STATE_AUTHORITY', 'NATIONAL_AUTHORITY', 'ADMIN']} />}>
            <Route path="/dashboard/state" element={<StateDashboardPage />} />
            <Route path="/state-dashboard" element={<StateDashboardPage />} />
            <Route path="/state-dashboard/:stateId" element={<StateDashboardPage />} />
            <Route path="/dashboard/state/gis" element={<AdvancedGISPage />} />
            <Route path="/dashboard/state/:stateId/gis" element={<AdvancedGISPage />} />
            <Route path="/state-dashboard/gis" element={<AdvancedGISPage />} />
            <Route path="/state-dashboard/:stateId/gis" element={<AdvancedGISPage />} />
          </Route>

          {/* District Authority Route */}
          <Route element={<RoleGuard allowedRoles={['DISTRICT_AUTHORITY', 'STATE_AUTHORITY', 'NATIONAL_AUTHORITY', 'ADMIN']} />}>
            <Route path="/dashboard/district" element={<DistrictDashboardPage />} />
            <Route path="/district-dashboard" element={<DistrictDashboardPage />} />
            <Route path="/district-dashboard/:districtId" element={<DistrictDashboardPage />} />
            <Route path="/dashboard/district/gis" element={<AdvancedGISPage />} />
            <Route path="/dashboard/district/:districtId/gis" element={<AdvancedGISPage />} />
            <Route path="/district-dashboard/gis" element={<AdvancedGISPage />} />
            <Route path="/district-dashboard/:districtId/gis" element={<AdvancedGISPage />} />
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

