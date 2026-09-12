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

export const authorizeScope = (minimumRequiredScope: 'NATIONAL' | 'STATE' | 'DISTRICT' | 'PROJECT') => {
  const scopeHierarchy = {
    NATIONAL: 4,
    STATE: 3,
    DISTRICT: 2,
    PROJECT: 1,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, "Unauthorized: Authentication required"));
    }

    // Admin has superuser access
    if (req.user.role === 'ADMIN') {
      return next();
    }

    const userScope = req.user.scope || 'PROJECT';
    const userScopeLevel = scopeHierarchy[userScope] || 1;
    const requiredLevel = scopeHierarchy[minimumRequiredScope] || 1;

    if (userScopeLevel < requiredLevel) {
      return next(new ApiError(403, `Forbidden: Scope '${minimumRequiredScope}' authorization required`));
    }

    next();
  };
};
