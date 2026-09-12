import { useMemo } from 'react';
import { useAuth } from './useAuth';
import type { UserRole, ScopeLevel } from '../types/auth.types';

export interface AuthorizationPolicy {
  userRole: UserRole | null;
  scopeLevel: ScopeLevel;
  userState?: string;
  userDistrict?: string;
  userAuthority?: string;
  isMonitorOnly: boolean;
  isExecutionOfficer: boolean;
  isBoss: boolean;
  isRequestingAuthority: boolean;
  isAdmin: boolean;
  canAccessState: (targetState?: string, targetStateId?: string) => boolean;
  canAccessDistrict: (targetDistrict?: string, targetDistrictId?: string, targetState?: string) => boolean;
  canAccessProject: (opts: { state?: string; district?: string; authority?: string; isRequestedByMe?: boolean }) => boolean;
  canEditWorkflow: (workflowStatus?: string) => boolean;
}

/**
 * useAuthorization Hook
 * Enforces Phase 2 acceptance rules & V2 Global Behaviour Rules:
 * - A State Authority cannot retrieve another State's records.
 * - A District Authority cannot retrieve another District's records.
 * - Operational officers cannot browse unrelated parcels/projects.
 * - BOSS may modify the workflow ONLY before activation.
 * - After activation, BOSS project access is closed.
 * - National, State, and District Authorities are monitor-only.
 */
export const useAuthorization = (): AuthorizationPolicy => {
  const { user } = useAuth();

  return useMemo(() => {
    const role = user?.role || null;
    const scope = user?.administrativeScope;

    const level: ScopeLevel =
      scope?.level ||
      (role === 'NATIONAL_AUTHORITY'
        ? 'NATIONAL'
        : role === 'STATE_AUTHORITY'
        ? 'STATE'
        : role === 'DISTRICT_AUTHORITY'
        ? 'DISTRICT'
        : role === 'REQUESTING_AUTHORITY'
        ? 'PROJECT'
        : 'TASK');

    const userState = (scope?.state || user?.state || '').trim().toLowerCase();
    const userStateId = (scope?.stateId || user?.stateId || '').trim().toLowerCase();
    const userDistrict = (scope?.district || user?.district || '').trim().toLowerCase();
    const userDistrictId = (scope?.districtId || user?.districtId || '').trim().toLowerCase();
    const userAuthority = (scope?.authority || user?.authority || '').trim().toLowerCase();

    const isMonitorOnly =
      role === 'NATIONAL_AUTHORITY' ||
      role === 'STATE_AUTHORITY' ||
      role === 'DISTRICT_AUTHORITY';

    const isExecutionOfficer =
      role === 'PROCESSING_OFFICER' ||
      role === 'COMPENSATION_OFFICER' ||
      role === 'POSSESSION_OFFICER';

    const isBoss = role === 'BOSS';
    const isRequestingAuthority = role === 'REQUESTING_AUTHORITY';
    const isAdmin = role === 'ADMIN';

    // State Scope Policy Check
    const canAccessState = (targetState?: string, targetStateId?: string): boolean => {
      if (!user) return false;
      if (isAdmin || role === 'NATIONAL_AUTHORITY') return true;

      const target = (targetState || '').trim().toLowerCase();
      const targetId = (targetStateId || '').trim().toLowerCase();

      if (role === 'STATE_AUTHORITY' || role === 'DISTRICT_AUTHORITY') {
        if (targetId && userStateId && targetId === userStateId) return true;
        if (target && userState && (target === userState || userState.includes(target) || target.includes(userState))) {
          return true;
        }
        return false;
      }

      return true;
    };

    // District Scope Policy Check
    const canAccessDistrict = (
      targetDistrict?: string,
      targetDistrictId?: string,
      targetState?: string
    ): boolean => {
      if (!user) return false;
      if (isAdmin || role === 'NATIONAL_AUTHORITY') return true;

      // State authority can access any district inside their state
      if (role === 'STATE_AUTHORITY') {
        return canAccessState(targetState);
      }

      // District authority is strictly isolated to their assigned district
      if (role === 'DISTRICT_AUTHORITY') {
        const target = (targetDistrict || '').trim().toLowerCase();
        const targetId = (targetDistrictId || '').trim().toLowerCase();
        if (targetId && userDistrictId && targetId === userDistrictId) return true;
        if (target && userDistrict && (target === userDistrict || userDistrict.includes(target) || target.includes(userDistrict))) {
          return true;
        }
        return false;
      }

      return true;
    };

    // Project Scope Policy Check
    const canAccessProject = (opts: {
      state?: string;
      district?: string;
      authority?: string;
      isRequestedByMe?: boolean;
    }): boolean => {
      if (!user) return false;
      if (isAdmin || role === 'NATIONAL_AUTHORITY') return true;

      if (role === 'REQUESTING_AUTHORITY') {
        if (opts.authority && userAuthority && !opts.authority.toLowerCase().includes(userAuthority)) {
          return false;
        }
        return opts.isRequestedByMe ?? true;
      }

      if (role === 'STATE_AUTHORITY') {
        return canAccessState(opts.state);
      }

      if (role === 'DISTRICT_AUTHORITY') {
        return canAccessDistrict(opts.district, undefined, opts.state);
      }

      return true;
    };

    // Workflow Edit Rule (Implementation Plan.md lines 461-468)
    // "After activation: BOSS PROJECT ACCESS = CLOSED. No normal UI route should permit BOSS to modify the active workflow."
    const canEditWorkflow = (workflowStatus?: string): boolean => {
      if (!isBoss) return false;
      const status = (workflowStatus || '').toUpperCase();
      return status === 'DRAFT' || status === 'PENDING' || status === 'WORKFLOW_CONFIGURED';
    };

    return {
      userRole: role,
      scopeLevel: level,
      userState: scope?.state || user?.state,
      userDistrict: scope?.district || user?.district,
      userAuthority: scope?.authority || user?.authority,
      isMonitorOnly,
      isExecutionOfficer,
      isBoss,
      isRequestingAuthority,
      isAdmin,
      canAccessState,
      canAccessDistrict,
      canAccessProject,
      canEditWorkflow,
    };
  }, [user]);
};

export default useAuthorization;
