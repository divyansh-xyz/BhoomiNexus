import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types/auth.types';

export const getRoleHomeDashboard = (role?: UserRole): string => {
  switch (role) {
    case 'BOSS':
      return '/boss/dashboard';
    case 'PROCESSING_OFFICER':
      return '/officer/dashboard';
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
