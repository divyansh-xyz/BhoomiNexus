import { pool } from "../../config/db";

// ==========================================
// WORKFLOW NODES REPOSITORY
// ==========================================

export interface CreateNodePayload {
  workflowInstanceId: string;
  nodeKey: string;
  name: string;
  nodeType?: string;
  responsibleRole?: string;
  responsibleUnitId?: string;
  responsibleUserId?: string;
  configuration?: any;
  templateSource?: string;
  xPosition?: number;
  yPosition?: number;
}

export const createWorkflowNode = async (payload: CreateNodePayload) => {
  const result = await pool.query(
    `INSERT INTO workflow_nodes (
       workflow_instance_id, node_key, name, node_type, responsible_role,
       responsible_unit_id, responsible_user_id, configuration, template_source,
       x_position, y_position
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      payload.workflowInstanceId,
      payload.nodeKey,
      payload.name,
      payload.nodeType || "STAGE",
      payload.responsibleRole || null,
      payload.responsibleUnitId || null,
      payload.responsibleUserId || null,
      JSON.stringify(payload.configuration || {}),
      payload.templateSource || null,
      payload.xPosition ?? 0,
      payload.yPosition ?? 0,
    ]
  );
  return result.rows[0];
};

export const updateWorkflowNode = async (id: string, updates: Partial<CreateNodePayload>) => {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (updates.name !== undefined) {
    fields.push(`name = $${idx++}`);
    values.push(updates.name);
  }
  if (updates.nodeType !== undefined) {
    fields.push(`node_type = $${idx++}`);
    values.push(updates.nodeType);
  }
  if (updates.responsibleRole !== undefined) {
    fields.push(`responsible_role = $${idx++}`);
    values.push(updates.responsibleRole);
  }
  if (updates.responsibleUnitId !== undefined) {
    fields.push(`responsible_unit_id = $${idx++}`);
    values.push(updates.responsibleUnitId);
  }
  if (updates.responsibleUserId !== undefined) {
    fields.push(`responsible_user_id = $${idx++}`);
    values.push(updates.responsibleUserId);
  }
  if (updates.configuration !== undefined) {
    fields.push(`configuration = $${idx++}::jsonb`);
    values.push(JSON.stringify(updates.configuration));
  }
  if (updates.xPosition !== undefined) {
    fields.push(`x_position = $${idx++}`);
    values.push(updates.xPosition);
  }
  if (updates.yPosition !== undefined) {
    fields.push(`y_position = $${idx++}`);
    values.push(updates.yPosition);
  }

  if (fields.length === 0) return null;

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query(
    `UPDATE workflow_nodes SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] || null;
};

export const deleteWorkflowNode = async (id: string) => {
  const result = await pool.query(`DELETE FROM workflow_nodes WHERE id = $1 RETURNING id`, [id]);
  return result.rows.length > 0;
};

export const getWorkflowNodesByInstance = async (workflowInstanceId: string) => {
  const result = await pool.query(
    `SELECT wn.*, u.name AS responsible_user_name, u.designation AS responsible_user_designation
     FROM workflow_nodes wn
     LEFT JOIN users u ON u.id = wn.responsible_user_id
     WHERE wn.workflow_instance_id = $1
     ORDER BY wn.created_at ASC`,
    [workflowInstanceId]
  );
  return result.rows;
};

// ==========================================
// WORKFLOW EDGES REPOSITORY
// ==========================================

export interface CreateEdgePayload {
  workflowInstanceId: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType?: string;
  condition?: any;
}

export const createWorkflowEdge = async (payload: CreateEdgePayload) => {
  const result = await pool.query(
    `INSERT INTO workflow_edges (workflow_instance_id, source_node_id, target_node_id, edge_type, condition)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      payload.workflowInstanceId,
      payload.sourceNodeId,
      payload.targetNodeId,
      payload.edgeType || "STANDARD",
      JSON.stringify(payload.condition || {}),
    ]
  );
  return result.rows[0];
};

export const deleteWorkflowEdge = async (id: string) => {
  const result = await pool.query(`DELETE FROM workflow_edges WHERE id = $1 RETURNING id`, [id]);
  return result.rows.length > 0;
};

export const getWorkflowEdgesByInstance = async (workflowInstanceId: string) => {
  const result = await pool.query(
    `SELECT * FROM workflow_edges WHERE workflow_instance_id = $1 ORDER BY created_at ASC`,
    [workflowInstanceId]
  );
  return result.rows;
};

// ==========================================
// NODE PARCELS (COHORTS) REPOSITORY
// ==========================================

export const assignParcelToNode = async (workflowNodeId: string, parcelId: string, assignedBy?: string) => {
  const result = await pool.query(
    `INSERT INTO workflow_node_parcels (workflow_node_id, parcel_id, assigned_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (workflow_node_id, parcel_id) DO NOTHING
     RETURNING *`,
    [workflowNodeId, parcelId, assignedBy || null]
  );
  return result.rows[0] || null;
};

export const removeParcelFromNode = async (workflowNodeId: string, parcelId: string) => {
  const result = await pool.query(
    `DELETE FROM workflow_node_parcels WHERE workflow_node_id = $1 AND parcel_id = $2 RETURNING id`,
    [workflowNodeId, parcelId]
  );
  return result.rows.length > 0;
};

export const getNodeParcels = async (workflowNodeId: string) => {
  const result = await pool.query(
    `SELECT wnp.*, lp.ulpin, lp.survey_number, lp.village, lp.area_acres, lp.land_type
     FROM workflow_node_parcels wnp
     JOIN land_parcels lp ON lp.id = wnp.parcel_id
     WHERE wnp.workflow_node_id = $1
     ORDER BY wnp.assigned_at ASC`,
    [workflowNodeId]
  );
  return result.rows;
};

// ==========================================
// WORKFLOW EXECUTIONS REPOSITORY
// ==========================================

export interface CreateExecutionPayload {
  workflowInstanceId: string;
  parcelId: string;
  nodeId: string;
  status?: string;
  attemptNumber?: number;
}

export const createWorkflowExecution = async (payload: CreateExecutionPayload) => {
  const result = await pool.query(
    `INSERT INTO workflow_executions (workflow_instance_id, parcel_id, node_id, status, attempt_number)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      payload.workflowInstanceId,
      payload.parcelId,
      payload.nodeId,
      payload.status || "PENDING",
      payload.attemptNumber || 1,
    ]
  );
  return result.rows[0];
};

