import { pool } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import * as graphRepo from "../../database/v2/graphRepository";
import { createAuditEvent } from "../../utils/audit";

/**
 * Retrieves the workflow instance for a project and checks if it is active/frozen.
 */
export const getWorkflowInstance = async (projectId: string) => {
  const result = await pool.query(
    `SELECT * FROM workflow_instances WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [projectId]
  );
  if (result.rows.length === 0) {
    throw new ApiError(404, "Workflow instance not found for this project");
  }
  return result.rows[0];
};

/**
 * Ensures that the workflow is not already activated. If it is active, mutation is forbidden.
 */
export const assertWorkflowEditable = (instance: { status: string }) => {
  if (instance.status === "ACTIVE" || instance.status === "COMPLETED") {
    throw new ApiError(409, "WORKFLOW_ALREADY_ACTIVATED: Workflow topology is frozen and cannot be modified");
  }
};

/**
 * Phase 8 — Standard District Initialization
 * Initializes the V2 workflow graph with standard District root:
 * District
 *   ├── Acquisition
 *   ├── Compensation
 *   └── Possession
 */
export const initializeProjectWorkflow = async (projectId: string, userId: string) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Verify project exists
    const projRes = await client.query("SELECT * FROM projects WHERE id = $1", [projectId]);
    if (projRes.rows.length === 0) {
      throw new ApiError(404, "Project not found");
    }
    const project = projRes.rows[0];

    // 2. Check existing workflow instance
    let wfRes = await client.query(
      "SELECT * FROM workflow_instances WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1",
      [projectId]
    );

    let instance: any;
    if (wfRes.rows.length > 0) {
      instance = wfRes.rows[0];
      assertWorkflowEditable(instance);
    } else {
      const insRes = await client.query(
        `INSERT INTO workflow_instances (project_id, template_name, status, version)
         VALUES ($1, 'V2 Graph Workflow', 'DRAFT', 2)
         RETURNING *`,
        [projectId]
      );
      instance = insRes.rows[0];
    }

    // 3. Clear any existing draft nodes/edges for clean initialization
    await client.query("DELETE FROM workflow_nodes WHERE workflow_instance_id = $1", [instance.id]);
    await client.query("DELETE FROM workflow_edges WHERE workflow_instance_id = $1", [instance.id]);

    // 4. Create standard District Root node
    const districtNodeRes = await client.query(
      `INSERT INTO workflow_nodes
       (workflow_instance_id, node_key, name, node_type, responsible_role, x_position, y_position)
       VALUES ($1, 'district_root', $2, 'DISTRICT', 'DISTRICT_AUTHORITY', 100, 200)
       RETURNING *`,
      [instance.id, `${project.district || 'District'} Authority`]
    );
    const districtNode = districtNodeRes.rows[0];

    // 5. Create the 3 Standard Branches: Acquisition, Compensation, Possession
    const branches = [
      {
        key: "branch_acquisition",
        name: "Acquisition Verification",
        role: "PROCESSING_OFFICER",
        type: "STAGE",
        x: 350,
        y: 100,
        desc: "Cadastral parcel title verification and field validation",
      },
      {
        key: "branch_compensation",
        name: "Compensation Determination",
        role: "COMPENSATION_OFFICER",
        type: "STAGE",
        x: 350,
        y: 200,
        desc: "Statutory compensation assessment, award declaration, and disbursement",
      },
      {
        key: "branch_possession",
        name: "Physical Possession",
        role: "POSSESSION_OFFICER",
        type: "STAGE",
        x: 350,
        y: 300,
        desc: "Physical inspection, boundary demarcation, and eviction/possession clearance",
      },
    ];

    const createdBranchNodes: any[] = [];
    for (const b of branches) {
      const bRes = await client.query(
        `INSERT INTO workflow_nodes
         (workflow_instance_id, node_key, name, node_type, responsible_role, x_position, y_position, configuration)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [instance.id, b.key, b.name, b.type, b.role, b.x, b.y, JSON.stringify({ description: b.desc })]
      );
      const bNode = bRes.rows[0];
      createdBranchNodes.push(bNode);

      // Connect edge from District Root -> Branch
      await client.query(
        `INSERT INTO workflow_edges
         (workflow_instance_id, source_node_id, target_node_id, edge_type)
         VALUES ($1, $2, $3, 'STANDARD')`,
        [instance.id, districtNode.id, bNode.id]
      );
    }

    // 6. Assign confirmed/candidate project parcels to Acquisition branch by default
    const parcelsRes = await client.query(
      `SELECT parcel_id FROM project_parcels WHERE project_id = $1`,
      [projectId]
    );
    const acqNode = createdBranchNodes[0];
    for (const p of parcelsRes.rows) {
      await client.query(
        `INSERT INTO workflow_node_parcels (workflow_node_id, parcel_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (workflow_node_id, parcel_id) DO NOTHING`,
        [acqNode.id, p.parcel_id, userId]
      );
    }

    await client.query("COMMIT");

    await createAuditEvent({
      userId,
      userRole: "BOSS",
      action: "WORKFLOW_INITIALIZE",
      entityType: "WORKFLOW_INSTANCE",
      entityId: instance.id,
      details: { projectId, branches: branches.map(b => b.key), parcelCount: parcelsRes.rows.length },
    });

    return await getWorkflowGraph(projectId);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Retrieves the complete V2 workflow graph: nodes, edges, parcel counts, and assigned officers.
 */
