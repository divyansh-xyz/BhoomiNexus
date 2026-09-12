/**
 * ============================================================
 * V2 Workflow Graph Topology Engine & Utilities (Phase 4 Core)
 * Strictly adheres to:
 * 1. Phase Implementation.md (Section 7: Phase 4 — V2 Workflow Graph Core)
 * 2. V2 API Endpoints and Behaviour.md (Section: V2 Workflow)
 * ============================================================
 */

import type { WorkflowNode, WorkflowEdge, WorkflowNodeParcel } from '../types/workflowV2.types';

export interface CycleCheckResult {
  hasCycle: boolean;
  cyclePath?: string[];
  message?: string;
}

/**
 * Detects if adding a proposed directed edge (or within the current graph) creates a directed cycle.
 * Uses Depth-First Search (DFS) with 3-color marking (0 = White/Unvisited, 1 = Gray/Visiting, 2 = Black/Visited).
 */
export function detectCycle(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  proposedEdge?: { sourceNodeId: string; targetNodeId: string }
): CycleCheckResult {
  // Self-loop check
  if (proposedEdge && proposedEdge.sourceNodeId === proposedEdge.targetNodeId) {
    return {
      hasCycle: true,
      cyclePath: [proposedEdge.sourceNodeId, proposedEdge.targetNodeId],
      message: 'Self-loop detected: A node cannot connect directly to itself.',
    };
  }

  // Build adjacency list
  const adj = new Map<string, string[]>();
  for (const node of nodes) {
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    if (adj.has(edge.sourceNodeId)) {
      adj.get(edge.sourceNodeId)!.push(edge.targetNodeId);
    }
  }

  // Include proposed edge if provided
  if (proposedEdge) {
    if (!adj.has(proposedEdge.sourceNodeId)) {
      adj.set(proposedEdge.sourceNodeId, []);
    }
    adj.get(proposedEdge.sourceNodeId)!.push(proposedEdge.targetNodeId);
  }

  // Color state: 0 = unvisited, 1 = visiting (in stack), 2 = visited
  const colors = new Map<string, number>();
  const parentMap = new Map<string, string>();
  for (const nodeId of adj.keys()) {
    colors.set(nodeId, 0);
  }

  let cycleFound = false;
  let cycleStartNode: string | null = null;
  let cycleEndNode: string | null = null;

  function dfs(u: string): boolean {
    colors.set(u, 1); // Gray / In Stack

    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      if (!colors.has(v)) {
        colors.set(v, 0);
      }
      const colorV = colors.get(v)!;
      if (colorV === 1) {
        // Back-edge found! A cycle exists.
        cycleFound = true;
        cycleStartNode = v;
        cycleEndNode = u;
        return true;
      }
      if (colorV === 0) {
        parentMap.set(v, u);
        if (dfs(v)) return true;
      }
    }

    colors.set(u, 2); // Black / Finished
    return false;
  }

  for (const nodeId of adj.keys()) {
    if (colors.get(nodeId) === 0) {
      if (dfs(nodeId)) break;
    }
  }

  if (cycleFound && cycleStartNode && cycleEndNode) {
    // Reconstruct cycle path
    const path: string[] = [cycleStartNode];
    let curr: string = cycleEndNode;
    while (curr !== cycleStartNode && parentMap.has(curr)) {
      path.push(curr);
      const next: string | undefined = parentMap.get(curr);
      if (!next) break;
      curr = next;
    }
    path.push(cycleStartNode);
    path.reverse();

    return {
      hasCycle: true,
      cyclePath: path,
      message: `Directed cycle detected: ${path.join(' → ')}. Workflow graphs must be strictly Acyclic (DAG).`,
    };
  }

  return { hasCycle: false };
}

/**
 * Computes topological ordering of nodes in the DAG using Kahn's Algorithm (in-degree based).
 * Returns node IDs in legal execution sequence.
 */
export function getTopologicalOrder(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adj.set(node.id, []);
  }

  for (const edge of edges) {
    if (adj.has(edge.sourceNodeId)) {
      adj.get(edge.sourceNodeId)!.push(edge.targetNodeId);
    }
    inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [nodeId, deg] of inDegree.entries()) {
    if (deg === 0) {
      queue.push(nodeId);
    }
  }

  const order: string[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    order.push(u);

    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      const updatedDeg = (inDegree.get(v) || 1) - 1;
      inDegree.set(v, updatedDeg);
      if (updatedDeg === 0) {
        queue.push(v);
      }
    }
  }

  return order;
}

/**
 * Finds completely disconnected (orphan) nodes that have neither incoming nor outgoing edges
 * (unless it is a single standalone root node).
 */
export function findOrphanNodes(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
  if (nodes.length <= 1) return [];

  const connectedNodeIds = new Set<string>();
  for (const edge of edges) {
    connectedNodeIds.add(edge.sourceNodeId);
    connectedNodeIds.add(edge.targetNodeId);
  }

  return nodes.filter((n) => !connectedNodeIds.has(n.id)).map((n) => n.id);
}

