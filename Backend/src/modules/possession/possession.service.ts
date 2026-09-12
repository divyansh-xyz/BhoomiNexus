import { pool } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { createAuditEvent } from "../../utils/audit";

export interface CreatePossessionPayload {
  projectId: string;
  parcelId: string;
  possessionDate?: string;
  remarks?: string;
}

/**
 * Returns dashboard metrics for physical possession: pending vs completed parcels.
 */
export const getPossessionDashboard = async (filter?: { state?: string; district?: string; projectId?: string }) => {
  let whereClause = "WHERE 1=1";
  const params: any[] = [];

  if (filter?.projectId) {
    params.push(filter.projectId);
    whereClause += ` AND pr.project_id = $${params.length}`;
  }

  if (filter?.district) {
    params.push(filter.district);
    whereClause += ` AND lp.district = $${params.length}`;
  }

  if (filter?.state) {
    params.push(filter.state);
    whereClause += ` AND lp.state = $${params.length}`;
  }

  const totalsRes = await pool.query(
    `SELECT COUNT(DISTINCT pr.id)::int AS total_records,
            COUNT(DISTINCT pr.parcel_id)::int AS total_parcels,
            COUNT(CASE WHEN pr.status = 'COMPLETED' OR lp.possession_status = 'TAKEN' THEN 1 END)::int AS completed_count,
            COUNT(CASE WHEN pr.status != 'COMPLETED' AND lp.possession_status != 'TAKEN' THEN 1 END)::int AS pending_count
     FROM possession_records pr
     JOIN land_parcels lp ON lp.id = pr.parcel_id
     ${whereClause}`,
    params
  );

  const recordsRes = await pool.query(
    `SELECT pr.*,
            lp.ulpin, lp.survey_number, lp.village, lp.district AS parcel_district, lp.area_acres,
            lp.possession_status AS parcel_possession_status,
            p.code AS project_code, p.title AS project_title,
            u.name AS officer_name, u.designation AS officer_designation
     FROM possession_records pr
     JOIN land_parcels lp ON lp.id = pr.parcel_id
     JOIN projects p ON p.id = pr.project_id
     LEFT JOIN users u ON u.id = pr.possession_officer_id
     ${whereClause}
     ORDER BY pr.created_at DESC
     LIMIT 100`,
    params
  );

  return {
    metrics: totalsRes.rows[0],
    records: recordsRes.rows,
  };
};

/**
 * Retrieves possession tasks assigned to a possession officer.
 */
export const getPossessionTasks = async (userId: string) => {
  const result = await pool.query(
    `SELECT wt.id AS task_id, wt.status AS task_status, wt.started_at, wt.completed_at,
            we.id AS execution_id, we.parcel_id,
            lp.ulpin, lp.survey_number, lp.village, lp.district AS parcel_district, lp.area_acres,
            lp.possession_status AS parcel_possession_status,
            pr.id AS possession_record_id, pr.status AS possession_record_status, pr.possession_date,
            p.id AS project_id, p.code AS project_code, p.title AS project_title
     FROM workflow_tasks wt
     JOIN workflow_executions we ON we.id = wt.workflow_execution_id
     JOIN workflow_nodes wn ON wn.id = we.node_id
     JOIN workflow_instances wi ON wi.id = we.workflow_instance_id
     JOIN projects p ON p.id = wi.project_id
     JOIN land_parcels lp ON lp.id = we.parcel_id
     LEFT JOIN possession_records pr ON pr.project_id = p.id AND pr.parcel_id = lp.id
     WHERE wt.assigned_to = $1 AND wn.responsible_role = 'POSSESSION_OFFICER'
     ORDER BY wt.created_at DESC`,
    [userId]
  );

  return result.rows;
};

/**
 * Retrieves a single possession record by ID with attached evidence.
 */
export const getPossessionRecordById = async (recordId: string) => {
  const result = await pool.query(
    `SELECT pr.*,
            lp.ulpin, lp.survey_number, lp.village, lp.district AS parcel_district,
            lp.state AS parcel_state, lp.area_acres, lp.land_type,
            p.code AS project_code, p.title AS project_title,
            u.name AS officer_name, u.designation AS officer_designation
     FROM possession_records pr
     JOIN land_parcels lp ON lp.id = pr.parcel_id
     JOIN projects p ON p.id = pr.project_id
     LEFT JOIN users u ON u.id = pr.possession_officer_id
     WHERE pr.id = $1`,
    [recordId]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, "Possession record not found");
  }

  const row = result.rows[0];

  // Fetch linked evidence / photos
  const docsRes = await pool.query(
    `SELECT * FROM documents WHERE project_id = $1 AND (document_type = 'EVIDENCE' OR title ILIKE '%possession%')`,
    [row.project_id]
  );

  return {
    ...row,
    evidence: docsRes.rows,
  };
};

/**
 * Uploads/links evidence or field photos to a possession record.
 */
export const linkPossessionEvidence = async (
  recordId: string,
  payload: { title: string; filePath: string; remarks?: string },
  userId: string
) => {
  const record = await getPossessionRecordById(recordId);

  const docRes = await pool.query(
    `INSERT INTO documents
     (project_id, title, document_type, file_path, verification_status, uploader_id)
     VALUES ($1, $2, 'EVIDENCE', $3, 'VERIFIED', $4)
     RETURNING *`,
    [record.project_id, payload.title || "Field Possession Evidence", payload.filePath, userId]
  );

  await createAuditEvent({
    userId,
    userRole: "POSSESSION_OFFICER",
    action: "POSSESSION_EVIDENCE_UPLOADED",
    entityType: "POSSESSION_RECORD",
    entityId: recordId,
    projectId: record.project_id,
    parcelId: record.parcel_id,
    details: { documentId: docRes.rows[0].id, title: payload.title },
  });

  return docRes.rows[0];
};

/**
 * Completes physical possession execution.
 * Direct completion with no second approval step as per Section 17.
 */
export const completePossessionRecord = async (recordId: string, userId: string) => {
  const record = await getPossessionRecordById(recordId);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Mark possession record as COMPLETED
    const updatedRecord = await client.query(
      `UPDATE possession_records SET
         status = 'COMPLETED',
         possession_date = COALESCE(possession_date, CURRENT_DATE),
         possession_officer_id = COALESCE(possession_officer_id, $1),
         updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [userId, recordId]
    );

    // 2. Mark parcel possession_status as TAKEN
    await client.query(
      `UPDATE land_parcels SET possession_status = 'TAKEN' WHERE id = $1`,
      [record.parcel_id]
    );

    // 3. Emit in-app notification
    const projRes = await client.query(`SELECT created_by FROM projects WHERE id = $1`, [record.project_id]);
    const requestorId = projRes.rows[0]?.created_by;
    if (requestorId) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, 'Physical Possession Completed', $2, 'POSSESSION_COMPLETED', $3)`,
        [
          requestorId,
          `Physical possession and field demarcation completed for parcel ${record.ulpin} in village ${record.village}.`,
          `/projects/${record.project_id}`,
        ]
      );
    }

    await client.query("COMMIT");

    await createAuditEvent({
      userId,
      userRole: "POSSESSION_OFFICER",
      action: "POSSESSION_COMPLETED",
      entityType: "POSSESSION_RECORD",
      entityId: recordId,
      projectId: record.project_id,
      parcelId: record.parcel_id,
    });

    return updatedRecord.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
