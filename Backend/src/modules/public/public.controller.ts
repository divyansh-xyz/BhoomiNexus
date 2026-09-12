import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";

export const getNationalOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(id) AS total_projects,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS completed_projects,
        SUM(requested_area_acres) AS total_area_proposed,
        SUM(confirmed_area_acres) AS total_area_acquired,
        SUM(estimated_budget_cr) AS total_compensation_paid
      FROM projects
      WHERE status != 'DRAFT'
    `);

    const data = result.rows[0];

    res.json({
      totalProjects: parseInt(data.total_projects),
      projectsInProgress: parseInt(data.total_projects) - parseInt(data.completed_projects),
      projectsCompleted: parseInt(data.completed_projects),
      landProposed: parseFloat(data.total_area_proposed || '0'),
      landAcquired: parseFloat(data.total_area_acquired || '0'),
      compensationPaid: parseFloat(data.total_compensation_paid || '0'),
    });
  } catch (error) {
    next(error);
  }
};

export const getStatesList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(`
      SELECT s.id, s.code, s.name, 
             COUNT(p.id) as active_projects
      FROM states s
      LEFT JOIN projects p ON p.state = s.name AND p.status != 'DRAFT' AND p.status != 'COMPLETED'
      GROUP BY s.id, s.code, s.name
      ORDER BY s.name
    `);

    res.json(result.rows.map(row => ({
      stateId: row.code,
      stateName: row.name,
      projectCount: parseInt(row.active_projects),
    })));
  } catch (error) {
    next(error);
  }
};

export const getStateMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stateId } = req.params;

    const stateRes = await pool.query("SELECT name FROM states WHERE code = $1", [stateId]);
    if (stateRes.rows.length === 0) {
      return res.status(404).json({ error: "State not found" });
    }
    const stateName = stateRes.rows[0].name;

    const result = await pool.query(`
      SELECT 
        COUNT(id) AS total_projects,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) AS completed_projects,
        SUM(requested_area_acres) AS total_area_proposed,
        SUM(confirmed_area_acres) AS total_area_acquired,
        SUM(estimated_budget_cr) AS total_compensation_paid
      FROM projects
      WHERE state = $1 AND status != 'DRAFT'
    `, [stateName]);

    const data = result.rows[0];
    const totalProjects = parseInt(data.total_projects);
    const completedProjects = parseInt(data.completed_projects);

    res.json({
      state: stateName,
      stateCode: stateId,
      projectCount: totalProjects,
      completedProjects,
      activeProjects: totalProjects - completedProjects,
      landProposed: parseFloat(data.total_area_proposed || '0'),
      landAcquired: parseFloat(data.total_area_acquired || '0'),
      compensationPaid: parseFloat(data.total_compensation_paid || '0'),
      highRiskProjects: Math.floor(Math.random() * (totalProjects / 10)), // Mocked high risk for now
    });
  } catch (error) {
    next(error);
  }
};

export const getStateProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { stateId } = req.params;

    const stateRes = await pool.query("SELECT name FROM states WHERE code = $1", [stateId]);
    if (stateRes.rows.length === 0) {
      return res.status(404).json({ error: "State not found" });
    }

    const result = await pool.query(`
      SELECT code as id, title as name, project_type as type, status
      FROM projects
      WHERE state = $1 AND status != 'DRAFT'
      ORDER BY created_at DESC
    `, [stateRes.rows[0].name]);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};
