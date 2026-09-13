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

export interface WorkflowValidationChecklist {
  validGraph: boolean;
  validNodeAssignments: boolean;
  validParcelAllocation: boolean;
  noDuplicateActiveMembership: boolean;
  noOrphanNodes: boolean;
  validTemplateFragments: boolean;
}

export interface WorkflowValidationResult {
  isValid: boolean;
  valid?: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  checklist?: WorkflowValidationChecklist;
  summary: {
    nodeCount: number;
    edgeCount: number;
    totalParcels: number;
    assignedParcels: number;
    unassignedParcels: number;
  };
  telemetry?: {
    totalNodes: number;
    totalEdges: number;
    totalSlaDays: number;
    allocatedParcelsCount: number;
    estimatedInitialTasks: number;
  };
}

/**
 * Phase 9 — Workflow Topology and Parcel Allocation Validation Engine
 */
export const validateWorkflowGraph = async (projectId: string): Promise<WorkflowValidationResult> => {
  const instance = await getWorkflowInstance(projectId);

  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  const checklist: WorkflowValidationChecklist = {
    validGraph: true,
    validNodeAssignments: true,
    validParcelAllocation: true,
    noDuplicateActiveMembership: true,
    noOrphanNodes: true,
    validTemplateFragments: true,
  };

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
    checklist.validGraph = false;
    return {
      isValid: false,
      valid: false,
      errors,
      warnings,
      checklist,
      summary: {
        nodeCount: 0,
        edgeCount: 0,
        totalParcels: 0,
        assignedParcels: 0,
        unassignedParcels: 0,
      },
    };
  }

  // 1b. Graph Cycle & Root Validation
  const nodeMap = new Map<string, any>();
  for (const n of nodes) {
    nodeMap.set(n.id, n);
  }

  const adjList = new Map<string, string[]>();
  for (const n of nodes) {
    adjList.set(n.id, []);
  }
  for (const e of edges) {
    if (adjList.has(e.source_node_id)) {
      adjList.get(e.source_node_id)!.push(e.target_node_id);
    }
  }

  // Simple cycle detection via DFS
  const visited = new Map<string, number>(); // 0: unvisited, 1: visiting, 2: visited
  let hasCycle = false;

  const dfs = (currId: string): boolean => {
    visited.set(currId, 1);
    const neighbors = adjList.get(currId) || [];
    for (const nId of neighbors) {
      if (visited.get(nId) === 1) return true;
      if (!visited.get(nId) && dfs(nId)) return true;
    }
    visited.set(currId, 2);
    return false;
  };

  for (const n of nodes) {
    if (!visited.get(n.id)) {
      if (dfs(n.id)) {
        hasCycle = true;
        break;
      }
    }
  }

  if (hasCycle) {
    checklist.validGraph = false;
    errors.push({
      severity: "ERROR",
      code: "TOPOLOGY_CYCLE",
      message: "Directed cycle detected in DAG workflow topology.",
    });
  }

  // Descendants helper for reachability checks
  const getDescendants = (startId: string): Set<string> => {
    const desc = new Set<string>();
    const queue = [startId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const childId of (adjList.get(curr) || [])) {
        if (!desc.has(childId)) {
          desc.add(childId);
          queue.push(childId);
        }
      }
    }
    return desc;
  };

  // 2. Check Node Role Assignments
  for (const node of nodes) {
    if (!node.responsible_role && !node.responsible_user_id) {
      checklist.validNodeAssignments = false;
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
      checklist.noOrphanNodes = false;
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
    `SELECT wnp.parcel_id, wnp.workflow_node_id, wn.node_key, wn.node_type
     FROM workflow_node_parcels wnp
     JOIN workflow_nodes wn ON wn.id = wnp.workflow_node_id
     WHERE wn.workflow_instance_id = $1`,
    [instance.id]
  );

  const assignedParcelsMap = new Map<string, Set<string>>();
  for (const row of assignedParcelsRes.rows) {
    if (!assignedParcelsMap.has(row.parcel_id)) {
      assignedParcelsMap.set(row.parcel_id, new Set<string>());
    }
    assignedParcelsMap.get(row.parcel_id)!.add(row.workflow_node_id);
  }

  const assignedCount = assignedParcelsMap.size;
  const unassignedCount = totalProjectParcels.filter(pId => !assignedParcelsMap.has(pId)).length;

  if (totalProjectParcels.length > 0 && assignedCount === 0) {
    checklist.validParcelAllocation = false;
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

  // 5. Check Duplicate Active Cohort Membership across mutually exclusive sibling branches
  const isBranchParallel = (n: any): boolean => {
    if (!n) return false;
    const key = (n.node_key || "").toLowerCase();
    const name = (n.name || "").toLowerCase();
    const type = (n.node_type || "").toUpperCase();
    if (type === "DISTRICT" || type === "DISTRICT_ACQUISITION" || key === "root" || key === "district_root") return true;
    if (key.startsWith("comp") || key.includes("_comp") || name.includes("compensat") || name.includes("solatium") || name.includes("valuation")) return true;
    if (key.startsWith("poss") || key.includes("_poss") || name.includes("possess") || name.includes("vesting")) return true;
    return false;
  };

  const areMutuallyExclusive = (id1: string, id2: string): boolean => {
    if (id1 === id2) return false;
    const n1 = nodeMap.get(id1);
    const n2 = nodeMap.get(id2);
    if (!n1 || !n2) return false;
    if (isBranchParallel(n1) || isBranchParallel(n2)) return false;
    // If one is ancestor of another along same branch, they are not mutually exclusive
    if (getDescendants(id1).has(id2) || getDescendants(id2).has(id1)) return false;
    return true;
  };

  for (const [pId, nSet] of assignedParcelsMap.entries()) {
    const nArr = Array.from(nSet);
    if (nArr.length > 1) {
      const conflicting = new Set<string>();
      for (let i = 0; i < nArr.length; i++) {
        for (let j = i + 1; j < nArr.length; j++) {
          if (areMutuallyExclusive(nArr[i], nArr[j])) {
            conflicting.add(nArr[i]);
            conflicting.add(nArr[j]);
          }
        }
      }
      if (conflicting.size > 0) {
        checklist.noDuplicateActiveMembership = false;
        errors.push({
          severity: "ERROR",
          code: "DUPLICATE_ACTIVE_COHORT",
          message: `Parcel '${pId}' is assigned simultaneously to multiple mutually exclusive active branches`,
        });
      }
    }
  }

  const totalSlaDays = nodes.reduce((acc, n) => acc + (n.sla_days || 0), 0);

  return {
    isValid: errors.length === 0,
    valid: errors.length === 0,
    errors,
    warnings,
    checklist,
    summary: {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      totalParcels: totalProjectParcels.length,
      assignedParcels: assignedCount,
      unassignedParcels: unassignedCount,
    },
    telemetry: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      totalSlaDays,
      allocatedParcelsCount: assignedCount,
      estimatedInitialTasks: nodes.filter((n: any) => n.node_type !== "DISTRICT").length,
    },
  };
};
