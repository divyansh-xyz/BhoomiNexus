import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import './boss-dashboard.css';
import { bossService } from '../../services/api/boss.service';
import { useWorkflowGraph } from '../../hooks/useWorkflowGraph';
import type { ProjectRequest } from '../../types/boss.types';
import type { WorkflowNodeType, WorkflowNodeResponsibility } from '../../types/workflowV2.types';
import BhoomiLogo from '../../components/common/BhoomiLogo';
import {
  computeDAGLayout,
  computeEdgePath,
  getNodeDimensions,
} from '../../utils/workflowLayout.utils';
import type { LayoutPosition } from '../../utils/workflowLayout.utils';
import { getValidSiblingNodes } from '../../utils/workflowGraph.utils';
import { WorkflowParcelPanel } from '../../components/workflow/WorkflowParcelPanel';
import { ParcelPassportModal } from '../../components/workflow/ParcelPassportModal';
import { WorkflowTemplateModal } from '../../components/workflow/WorkflowTemplateModal';
import { WorkflowValidationModal } from '../../components/workflow/WorkflowValidationModal';
import { WorkflowExecutionPanel } from '../../components/workflow/WorkflowExecutionPanel';
import { getNodeBranchType } from '../../utils/workflowTemplates.utils';
import type { WorkflowNodeParcel, ProjectExecutionResponse } from '../../types/workflowV2.types';
import { v2WorkflowService } from '../../services/api/v2Workflow.service';

// ────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────

/** Map node type to CSS badge modifier */
function getNodeTypeBadgeClass(nodeType: string): string {
  switch (nodeType) {
    case 'DISTRICT_ACQUISITION':
      return 'wf-node-type-badge--district';
    case 'SUB_DIVISION':
      return 'wf-node-type-badge--subdivision';
    case 'APPROVAL_GATE':
    case 'BRANCH_GATE':
      return 'wf-node-type-badge--gate';
    case 'SPECIAL_UNIT':
      return 'wf-node-type-badge--special';
    default:
      return 'wf-node-type-badge--stage';
  }
}

/** Readable label for responsibility code */
function formatResponsibility(resp: string): string {
  const map: Record<string, string> = {
    REVENUE_BRANCH: 'Revenue',
    SURVEY_OFFICE: 'Survey',
    FOREST_DEPT: 'Forest',
    ENVIRONMENT_DEPT: 'Environment',
    COMPENSATION_BRANCH: 'Compensation',
    POSSESSION_BRANCH: 'Possession',
    LEGAL_CELL: 'Legal',
  };
  return map[resp] || resp;
}

// ────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────

