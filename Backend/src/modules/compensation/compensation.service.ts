import { pool } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { createAuditEvent } from "../../utils/audit";

export interface CreateCompensationPayload {
  projectId: string;
  parcelId: string;
  beneficiaryReference: string;
  assessedAmount: number;
  approvedAmount?: number;
  paidAmount?: number;
  paymentStatus?: string;
  remarks?: string;
}

export interface UpdateCompensationPayload {
  assessedAmount?: number;
  approvedAmount?: number;
  paidAmount?: number;
  paymentStatus?: string;
  paymentReference?: string;
  paymentDate?: string;
  remarks?: string;
}

/**
 * Returns dashboard metrics for compensation: assessed, approved, paid, pending totals.
 */
export const getCompensationDashboard = async (filter?: { state?: string; district?: string; projectId?: string }) => {
  let whereClause = "WHERE 1=1";
  const params: any[] = [];

  if (filter?.projectId) {
    params.push(filter.projectId);
    whereClause += ` AND cr.project_id = $${params.length}`;
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
    `SELECT COUNT(DISTINCT cr.id)::int AS total_records,
            COUNT(DISTINCT cr.parcel_id)::int AS total_parcels,
            COALESCE(SUM(cr.assessed_amount), 0)::numeric(15,2) AS total_assessed,
            COALESCE(SUM(cr.approved_amount), 0)::numeric(15,2) AS total_approved,
            COALESCE(SUM(cr.paid_amount), 0)::numeric(15,2) AS total_paid,
            COALESCE(SUM(cr.pending_amount), 0)::numeric(15,2) AS total_pending,
            COUNT(CASE WHEN cr.payment_status = 'COMPLETED' THEN 1 END)::int AS completed_count,
            COUNT(CASE WHEN cr.payment_status = 'PENDING' THEN 1 END)::int AS pending_count
     FROM compensation_records cr
     JOIN land_parcels lp ON lp.id = cr.parcel_id
     ${whereClause}`,
    params
  );

  const recordsRes = await pool.query(
    `SELECT cr.*,
            lp.ulpin, lp.survey_number, lp.village, lp.district AS parcel_district, lp.area_acres,
            p.code AS project_code, p.title AS project_title
     FROM compensation_records cr
     JOIN land_parcels lp ON lp.id = cr.parcel_id
     JOIN projects p ON p.id = cr.project_id
     ${whereClause}
     ORDER BY cr.created_at DESC
     LIMIT 100`,
    params
  );

  return {
    metrics: totalsRes.rows[0],
    records: recordsRes.rows,
  };
};

/**
 * Retrieves compensation tasks assigned to an officer.
 */
export const getCompensationTasks = async (userId: string) => {
  const result = await pool.query(
    `SELECT wt.id AS task_id, wt.status AS task_status, wt.started_at, wt.completed_at,
            we.id AS execution_id, we.parcel_id,
            lp.ulpin, lp.survey_number, lp.village, lp.district AS parcel_district, lp.area_acres,
            cr.id AS compensation_record_id, cr.assessed_amount, cr.approved_amount,
            cr.paid_amount, cr.pending_amount, cr.payment_status, cr.payment_reference,
            p.id AS project_id, p.code AS project_code, p.title AS project_title
     FROM workflow_tasks wt
     JOIN workflow_executions we ON we.id = wt.workflow_execution_id
     JOIN workflow_nodes wn ON wn.id = we.node_id
     JOIN workflow_instances wi ON wi.id = we.workflow_instance_id
     JOIN projects p ON p.id = wi.project_id
     JOIN land_parcels lp ON lp.id = we.parcel_id
     LEFT JOIN compensation_records cr ON cr.project_id = p.id AND cr.parcel_id = lp.id
     WHERE wt.assigned_to = $1 AND wn.responsible_role = 'COMPENSATION_OFFICER'
     ORDER BY wt.created_at DESC`,
    [userId]
  );

  return result.rows;
};

/**
 * Retrieves a single compensation record by ID.
 */
export const getCompensationRecordById = async (recordId: string) => {
  const result = await pool.query(
    `SELECT cr.*,
            lp.ulpin, lp.survey_number, lp.village, lp.district AS parcel_district,
            lp.state AS parcel_state, lp.area_acres, lp.land_type,
            p.code AS project_code, p.title AS project_title
     FROM compensation_records cr
     JOIN land_parcels lp ON lp.id = cr.parcel_id
     JOIN projects p ON p.id = cr.project_id
     WHERE cr.id = $1`,
    [recordId]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, "Compensation record not found");
  }

  return result.rows[0];
};

/**
 * Creates a compensation record.
 */
