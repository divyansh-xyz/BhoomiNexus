import { pool } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { createAuditEvent } from "../../utils/audit";

/**
 * Phase 10 & 11 — Runtime Execution Engine & Acquisition Task Lifecycle Service
 */

export const getV2Tasks = async (userId: string, filter?: { status?: string; projectId?: string }) => {
  let query = `
    SELECT wt.id, wt.status, wt.started_at, wt.completed_at, wt.assigned_at,
           we.id AS execution_id, we.parcel_id, we.status AS execution_status,
           we.rejection_reason,
           lp.ulpin, lp.survey_number, lp.village, lp.district AS parcel_district,
           lp.state AS parcel_state, lp.area_acres, lp.land_type,
           wn.id AS node_id, wn.node_key, wn.name AS node_name, wn.node_type,
           wn.responsible_role, wn.configuration AS node_configuration,
           wi.project_id,
           p.code AS project_code, p.title AS project_title,
           u.name AS officer_name, u.designation AS officer_designation
    FROM workflow_tasks wt
    JOIN workflow_executions we ON we.id = wt.workflow_execution_id
    JOIN land_parcels lp ON lp.id = we.parcel_id
    JOIN workflow_nodes wn ON wn.id = we.node_id
    JOIN workflow_instances wi ON wi.id = we.workflow_instance_id
    JOIN projects p ON p.id = wi.project_id
    LEFT JOIN users u ON u.id = wt.assigned_to
    WHERE wt.assigned_to = $1
  `;
  const params: any[] = [userId];

  if (filter?.status) {
    params.push(filter.status);
    query += ` AND wt.status = $${params.length}`;
  }

  if (filter?.projectId) {
    params.push(filter.projectId);
    query += ` AND wi.project_id = $${params.length}`;
  }

  query += ` ORDER BY wt.created_at DESC`;

  const result = await pool.query(query, params);
  return result.rows;
};

