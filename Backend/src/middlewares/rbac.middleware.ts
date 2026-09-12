import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";

export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden: Insufficient permissions for this action"));
    }
    next();
  };
};

export const authorizeRoles = authorize;

export type ScopeLevel = 'NATIONAL' | 'STATE' | 'DISTRICT' | 'PROJECT' | 'TASK';

export const scopeHierarchy: Record<ScopeLevel, number> = {
  NATIONAL: 5,
  STATE: 4,
  DISTRICT: 3,
  PROJECT: 2,
  TASK: 1,
};

/**
 * Validates whether a user has jurisdiction over a target state/district
 */
export const validateJurisdiction = (
  user: { role?: string; scope?: ScopeLevel; state?: string; district?: string },
  target: { state?: string; district?: string }
): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.scope === 'NATIONAL') return true;

  if (user.scope === 'STATE') {
    if (target.state && user.state && target.state.toLowerCase() !== user.state.toLowerCase()) {
      return false;
    }
    return true;
  }

  if (user.scope === 'DISTRICT') {
    if (target.state && user.state && target.state.toLowerCase() !== user.state.toLowerCase()) {
      return false;
    }
    if (target.district && user.district && target.district.toLowerCase() !== user.district.toLowerCase()) {
      return false;
    }
    return true;
  }

  return true;
};

/**
 * Validates whether an operational officer or user can access a specific parcel
 */
export const canAccessParcel = (
  user: { id: string; role?: string; scope?: ScopeLevel; state?: string; district?: string },
  parcel: {
    state?: string;
    district?: string;
    assignedOfficerId?: string;
    assignedUserIds?: string[];
  }
): boolean => {
  if (!user) return false;
  if (user.role === 'ADMIN' || user.scope === 'NATIONAL') return true;

  // Geographic boundary check
  if (!validateJurisdiction(user, parcel)) {
    return false;
  }

  // Operational officers (TASK scope) can only access assigned parcels
  if (user.scope === 'TASK') {
    const isAssigned =
      (parcel.assignedOfficerId && parcel.assignedOfficerId === user.id) ||
      (parcel.assignedUserIds && parcel.assignedUserIds.includes(user.id));
    return Boolean(isAssigned);
  }

  return true;
};

export interface AuthorizeScopeOptions {
  enforceJurisdiction?: boolean;
  getState?: (req: Request) => string | undefined;
  getDistrict?: (req: Request) => string | undefined;
}

/**
 * Middleware ensuring user has the minimum required scope level
 * and optionally validates target jurisdiction (state/district)
 */
export const authorizeScope = (
  minimumRequiredScope: ScopeLevel,
  options?: AuthorizeScopeOptions
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, "Unauthorized: Authentication required"));
    }

    // Admin has superuser access
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const userScope = (req.user.scope as ScopeLevel) || 'PROJECT';
    const userScopeLevel = scopeHierarchy[userScope] || 1;
    const requiredLevel = scopeHierarchy[minimumRequiredScope] || 1;

    if (userScopeLevel < requiredLevel) {
      return next(new ApiError(403, `Forbidden: Scope '${minimumRequiredScope}' authorization required`));
    }

    // Enforce jurisdiction if options enabled or parameters present
    const targetState = options?.getState
      ? options.getState(req)
      : (req.params.state || (req.query.state as string) || req.body?.state);

    const targetDistrict = options?.getDistrict
      ? options.getDistrict(req)
      : (req.params.district || (req.query.district as string) || req.body?.district);

    if (targetState || targetDistrict) {
      const hasJurisdiction = validateJurisdiction(req.user, {
        state: targetState,
        district: targetDistrict,
      });

      if (!hasJurisdiction) {
        if (req.user.scope === 'STATE') {
          return next(new ApiError(403, `Forbidden: Cannot access records outside state '${req.user.state}'`));
        }
        if (req.user.scope === 'DISTRICT') {
          return next(new ApiError(403, `Forbidden: Cannot access records outside district '${req.user.district}'`));
        }
        return next(new ApiError(403, "Forbidden: Action outside authorized jurisdiction"));
      }
    }

    next();
  };
};