export const createCompensationRecord = async (payload: CreateCompensationPayload, userId: string) => {
  const {
    projectId,
    parcelId,
    beneficiaryReference,
    assessedAmount,
    approvedAmount = 0,
    paidAmount = 0,
    paymentStatus = "PENDING",
    remarks,
  } = payload;

  const pendingAmount = Math.max(0, (approvedAmount || assessedAmount) - paidAmount);

  const result = await pool.query(
    `INSERT INTO compensation_records
     (project_id, parcel_id, beneficiary_reference, assessed_amount, approved_amount, paid_amount, pending_amount, payment_status, remarks, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      projectId,
      parcelId,
      beneficiaryReference,
      assessedAmount,
      approvedAmount,
      paidAmount,
      pendingAmount,
      paymentStatus,
      remarks,
      userId,
    ]
  );

  await createAuditEvent({
    userId,
    userRole: "COMPENSATION_OFFICER",
    action: "COMPENSATION_CREATED",
    entityType: "COMPENSATION_RECORD",
    entityId: result.rows[0].id,
    projectId,
    parcelId,
    details: { assessedAmount, approvedAmount },
  });

  return result.rows[0];
};

/**
 * Updates a compensation record.
 */
export const updateCompensationRecord = async (recordId: string, updates: UpdateCompensationPayload, userId: string) => {
  const existing = await getCompensationRecordById(recordId);

  const assessedAmount = updates.assessedAmount ?? existing.assessed_amount;
  const approvedAmount = updates.approvedAmount ?? existing.approved_amount;
  const paidAmount = updates.paidAmount ?? existing.paid_amount;
  const pendingAmount = Math.max(0, approvedAmount - paidAmount);
  const paymentStatus = updates.paymentStatus ?? (paidAmount >= approvedAmount && approvedAmount > 0 ? "COMPLETED" : existing.payment_status);

  const result = await pool.query(
    `UPDATE compensation_records SET
       assessed_amount = $1,
       approved_amount = $2,
       paid_amount = $3,
       pending_amount = $4,
       payment_status = $5,
       payment_reference = COALESCE($6, payment_reference),
       payment_date = COALESCE($7::date, payment_date),
       remarks = COALESCE($8, remarks),
       updated_by = $9,
       updated_at = NOW()
     WHERE id = $10
     RETURNING *`,
    [
      assessedAmount,
      approvedAmount,
      paidAmount,
      pendingAmount,
      paymentStatus,
      updates.paymentReference || null,
      updates.paymentDate || null,
      updates.remarks || null,
      userId,
      recordId,
    ]
  );

  // If status becomes COMPLETED, update parcel compensation_status
  if (paymentStatus === "COMPLETED") {
    await pool.query(
      `UPDATE land_parcels SET compensation_status = 'DISBURSED' WHERE id = $1`,
      [existing.parcel_id]
    );
  }

  await createAuditEvent({
    userId,
    userRole: "COMPENSATION_OFFICER",
    action: "COMPENSATION_UPDATED",
    entityType: "COMPENSATION_RECORD",
    entityId: recordId,
    projectId: existing.project_id,
    parcelId: existing.parcel_id,
    details: { assessedAmount, approvedAmount, paidAmount, paymentStatus },
  });

  return result.rows[0];
};

/**
 * Marks compensation as paid.
 */
export const markCompensationPaid = async (
  recordId: string,
  payload: { paymentReference?: string; paymentDate?: string },
  userId: string
) => {
  const existing = await getCompensationRecordById(recordId);
  const approvedAmount = existing.approved_amount || existing.assessed_amount;
  const paymentReference = payload.paymentReference || `PFMS-DISB-${Date.now()}`;
  const paymentDate = payload.paymentDate || new Date().toISOString().split("T")[0];

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `UPDATE compensation_records SET
         paid_amount = $1,
         pending_amount = 0,
         payment_status = 'COMPLETED',
         payment_reference = $2,
         payment_date = $3::date,
         updated_by = $4,
         updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [approvedAmount, paymentReference, paymentDate, userId, recordId]
    );

    // Update parcel status
    await client.query(
      `UPDATE land_parcels SET compensation_status = 'DISBURSED' WHERE id = $1`,
      [existing.parcel_id]
    );

    // Emit in-app notification
    const projRes = await client.query(`SELECT created_by FROM projects WHERE id = $1`, [existing.project_id]);
    const requestorId = projRes.rows[0]?.created_by;
    if (requestorId) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, 'Compensation Disbursed', $2, 'COMPENSATION_COMPLETED', $3)`,
        [
          requestorId,
          `Statutory compensation of ₹${approvedAmount.toLocaleString()} has been disbursed for parcel ${existing.ulpin} (Ref: ${paymentReference}).`,
          `/projects/${existing.project_id}`,
        ]
      );
    }

    await client.query("COMMIT");

    await createAuditEvent({
      userId,
      userRole: "COMPENSATION_OFFICER",
      action: "COMPENSATION_COMPLETED",
      entityType: "COMPENSATION_RECORD",
      entityId: recordId,
      projectId: existing.project_id,
      parcelId: existing.parcel_id,
      details: { approvedAmount, paymentReference, paymentDate },
    });

    return result.rows[0];
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Completes an assigned Compensation Officer task.
 */
export const completeCompensationTask = async (taskId: string, userId: string) => {
  const taskRes = await pool.query(
    `SELECT wt.*, we.parcel_id, we.workflow_instance_id, wi.project_id
     FROM workflow_tasks wt
     JOIN workflow_executions we ON we.id = wt.workflow_execution_id
     JOIN workflow_instances wi ON wi.id = we.workflow_instance_id
     WHERE wt.id = $1`,
    [taskId]
  );

  if (taskRes.rows.length === 0) {
    throw new ApiError(404, "Compensation task not found");
  }

  const task = taskRes.rows[0];

  await pool.query(
    `UPDATE workflow_tasks SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [taskId]
  );

  await pool.query(
    `UPDATE workflow_executions SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [task.workflow_execution_id]
  );

  await createAuditEvent({
    userId,
    userRole: "COMPENSATION_OFFICER",
    action: "COMPENSATION_TASK_COMPLETED",
    entityType: "TASK",
    entityId: taskId,
    projectId: task.project_id,
  });

  return { success: true, taskId, status: "COMPLETED" };
};