export const getWorkflowGraph = async (projectId: string) => {
  const instance = await getWorkflowInstance(projectId);

  // Fetch all nodes with parcel counts and assigned users
  const nodesRes = await pool.query(
    `SELECT wn.*,
            u.name AS responsible_user_name,
            u.designation AS responsible_user_designation,
            COALESCE(pc.parcel_count, 0)::int AS parcel_count
     FROM workflow_nodes wn
     LEFT JOIN users u ON u.id = wn.responsible_user_id
     LEFT JOIN (
       SELECT workflow_node_id, COUNT(*) AS parcel_count
       FROM workflow_node_parcels
       GROUP BY workflow_node_id
     ) pc ON pc.workflow_node_id = wn.id
     WHERE wn.workflow_instance_id = $1
     ORDER BY wn.created_at ASC`,
    [instance.id]
  );

  // Fetch all edges
  const edgesRes = await pool.query(
    `SELECT * FROM workflow_edges WHERE workflow_instance_id = $1 ORDER BY created_at ASC`,
    [instance.id]
  );

  return {
    workflowInstanceId: instance.id,
    projectId,
    status: instance.status,
    version: instance.version || 2,
    nodes: nodesRes.rows.map(n => ({
      id: n.id,
      nodeKey: n.node_key,
      name: n.name,
      nodeType: n.node_type,
      responsibleRole: n.responsible_role,
      responsibleUnitId: n.responsible_unit_id,
      responsibleUserId: n.responsible_user_id,
      responsibleUserName: n.responsible_user_name,
      responsibleUserDesignation: n.responsible_user_designation,
      configuration: n.configuration || {},
      templateSource: n.template_source,
      xPosition: n.x_position,
      yPosition: n.y_position,
      parcelCount: n.parcel_count,
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    })),
    edges: edgesRes.rows.map(e => ({
      id: e.id,
      sourceNodeId: e.source_node_id,
      targetNodeId: e.target_node_id,
      edgeType: e.edge_type,
      condition: e.condition || {},
      createdAt: e.created_at,
    })),
  };
};

/**
 * Creates a new workflow node in an editable workflow instance.
 */
export const createNode = async (projectId: string, payload: any, userId: string) => {
  const instance = await getWorkflowInstance(projectId);
  assertWorkflowEditable(instance);

  const node = await graphRepo.createWorkflowNode({
    workflowInstanceId: instance.id,
    nodeKey: payload.nodeKey || `node_${Date.now()}`,
    name: payload.name,
    nodeType: payload.nodeType || "STAGE",
    responsibleRole: payload.responsibleRole,
    responsibleUnitId: payload.responsibleUnitId,
    responsibleUserId: payload.responsibleUserId,
    configuration: payload.configuration,
    templateSource: payload.templateSource,
    xPosition: payload.xPosition ?? 100,
    yPosition: payload.yPosition ?? 100,
  });

  await createAuditEvent({
    userId,
    userRole: "BOSS",
    action: "WORKFLOW_NODE_CREATE",
    entityType: "WORKFLOW_NODE",
    entityId: node.id,
    details: { projectId, nodeKey: node.node_key, name: node.name },
  });

  return node;
};