export const getV2TaskById = async (taskId: string) => {
  const result = await pool.query(
    `SELECT wt.id, wt.status, wt.started_at, wt.completed_at, wt.assigned_at,
            we.id AS execution_id, we.parcel_id, we.status AS execution_status,
            we.rejection_reason,
            lp.id AS land_parcel_id, lp.ulpin, lp.survey_number, lp.owner_reference,
            lp.village, lp.district, lp.state, lp.area_acres, lp.area_ha, lp.land_type,
            lp.acquisition_status, lp.compensation_status, lp.possession_status,
            wn.id AS node_id, wn.node_key, wn.name AS node_name, wn.node_type,
            wn.responsible_role, wn.configuration AS node_configuration,
            wi.project_id,
            p.code AS project_code, p.title AS project_title, p.state AS project_state,
            p.district AS project_district,
            u.id AS officer_id, u.name AS officer_name, u.designation AS officer_designation,
            u.department AS officer_department
     FROM workflow_tasks wt
     JOIN workflow_executions we ON we.id = wt.workflow_execution_id
     JOIN land_parcels lp ON lp.id = we.parcel_id
     JOIN workflow_nodes wn ON wn.id = we.node_id
     JOIN workflow_instances wi ON wi.id = we.workflow_instance_id
     JOIN projects p ON p.id = wi.project_id
     LEFT JOIN users u ON u.id = wt.assigned_to
     WHERE wt.id = $1`,
    [taskId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];

  // Fetch linked evidence / documents
  const evidenceRes = await pool.query(
    `SELECT d.* FROM documents d WHERE d.project_id = $1 ORDER BY d.created_at DESC`,
    [row.project_id]
  );

  return {
    ...row,
    evidence: evidenceRes.rows,
  };
};

export const startV2Task = async (taskId: string, userId: string) => {
  const task = await getV2TaskById(taskId);
  if (!task) {
    throw new ApiError(404, "Workflow task not found");
  }

  if (task.status !== "ASSIGNED") {
    throw new ApiError(400, `Task cannot be started from current status '${task.status}'`);
  }

  const result = await pool.query(
    `UPDATE workflow_tasks SET status = 'IN_PROGRESS', started_at = NOW(), updated_at = NOW()
     WHERE id = $1 RETURNING *`,
    [taskId]
  );

  await createAuditEvent({
    userId,
    userRole: task.responsible_role || "PROCESSING_OFFICER",
    action: "TASK_STARTED",
    entityType: "TASK",
    entityId: taskId,
    projectId: task.project_id,
  });

  return result.rows[0];
};

export const acceptV2Task = async (taskId: string, userId: string) => {
  const task = await getV2TaskById(taskId);
  if (!task) {
    throw new ApiError(404, "Workflow task not found");
  }

  if (task.status !== "IN_PROGRESS" && task.status !== "ASSIGNED") {
    throw new ApiError(400, `Task cannot be accepted from status '${task.status}'`);
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Complete current task
    await client.query(
      `UPDATE workflow_tasks SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [taskId]
    );

    // 2. Complete current execution
    await client.query(
      `UPDATE workflow_executions SET status = 'COMPLETED', completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [task.execution_id]
    );

    // 3. Find downstream target nodes via workflow_edges
    const nextEdgesRes = await client.query(
      `SELECT we.target_node_id, wn.name AS target_node_name, wn.responsible_role,
              wn.responsible_user_id
       FROM workflow_edges we
       JOIN workflow_nodes wn ON wn.id = we.target_node_id
       WHERE we.source_node_id = $1`,
      [task.node_id]
    );

    let nextTasksCreated = 0;
    if (nextEdgesRes.rows.length > 0) {
      for (const edge of nextEdgesRes.rows) {
        // Create execution for parcel on target node
        const execRes = await client.query(
          `INSERT INTO workflow_executions
           (workflow_instance_id, parcel_id, node_id, status, started_at)
           SELECT workflow_instance_id, $1, $2, 'IN_PROGRESS', NOW()
           FROM workflow_executions WHERE id = $3
           RETURNING id`,
          [task.parcel_id, edge.target_node_id, task.execution_id]
        );
        const nextExecId = execRes.rows[0].id;

        // Assign task to node's officer or current user
        const assignedTo = edge.responsible_user_id || userId;
        await client.query(
          `INSERT INTO workflow_tasks (workflow_execution_id, assigned_to, status, started_at)
           VALUES ($1, $2, 'ASSIGNED', NOW())`,
          [nextExecId, assignedTo]
        );
        nextTasksCreated++;
      }
    } else {
      // Terminal node reached on this branch: mark parcel as ACQUIRED
      await client.query(
        `UPDATE land_parcels SET acquisition_status = 'ACQUIRED' WHERE id = $1`,
        [task.parcel_id]
      );
    }

    await client.query("COMMIT");

    await createAuditEvent({
      userId,
      userRole: task.responsible_role || "PROCESSING_OFFICER",
      action: "TASK_ACCEPTED",
      entityType: "TASK",
      entityId: taskId,
      projectId: task.project_id,
      details: {
        parcelId: task.parcel_id,
        nodeId: task.node_id,
        nextTasksCreated,
      },
    });

    return {
      success: true,
      taskId,
      status: "COMPLETED",
      nextTasksCreated,
      isTerminal: nextEdgesRes.rows.length === 0,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

export const rejectV2Task = async (taskId: string, userId: string, reason: string) => {
  if (!reason || reason.trim().length === 0) {
    throw new ApiError(400, "Rejection reason is mandatory");
  }

  const task = await getV2TaskById(taskId);
  if (!task) {
    throw new ApiError(404, "Workflow task not found");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Mark task as REJECTED
    await client.query(
      `UPDATE workflow_tasks SET status = 'REJECTED', updated_at = NOW() WHERE id = $1`,
      [taskId]
    );

    // Mark execution as REJECTED with reason
    await client.query(
      `UPDATE workflow_executions SET status = 'REJECTED', rejection_reason = $1, updated_at = NOW() WHERE id = $2`,
      [reason, task.execution_id]
    );

    // Notify Requesting Authority about rejection
    const projRes = await client.query(`SELECT created_by FROM projects WHERE id = $1`, [task.project_id]);
    const requestorId = projRes.rows[0]?.created_by;
    if (requestorId) {
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, link)
         VALUES ($1, 'Acquisition Task Rejected', $2, 'STAGE_REJECTED', $3)`,
        [
          requestorId,
          `Stage '${task.node_name}' for parcel ${task.ulpin} was rejected. Reason: ${reason}`,
          `/projects/${task.project_id}`,
        ]
      );
    }

    await client.query("COMMIT");

    await createAuditEvent({
      userId,
      userRole: task.responsible_role || "PROCESSING_OFFICER",
      action: "STAGE_REJECTED",
      entityType: "TASK",
      entityId: taskId,
      projectId: task.project_id,
      details: { reason, parcelId: task.parcel_id, nodeName: task.node_name },
    });

    return {
      success: true,
      taskId,
      status: "REJECTED",
      reason,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
