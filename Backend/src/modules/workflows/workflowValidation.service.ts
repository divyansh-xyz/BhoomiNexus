import { pool } from "../../config/db";
import { ApiError } from "../../utils/apiError";
import { getWorkflowInstance } from "./workflowGraph.service";

export interface ValidationIssue {
  severity: "ERROR" | "WARNING";
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface WorkflowValidationResult {
  isValid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  summary: {
    nodeCount: number;
    edgeCount: number;
    totalParcels: number;
    assignedParcels: number;
    unassignedParcels: number;
  };
}

/**
 * Phase 9 — Workflow Topology and Parcel Allocation Validation Engine
 */
export const validateWorkflowGraph = async (projectId: string): Promise<WorkflowValidationResult> => {
  const instance = await getWorkflowInstance(projectId);

  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // 1. Fetch nodes and edges
  const nodesRes = await pool.query(
    `SELECT * FROM workflow_nodes WHERE workflow_instance_id = $1`,
    [instance.id]
  );
  const edgesRes = await pool.query(
    `SELECT * FROM workflow_edges WHERE workflow_instance_id = $1`,
    [instance.id]
  );

  const nodes = nodesRes.rows;
  const edges = edgesRes.rows;

  if (nodes.length === 0) {
    errors.push({
      severity: "ERROR",
      code: "EMPTY_WORKFLOW",
      message: "Workflow has no nodes. Please initialize standard branches or add nodes.",
    });
    return {
      isValid: false,
      errors,
      warnings,
      summary: {
        nodeCount: 0,
        edgeCount: 0,
        totalParcels: 0,
        assignedParcels: 0,
        unassignedParcels: 0,
      },
    };
  }

  // 2. Check Node Role Assignments
  for (const node of nodes) {
    if (!node.responsible_role && !node.responsible_user_id) {
      errors.push({
        severity: "ERROR",
        code: "UNASSIGNED_ROLE",
        message: `Node '${node.name}' (${node.node_key}) has no responsible role or officer assigned`,
        nodeId: node.id,
      });
    }
  }

  // 3. Check for Orphan Nodes (nodes with neither incoming nor outgoing edges, except single root)
  const incomingCount = new Map<string, number>();
  const outgoingCount = new Map<string, number>();

  for (const n of nodes) {
    incomingCount.set(n.id, 0);
    outgoingCount.set(n.id, 0);
  }

  for (const e of edges) {
    incomingCount.set(e.target_node_id, (incomingCount.get(e.target_node_id) || 0) + 1);
    outgoingCount.set(e.source_node_id, (outgoingCount.get(e.source_node_id) || 0) + 1);
  }

  for (const n of nodes) {
    const inc = incomingCount.get(n.id) || 0;
    const out = outgoingCount.get(n.id) || 0;
    if (inc === 0 && out === 0 && nodes.length > 1) {
      warnings.push({
        severity: "WARNING",
        code: "ORPHAN_NODE",
        message: `Node '${n.name}' has no incoming or outgoing connections`,
        nodeId: n.id,
      });
    }
  }

  // 4. Check Parcel Allocations
  const projectParcelsRes = await pool.query(
    `SELECT parcel_id FROM project_parcels WHERE project_id = $1`,
    [projectId]
  );
  const totalProjectParcels = projectParcelsRes.rows.map(r => r.parcel_id);

  const assignedParcelsRes = await pool.query(
    `SELECT wnp.parcel_id, wnp.workflow_node_id, wn.node_key
     FROM workflow_node_parcels wnp
     JOIN workflow_nodes wn ON wn.id = wnp.workflow_node_id
     WHERE wn.workflow_instance_id = $1`,
    [instance.id]
  );

  const assignedParcelsMap = new Map<string, string[]>();
  for (const row of assignedParcelsRes.rows) {
    const list = assignedParcelsMap.get(row.parcel_id) || [];
    list.push(row.workflow_node_id);
    assignedParcelsMap.set(row.parcel_id, list);
  }

  const assignedCount = assignedParcelsMap.size;
  const unassignedCount = totalProjectParcels.filter(pId => !assignedParcelsMap.has(pId)).length;

  if (totalProjectParcels.length > 0 && assignedCount === 0) {
    errors.push({
      severity: "ERROR",
      code: "NO_PARCELS_ALLOCATED",
      message: "None of the project candidate parcels are assigned to any workflow cohort",
    });
  } else if (unassignedCount > 0) {
    warnings.push({
      severity: "WARNING",
      code: "UNASSIGNED_PARCELS",
      message: `${unassignedCount} project parcels are not yet assigned to any workflow cohort`,
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      totalParcels: totalProjectParcels.length,
      assignedParcels: assignedCount,
      unassignedParcels: unassignedCount,
    },
  };
};
