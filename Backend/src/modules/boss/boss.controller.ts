import { Request, Response, NextFunction } from "express";
import { pool } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { createAuditEvent } from "../../utils/audit";

export const fetchLandRecords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId } = req.params;

    const projResult = await pool.query(
      `SELECT p.id, p.state, p.district, pg.corridor_coordinates, ST_AsGeoJSON(pg.geometry)::jsonb as geojson FROM projects p
       LEFT JOIN project_geometry pg ON p.id = pg.project_id
       WHERE p.id = $1`,
      [projectId]
    );

    if (projResult.rows.length === 0) return next(new ApiError(404, "Project not found"));
    const proj = projResult.rows[0];

    // Determine anchor coordinates for generating parcel polygons
    let waypoints: [number, number][] = [];
    if (proj.corridor_coordinates) {
      waypoints = typeof proj.corridor_coordinates === "string"
        ? JSON.parse(proj.corridor_coordinates)
        : proj.corridor_coordinates;
    }

    let baseLat = 28.6139;
    let baseLon = 77.2090;
    if (waypoints.length > 0) {
      baseLat = waypoints[0][0];
      baseLon = waypoints[0][1];
    } else if (proj.district === "Agra" || proj.state === "Uttar Pradesh") {
      baseLat = 27.1767;
      baseLon = 78.0081;
    } else if (proj.district === "Pune" || proj.state === "Maharashtra") {
      baseLat = 18.5204;
      baseLon = 73.8567;
    } else if (proj.district?.includes("Bengaluru") || proj.state === "Karnataka") {
      baseLat = 12.9716;
      baseLon = 77.5946;
    }

    const count = Math.floor(15 + Math.random() * 15); // 15-30 parcels
    
    // Clear old candidate parcels for this project
    await pool.query(`DELETE FROM project_parcels WHERE project_id = $1`, [projectId]);

    for (let i = 0; i < count; i++) {
      const area = Math.round((1 + Math.random() * 9) * 100) / 100; // 1-10 acres
      
      // Determine center point for this parcel
      let ptLat = baseLat;
      let ptLon = baseLon;
      if (waypoints.length > 1) {
        const wpIdx = i % (waypoints.length - 1);
        const frac = ((i * 7) % 10) / 10;
        ptLat = waypoints[wpIdx][0] + (waypoints[wpIdx + 1][0] - waypoints[wpIdx][0]) * frac;
        ptLon = waypoints[wpIdx][1] + (waypoints[wpIdx + 1][1] - waypoints[wpIdx][1]) * frac;
        ptLat += (Math.sin(i) * 0.004);
        ptLon += (Math.cos(i) * 0.004);
      } else {
        ptLat += (Math.sin(i * 1.3) * 0.012) + (Math.random() - 0.5) * 0.004;
        ptLon += (Math.cos(i * 1.3) * 0.012) + (Math.random() - 0.5) * 0.004;
      }

      const dLat = 0.0018 + Math.random() * 0.0012;
      const dLon = 0.0018 + Math.random() * 0.0012;
      // GeoJSON Polygon coordinates are [[[lon, lat], ...], closed ring]
      const polygonGeoJson = {
        type: "Polygon",
        coordinates: [[
          [parseFloat((ptLon).toFixed(6)), parseFloat((ptLat).toFixed(6))],
          [parseFloat((ptLon + dLon).toFixed(6)), parseFloat((ptLat).toFixed(6))],
          [parseFloat((ptLon + dLon).toFixed(6)), parseFloat((ptLat + dLat).toFixed(6))],
          [parseFloat((ptLon).toFixed(6)), parseFloat((ptLat + dLat).toFixed(6))],
          [parseFloat((ptLon).toFixed(6)), parseFloat((ptLat).toFixed(6))],
        ]],
      };

      const pResult = await pool.query(
        `INSERT INTO land_parcels (ulpin, survey_number, owner_reference, village, district, state, area_acres, area_ha, land_type, market_rate_per_acre, geometry)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, ST_SetSRID(ST_GeomFromGeoJSON($11), 4326)) RETURNING id`,
        [
          `ULPIN-${Math.floor(100000 + Math.random() * 900000)}`,
          `SV-${Math.floor(100 + Math.random() * 900)}`,
          `Owner-${Math.floor(Math.random() * 1000)}`,
          "Sample Village", proj.district, proj.state,
          area, parseFloat((area * 0.404686).toFixed(4)),
          Math.random() > 0.3 ? "AGRICULTURAL" : "COMMERCIAL",
          Math.round(500000 + Math.random() * 5000000),
          JSON.stringify(polygonGeoJson)
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
             lp.village, lp.district, lp.state, 
             lp.area_acres::float as "areaAcres", 
             lp.area_ha::float as "areaHa",
             lp.land_type as "landType", 
             lp.market_rate_per_acre::float as "marketRatePerAcre",
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
