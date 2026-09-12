import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { ApiError } from "../utils/apiError";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.query && typeof req.query.token === "string") {
      token = req.query.token;
    }

    if (!token) {
      return next(new ApiError(401, "Unauthorized: No token provided"));
    }
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
      name?: string;
      designation?: string;
      department?: string;
      state?: string;
      district?: string;
      scope?: 'NATIONAL' | 'STATE' | 'DISTRICT' | 'PROJECT' | 'TASK';
    };

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name || "",
      designation: decoded.designation || "",
      department: decoded.department || "",
      state: decoded.state || "",
      district: decoded.district || "",
      scope: decoded.scope || (
        decoded.role === "NATIONAL_AUTHORITY" || decoded.role === "ADMIN" ? "NATIONAL" :
        decoded.role === "STATE_AUTHORITY" ? "STATE" :
        decoded.role === "DISTRICT_AUTHORITY" ? "DISTRICT" :
        (decoded.role === "COMPENSATION_OFFICER" || decoded.role === "POSSESSION_OFFICER" || decoded.role === "PROCESSING_OFFICER") ? "TASK" : "PROJECT"
      ),
    };
    next();
  } catch (error) {
    next(new ApiError(401, "Unauthorized: Invalid or expired token"));
  }
};
