import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../../config/db";
import { env } from "../../config/env";
import { ApiError } from "../../utils/apiError";
import { createAuditEvent } from "../../utils/audit";

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (result.rows.length === 0) {
      return next(new ApiError(401, "Invalid email or password"));
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return next(new ApiError(401, "Invalid email or password"));
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role_id, name: user.name, designation: user.designation },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await createAuditEvent({
      userId: user.id,
      userRole: user.role_id,
      action: "USER_LOGIN",
      entityType: "USER",
      entityId: user.id,
    });

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role_id,
          department: user.department,
          designation: user.designation,
          cadre: user.cadre,
          phone: user.phone,
          officeLocation: user.office_location,
        }
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role_id as role, department, designation, cadre, phone, office_location as \"officeLocation\" FROM users WHERE id = $1",
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return next(new ApiError(404, "User not found"));
    }

    res.json({
      success: true,
      data: { user: result.rows[0] },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // For JWT, logout is handled client side by destroying the token,
    // but we can log the action in audit_logs
    await createAuditEvent({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: "USER_LOGOUT",
      entityType: "USER",
      entityId: req.user!.id,
    });

    res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return next(new ApiError(401, "Refresh token required"));

    const decoded = jwt.verify(refreshToken, env.JWT_SECRET) as { userId: string };
    
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [decoded.userId]);
    if (result.rows.length === 0) return next(new ApiError(401, "Invalid refresh token"));

    const user = result.rows[0];

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role_id, name: user.name, designation: user.designation },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    res.json({ success: true, token });
  } catch (error) {
    next(new ApiError(401, "Invalid or expired refresh token"));
  }
};
