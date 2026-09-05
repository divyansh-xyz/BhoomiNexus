import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { createAuditEvent } from "../../utils/audit";

export const getProjects = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, state } = req.query;

    let query = `
      SELECT id, code, title, project_type AS "type",
             requested_area_acres AS "areaAcres",
             estimated_budget_cr AS budget,
             state, district, status,
             target_completion_date AS "targetCompletionDate",
             created_at AS "createdAt",
             updated_at AS "updatedAt"
      FROM projects
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (state) {
      params.push(state);
      query += ` AND state = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const createProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = `PRJ-${Math.floor(1000 + Math.random() * 9000)}`;
    const { title, type, state, district, areaAcres, budget, description, purpose, ministry, authority } = req.body;

    const result = await pool.query(
      `INSERT INTO projects
       (code, title, project_type, state, district, requested_area_acres,
        requested_area_ha, estimated_budget_cr, description, statutory_purpose,
        ministry, proponent_authority, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'DRAFT', $13)
       RETURNING *`,
      [
        code, title, type, state, district, areaAcres,
        areaAcres ? areaAcres * 0.404686 : null, budget, description, purpose,
        ministry, authority, req.user!.id
      ]
    );

    const project = result.rows[0];

    await createAuditEvent({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: "PROJECT_CREATED",
      entityType: "PROJECT",
      entityId: project.id,
      projectId: project.id,
      metadata: { code, title },
    });

    res.status(201).json(mapProjectRow(project));
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const projResult = await pool.query(`SELECT * FROM projects WHERE id = $1`, [id]);
    if (projResult.rows.length === 0) return next(new ApiError(404, "Project not found"));

    const geomResult = await pool.query(
      `SELECT ST_AsGeoJSON(geometry)::jsonb AS geojson, corridor_coordinates AS corridor, bounds
       FROM project_geometry WHERE project_id = $1`,
      [id]
    );

    const project = projResult.rows[0];
    
    res.json({
      ...mapProjectRow(project),
      geometry: geomResult.rows.length > 0 ? geomResult.rows[0].geojson : null,
      corridorCoordinates: geomResult.rows.length > 0 ? geomResult.rows[0].corridor : null,
      bounds: geomResult.rows.length > 0 ? geomResult.rows[0].bounds : null,
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { title, type, state, district, areaAcres, budget, description, purpose, ministry, authority } = req.body;

    const existing = await pool.query(`SELECT * FROM projects WHERE id = $1`, [id]);
    if (existing.rows.length === 0) return next(new ApiError(404, "Project not found"));

    const result = await pool.query(
      `UPDATE projects SET
       title = COALESCE($1, title),
       project_type = COALESCE($2, project_type),
       state = COALESCE($3, state),
       district = COALESCE($4, district),
       requested_area_acres = COALESCE($5, requested_area_acres),
       requested_area_ha = CASE WHEN $5::numeric IS NOT NULL THEN $5::numeric * 0.404686 ELSE requested_area_ha END,
       estimated_budget_cr = COALESCE($6, estimated_budget_cr),
       description = COALESCE($7, description),
       statutory_purpose = COALESCE($8, statutory_purpose),
       ministry = COALESCE($9, ministry),
       proponent_authority = COALESCE($10, proponent_authority),
       updated_at = NOW()
       WHERE id = $11
       RETURNING *`,
      [title, type, state, district, areaAcres, budget, description, purpose, ministry, authority, id]
    );

    await createAuditEvent({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: "PROJECT_UPDATED",
      entityType: "PROJECT",
      entityId: id,
      projectId: id,
    });

    res.json(mapProjectRow(result.rows[0]));
  } catch (error) {
    next(error);
  }
};

export const updateProjectGeometry = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { geometry, corridorCoordinates, bounds } = req.body;

    if (!geometry) {
      return next(new ApiError(400, "Geometry is required"));
    }

    const geojsonStr = JSON.stringify(geometry);

    await pool.query(
      `INSERT INTO project_geometry (project_id, geometry, corridor_coordinates, bounds)
       VALUES ($1, ST_GeomFromGeoJSON($2), $3, $4)
       ON CONFLICT (project_id) DO UPDATE SET
       geometry = ST_GeomFromGeoJSON($2),
       corridor_coordinates = $3,
       bounds = $4,
       updated_at = NOW()`,
      [id, geojsonStr, corridorCoordinates ? JSON.stringify(corridorCoordinates) : null, bounds ? JSON.stringify(bounds) : null]
    );

    await createAuditEvent({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: "PROJECT_GEOMETRY_UPDATED",
      entityType: "PROJECT",
      entityId: id,
      projectId: id,
    });

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

