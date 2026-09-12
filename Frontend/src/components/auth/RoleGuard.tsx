import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types/auth.types';

export const getRoleHomeDashboard = (role?: UserRole): string => {
  switch (role) {
    case 'NATIONAL_AUTHORITY':
      return '/dashboard/national';
    case 'STATE_AUTHORITY':
      return '/dashboard/state';
    case 'DISTRICT_AUTHORITY':
      return '/dashboard/district';
    case 'COMPENSATION_OFFICER':
      return '/compensation/dashboard';
    case 'POSSESSION_OFFICER':
      return '/possession/dashboard';
    case 'BOSS':
      return '/boss/dashboard';
    case 'PROCESSING_OFFICER':
      return '/officer/dashboard';
    case 'ADMIN':
      return '/dashboard/admin';
    case 'REQUESTING_AUTHORITY':
    default:
      return '/projects';
  }
};

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children?: React.ReactNode;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ allowedRoles, children }) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleHomeDashboard(user.role)} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default RoleGuard;
