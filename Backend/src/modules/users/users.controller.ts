import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import { ApiError } from "../../utils/apiError";

export const getUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { role } = req.query;

    let query = `
      SELECT id, name, email, role_id as role, department, designation, cadre, phone, office_location as "officeLocation"
      FROM users
      WHERE is_active = true
    `;
    const params: any[] = [];

    if (role) {
      params.push(role);
      query += ` AND role_id = $${params.length}`;
    }

    query += " ORDER BY name";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT id, name, email, role_id as role, department, designation, cadre, phone, office_location as "officeLocation"
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return next(new ApiError(404, "User not found"));
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
};
