import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { createAuditEvent } from "../../utils/audit";

export const fetchLandRecords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const projResult = await pool.query(
      `SELECT state, district, ST_AsGeoJSON(geometry)::jsonb as geojson FROM projects p
       LEFT JOIN project_geometry pg ON p.id = pg.project_id
       WHERE p.id = $1`,
      [projectId]
    );

    if (projResult.rows.length === 0) return next(new ApiError(404, "Project not found"));
    const proj = projResult.rows[0];

    // Mock logic to generate random intersecting parcels
    const count = Math.floor(10 + Math.random() * 20); // 10-30 parcels
    
    // Clear old candidate parcels for this project
    await pool.query(`DELETE FROM project_parcels WHERE project_id = $1`, [projectId]);

    for (let i = 0; i < count; i++) {
      const area = Math.round(1 + Math.random() * 10 * 100) / 100; // 1-10 acres
      
      const pResult = await pool.query(
        `INSERT INTO land_parcels (ulpin, survey_number, owner_reference, village, district, state, area_acres, area_ha, land_type, market_rate_per_acre)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          `ULPIN-${Math.floor(100000 + Math.random() * 900000)}`,
          `SV-${Math.floor(100 + Math.random() * 900)}`,
          `Owner-${Math.floor(Math.random() * 1000)}`,
          "Sample Village", proj.district, proj.state,
          area, area * 0.404686,
          Math.random() > 0.3 ? "AGRICULTURAL" : "COMMERCIAL",
          Math.round(500000 + Math.random() * 5000000)
        ]
      );
      
      const pId = pResult.rows[0].id;

      await pool.query(
        `INSERT INTO project_parcels (project_id, parcel_id, status, intersect_percent)
         VALUES ($1, $2, 'CANDIDATE', $3)`,
        [projectId, pId, Math.round(50 + Math.random() * 50)]
      );
    }

    await pool.query(`UPDATE projects SET candidate_parcels_count = $1, status = 'PENDING_CONFIGURATION' WHERE id = $2`, [count, projectId]);

    await createAuditEvent({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: "PARCELS_FETCHED",
      entityType: "PROJECT",
      entityId: projectId,
      projectId: projectId,
      metadata: { count },
    });

    res.json({ success: true, message: `Fetched ${count} land records` });
  } catch (error) {
    next(error);
  }
};

export const getLandRecords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { status } = req.query;

    let query = `
      SELECT lp.id, lp.ulpin, lp.survey_number as "surveyNumber", lp.owner_reference as "ownerReference",
             lp.village, lp.district, lp.state, lp.area_acres as "areaAcres", lp.area_ha as "areaHa",
             lp.land_type as "landType", lp.market_rate_per_acre as "marketRatePerAcre",
             ST_AsGeoJSON(lp.geometry)::jsonb as geometry,
             pp.status, pp.intersect_percent as "intersectPercent"
      FROM land_parcels lp
      JOIN project_parcels pp ON pp.parcel_id = lp.id
      WHERE pp.project_id = $1
    `;
    const params: any[] = [projectId];

    if (status) {
      params.push(status);
      query += ` AND pp.status = $${params.length}`;
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const confirmParcels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;
    const { parcelIds } = req.body;

    if (!Array.isArray(parcelIds)) {
      return next(new ApiError(400, "parcelIds must be an array"));
    }

    await pool.query(
      `UPDATE project_parcels SET status = 'EXCLUDED' WHERE project_id = $1`,
      [projectId]
    );

    if (parcelIds.length > 0) {
      await pool.query(
        `UPDATE project_parcels SET status = 'CONFIRMED', confirmed_at = NOW()
         WHERE project_id = $1 AND parcel_id = ANY($2::uuid[])`,
        [projectId, parcelIds]
      );
    }

    const areaResult = await pool.query(
      `SELECT SUM(lp.area_acres) as confirmed_area
       FROM land_parcels lp
       JOIN project_parcels pp ON pp.parcel_id = lp.id
       WHERE pp.project_id = $1 AND pp.status = 'CONFIRMED'`,
      [projectId]
    );

    const confirmedArea = areaResult.rows[0].confirmed_area || 0;

    await pool.query(
      `UPDATE projects SET selected_parcels_count = $1, confirmed_area_acres = $2, status = 'PARCELS_CONFIRMED', updated_at = NOW()
       WHERE id = $3`,
      [parcelIds.length, confirmedArea, projectId]
    );

    await createAuditEvent({
      userId: req.user!.id,
      userRole: req.user!.role,
      action: "PARCELS_CONFIRMED",
      entityType: "PROJECT",
      entityId: projectId,
      projectId: projectId,
      metadata: { count: parcelIds.length, confirmedArea },
    });

    res.json({ success: true, count: parcelIds.length, confirmedArea });
  } catch (error) {
    next(error);
  }
};
