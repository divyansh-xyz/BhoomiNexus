import { pool } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { getWorkflowInstance, assertWorkflowEditable } from "./workflowGraph.service";
import { validateWorkflowGraph } from "./workflowValidation.service";
import { createAuditEvent } from "../../utils/audit";

/**
 * Phase 9 — Workflow Atomic Activation Service
 * Freezes the topology, creates initial runtime executions and actionable tasks,
 * and notifies assigned operational officers.
 */
export const activateWorkflow = async (projectId: string, userId: string) => {
  const instance = await getWorkflowInstance(projectId);
  assertWorkflowEditable(instance);

  // 1. Run Validation
  const validation = await validateWorkflowGraph(projectId);
  if (!validation.isValid) {
    throw new ApiError(
      400,
      `Cannot activate invalid workflow: ${validation.errors.map(e => e.message).join("; ")}`
    );
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 2. Freeze Workflow Instance
    await client.query(
      `UPDATE workflow_instances SET
         status = 'ACTIVE',
         activated_at = NOW(),
         activated_by = $1,
         updated_at = NOW()
       WHERE id = $2`,
      [userId, instance.id]
    );

    // 3. Update Project Status
    await client.query(
      `UPDATE projects SET status = 'WORKFLOW_ACTIVE', updated_at = NOW() WHERE id = $1`,
      [projectId]
    );

    // 4. Determine Initial Actionable Nodes
    // In V2 graph, initial actionable nodes have no incoming dependencies or incoming edges only from DISTRICT root
    const rootNodesRes = await client.query(
      `SELECT id FROM workflow_nodes WHERE workflow_instance_id = $1 AND node_type = 'DISTRICT'`,
      [instance.id]
    );
    const rootNodeIds = rootNodesRes.rows.map(r => r.id);

    // Nodes that have incoming edge from rootNodeIds, or no incoming edges at all
    const actionableNodesRes = await client.query(
      `SELECT DISTINCT wn.*
       FROM workflow_nodes wn
       LEFT JOIN workflow_edges we ON we.target_node_id = wn.id
       WHERE wn.workflow_instance_id = $1
         AND wn.node_type != 'DISTRICT'
         AND (we.id IS NULL OR we.source_node_id = ANY($2::uuid[]))`,
      [instance.id, rootNodeIds.length > 0 ? rootNodeIds : ['00000000-0000-0000-0000-000000000000']]
    );

    const actionableNodes = actionableNodesRes.rows;
    let executionCount = 0;
    let taskCount = 0;

    // Default officer lookup if node doesn't specify a responsible_user_id directly
    const defaultOfficerRes = await client.query(
      `SELECT id FROM users WHERE role_id IN ('PROCESSING_OFFICER', 'COMPENSATION_OFFICER', 'POSSESSION_OFFICER') LIMIT 1`
    );
    const defaultOfficerId = defaultOfficerRes.rows[0]?.id || userId;

    // 5. Generate Runtime Executions & Initial Tasks for Assigned Parcels
    for (const node of actionableNodes) {
      const parcelsRes = await client.query(
        `SELECT parcel_id FROM workflow_node_parcels WHERE workflow_node_id = $1`,
        [node.id]
      );

      const assignedOfficerId = node.responsible_user_id || defaultOfficerId;

      for (const p of parcelsRes.rows) {
        // Create workflow execution
        const execRes = await client.query(
          `INSERT INTO workflow_executions
           (workflow_instance_id, parcel_id, node_id, status, started_at)
           VALUES ($1, $2, $3, 'IN_PROGRESS', NOW())
           RETURNING id`,
          [instance.id, p.parcel_id, node.id]
        );
        const executionId = execRes.rows[0].id;
        executionCount++;

        // Create runtime workflow task
        await client.query(
          `INSERT INTO workflow_tasks
           (workflow_execution_id, assigned_to, status, started_at)
           VALUES ($1, $2, 'ASSIGNED', NOW())`,
          [executionId, assignedOfficerId]
        );
        taskCount++;

        // Update parcel lifecycle acquisition_status to IN_PROGRESS
        await client.query(
          `UPDATE land_parcels SET acquisition_status = 'IN_PROGRESS' WHERE id = $1`,
          [p.parcel_id]
        );
      }
    }

    // 6. Record Notification for Assigned Officers and Requesting Authority
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type, link)
       SELECT DISTINCT assigned_to,
              'New Acquisition Workflow Activated',
              'A workflow has been activated for project: ' || $1 || '. You have new tasks pending review.',
              'TASK_ASSIGNED',
              '/officer/dashboard'
       FROM workflow_tasks wt
       JOIN workflow_executions we ON we.id = wt.workflow_execution_id
       WHERE we.workflow_instance_id = $2`,
      [projectId, instance.id]
    );

    await client.query("COMMIT");

    await createAuditEvent({
      userId,
      userRole: "BOSS",
      action: "WORKFLOW_ACTIVATE",
      entityType: "WORKFLOW_INSTANCE",
      entityId: instance.id,
      details: { projectId, executionCount, taskCount, activatedAt: new Date().toISOString() },
    });

    return {
      success: true,
      workflowInstanceId: instance.id,
      status: "ACTIVE",
      executionCount,
      taskCount,
      message: "Workflow topology frozen and runtime tasks generated successfully",
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