/**
 * Validates cohort parcel assignments.
 * Rule: Under Phase 4 V2 rules, a parcel can belong to only 1 active cohort at design time.
 */
export function validateCohortParcels(
  _nodes: WorkflowNode[],
  parcels: WorkflowNodeParcel[]
): {
  valid: boolean;
  duplicateAssignments: { parcelId: string; nodeIds: string[] }[];
  assignedCount: number;
} {
  const parcelToNodes = new Map<string, string[]>();

  for (const p of parcels) {
    if (!parcelToNodes.has(p.parcelId)) {
      parcelToNodes.set(p.parcelId, []);
    }
    parcelToNodes.get(p.parcelId)!.push(p.nodeId);
  }

  const duplicates: { parcelId: string; nodeIds: string[] }[] = [];
  for (const [parcelId, nodeIds] of parcelToNodes.entries()) {
    if (nodeIds.length > 1) {
      duplicates.push({ parcelId, nodeIds });
    }
  }

  return {
    valid: duplicates.length === 0,
    duplicateAssignments: duplicates,
    assignedCount: parcelToNodes.size,
  };
}

/**
 * Returns direct children (outgoing targets) of a node
 */
export function getDirectChildNodeIds(nodeId: string, edges: WorkflowEdge[]): string[] {
  return edges.filter((e) => e.sourceNodeId === nodeId).map((e) => e.targetNodeId);
}

/**
 * Returns direct parents (incoming sources) of a node
 */
export function getDirectParentNodeIds(nodeId: string, edges: WorkflowEdge[]): string[] {
  return edges.filter((e) => e.targetNodeId === nodeId).map((e) => e.sourceNodeId);
}

/**
 * Recursively collects all descendant node IDs of a given node in the graph.
 * Required for Phase 4 V2 transactional node deletion rule:
 * "Deletes the node and descendant topology according to the V2 node-deletion rule."
 */
export function getDescendantNodeIds(nodeId: string, edges: WorkflowEdge[]): Set<string> {
  const descendants = new Set<string>();
  const queue: string[] = [nodeId];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const children = getDirectChildNodeIds(curr, edges);
    for (const child of children) {
      if (!descendants.has(child)) {
        descendants.add(child);
        queue.push(child);
      }
    }
  }

  return descendants;
}

/**
 * Finds a deterministic sibling node for parcel migration upon node deletion.
 * Rule: "directly assigned parcels are merged to the deterministic sibling"
 */
export function findDeterministicSiblingNode(
  nodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowNode | null {
  const parents = getDirectParentNodeIds(nodeId, edges);
  if (parents.length === 0) {
    // If root, find any other root node
    const roots = nodes.filter(
      (n) => n.id !== nodeId && getDirectParentNodeIds(n.id, edges).length === 0
    );
    return roots.length > 0 ? roots[0] : null;
  }

  // Find siblings that share the same first parent
  const primaryParent = parents[0];
  const siblingIds = getDirectChildNodeIds(primaryParent, edges).filter((id) => id !== nodeId);
  if (siblingIds.length > 0) {
    const siblingNode = nodes.find((n) => n.id === siblingIds[0]);
    if (siblingNode) return siblingNode;
  }

  // Fallback to any other existing node
  return nodes.find((n) => n.id !== nodeId) || null;
}

/**
 * Returns all valid sibling nodes for parcel reallocation.
 * Rule: "Only sibling moves are allowed according to the agreed design model."
 */
export function getValidSiblingNodes(
  nodeId: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowNode[] {
  const parents = getDirectParentNodeIds(nodeId, edges);
  const siblingIds = new Set<string>();

  if (parents.length > 0) {
    // Collect all children of any parent of this node (excluding self)
    for (const parentId of parents) {
      const children = getDirectChildNodeIds(parentId, edges);
      for (const childId of children) {
        if (childId !== nodeId) {
          siblingIds.add(childId);
        }
      }
    }
  } else {
    // For root nodes, other root nodes are valid siblings
    for (const node of nodes) {
      if (node.id !== nodeId && getDirectParentNodeIds(node.id, edges).length === 0) {
        siblingIds.add(node.id);
      }
    }
  }

  // If node has child branches resulting from split, direct children are also valid recipients
  const directChildren = getDirectChildNodeIds(nodeId, edges);
  for (const childId of directChildren) {
    siblingIds.add(childId);
  }

  // Also include nodes that share a common branchKey
  const currentNode = nodes.find((n) => n.id === nodeId);
  if (currentNode?.branchKey) {
    for (const node of nodes) {
      if (node.id !== nodeId && node.branchKey === currentNode.branchKey) {
        siblingIds.add(node.id);
      }
    }
  }

  // Fallback for initial demo or linear chains if no strict parent-sibling exists
  if (siblingIds.size === 0) {
    for (const node of nodes) {
      if (node.id !== nodeId) {
        siblingIds.add(node.id);
      }
    }
  }

  return nodes.filter((n) => siblingIds.has(n.id));
}