export const submitProject = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const existing = await pool.query(`SELECT status FROM projects WHERE id = $1`, [id]);
    if (existing.rows.length === 0) return next(new ApiError(404, "Project not found"));
    if (existing.rows[0].status !== 'DRAFT') {
      return next(new ApiError(400, "Project is not in DRAFT status"));
    }

    const result = await pool.query(
      `UPDATE projects SET status = 'NEW_REQUEST', submission_date = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );

    await createAuditEvent({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: "PROJECT_SUBMITTED",
      entityType: "PROJECT",
      entityId: id,
      projectId: id,
    });

    res.json(mapProjectRow(result.rows[0]));
  } catch (error) {
    next(error);
  }
};

export const getProjectSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const projResult = await pool.query(
      `SELECT status, submission_date, sla_deadline, candidate_parcels_count, selected_parcels_count,
              requested_area_acres, confirmed_area_acres, created_at, updated_at
       FROM projects WHERE id = $1`, [id]
    );

    if (projResult.rows.length === 0) return next(new ApiError(404, "Project not found"));
    const p = projResult.rows[0];

    const wfResult = await pool.query(`SELECT id, status FROM workflow_instances WHERE project_id = $1`, [id]);
    
    let totalStages = 0;
    let completedStages = 0;
    let currentStage = null;
    let nextAction = "Awaiting configuration";

    if (wfResult.rows.length > 0) {
      const wfId = wfResult.rows[0].id;
      const stagesResult = await pool.query(
        `SELECT id, name, status, stage_order FROM workflow_instance_stages
         WHERE workflow_id = $1 ORDER BY stage_order`, [wfId]
      );
      totalStages = stagesResult.rows.length;
      completedStages = stagesResult.rows.filter(s => s.status === 'COMPLETED').length;
      
      const activeStage = stagesResult.rows.find(s => s.status === 'ACTIVE' || s.status === 'REJECTED');
      if (activeStage) {
        currentStage = activeStage;
        if (activeStage.status === 'REJECTED') {
          nextAction = `Correct rejected stage: ${activeStage.name}`;
        } else {
          nextAction = `Processing stage: ${activeStage.name}`;
        }
      }
    } else if (p.status === 'DRAFT') {
      nextAction = "Submit project request";
    } else if (p.status === 'NEW_REQUEST') {
      nextAction = "Awaiting land parcel confirmation";
    }

    res.json({
      status: p.status,
      submissionDate: p.submission_date,
      slaDeadline: p.sla_deadline,
      candidateParcelsCount: p.candidate_parcels_count,
      selectedParcelsCount: p.selected_parcels_count,
      requestedAreaAcres: parseFloat(p.requested_area_acres || '0'),
      confirmedAreaAcres: parseFloat(p.confirmed_area_acres || '0'),
      workflowProgress: {
        totalStages,
        completedStages,
        currentStageName: currentStage ? currentStage.name : null,
      },
      nextAction,
      updatedAt: p.updated_at,
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectActions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const stagesResult = await pool.query(
      `SELECT wis.id as "stageId", wis.name as "stageName", wis.status, t.rejection_reason as "reason"
       FROM workflow_instance_stages wis
       JOIN workflow_instances wi ON wi.id = wis.workflow_id
       LEFT JOIN tasks t ON t.stage_id = wis.id AND t.status = 'REJECTED'
       WHERE wi.project_id = $1 AND wis.status = 'REJECTED'
       ORDER BY wis.stage_order`,
      [id]
    );

    const actions = stagesResult.rows.map(row => ({
      id: `act-${row.stageId}`,
      type: 'STAGE_REJECTED',
      stageId: row.stageId,
      title: `Correct Rejected Stage: ${row.stageName}`,
      description: row.reason || "Action required.",
      isUrgent: true
    }));

    res.json(actions);
  } catch (error) {
    next(error);
  }
};

function mapProjectRow(row: any): any {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    type: row.project_type,
    state: row.state,
    district: row.district,
    areaAcres: row.requested_area_acres,
    areaHa: row.requested_area_ha,
    budget: row.estimated_budget_cr,
    description: row.description,
    purpose: row.statutory_purpose,
    ministry: row.ministry,
    authority: row.proponent_authority,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
