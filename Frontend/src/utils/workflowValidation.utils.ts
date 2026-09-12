/**
 * ============================================================
 * Phase 9: V2 Workflow Validation Engine
 * Strictly adheres to:
 * 1. Phase Implementation.md (Section 12: Phase 9 — Workflow Validation and Activation)
 * 2. V2 API Endpoints and Behaviour.md (Lines 181–189)
 * ============================================================
 */

import type {
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeParcel,
  WorkflowValidationResult,
  WorkflowValidationChecklist,
} from '../types/workflowV2.types';
import {
  detectCycle,
  findOrphanNodeIds,
  getDirectParentNodeIds,
  validateCohortParcels,
} from './workflowGraph.utils';

/**
 * Validates a workflow graph against the 6 statutory pre-flight criteria:
 * 1. valid graph
 * 2. valid node assignments
 * 3. valid parcel allocation
 * 4. no duplicate active branch membership
 * 5. no orphan nodes
 * 6. valid template fragments
 */
export function validateWorkflowGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  nodeParcelsMap: Record<string, WorkflowNodeParcel[]> = {},
  expectedParcelCount: number = 4
): WorkflowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const checklist: WorkflowValidationChecklist = {
    validGraph: true,
    validNodeAssignments: true,
    validParcelAllocation: true,
    noDuplicateActiveMembership: true,
    noOrphanNodes: true,
    validTemplateFragments: true,
  };

  if (nodes.length === 0) {
    errors.push('Workflow graph is empty. At least one root node must be defined.');
    checklist.validGraph = false;
    return {
      valid: false,
      errors,
      warnings,
      unassignedParcelsCount: expectedParcelCount,
      unassignedNodesCount: 0,
      orphanNodesCount: 0,
      checklist,
    };
  }

  // ── 1. Check: valid graph ──
  const cycleCheck = detectCycle(nodes, edges);
  if (cycleCheck.hasCycle) {
    checklist.validGraph = false;
    errors.push(`Graph Cycle Violation: ${cycleCheck.message || 'Directed cycle detected in DAG topology.'}`);
  }

  // Find root nodes (no incoming edges)
  const rootNodes = nodes.filter((n) => getDirectParentNodeIds(n.id, edges).length === 0);
  if (rootNodes.length === 0) {
    checklist.validGraph = false;
    errors.push('No root node found: Every node has an incoming edge, indicating an unanchored loop.');
  }

  // ── 2. Check: valid node assignments ──
  let unassignedNodesCount = 0;
  for (const node of nodes) {
    if (!node.name || node.name.trim() === '') {
      checklist.validNodeAssignments = false;
      errors.push(`Node '${node.id}' must have a non-empty name.`);
    }

    if (!node.responsibility) {
      checklist.validNodeAssignments = false;
      unassignedNodesCount++;
      errors.push(`Node '${node.name || node.id}' is missing a statutory departmental responsibility.`);
    }

    if (node.nodeType !== 'DISTRICT_ACQUISITION' && (!node.slaDays || node.slaDays <= 0)) {
      checklist.validNodeAssignments = false;
      errors.push(`Operational stage '${node.name}' must have a statutory SLA of at least 1 day.`);
    }

    if (!node.unitName && node.nodeType !== 'DISTRICT_ACQUISITION') {
      warnings.push(`Node '${node.name}' has no designated operating unit/wing.`);
    }
  }

  // ── 3. Check: valid parcel allocation ──
  let totalAllocatedParcels = 0;
  for (const node of nodes) {
    totalAllocatedParcels += node.parcelCount || 0;
  }

  let unassignedParcelsCount = Math.max(0, expectedParcelCount - totalAllocatedParcels);
  if (totalAllocatedParcels === 0) {
    checklist.validParcelAllocation = false;
    errors.push('Zero parcels allocated: Project requires at least one demarcated parcel assigned to an active cohort.');
  } else if (totalAllocatedParcels < expectedParcelCount) {
    warnings.push(
      `${unassignedParcelsCount} of ${expectedParcelCount} project parcels are not yet assigned to active workflow cohorts.`
    );
  }

  // ── 4. Check: no duplicate active branch membership ──
  const allParcels: WorkflowNodeParcel[] = [];
  Object.values(nodeParcelsMap).forEach((parcels) => {
    allParcels.push(...parcels);
  });

  if (allParcels.length > 0) {
    const cohortCheck = validateCohortParcels(nodes, allParcels);
    if (!cohortCheck.valid) {
      checklist.noDuplicateActiveMembership = false;
      for (const dup of cohortCheck.duplicateAssignments) {
        errors.push(
          `Duplicate Active Cohort Membership: Parcel '${dup.parcelId}' is assigned simultaneously to ${dup.nodeIds.length} branches.`
        );
      }
    }
  }

  // ── 5. Check: no orphan nodes ──
  const orphanIds = findOrphanNodeIds(nodes, edges);
  // Also flag any non-root node that has no incoming edges
  const floatingNodeIds = nodes
    .filter((n) => n.id !== rootNodes[0]?.id && getDirectParentNodeIds(n.id, edges).length === 0)
    .map((n) => n.id);

  const totalOrphanIds = Array.from(new Set([...orphanIds, ...floatingNodeIds]));
  const orphanNodesCount = totalOrphanIds.length;

  if (orphanNodesCount > 0) {
    checklist.noOrphanNodes = false;
    for (const orphanId of totalOrphanIds) {
      const node = nodes.find((n) => n.id === orphanId);
      errors.push(`Orphan Node Detected: '${node?.name || orphanId}' has no incoming path from the root workflow.`);
    }
  }

  // ── 6. Check: valid template fragments ──
  for (const node of nodes) {
    // If standard operational stage, verify required documents checklist
    if (node.nodeType === 'STAGE' && (!node.requiredDocuments || node.requiredDocuments.length === 0)) {
      warnings.push(`Node '${node.name}' has no statutory required documents specified.`);
    }
  }

  // Calculate telemetry
  const totalSlaDays = nodes.reduce((sum, n) => sum + (n.slaDays || 0), 0);
  const estimatedInitialTasks = Math.max(1, totalAllocatedParcels);

  const isValid =
    checklist.validGraph &&
    checklist.validNodeAssignments &&
    checklist.validParcelAllocation &&
    checklist.noDuplicateActiveMembership &&
    checklist.noOrphanNodes &&
    checklist.validTemplateFragments &&
    errors.length === 0;

  return {
    valid: isValid,
    errors,
    warnings,
    unassignedParcelsCount,
    unassignedNodesCount,
    orphanNodesCount,
    checklist,
    telemetry: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      totalSlaDays,
      allocatedParcelsCount: totalAllocatedParcels,
      estimatedInitialTasks,
    },
  };
}