export const BossWorkflowBuilderPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectRequest | null>(null);

  const {
    graph,
    nodes,
    edges,
    selectedNode,
    selectedNodeId,
    selectedNodeParcels,
    nodeParcelsMap,
    getNodeParcelsList,
    validationResult,
    cycleError,
    previewFragment,
    isLoading,
    isSaving,
    isActivating,
    isLocked,
    error,
    selectNode,
    createNode,
    updateNode,
    deleteNode,
    createEdge,
    deleteEdge,
    splitNode,
    moveParcels,
    applyTemplate,
    previewTemplate,
    clearTemplatePreview,
    validateGraph,
    activateGraph,
    resetToStandardGraph,
  } = useWorkflowGraph(projectId);

  // ── Canvas pan / zoom state ──
  const canvasRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // ── Edge creation flow ──
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);

  // ── Modals ──
  const [showAddNodeModal, setShowAddNodeModal] = useState(false);
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [showConnectEdgeModal, setShowConnectEdgeModal] = useState(false);
  const [showMoveParcelsModal, setShowMoveParcelsModal] = useState(false);

  // ── Add Node form ──
  const [newNodeName, setNewNodeName] = useState('');
  const [newNodeType, setNewNodeType] = useState<WorkflowNodeType>('SUB_DIVISION');
  const [newNodeResp, setNewNodeResp] = useState<WorkflowNodeResponsibility>('REVENUE_BRANCH');
  const [newNodeSla, setNewNodeSla] = useState(15);

  // ── Split form ──
  const [splitBranches, setSplitBranches] = useState('Sub-Division North, Sub-Division South');
  const [splitUnitName, setSplitUnitName] = useState('');

  // ── Connect Edge form ──
  const [targetEdgeNodeId, setTargetEdgeNodeId] = useState('');
  const [edgeLabel, setEdgeLabel] = useState('');

  // ── Move Parcels form ──
  const [moveTargetNodeId, setMoveTargetNodeId] = useState('');
  const [moveParcelCount, setMoveParcelCount] = useState(1);
  const [movePreselectedParcelIds, setMovePreselectedParcelIds] = useState<string[]>([]);

  // ── Phase 6 & Phase 7 Tabs & Modals ──
  const [inspectorTab, setInspectorTab] = useState<'config' | 'parcels'>('config');
  const [activePassportParcel, setActivePassportParcel] = useState<WorkflowNodeParcel | null>(null);
  const [dropTargetNodeId, setDropTargetNodeId] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState<boolean>(false);
  const [activePreviewTemplateId, setActivePreviewTemplateId] = useState<string | null>(null);
  const [inspectorName, setInspectorName] = useState('');
  const [inspectorSla, setInspectorSla] = useState(15);
  const [inspectorResp, setInspectorResp] = useState<WorkflowNodeResponsibility>('REVENUE_BRANCH');

  // ── Phase 9 Validation & Activation Modal ──
  const [showValidationModal, setShowValidationModal] = useState<boolean>(false);
  const [validationModalMode, setValidationModalMode] = useState<'validate' | 'activate'>('validate');

  // ── Phase 10 Runtime Execution Engine ──
  const [showExecutionPanel, setShowExecutionPanel] = useState<boolean>(false);
  const [executionData, setExecutionData] = useState<ProjectExecutionResponse | null>(null);
  const [loadingExecution, setLoadingExecution] = useState<boolean>(false);

  // ────────────────────────────────────────────────────
  // Effects
  // ────────────────────────────────────────────────────

  useEffect(() => {
    async function loadProject() {
      if (!projectId) return;
      try {
        const proj = await bossService.getProjectById(projectId);
        setProject(proj);
      } catch (err) {
        console.error('Failed to load project details', err);
      }
    }
    loadProject();
  }, [projectId]);

  useEffect(() => {
    if (selectedNode) {
      setInspectorName(selectedNode.name);
      setInspectorSla(selectedNode.slaDays);
      setInspectorResp(selectedNode.responsibility);
    }
  }, [selectedNode]);

  // ────────────────────────────────────────────────────
  // Layout computation (memoised including preview fragment)
  // ────────────────────────────────────────────────────

  const displayNodes = useMemo(() => {
    if (!previewFragment) return nodes;
    return [...nodes, ...previewFragment.previewNodes];
  }, [nodes, previewFragment]);

  const displayEdges = useMemo(() => {
    if (!previewFragment) return edges;
    return [...edges, ...previewFragment.previewEdges];
  }, [edges, previewFragment]);

  const layout = useMemo(() => computeDAGLayout(displayNodes, displayEdges), [displayNodes, displayEdges]);
  const positionMap = useMemo(() => {
    const m = new Map<string, LayoutPosition>();
    for (const p of layout.positions) m.set(p.nodeId, p);
    return m;
  }, [layout]);

  const { width: nodeW, height: nodeH } = getNodeDimensions();

  // ────────────────────────────────────────────────────
  // Canvas pan & zoom handlers
  // ────────────────────────────────────────────────────

  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start pan if clicking the canvas background, not a node
      if ((e.target as HTMLElement).closest('.wf-node')) return;
      setIsPanning(true);
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY });
    },
    [panX, panY]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      setPanX(e.clientX - panStart.x);
      setPanY(e.clientY - panStart.y);
    },
    [isPanning, panStart]
  );

  const handleCanvasMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleCanvasWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((prev) => Math.min(2, Math.max(0.3, prev + delta)));
  }, []);

  const zoomIn = () => setZoom((z) => Math.min(2, z + 0.15));
  const zoomOut = () => setZoom((z) => Math.max(0.3, z - 0.15));
  const zoomReset = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  // ────────────────────────────────────────────────────
  // Node quick-add from library bar
  // ────────────────────────────────────────────────────

  const handleQuickAddNode = async (type: WorkflowNodeType, label: string) => {
    const nameMap: Record<string, string> = {
      STAGE: 'New Stage',
      SUB_DIVISION: 'New Sub-Division',
      APPROVAL_GATE: 'Approval Gate',
      BRANCH_GATE: 'Branch Gate',
      SPECIAL_UNIT: 'Special Unit',
    };
    await createNode({
      name: nameMap[type] || label,
      nodeType: type,
      responsibility: 'REVENUE_BRANCH',
      slaDays: 15,
      requiredDocuments: [],
      positionX: 300,
      positionY: 200,
      parcelCount: 0,
    });
  };

  // ────────────────────────────────────────────────────
  // Form handlers
  // ────────────────────────────────────────────────────

  const handleAddNodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeName) return;
    await createNode({
      name: newNodeName,
      nodeType: newNodeType,
      responsibility: newNodeResp,
      slaDays: Number(newNodeSla),
      requiredDocuments: ['Joint Measurement Survey Record', 'Cadastral Map Excerpt'],
      positionX: 300,
      positionY: 200,
      parcelCount: 0,
    });
    setShowAddNodeModal(false);
    setNewNodeName('');
  };

  const handleSplitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId) return;
    const branches = splitBranches
      .split(',')
      .map((b) => b.trim())
      .filter((b) => b.length > 0);
    if (branches.length < 2) {
      alert('Please provide at least 2 comma-separated branch names.');
      return;
    }
    await splitNode(selectedNodeId, branches, splitUnitName || undefined);
    setShowSplitModal(false);
  };

  const handleConnectEdgeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId || !targetEdgeNodeId) return;
    await createEdge(selectedNodeId, targetEdgeNodeId, edgeLabel || undefined);
    if (!cycleError) {
      setShowConnectEdgeModal(false);
      setTargetEdgeNodeId('');
      setEdgeLabel('');
    }
  };

  // ── Phase 6: Sibling cohorts for parcel reallocation ──
  const validSiblingNodes = useMemo(() => {
    if (!selectedNodeId) return [];
    return getValidSiblingNodes(selectedNodeId, nodes, edges);
  }, [selectedNodeId, nodes, edges]);

  const handleMoveParcelsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId || !moveTargetNodeId) return;

    // Use preselected parcel IDs or pick first N parcels from source cohort
    const sourceParcels = getNodeParcelsList(selectedNodeId);
    let idsToTransfer = movePreselectedParcelIds;
    if (idsToTransfer.length === 0) {
      idsToTransfer = sourceParcels.slice(0, moveParcelCount).map((p) => p.parcelId);
    }
    if (idsToTransfer.length === 0) {
      idsToTransfer = Array.from({ length: moveParcelCount }, (_, i) => `parcel-transfer-${Date.now()}-${i}`);
    }

    await moveParcels(selectedNodeId, moveTargetNodeId, idsToTransfer);
    setShowMoveParcelsModal(false);
    setMovePreselectedParcelIds([]);
    setMoveTargetNodeId('');
  };

  const handleInspectorSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNodeId) return;
    await updateNode(selectedNodeId, {
      name: inspectorName,
      slaDays: Number(inspectorSla),
      responsibility: inspectorResp,
    });
  };

  // ── Edge connection via canvas click ──
  const handleNodeSourceClick = (nodeId: string) => {
    if (connectingFrom) {
      // Second click → complete connection
      if (connectingFrom !== nodeId) {
        createEdge(connectingFrom, nodeId);
      }
      setConnectingFrom(null);
    } else {
      setConnectingFrom(nodeId);
    }
  };

  const isWorkflowActive = graph?.status === 'ACTIVE' || project?.status === 'WORKFLOW_ACTIVE' || isLocked;

  // ── Phase 10: Runtime Execution Handlers ──
  const handleOpenExecution = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoadingExecution(true);
      const data = await v2WorkflowService.getWorkflowExecution(projectId, graph);
      setExecutionData(data);
      setShowExecutionPanel(true);
    } catch (err) {
      console.error('Failed to load runtime execution', err);
    } finally {
      setLoadingExecution(false);
    }
  }, [projectId, graph]);

  // Automatically fetch execution data when workflow becomes active
  useEffect(() => {
    if (isWorkflowActive && projectId && !executionData) {
      v2WorkflowService.getWorkflowExecution(projectId, graph).then((data) => {
        if (data) setExecutionData(data);
      });
    }
  }, [isWorkflowActive, projectId, graph, executionData]);

  const getNodeExecutionStats = (nodeId: string) => {
    if (!executionData) return null;
    const nodeExecs = executionData.executions.filter((e) => e.nodeId === nodeId);
    if (nodeExecs.length === 0) return null;

    const actionable = nodeExecs.filter((e) => e.status === 'ACTIONABLE').length;
    const inProgress = nodeExecs.filter((e) => e.status === 'IN_PROGRESS').length;
    const completed = nodeExecs.filter((e) => e.status === 'COMPLETED').length;

    if (actionable > 0) {
      return (
        <span
          className="wf-node-exec-badge wf-node-exec-badge--actionable"
          title={`${actionable} Actionable Parcel Tasks Dispatched`}
          onClick={(e) => {
            e.stopPropagation();
            selectNode(nodeId);
            handleOpenExecution();
          }}
        >
          <span className="wf-exec-mini-pulse" />
          ⚡ {actionable} Actionable
        </span>
      );
    }
    if (inProgress > 0) {
      return (
        <span
          className="wf-node-exec-badge wf-node-exec-badge--progress"
          title={`${inProgress} Parcel Tasks In Progress`}
          onClick={(e) => {
            e.stopPropagation();
            selectNode(nodeId);
            handleOpenExecution();
          }}
        >
          ⏳ {inProgress} Active
        </span>
      );
    }
    if (completed > 0 && completed === nodeExecs.length) {
      return (
        <span className="wf-node-exec-badge wf-node-exec-badge--completed" title="All Parcel Tasks Completed">
          ✓ Completed
        </span>
      );
    }
    return (
      <span className="wf-node-exec-badge wf-node-exec-badge--pending" title="Awaiting Predecessor Stage Completion">
        ⚪ Pending
      </span>
    );
  };

  // ────────────────────────────────────────────────────
  // Loading state
  // ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="wf-builder">
        <div className="wf-builder-inner" style={{ paddingTop: '120px', textAlign: 'center' }}>
          <div style={{ fontSize: '14px', color: '#838b96' }}>Loading V2 Workflow Graph Topology&hellip;</div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────

  return (
    <div className="wf-builder">
      <div className="wf-builder-inner">
        {/* ──────── Header ──────── */}
        <header className="wf-header">
          <div className="wf-header-left">
            <div className="wf-breadcrumb">
              <Link to="/boss/dashboard">
                <BhoomiLogo size={14} strokeWidth={2.4} />
                <span>&larr; Command Center</span>
              </Link>
              <span className="wf-breadcrumb-sep">/</span>
              <span className="wf-breadcrumb-code">{project?.code || 'PROJECT'}</span>
              <span className="wf-breadcrumb-sep">/</span>
              <span>Workflow Designer</span>
            </div>
            <h1 className="wf-title">
              Workflow Graph &mdash; {project?.title || 'Statutory Docket'}
            </h1>
            <p className="wf-subtitle">
              Directed Acyclic Graph (DAG) topology for statutory stages, multi-branch cohort allocation, and execution gates.
            </p>
          </div>

          <div className="wf-header-actions">
            <span className={`wf-status-badge ${isWorkflowActive ? 'wf-status-badge--active' : 'wf-status-badge--draft'}`}>
              {isWorkflowActive ? 'ACTIVE · FROZEN' : 'DESIGN · DRAFT'}
            </span>
            <button
              type="button"
              className="wf-btn wf-btn--execution"
              onClick={handleOpenExecution}
              disabled={loadingExecution}
              title="Inspect Phase 10 Runtime Execution Engine & Parcel-to-Task Lineage"
            >
              {loadingExecution ? 'Loading Runtime…' : '⚡ Runtime Execution Engine'}
            </button>
            <Link to={`/boss/projects/${projectId}/workflow`} className="wf-btn">
              Linear View
            </Link>
          </div>
        </header>

        {/* ──────── Alerts ──────── */}
        {isWorkflowActive && (
          <div className="wf-alert wf-alert--locked">
            <span style={{ fontSize: '18px' }}>🔒</span>
            <div style={{ flex: 1 }}>
              <strong>Workflow Activated & Topology Frozen:</strong> Operational execution has started and tasks are dispatched to field officers. All mutation requests are restricted by statutory compliance (<code>WORKFLOW_ALREADY_ACTIVATED</code>).
            </div>
            <button
              type="button"
              className="wf-btn wf-btn--execution-sm"
              onClick={handleOpenExecution}
            >
              ⚡ Inspect Execution Matrix
            </button>
          </div>
        )}
        {cycleError && (
          <div className="wf-alert wf-alert--error">
            <strong>⛔ DAG Cycle Violation:</strong> {cycleError}
          </div>
        )}
        {error && (
          <div className="wf-alert wf-alert--warning">
            <strong>⚠️ Notice:</strong> {error}
          </div>
        )}
        {validationResult && (
          <div className={`wf-alert ${validationResult.valid ? 'wf-alert--success' : 'wf-alert--error'}`}>
            {validationResult.valid ? (
              <div><strong>✓ Topology Validated</strong> — Graph is cycle-free, cohorts assigned, ready for activation.</div>
            ) : (
              <div>
                <strong>Validation Issues:</strong>
                <ul className="wf-validation-list">
                  {validationResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ──────── Toolbar ──────── */}
        <div className="wf-toolbar">
          <div className="wf-toolbar-left">
            <div className="wf-toolbar-stat">
              Nodes: <strong>{nodes.length}</strong> &bull; Edges: <strong>{edges.length}</strong>
            </div>
            <div className="wf-toolbar-divider" />
            {/* Node library — quick-add buttons */}
            <div className="wf-node-library">
              <button
                type="button"
                disabled={isWorkflowActive || isSaving}
                onClick={() => handleQuickAddNode('STAGE', 'Stage')}
                className="wf-node-library-btn"
              >
                + Stage
              </button>
              <button
                type="button"
                disabled={isWorkflowActive || isSaving}
                onClick={() => handleQuickAddNode('SUB_DIVISION', 'Sub-Division')}
                className="wf-node-library-btn"
              >
                + Sub-Division
              </button>
              <button
                type="button"
                disabled={isWorkflowActive || isSaving}
                onClick={() => handleQuickAddNode('APPROVAL_GATE', 'Gate')}
                className="wf-node-library-btn"
              >
                + Approval Gate
              </button>
              <button
                type="button"
                disabled={isWorkflowActive || isSaving}
                onClick={() => setShowAddNodeModal(true)}
                className="wf-btn wf-btn--primary wf-btn--sm"
              >
                + Custom Node
              </button>
            </div>
          </div>

          <div className="wf-toolbar-right">
            <button
              type="button"
              disabled={isWorkflowActive || isSaving}
              onClick={resetToStandardGraph}
              className="wf-btn"
              title="Reset to standard District ├── Acquisition ├── Compensation └── Possession lifecycle"
            >
              🔄 Standard 3 Branches
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setValidationModalMode('validate');
                setShowValidationModal(true);
              }}
              className="wf-btn"
            >
              Validate
            </button>
            <button
              type="button"
              disabled={isWorkflowActive || isActivating}
              onClick={() => {
                setValidationModalMode('activate');
                setShowValidationModal(true);
              }}
              className={`wf-btn ${isWorkflowActive ? '' : 'wf-btn--success'}`}
            >
              {isActivating ? 'Activating…' : isWorkflowActive ? 'Activated' : 'Activate →'}
            </button>
          </div>
        </div>

        {/* ──────── Connecting-edge hint ──────── */}
        {connectingFrom && (
          <div className="wf-alert wf-alert--info">
            <strong>🔗 Edge Mode:</strong> Click a target node to connect from &ldquo;{nodes.find((n) => n.id === connectingFrom)?.name}&rdquo;.{' '}
            <button
              type="button"
              onClick={() => setConnectingFrom(null)}
              className="wf-btn wf-btn--sm wf-btn--danger"
              style={{ marginLeft: 8 }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* ──────── Main workspace: Canvas + Inspector ──────── */}
        <div className="wf-workspace">
          {/* ── Canvas ── */}
          <div className="wf-canvas-container">
            <div
              ref={canvasRef}
              className="wf-canvas-viewport"
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseUp}
              onWheel={handleCanvasWheel}
            >
              {/* Phase 7: Live Fragment Preview Floating Banner */}
              {previewFragment && (
                <div className="wf-canvas-preview-banner">
                  <div className="wf-preview-banner-text">
                    <span className="wf-preview-sparkle">✨</span>
                    <span>
                      Previewing Template Fragment: <strong>{previewFragment.previewNodes.length} Nodes</strong> (Dashed on Canvas)
                    </span>
                  </div>
                  <div className="wf-preview-banner-actions">
                    <button
                      type="button"
                      className="wf-btn wf-btn--sm wf-btn--primary"
                      onClick={async () => {
                        if (selectedNodeId && activePreviewTemplateId) {
                          await applyTemplate(selectedNodeId, activePreviewTemplateId);
                          setActivePreviewTemplateId(null);
                        }
                      }}
                    >
                      ✓ Commit Fragment
                    </button>
                    <button
                      type="button"
                      className="wf-btn wf-btn--sm"
                      onClick={() => {
                        clearTemplatePreview();
                        setActivePreviewTemplateId(null);
                      }}
                    >
                      × Cancel Preview
                    </button>
                  </div>
                </div>
              )}

              <svg
                className="wf-canvas-svg"
                width={layout.canvasWidth}
                height={layout.canvasHeight}
                style={{ width: '100%', height: '100%' }}
              >
                {/* Definitions: dot grid pattern + arrowhead marker */}
                <defs>
                  <pattern id="wf-dot-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="10" cy="10" r="0.8" fill="#dfe3e8" />
                  </pattern>
                  <marker
                    id="wf-arrowhead"
                    markerWidth="8"
                    markerHeight="8"
                    refX="7"
                    refY="4"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M 0 0 L 8 4 L 0 8 Z" className="wf-edge-arrowhead" />
                  </marker>
                </defs>

                {/* Background grid */}
                <rect width="100%" height="100%" className="wf-canvas-grid" />

                {/* Transform group for pan + zoom */}
                <g transform={`translate(${panX}, ${panY}) scale(${zoom})`}>
                  {/* ── Edges (including preview edges) ── */}
                  {displayEdges.map((edge) => {
                    const srcPos = positionMap.get(edge.sourceNodeId);
                    const tgtPos = positionMap.get(edge.targetNodeId);
                    if (!srcPos || !tgtPos) return null;

                    const isPreviewEdge = previewFragment?.previewEdges.some((e) => e.id === edge.id);
                    const pathD = computeEdgePath(srcPos, tgtPos);
                    const midX = (srcPos.x + nodeW / 2 + tgtPos.x + nodeW / 2) / 2;
                    const midY = (srcPos.y + nodeH + tgtPos.y) / 2;

                    return (
                      <g key={edge.id} className={`wf-edge-group ${isPreviewEdge ? 'wf-edge-group--preview' : ''}`}>
                        <path
                          d={pathD}
                          className={`wf-edge-path ${isPreviewEdge ? 'wf-edge-path--preview' : ''}`}
                          markerEnd="url(#wf-arrowhead)"
                          strokeDasharray={isPreviewEdge ? '6 4' : undefined}
                          stroke={isPreviewEdge ? '#3b82f6' : undefined}
                        />
                        {/* Label */}
                        {edge.edgeLabel && (
                          <text x={midX} y={midY - 6} className="wf-edge-label">
                            {edge.edgeLabel}
                          </text>
                        )}
                        {/* Delete button on hover */}
                        {!isWorkflowActive && (
                          <g
                            className="wf-edge-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteEdge(edge.id);
                            }}
                            transform={`translate(${midX - 8}, ${midY - 18})`}
                          >
                            <rect
                              x="0"
                              y="0"
                              width="16"
                              height="16"
                              rx="3"
                              fill="#ffffff"
                              stroke="#fecaca"
                              strokeWidth="1"
                            />
                            <text
                              x="8"
                              y="12"
                              textAnchor="middle"
                              fontSize="10"
                              fill="#ef4444"
                              fontWeight="700"
                            >
                              ×
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}

                  {/* ── Nodes (foreignObject cards) ── */}
                  {nodes.map((node) => {
                    const pos = positionMap.get(node.id);
                    if (!pos) return null;
                    const isSelected = node.id === selectedNodeId;
                    const isConnectSource = node.id === connectingFrom;
                    const isSibling = selectedNodeId ? validSiblingNodes.some((s) => s.id === node.id) : false;
                    const isDropTarget = dropTargetNodeId === node.id;

                    return (
                      <foreignObject
                        key={node.id}
                        x={pos.x}
                        y={pos.y}
                        width={nodeW}
                        height={nodeH}
                        style={{ overflow: 'visible' }}
                      >
                        <div
                          className={`wf-node ${isSelected ? 'wf-node--selected' : ''} ${
                            isDropTarget ? 'wf-node--drop-active' : ''
                          }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (connectingFrom) {
                                handleNodeSourceClick(node.id);
                              } else {
                                selectNode(node.id);
                              }
                            }}
                            onDragOver={(e) => {
                              // Allow dropping dragged parcels on valid sibling node
                              if (isSibling) {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                if (dropTargetNodeId !== node.id) {
                                  setDropTargetNodeId(node.id);
                                }
                              }
                            }}
                            onDragLeave={() => {
                              if (dropTargetNodeId === node.id) {
                                setDropTargetNodeId(null);
                              }
                            }}
                            onDrop={async (e) => {
                              e.preventDefault();
                              setDropTargetNodeId(null);
                              try {
                                const raw = e.dataTransfer.getData('application/json');
                                if (!raw) return;
                                const data = JSON.parse(raw);
                                if (data.sourceNodeId && data.parcelIds && data.sourceNodeId !== node.id) {
                                  await moveParcels(data.sourceNodeId, node.id, data.parcelIds);
                                }
                              } catch (err) {
                                console.error('Parcel drop error', err);
                              }
                            }}
                            style={{
                              outline: isConnectSource
                                ? '2px dashed #2576eb'
                                : isDropTarget
                                ? '2px dashed #10b981'
                                : undefined,
                              position: 'relative',
                            }}
                          >
                            {/* Header row: name + branch badge + type badge + template indicator */}
                            <div className="wf-node-header">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                                <span className={`wf-node-branch-tag wf-node-branch-tag--${getNodeBranchType(node).toLowerCase()}`}>
                                  {getNodeBranchType(node)}
                                </span>
                                <span className="wf-node-name" title={node.name}>{node.name}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                {!isPreviewNode && !isWorkflowActive && (
                                  <span
                                    className="wf-node-template-pill"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      selectNode(node.id);
                                      setShowTemplateModal(true);
                                    }}
                                    title="✨ Contextual templates available for this node"
                                  >
                                    ✨
                                  </span>
                                )}
                                <span className={`wf-node-type-badge ${getNodeTypeBadgeClass(node.nodeType)}`}>
                                  {node.nodeType.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>

                            {/* Meta row: dept + parcels + SLA */}
                            <div className="wf-node-meta">
                              <span className="wf-node-dept">
                                {formatResponsibility(node.responsibility)}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span
                                  className="wf-node-parcels"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectNode(node.id);
                                    setInspectorTab('parcels');
                                  }}
                                  title="Click to view & manage cohort parcels"
                                  style={{ cursor: 'pointer' }}
                                >
                                  {node.parcelCount ?? 0} parcels
                                </span>
                                <span className="wf-node-sla">SLA {node.slaDays}d</span>
                              </div>
                            </div>

                            {/* Phase 10: Live Node Execution Badge */}
                            {getNodeExecutionStats(node.id)}

                            {/* Drop overlay badge when dragging parcels over this node */}
                            {isDropTarget && (
                              <div className="wf-node-drop-indicator">
                                <span>↓ Drop to move parcels</span>
                              </div>
                            )}

                          {/* Action buttons (visible on hover / selection) */}
                          {!isWorkflowActive && (
                            <div className="wf-node-actions">
                              <button
                                type="button"
                                className="wf-node-action-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectNode(node.id);
                                  setConnectingFrom(node.id);
                                }}
                              >
                                → Edge
                              </button>
                              <button
                                type="button"
                                className="wf-node-action-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectNode(node.id);
                                  setShowSplitModal(true);
                                }}
                              >
                                ⑂ Split
                              </button>
                              {(node.parcelCount || 0) > 0 && (
                                <button
                                  type="button"
                                  className="wf-node-action-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectNode(node.id);
                                    setShowMoveParcelsModal(true);
                                  }}
                                >
                                  ⇄ Move
                                </button>
                              )}
                              <button
                                type="button"
                                className="wf-node-action-btn wf-node-action-btn--delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`Delete "${node.name}"? Parcels merge to sibling.`)) {
                                    deleteNode(node.id);
                                  }
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </foreignObject>
                    );
                  })}
                </g>
              </svg>
            </div>

            {/* Zoom controls */}
            <div className="wf-zoom-controls">
              <button type="button" className="wf-zoom-btn" onClick={zoomIn} title="Zoom in">
                +
              </button>
              <div className="wf-zoom-label">{Math.round(zoom * 100)}%</div>
              <button type="button" className="wf-zoom-btn" onClick={zoomOut} title="Zoom out">
                −
              </button>
              <button
                type="button"
                className="wf-zoom-btn"
                onClick={zoomReset}
                title="Reset view"
                style={{ marginTop: 4, fontSize: 11 }}
              >
                ⊞
              </button>
            </div>

            {/* Mini-map */}
            {nodes.length > 0 && (
              <div className="wf-minimap">
                <svg width="160" height="100" viewBox={`0 0 ${layout.canvasWidth} ${layout.canvasHeight}`}>
                  {/* Mini-map edges */}
                  {edges.map((edge) => {
                    const srcPos = positionMap.get(edge.sourceNodeId);
                    const tgtPos = positionMap.get(edge.targetNodeId);
                    if (!srcPos || !tgtPos) return null;
                    return (
                      <line
                        key={`mm-${edge.id}`}
                        className="wf-minimap-edge"
                        x1={srcPos.x + nodeW / 2}
                        y1={srcPos.y + nodeH}
                        x2={tgtPos.x + nodeW / 2}
                        y2={tgtPos.y}
                      />
                    );
                  })}
                  {/* Mini-map nodes */}
                  {layout.positions.map((pos) => (
                    <rect
                      key={`mm-${pos.nodeId}`}
                      className={`wf-minimap-node ${pos.nodeId === selectedNodeId ? 'wf-minimap-node--selected' : ''}`}
                      x={pos.x}
                      y={pos.y}
                      width={nodeW}
                      height={nodeH}
                    />
                  ))}
                  {/* Viewport indicator */}
                  <rect
                    className="wf-minimap-viewport"
                    x={Math.max(0, -panX / zoom)}
                    y={Math.max(0, -panY / zoom)}
                    width={Math.min(layout.canvasWidth, (canvasRef.current?.clientWidth || 800) / zoom)}
                    height={Math.min(layout.canvasHeight, 560 / zoom)}
                  />
                </svg>
              </div>
            )}

            {/* Empty state */}
            {nodes.length === 0 && (
              <div className="wf-canvas-empty">
                <div className="wf-canvas-empty-icon">⬡</div>
                <h3 className="wf-canvas-empty-title">No Workflow Topology</h3>
                <p className="wf-canvas-empty-desc">
                  Add nodes from the toolbar above or click &ldquo;Reset DAG&rdquo; to initialise the standard District-level starting structure.
                </p>
              </div>
            )}
          </div>

          {/* ──────── Inspector Panel ──────── */}
          <div className={`wf-inspector ${inspectorTab === 'parcels' ? 'wf-inspector--parcels-mode' : ''}`}>
            <div className="wf-inspector-header-row">
              <h3 className="wf-inspector-title">
                {selectedNode ? selectedNode.name : 'Node Inspector'}
              </h3>
              {selectedNode && (
                <span className={`wf-node-type-badge ${getNodeTypeBadgeClass(selectedNode.nodeType)}`}>
                  {selectedNode.nodeType.replace(/_/g, ' ')}
                </span>
              )}
            </div>

            {selectedNode ? (
              <>
                {/* Tab switcher: Node Config vs Cohort Parcels */}
                <div className="wf-inspector-tabs">
                  <button
                    type="button"
                    className={`wf-inspector-tab ${inspectorTab === 'config' ? 'wf-inspector-tab--active' : ''}`}
                    onClick={() => setInspectorTab('config')}
                  >
                    Node Config
                  </button>
                  <button
                    type="button"
                    className={`wf-inspector-tab ${inspectorTab === 'parcels' ? 'wf-inspector-tab--active' : ''}`}
                    onClick={() => setInspectorTab('parcels')}
                  >
                    Cohort Parcels ({selectedNodeParcels.length})
                  </button>
                </div>

                {inspectorTab === 'config' ? (
                  <form onSubmit={handleInspectorSave} className="wf-inspector-form">
                    {isWorkflowActive && (
                      <div className="wf-inspector-locked-notice">
                        🔒 <strong>Read-Only Topology:</strong> Workflow is active. Node properties and stages are locked per statutory compliance.
                      </div>
                    )}
                    <div className="wf-field">
                      <label className="wf-field-label">Node Name</label>
                      <input
                        type="text"
                        disabled={isWorkflowActive}
                        value={inspectorName}
                        onChange={(e) => setInspectorName(e.target.value)}
                        className="wf-field-input"
                      />
                    </div>

                    <div className="wf-field">
                      <label className="wf-field-label">Node Type</label>
                      <div className="wf-field-readonly">
                        {selectedNode.nodeType.replace(/_/g, ' ')}
                      </div>
                    </div>

                    <div className="wf-field">
                      <label className="wf-field-label">Departmental Responsibility</label>
                      <select
                        disabled={isWorkflowActive}
                        value={inspectorResp}
                        onChange={(e) => setInspectorResp(e.target.value as WorkflowNodeResponsibility)}
                        className="wf-field-input"
                      >
                        <option value="REVENUE_BRANCH">Revenue Branch</option>
                        <option value="SURVEY_OFFICE">Survey Office</option>
                        <option value="FOREST_DEPT">Forest Department</option>
                        <option value="ENVIRONMENT_DEPT">Environment Department</option>
                        <option value="COMPENSATION_BRANCH">Compensation Branch (SLAO)</option>
                        <option value="POSSESSION_BRANCH">Possession Branch (Tehsil)</option>
                        <option value="LEGAL_CELL">Legal Cell</option>
                      </select>
                    </div>

                    <div className="wf-field">
                      <label className="wf-field-label">Statutory SLA (Days)</label>
                      <input
                        type="number"
                        disabled={isWorkflowActive}
                        value={inspectorSla}
                        onChange={(e) => setInspectorSla(Number(e.target.value))}
                        className="wf-field-input"
                      />
                    </div>

                    <div className="wf-field">
                      <label className="wf-field-label">Cohort Parcel Size</label>
                      <div className="wf-field-readonly" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{selectedNode.parcelCount ?? 0} Demarcated Parcels</span>
                        <button
                          type="button"
                          className="wf-btn wf-btn--sm"
                          onClick={() => setInspectorTab('parcels')}
                        >
                          Manage Parcels →
                        </button>
                      </div>
                    </div>

                    {/* Reusable Template Trigger Banner */}
                    {!isWorkflowActive && (
                      <button
                        type="button"
                        className="wf-btn wf-btn--outline wf-btn-template-action"
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          borderColor: '#93c5fd',
                          color: '#1d4ed8',
                          backgroundColor: '#eff6ff',
                          fontWeight: 600,
                        }}
                        onClick={() => setShowTemplateModal(true)}
                      >
                        ✨ Insert Reusable Template Fragment...
                      </button>
                    )}

                    {/* Inspector quick-actions */}
                    {!isWorkflowActive && (
                      <>
                        <button type="submit" disabled={isSaving} className="wf-btn wf-btn--primary" style={{ width: '100%', justifyContent: 'center' }}>
                          {isSaving ? 'Saving…' : 'Save Properties'}
                        </button>

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            className="wf-btn wf-btn--sm"
                            onClick={() => {
                              setConnectingFrom(selectedNodeId);
                            }}
                          >
                            → Connect Edge
                          </button>
                          <button
                            type="button"
                            className="wf-btn wf-btn--sm"
                            onClick={() => setShowSplitModal(true)}
                          >
                            ⑂ Split
                          </button>
                          {(selectedNode.parcelCount || 0) > 0 && (
                            <button
                              type="button"
                              className="wf-btn wf-btn--sm"
                              onClick={() => {
                                setMovePreselectedParcelIds([]);
                                setShowMoveParcelsModal(true);
                              }}
                            >
                              ⇄ Move Parcels
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </form>
                ) : (
                  <WorkflowParcelPanel
                    selectedNode={selectedNode}
                    parcels={selectedNodeParcels}
                    siblingNodes={validSiblingNodes}
                    onMoveParcels={moveParcels}
                    onOpenMoveModal={(preselectedIds) => {
                      setMovePreselectedParcelIds(preselectedIds || []);
                      setShowMoveParcelsModal(true);
                    }}
                    onViewPassport={(p) => setActivePassportParcel(p)}
                    isSaving={isSaving}
                  />
                )}
              </>
            ) : (
              <div className="wf-inspector-empty">
                Select a node from the canvas to inspect and configure its attributes or manage its parcel cohort.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          Modals
          ════════════════════════════════════════════════ */}

      {/* ── Add Node Modal ── */}
      {showAddNodeModal && (
        <div className="wf-modal-overlay" onClick={() => setShowAddNodeModal(false)}>
          <div className="wf-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="wf-modal-title">Add Workflow Node</h3>
            <p className="wf-modal-desc">
              Define a new statutory stage, sub-division branch, or approval gate in the workflow topology.
            </p>
            <form onSubmit={handleAddNodeSubmit} className="wf-modal-form">
              <div className="wf-field">
                <label className="wf-field-label">Node Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Haveli Sub-Division Scrutiny"
                  value={newNodeName}
                  onChange={(e) => setNewNodeName(e.target.value)}
                  className="wf-field-input"
                />
              </div>
              <div className="wf-field">
                <label className="wf-field-label">Node Classification</label>
                <select
                  value={newNodeType}
                  onChange={(e) => setNewNodeType(e.target.value as WorkflowNodeType)}
                  className="wf-field-input"
                >
                  <option value="SUB_DIVISION">Sub-Division Branch</option>
                  <option value="SPECIAL_UNIT">Special Acquisition Unit</option>
                  <option value="APPROVAL_GATE">Approval Gate</option>
                  <option value="BRANCH_GATE">Branch Gate</option>
                  <option value="STAGE">Standard Stage</option>
                </select>
              </div>
              <div className="wf-field">
                <label className="wf-field-label">Department Responsibility</label>
                <select
                  value={newNodeResp}
                  onChange={(e) => setNewNodeResp(e.target.value as WorkflowNodeResponsibility)}
                  className="wf-field-input"
                >
                  <option value="REVENUE_BRANCH">Revenue Branch</option>
                  <option value="SURVEY_OFFICE">Survey Office</option>
                  <option value="COMPENSATION_BRANCH">Compensation Branch</option>
                  <option value="POSSESSION_BRANCH">Possession Branch</option>
                </select>
              </div>
              <div className="wf-field">
                <label className="wf-field-label">SLA (Days)</label>
                <input
                  type="number"
                  value={newNodeSla}
                  onChange={(e) => setNewNodeSla(Number(e.target.value))}
                  className="wf-field-input"
                />
              </div>
              <div className="wf-modal-footer">
                <button type="button" onClick={() => setShowAddNodeModal(false)} className="wf-btn">
                  Cancel
                </button>
                <button type="submit" className="wf-btn wf-btn--primary">
                  Create Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Split Node Modal ── */}
      {showSplitModal && (
        <div className="wf-modal-overlay" onClick={() => setShowSplitModal(false)}>
          <div className="wf-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="wf-modal-title">Split into Sibling Branches</h3>
            <p className="wf-modal-desc">
              Per Phase 4 rules, newly created branches start empty. You can then move parcels into the intended branches.
            </p>
            <form onSubmit={handleSplitSubmit} className="wf-modal-form">
              <div className="wf-field">
                <label className="wf-field-label">Branch Names (comma-separated)</label>
                <input
                  type="text"
                  required
                  value={splitBranches}
                  onChange={(e) => setSplitBranches(e.target.value)}
                  className="wf-field-input"
                />
              </div>
              <div className="wf-field">
                <label className="wf-field-label">Administrative Unit Name (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Pune Regional Division"
                  value={splitUnitName}
                  onChange={(e) => setSplitUnitName(e.target.value)}
                  className="wf-field-input"
                />
              </div>
              <div className="wf-modal-footer">
                <button type="button" onClick={() => setShowSplitModal(false)} className="wf-btn">
                  Cancel
                </button>
                <button type="submit" className="wf-btn wf-btn--primary">
                  Execute Split
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Connect Edge Modal (fallback for non-canvas connect) ── */}
      {showConnectEdgeModal && (
        <div className="wf-modal-overlay" onClick={() => setShowConnectEdgeModal(false)}>
          <div className="wf-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="wf-modal-title">Connect Directed Edge</h3>
            <form onSubmit={handleConnectEdgeSubmit} className="wf-modal-form">
              <div className="wf-field">
                <label className="wf-field-label">Source Node</label>
                <div className="wf-field-readonly">
                  {selectedNode?.name || selectedNodeId || '—'}
                </div>
              </div>
              <div className="wf-field">
                <label className="wf-field-label">Target Node</label>
                <select
                  required
                  value={targetEdgeNodeId}
                  onChange={(e) => setTargetEdgeNodeId(e.target.value)}
                  className="wf-field-input"
                >
                  <option value="">Select target node…</option>
                  {nodes
                    .filter((n) => n.id !== selectedNodeId)
                    .map((n) => (
                      <option key={n.id} value={n.id}>
                        {n.name} ({n.nodeType.replace(/_/g, ' ')})
                      </option>
                    ))}
                </select>
              </div>
              <div className="wf-field">
                <label className="wf-field-label">Edge Label / Condition</label>
                <input
                  type="text"
                  placeholder="e.g. If title undisputed"
                  value={edgeLabel}
                  onChange={(e) => setEdgeLabel(e.target.value)}
                  className="wf-field-input"
                />
              </div>
              <div className="wf-modal-footer">
                <button type="button" onClick={() => setShowConnectEdgeModal(false)} className="wf-btn">
                  Cancel
                </button>
                <button type="submit" className="wf-btn wf-btn--primary">
                  Connect Edge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Move Parcels Modal (Strictly enforces Sibling-Only Moves) ── */}
      {showMoveParcelsModal && (
        <div className="wf-modal-overlay" onClick={() => setShowMoveParcelsModal(false)}>
          <div className="wf-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="wf-modal-title">Reallocate Parcels</h3>
            <p className="wf-modal-desc">
              Transfer parcels between sibling cohorts during design-time allocation.
              <br />
              <small style={{ color: 'var(--tb-ink-tertiary, #64748b)' }}>
                Statutory Rule: Only sibling moves are permitted according to the V2 design model.
              </small>
            </p>
            <form onSubmit={handleMoveParcelsSubmit} className="wf-modal-form">
              <div className="wf-field">
                <label className="wf-field-label">Source Cohort</label>
                <div className="wf-field-readonly">
                  {selectedNode?.name} ({selectedNode?.parcelCount || 0} parcels)
                </div>
              </div>

              <div className="wf-field">
                <label className="wf-field-label">Selected Parcels to Transfer</label>
                {movePreselectedParcelIds.length > 0 ? (
                  <div className="wf-modal-selected-parcels-box">
                    {movePreselectedParcelIds.map((id) => {
                      const p = getNodeParcelsList(selectedNodeId!).find((x) => x.parcelId === id);
                      return (
                        <span key={id} className="wf-modal-parcel-pill">
                          🏷️ {p?.parcelName || p?.surveyNumber || id}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <input
                    type="number"
                    min={1}
                    max={selectedNode?.parcelCount || 1}
                    value={moveParcelCount}
                    onChange={(e) => setMoveParcelCount(Number(e.target.value))}
                    className="wf-field-input"
                  />
                )}
              </div>

              <div className="wf-field">
                <label className="wf-field-label">Destination Sibling Cohort</label>
                <select
                  required
                  value={moveTargetNodeId}
                  onChange={(e) => setMoveTargetNodeId(e.target.value)}
                  className="wf-field-input"
                >
                  <option value="">Select sibling cohort…</option>
                  {validSiblingNodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name} ({n.parcelCount || 0} parcels)
                    </option>
                  ))}
                </select>
                {validSiblingNodes.length === 0 && (
                  <span className="wf-field-error" style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>
                    No sibling branches found. Split this node or add a sibling branch first.
                  </span>
                )}
              </div>

              <div className="wf-modal-footer">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoveParcelsModal(false);
                    setMovePreselectedParcelIds([]);
                  }}
                  className="wf-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="wf-btn wf-btn--primary"
                  disabled={validSiblingNodes.length === 0 || !moveTargetNodeId}
                >
                  Transfer Parcels
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Sovereign Land Parcel Passport Modal (Phase 6 View Passport Action) ── */}
      {activePassportParcel && (
        <ParcelPassportModal
          parcel={activePassportParcel}
          nodeName={selectedNode?.name}
          onClose={() => setActivePassportParcel(null)}
        />
      )}

      {/* ── Phase 7 Contextual Workflow Templates Modal ── */}
      {showTemplateModal && selectedNode && (
        <WorkflowTemplateModal
          selectedNode={selectedNode}
          onApplyTemplate={async (templateId) => {
            const ok = await applyTemplate(selectedNode.id, templateId);
            return ok;
          }}
          onPreviewTemplate={async (templateId) => {
            setActivePreviewTemplateId(templateId);
            const res = await previewTemplate(selectedNode.id, templateId);
            return res;
          }}
          onClose={() => setShowTemplateModal(false)}
          isSaving={isSaving}
        />
      )}

      {/* ── Phase 9 Workflow Validation and Activation Modal ── */}
      <WorkflowValidationModal
        isOpen={showValidationModal}
        onClose={() => setShowValidationModal(false)}
        mode={validationModalMode}
        validationResult={validationResult}
        isActivating={isActivating}
        onRunValidation={validateGraph}
        onConfirmActivate={activateGraph}
        isWorkflowActive={isWorkflowActive}
        onOpenExecution={handleOpenExecution}
      />

      {/* ── Phase 10 Runtime Execution Engine Panel ── */}
      {showExecutionPanel && executionData && (
        <WorkflowExecutionPanel
          execution={executionData}
          onClose={() => setShowExecutionPanel(false)}
          selectedNodeId={selectedNodeId}
          onSelectNode={(nodeId) => selectNode(nodeId)}
        />
      )}
    </div>
  );
};

export default BossWorkflowBuilderPage;