/**
 * Updates an existing node in an editable workflow instance.
 */
export const updateNode = async (projectId: string, nodeId: string, updates: any, userId: string) => {
  const instance = await getWorkflowInstance(projectId);
  assertWorkflowEditable(instance);

  const updatedNode = await graphRepo.updateWorkflowNode(nodeId, updates);
  if (!updatedNode) {
    throw new ApiError(404, "Workflow node not found");
  }

  await createAuditEvent({
    userId,
    userRole: "BOSS",
    action: "WORKFLOW_NODE_UPDATE",
    entityType: "WORKFLOW_NODE",
    entityId: nodeId,
    details: { projectId, updates },
  });

  return updatedNode;
};

/**
 * Deletes a workflow node, its attached edges, and cascades parcel assignments.
 */
export const deleteNode = async (projectId: string, nodeId: string, userId: string) => {
  const instance = await getWorkflowInstance(projectId);
  assertWorkflowEditable(instance);

  // Check if node exists
  const nodeRes = await pool.query(
    `SELECT * FROM workflow_nodes WHERE id = $1 AND workflow_instance_id = $2`,
    [nodeId, instance.id]
  );
  if (nodeRes.rows.length === 0) {
    throw new ApiError(404, "Workflow node not found in this project");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Sibling merge rule for directly assigned parcels:
    // If incoming edges exist from a parent, merge assigned parcels to a sibling if available
    const parentEdge = await client.query(
      `SELECT source_node_id FROM workflow_edges WHERE target_node_id = $1 LIMIT 1`,
      [nodeId]
    );

    if (parentEdge.rows.length > 0) {
      const parentId = parentEdge.rows[0].source_node_id;
      const siblingEdge = await client.query(
        `SELECT target_node_id FROM workflow_edges WHERE source_node_id = $1 AND target_node_id != $2 LIMIT 1`,
        [parentId, nodeId]
      );

      if (siblingEdge.rows.length > 0) {
        const siblingId = siblingEdge.rows[0].target_node_id;
        await client.query(
          `UPDATE workflow_node_parcels SET workflow_node_id = $1 WHERE workflow_node_id = $2`,
          [siblingId, nodeId]
        );
      }
    }

    // Delete attached edges
    await client.query(`DELETE FROM workflow_edges WHERE source_node_id = $1 OR target_node_id = $1`, [nodeId]);

    // Delete node (cascades remaining workflow_node_parcels)
    await client.query(`DELETE FROM workflow_nodes WHERE id = $1`, [nodeId]);

    await client.query("COMMIT");

    await createAuditEvent({
      userId,
      userRole: "BOSS",
      action: "WORKFLOW_NODE_DELETE",
      entityType: "WORKFLOW_NODE",
      entityId: nodeId,
      details: { projectId },
    });

    return { success: true, message: "Node deleted successfully" };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Creates a directed workflow edge between two nodes in the same workflow instance.
 */
export const createEdge = async (projectId: string, payload: any, userId: string) => {
  const instance = await getWorkflowInstance(projectId);
  assertWorkflowEditable(instance);

  const { sourceNodeId, targetNodeId, edgeType, condition } = payload;
  if (!sourceNodeId || !targetNodeId) {
    throw new ApiError(400, "sourceNodeId and targetNodeId are required");
  }

  // Ensure both nodes belong to the same workflow instance
  const nodesCheck = await pool.query(
    `SELECT id FROM workflow_nodes WHERE id IN ($1, $2) AND workflow_instance_id = $3`,
    [sourceNodeId, targetNodeId, instance.id]
  );
  if (nodesCheck.rows.length < 2) {
    throw new ApiError(400, "Both source and target nodes must belong to this workflow instance");
  }

  // Prevent duplicate edge
  const existingEdge = await pool.query(
    `SELECT id FROM workflow_edges WHERE workflow_instance_id = $1 AND source_node_id = $2 AND target_node_id = $3`,
    [instance.id, sourceNodeId, targetNodeId]
  );
  if (existingEdge.rows.length > 0) {
    return existingEdge.rows[0];
  }

  const edge = await graphRepo.createWorkflowEdge({
    workflowInstanceId: instance.id,
    sourceNodeId,
    targetNodeId,
    edgeType: edgeType || "STANDARD",
    condition,
  });

  await createAuditEvent({
    userId,
    userRole: "BOSS",
    action: "WORKFLOW_EDGE_CREATE",
    entityType: "WORKFLOW_EDGE",
    entityId: edge.id,
    details: { projectId, sourceNodeId, targetNodeId },
  });

  return edge;
};

/**
 * Deletes a workflow edge.
 */
export const deleteEdge = async (projectId: string, edgeId: string, userId: string) => {
  const instance = await getWorkflowInstance(projectId);
  assertWorkflowEditable(instance);

  const result = await pool.query(
    `DELETE FROM workflow_edges WHERE id = $1 AND workflow_instance_id = $2 RETURNING id`,
    [edgeId, instance.id]
  );

  if (result.rows.length === 0) {
    throw new ApiError(404, "Workflow edge not found in this project");
  }

  await createAuditEvent({
    userId,
    userRole: "BOSS",
    action: "WORKFLOW_EDGE_DELETE",
    entityType: "WORKFLOW_EDGE",
    entityId: edgeId,
    details: { projectId },
  });

  return { success: true, message: "Edge deleted successfully" };
};

/**
 * Phase 6 — Cohort / Parcel Assignment: Node Splitting
 * Splits a node into newly created sibling branches. Newly created branches start empty.
 */
export const splitNode = async (projectId: string, nodeId: string, payload: any, userId: string) => {
  const instance = await getWorkflowInstance(projectId);
  assertWorkflowEditable(instance);

  const { branchCount = 2, branchNames = [] } = payload;
  if (branchCount < 2) {
    throw new ApiError(400, "branchCount must be at least 2");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch base node to split
    const baseNodeRes = await client.query(
      `SELECT * FROM workflow_nodes WHERE id = $1 AND workflow_instance_id = $2`,
      [nodeId, instance.id]
    );
    if (baseNodeRes.rows.length === 0) {
      throw new ApiError(404, "Workflow node not found to split");
    }
    const baseNode = baseNodeRes.rows[0];

    // Identify parent nodes leading into base node
    const parentEdges = await client.query(
      `SELECT source_node_id FROM workflow_edges WHERE target_node_id = $1`,
      [nodeId]
    );

    const newNodes: any[] = [];
    for (let i = 0; i < branchCount; i++) {
      const name = branchNames[i] || `${baseNode.name} - Branch ${String.fromCharCode(65 + i)}`;
      const key = `${baseNode.node_key}_branch_${i + 1}`;
      const yOffset = (i - (branchCount - 1) / 2) * 80;

      const insNode = await client.query(
        `INSERT INTO workflow_nodes
         (workflow_instance_id, node_key, name, node_type, responsible_role, responsible_unit_id,
          responsible_user_id, configuration, x_position, y_position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          instance.id,
          key,
          name,
          baseNode.node_type,
          baseNode.responsible_role,
          baseNode.responsible_unit_id,
          baseNode.responsible_user_id,
          baseNode.configuration,
          baseNode.x_position + 150,
          baseNode.y_position + yOffset,
        ]
      );
      const newNode = insNode.rows[0];
      newNodes.push(newNode);

      // Connect edge from base node's parent (or from base node itself)
      if (parentEdges.rows.length > 0) {
        for (const p of parentEdges.rows) {
          await client.query(
            `INSERT INTO workflow_edges (workflow_instance_id, source_node_id, target_node_id, edge_type)
             VALUES ($1, $2, $3, 'SPLIT')`,
            [instance.id, p.source_node_id, newNode.id]
          );
        }
      } else {
        await client.query(
          `INSERT INTO workflow_edges (workflow_instance_id, source_node_id, target_node_id, edge_type)
           VALUES ($1, $2, $3, 'SPLIT')`,
          [instance.id, baseNode.id, newNode.id]
        );
      }
    }

    await client.query("COMMIT");

    await createAuditEvent({
      userId,
      userRole: "BOSS",
      action: "WORKFLOW_NODE_SPLIT",
      entityType: "WORKFLOW_NODE",
      entityId: nodeId,
      details: { projectId, newNodes: newNodes.map(n => n.id) },
    });

    return {
      baseNodeId: nodeId,
      newBranches: newNodes,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Phase 6 — Move Parcels Between Sibling Workflow Cohorts
 */
export const moveCohortParcels = async (projectId: string, payload: any, userId: string) => {
  const instance = await getWorkflowInstance(projectId);
  assertWorkflowEditable(instance);

  const { sourceNodeId, targetNodeId, parcelIds } = payload;
  if (!sourceNodeId || !targetNodeId || !Array.isArray(parcelIds) || parcelIds.length === 0) {
    throw new ApiError(400, "sourceNodeId, targetNodeId, and parcelIds array are required");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verify both nodes belong to this workflow instance
    const checkNodes = await client.query(
      `SELECT id FROM workflow_nodes WHERE id IN ($1, $2) AND workflow_instance_id = $3`,
      [sourceNodeId, targetNodeId, instance.id]
    );
    if (checkNodes.rows.length < 2) {
      throw new ApiError(400, "Source and target nodes must belong to the same workflow instance");
    }

    let movedCount = 0;
    for (const parcelId of parcelIds) {
      // Remove from source node
      await client.query(
        `DELETE FROM workflow_node_parcels WHERE workflow_node_id = $1 AND parcel_id = $2`,
        [sourceNodeId, parcelId]
      );
      // Insert into target node (avoids duplicate cohort assignment)
      await client.query(
        `INSERT INTO workflow_node_parcels (workflow_node_id, parcel_id, assigned_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (workflow_node_id, parcel_id) DO NOTHING`,
        [targetNodeId, parcelId, userId]
      );
      movedCount++;
    }

    await client.query("COMMIT");

    await createAuditEvent({
      userId,
      userRole: "BOSS",
      action: "WORKFLOW_COHORT_MOVE_PARCELS",
      entityType: "WORKFLOW_NODE",
      entityId: targetNodeId,
      details: { projectId, sourceNodeId, targetNodeId, movedCount, parcelIds },
    });

    return {
      success: true,
      movedCount,
      sourceNodeId,
      targetNodeId,
    };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Returns parcels assigned to a specific node cohort during design.
 */
export const getNodeParcels = async (projectId: string, nodeId: string) => {
  const instance = await getWorkflowInstance(projectId);

  const result = await pool.query(
    `SELECT lp.*,
            wnp.assigned_at,
            pp.intersect_percent,
            cr.assessed_amount,
            cr.approved_amount,
            cr.paid_amount,
            cr.payment_status AS compensation_payment_status
     FROM workflow_node_parcels wnp
     JOIN land_parcels lp ON lp.id = wnp.parcel_id
     LEFT JOIN project_parcels pp ON pp.project_id = $1 AND pp.parcel_id = lp.id
     LEFT JOIN compensation_records cr ON cr.project_id = $1 AND cr.parcel_id = lp.id
     JOIN workflow_nodes wn ON wn.id = wnp.workflow_node_id
     WHERE wn.id = $2 AND wn.workflow_instance_id = $3
     ORDER BY lp.ulpin ASC`,
    [projectId, nodeId, instance.id]
  );

  return result.rows;
};

/**
 * Bulk updates workflow design positions and configurations from Visual Builder.
 */
export const saveWorkflowDesign = async (projectId: string, payload: any, userId: string) => {
  const instance = await getWorkflowInstance(projectId);
  assertWorkflowEditable(instance);

  const { nodes = [] } = payload;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const n of nodes) {
      if (n.id) {
        await client.query(
          `UPDATE workflow_nodes SET
             x_position = COALESCE($1, x_position),
             y_position = COALESCE($2, y_position),
             name = COALESCE($3, name),
             configuration = COALESCE($4, configuration),
             updated_at = NOW()
           WHERE id = $5 AND workflow_instance_id = $6`,
          [
            n.xPosition,
            n.yPosition,
            n.name,
            n.configuration ? JSON.stringify(n.configuration) : null,
            n.id,
            instance.id,
          ]
        );
      }
    }

    await client.query("COMMIT");

    return await getWorkflowGraph(projectId);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