export const updateWorkflowExecutionStatus = async (
  id: string,
  status: string,
  rejectionReason?: string
) => {
  const isCompleted = status === "COMPLETED";
  const isStarted = status === "ACTIVE" || status === "IN_PROGRESS";

  const result = await pool.query(
    `UPDATE workflow_executions
     SET status = $1,
         started_at = CASE WHEN $2 THEN COALESCE(started_at, NOW()) ELSE started_at END,
         completed_at = CASE WHEN $3 THEN NOW() ELSE completed_at END,
         rejection_reason = COALESCE($4, rejection_reason),
         updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [status, isStarted, isCompleted, rejectionReason || null, id]
  );
  return result.rows[0] || null;
};

// ==========================================
// WORKFLOW TASKS REPOSITORY
// ==========================================

export const createWorkflowTask = async (workflowExecutionId: string, assignedTo?: string) => {
  const result = await pool.query(
    `INSERT INTO workflow_tasks (workflow_execution_id, assigned_to, status)
     VALUES ($1, $2, 'ASSIGNED')
     RETURNING *`,
    [workflowExecutionId, assignedTo || null]
  );
  return result.rows[0];
};

export const updateWorkflowTaskStatus = async (id: string, status: string) => {
  const isCompleted = status === "COMPLETED" || status === "ACCEPTED";
  const isStarted = status === "IN_PROGRESS";

  const result = await pool.query(
    `UPDATE workflow_tasks
     SET status = $1,
         started_at = CASE WHEN $2 THEN COALESCE(started_at, NOW()) ELSE started_at END,
         completed_at = CASE WHEN $3 THEN NOW() ELSE completed_at END,
         last_action_at = NOW(),
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [status, isStarted, isCompleted, id]
  );
  return result.rows[0] || null;
};

// ==========================================
// COMPENSATION RECORDS REPOSITORY
// ==========================================

export interface CreateCompensationPayload {
  projectId: string;
  parcelId: string;
  beneficiaryReference: string;
  assessedAmount?: number;
  approvedAmount?: number;
  paidAmount?: number;
  pendingAmount?: number;
  paymentStatus?: string;
  paymentReference?: string;
  paymentDate?: string;
  remarks?: string;
  createdBy?: string;
}

export const createCompensationRecord = async (payload: CreateCompensationPayload) => {
  const assessed = payload.assessedAmount || 0;
  const approved = payload.approvedAmount || assessed;
  const paid = payload.paidAmount || 0;
  const pending = payload.pendingAmount ?? (approved - paid);

  const result = await pool.query(
    `INSERT INTO compensation_records (
       project_id, parcel_id, beneficiary_reference, assessed_amount,
       approved_amount, paid_amount, pending_amount, payment_status,
       payment_reference, payment_date, remarks, created_by
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [
      payload.projectId,
      payload.parcelId,
      payload.beneficiaryReference,
      assessed,
      approved,
      paid,
      pending,
      payload.paymentStatus || "PENDING",
      payload.paymentReference || null,
      payload.paymentDate || null,
      payload.remarks || null,
      payload.createdBy || null,
    ]
  );
  return result.rows[0];
};

export const getCompensationRecordsByProject = async (projectId: string) => {
  const result = await pool.query(
    `SELECT cr.*, lp.ulpin, lp.survey_number, lp.village, lp.area_acres
     FROM compensation_records cr
     JOIN land_parcels lp ON lp.id = cr.parcel_id
     WHERE cr.project_id = $1
     ORDER BY cr.created_at DESC`,
    [projectId]
  );
  return result.rows;
};

// ==========================================
// POSSESSION RECORDS REPOSITORY
// ==========================================

export interface CreatePossessionPayload {
  projectId: string;
  parcelId: string;
  status?: string;
  takenAt?: string;
  takenBy?: string;
  remarks?: string;
}

export const createPossessionRecord = async (payload: CreatePossessionPayload) => {
  const result = await pool.query(
    `INSERT INTO possession_records (project_id, parcel_id, status, taken_at, taken_by, remarks)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (parcel_id) DO UPDATE SET
       status = EXCLUDED.status,
       taken_at = COALESCE(EXCLUDED.taken_at, possession_records.taken_at),
       taken_by = COALESCE(EXCLUDED.taken_by, possession_records.taken_by),
       remarks = COALESCE(EXCLUDED.remarks, possession_records.remarks),
       updated_at = NOW()
     RETURNING *`,
    [
      payload.projectId,
      payload.parcelId,
      payload.status || "PENDING",
      payload.takenAt || null,
      payload.takenBy || null,
      payload.remarks || null,
    ]
  );
  return result.rows[0];
};

export const getPossessionRecordsByProject = async (projectId: string) => {
  const result = await pool.query(
    `SELECT pr.*, lp.ulpin, lp.survey_number, lp.village, lp.area_acres
     FROM possession_records pr
     JOIN land_parcels lp ON lp.id = pr.parcel_id
     WHERE pr.project_id = $1
     ORDER BY pr.created_at DESC`,
    [projectId]
  );
  return result.rows;
};
