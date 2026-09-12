/**
 * ============================================================
 * V2 Workflow DAG Auto-Layout Engine (Phase 5 Visual Builder)
 * Computes layered node positions for top-to-bottom DAG rendering.
 * Uses topological ordering from workflowGraph.utils.ts.
 * ============================================================
 */

import type { WorkflowNode, WorkflowEdge } from '../types/workflowV2.types';
import { getTopologicalOrder, getDirectParentNodeIds, getDirectChildNodeIds } from './workflowGraph.utils';

export interface LayoutPosition {
  nodeId: string;
  x: number;
  y: number;
  layer: number;
  indexInLayer: number;
}

export interface LayoutResult {
  positions: LayoutPosition[];
  canvasWidth: number;
  canvasHeight: number;
  layers: string[][];
}

/**
 * Layout configuration constants.
 * All values calibrated for the Things/DESIGN.md visual builder canvas.
 */
const LAYOUT_CONFIG = {
  nodeWidth: 260,
  nodeHeight: 120,
  horizontalGap: 60,
  verticalGap: 80,
  paddingX: 80,
  paddingY: 60,
};

/**
 * Assigns each node to a layer (depth) in the DAG.
 * Layer 0 = root nodes (no incoming edges).
 * Each node's layer = max(parent layers) + 1 to respect all dependencies.
 */
function assignLayers(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  topoOrder: string[]
): Map<string, number> {
  const layerMap = new Map<string, number>();

  // Initialize all nodes at layer 0
  for (const node of nodes) {
    layerMap.set(node.id, 0);
  }

  // Walk topological order; each node's layer = max(parent layers) + 1
  for (const nodeId of topoOrder) {
    const parentIds = getDirectParentNodeIds(nodeId, edges);
    if (parentIds.length > 0) {
      let maxParentLayer = 0;
      for (const pid of parentIds) {
        const pl = layerMap.get(pid) ?? 0;
        if (pl > maxParentLayer) maxParentLayer = pl;
      }
      layerMap.set(nodeId, maxParentLayer + 1);
    }
  }

  // Handle any nodes not in topoOrder (orphans)
  for (const node of nodes) {
    if (!layerMap.has(node.id)) {
      layerMap.set(node.id, 0);
    }
  }

  return layerMap;
}

/**
 * Groups node IDs by their assigned layer, preserving topological order within each layer.
 */
function groupByLayer(
  nodes: WorkflowNode[],
  layerMap: Map<string, number>,
  topoOrder: string[]
): string[][] {
  let maxLayer = 0;
  for (const layer of layerMap.values()) {
    if (layer > maxLayer) maxLayer = layer;
  }

  const layers: string[][] = Array.from({ length: maxLayer + 1 }, () => []);

  // Place nodes from topoOrder first (maintains consistent ordering)
  const placed = new Set<string>();
  for (const nodeId of topoOrder) {
    const layer = layerMap.get(nodeId) ?? 0;
    layers[layer].push(nodeId);
    placed.add(nodeId);
  }

  // Place any remaining orphan nodes not in topoOrder
  for (const node of nodes) {
    if (!placed.has(node.id)) {
      const layer = layerMap.get(node.id) ?? 0;
      layers[layer].push(node.id);
    }
  }

  return layers;
}

/**
 * Reduces edge crossings by reordering nodes within each layer
 * using the barycenter heuristic (median position of connected parents).
 */
function reduceCrossings(
  layers: string[][],
  edges: WorkflowEdge[]
): string[][] {
  const result = layers.map((layer) => [...layer]);

  // Two-pass sweep: top-down then bottom-up
  for (let pass = 0; pass < 2; pass++) {
    // Top-down pass
    for (let i = 1; i < result.length; i++) {
      const prevLayer = result[i - 1];
      const prevPositionMap = new Map<string, number>();
      prevLayer.forEach((id, idx) => prevPositionMap.set(id, idx));

      const barycenters: { nodeId: string; barycenter: number }[] = result[i].map((nodeId) => {
        const parentIds = getDirectParentNodeIds(nodeId, edges);
        const parentPositions = parentIds
          .filter((pid) => prevPositionMap.has(pid))
          .map((pid) => prevPositionMap.get(pid)!);

        const barycenter =
          parentPositions.length > 0
            ? parentPositions.reduce((a, b) => a + b, 0) / parentPositions.length
            : Infinity;

        return { nodeId, barycenter };
      });

      barycenters.sort((a, b) => a.barycenter - b.barycenter);
      result[i] = barycenters.map((b) => b.nodeId);
    }

    // Bottom-up pass
    for (let i = result.length - 2; i >= 0; i--) {
      const nextLayer = result[i + 1];
      const nextPositionMap = new Map<string, number>();
      nextLayer.forEach((id, idx) => nextPositionMap.set(id, idx));

      const barycenters: { nodeId: string; barycenter: number }[] = result[i].map((nodeId) => {
        const childIds = getDirectChildNodeIds(nodeId, edges);
        const childPositions = childIds
          .filter((cid) => nextPositionMap.has(cid))
          .map((cid) => nextPositionMap.get(cid)!);

        const barycenter =
          childPositions.length > 0
            ? childPositions.reduce((a, b) => a + b, 0) / childPositions.length
            : Infinity;

        return { nodeId, barycenter };
      });

      barycenters.sort((a, b) => a.barycenter - b.barycenter);
      result[i] = barycenters.map((b) => b.nodeId);
    }
  }

  return result;
}

