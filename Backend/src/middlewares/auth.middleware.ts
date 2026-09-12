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
    };

    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name || "",
      designation: decoded.designation || "",
    };
    next();
  } catch (error) {
    next(new ApiError(401, "Unauthorized: Invalid or expired token"));
  }
};
