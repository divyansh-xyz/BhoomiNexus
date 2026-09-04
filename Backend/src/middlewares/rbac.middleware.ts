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