/**
 * Computes the final (x, y) positions for every node in the DAG.
 * Layout flows top-to-bottom, centered horizontally within each layer.
 */
export function computeDAGLayout(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): LayoutResult {
  if (nodes.length === 0) {
    return { positions: [], canvasWidth: 400, canvasHeight: 300, layers: [] };
  }

  const topoOrder = getTopologicalOrder(nodes, edges);
  const layerMap = assignLayers(nodes, edges, topoOrder);
  let layers = groupByLayer(nodes, layerMap, topoOrder);
  layers = reduceCrossings(layers, edges);

  // Find the widest layer to determine canvas width
  const maxLayerWidth = Math.max(...layers.map((l) => l.length), 1);

  const totalWidth =
    maxLayerWidth * LAYOUT_CONFIG.nodeWidth +
    (maxLayerWidth - 1) * LAYOUT_CONFIG.horizontalGap +
    LAYOUT_CONFIG.paddingX * 2;

  const totalHeight =
    layers.length * LAYOUT_CONFIG.nodeHeight +
    (layers.length - 1) * LAYOUT_CONFIG.verticalGap +
    LAYOUT_CONFIG.paddingY * 2;

  const positions: LayoutPosition[] = [];

  for (let layerIdx = 0; layerIdx < layers.length; layerIdx++) {
    const layer = layers[layerIdx];
    const layerWidth =
      layer.length * LAYOUT_CONFIG.nodeWidth +
      (layer.length - 1) * LAYOUT_CONFIG.horizontalGap;

    // Center the layer horizontally within the canvas
    const layerOffsetX = (totalWidth - layerWidth) / 2;

    for (let nodeIdx = 0; nodeIdx < layer.length; nodeIdx++) {
      const x =
        layerOffsetX +
        nodeIdx * (LAYOUT_CONFIG.nodeWidth + LAYOUT_CONFIG.horizontalGap);
      const y =
        LAYOUT_CONFIG.paddingY +
        layerIdx * (LAYOUT_CONFIG.nodeHeight + LAYOUT_CONFIG.verticalGap);

      positions.push({
        nodeId: layer[nodeIdx],
        x,
        y,
        layer: layerIdx,
        indexInLayer: nodeIdx,
      });
    }
  }

  return {
    positions,
    canvasWidth: Math.max(totalWidth, 600),
    canvasHeight: Math.max(totalHeight, 400),
    layers,
  };
}

/**
 * Computes an SVG path string for a directed edge between two nodes.
 * Uses a smooth cubic Bézier curve for clean visual connection.
 */
export function computeEdgePath(
  sourcePos: LayoutPosition,
  targetPos: LayoutPosition
): string {
  const sourceX = sourcePos.x + LAYOUT_CONFIG.nodeWidth / 2;
  const sourceY = sourcePos.y + LAYOUT_CONFIG.nodeHeight;
  const targetX = targetPos.x + LAYOUT_CONFIG.nodeWidth / 2;
  const targetY = targetPos.y;

  // Vertical distance for control point curvature
  const dy = Math.abs(targetY - sourceY);
  const controlOffset = Math.min(dy * 0.5, 60);

  return `M ${sourceX} ${sourceY} C ${sourceX} ${sourceY + controlOffset}, ${targetX} ${targetY - controlOffset}, ${targetX} ${targetY}`;
}

/**
 * Returns the node width/height constants for external use.
 */
export function getNodeDimensions(): { width: number; height: number } {
  return {
    width: LAYOUT_CONFIG.nodeWidth,
    height: LAYOUT_CONFIG.nodeHeight,
  };
}

/**
 * Computes the center point of a node for edge anchor calculation.
 */
export function getNodeCenter(pos: LayoutPosition): { cx: number; cy: number } {
  return {
    cx: pos.x + LAYOUT_CONFIG.nodeWidth / 2,
    cy: pos.y + LAYOUT_CONFIG.nodeHeight / 2,
  };
}
