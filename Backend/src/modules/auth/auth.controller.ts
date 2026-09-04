import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../../config/db";
import { env } from "../../config/env";
import { ApiError } from "../../utils/apiError";

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT id, email, name, role_id, department, password_hash FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return next(new ApiError(401, "Invalid email or password"));
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return next(new ApiError(401, "Invalid email or password"));
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role_id,
      department: user.department,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });

    res.status(200).json({
      success: true,
      token,
      user: payload,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    next(error);
  }
};
