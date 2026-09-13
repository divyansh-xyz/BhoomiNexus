import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import './boss-dashboard.css';
import { bossService } from '../../services/api/boss.service';
import { useWorkflowGraph } from '../../hooks/useWorkflowGraph';
import type { ProjectRequest } from '../../types/boss.types';
import type { WorkflowNode, WorkflowNodeType, WorkflowNodeResponsibility } from '../../types/workflowV2.types';
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
import { getNodeBranchType } from '../../utils/workflowTemplates.utils';
import type { WorkflowNodeParcel } from '../../types/workflowV2.types';
import { DemoLoading, DemoUnsavedChangesModal } from '../../components/common/DemoPolishStates';

// ────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────

/** Map node type to CSS badge modifier */
function getNodeTypeBadgeClass(type?: WorkflowNodeType | string): string {
  const normType = String(type || 'STAGE').toUpperCase();
  switch (normType) {
    case 'STAGE':
      return 'wf-node-type-badge--stage';
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

/** Human-readable label for node types with safe fallback */
function getNodeTypeLabel(type?: WorkflowNodeType | string): string {
  if (!type) return 'Stage';
  return String(type).replace(/_/g, ' ');
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

/** Returns assigned demo officer details for statutory workflow nodes */
function getNodeOfficerInfo(node?: WorkflowNode | null): { name: string; designation: string; email: string; role: string } {
  if (!node) {
    return { name: 'Ananya Patel', designation: 'Processing & Field Officer', email: 'officer@bhoomi.gov.in', role: 'Processing Officer' };
  }
  const branch = getNodeBranchType(node);
  if (branch === 'COMPENSATION' || node.responsibility === 'COMPENSATION_BRANCH' || (node as any).responsibleRole === 'COMPENSATION_OFFICER') {
    return {
      name: node.responsibleUserName || 'Mahesh Patil',
      designation: node.responsibleUserDesignation || 'Competent Authority for Land Acquisition (CALA)',
      email: 'comp.officer@bhoomi.gov.in',
      role: 'Compensation Officer',
    };
  }
  if (branch === 'POSSESSION' || node.responsibility === 'POSSESSION_BRANCH' || (node as any).responsibleRole === 'POSSESSION_OFFICER') {
    return {
      name: node.responsibleUserName || 'Vinayak Kulkarni',
      designation: node.responsibleUserDesignation || 'Special Tehsildar (Possession & Encroachment)',
      email: 'possession.officer@bhoomi.gov.in',
      role: 'Possession Officer',
    };
  }
  if (branch === 'DISTRICT' || (node.nodeType as string) === 'DISTRICT' || node.nodeType === 'DISTRICT_ACQUISITION') {
    return {
      name: node.responsibleUserName || 'Dr. Vikramaditya Sen',
      designation: node.responsibleUserDesignation || 'Competent Authority (District Magistrate)',
      email: 'boss@bhoomi.gov.in',
      role: 'District Authority',
    };
  }
  return {
    name: node.responsibleUserName || 'Ananya Patel',
    designation: node.responsibleUserDesignation || 'Processing & Field Officer',
    email: 'officer@bhoomi.gov.in',
    role: 'Processing Officer',
  };
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
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [addChildParentId, setAddChildParentId] = useState<string | null>(null);
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
  const [showUnsavedModal, setShowUnsavedModal] = useState<boolean>(false);

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

  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Sync inspector form fields whenever selectedNode data changes (not just ID).
  // This ensures edits reflected by updateNode are re-synced into the form fields.
  useEffect(() => {
    if (selectedNode) {
      setInspectorName(selectedNode.name);
      setInspectorSla(selectedNode.slaDays);
      setInspectorResp(selectedNode.responsibility);
    }
  }, [selectedNode?.id, selectedNode?.name, selectedNode?.slaDays, selectedNode?.responsibility]);

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


  const zoomIn = () => setZoom((z) => Math.min(2, z + 0.15));
  const zoomOut = () => setZoom((z) => Math.max(0.3, z - 0.15));
  const zoomReset = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  /** Center the workflow DAG precisely in the viewport */
  const centerCanvas = useCallback(() => {
    if (!canvasRef.current || layout.positions.length === 0) {
      setZoom(1);
      setPanX(0);
      setPanY(0);
      return;
    }
    const containerW = canvasRef.current.clientWidth || 900;
    const containerH = canvasRef.current.clientHeight || 600;

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const p of layout.positions) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x + nodeW);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y + nodeH);
    }

    const graphWidth = maxX - minX;
    const graphHeight = maxY - minY;
    const graphCenterX = minX + graphWidth / 2;
    const graphCenterY = minY + graphHeight / 2;

    const fitZoom = Math.min(
      1.0,
      Math.max(0.65, Math.min((containerW - 120) / (graphWidth || 1), (containerH - 120) / (graphHeight || 1)))
    );
    setZoom(fitZoom);
    const newPanX = Math.round(containerW / 2 - graphCenterX * fitZoom);
    const newPanY = Math.round(Math.max(40, containerH / 2 - graphCenterY * fitZoom));

    setPanX(newPanX);
    setPanY(newPanY);
  }, [layout.positions, nodeW, nodeH]);

  const hasAutoCentered = useRef(false);
  useEffect(() => {
    if (!hasAutoCentered.current && layout.positions.length > 0 && canvasRef.current) {
      hasAutoCentered.current = true;
      const t = setTimeout(() => centerCanvas(), 100);
      return () => clearTimeout(t);
    }
  }, [layout.positions.length, centerCanvas]);

  // Press Escape to cancel edge connecting mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && connectingFrom) {
        setConnectingFrom(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [connectingFrom]);


  /**
   * Add Child Node: Creates a new node AND auto-connects it as a child of parentNodeId.
   * This is the primary node creation flow — click a node, add a child, auto-connect.
   */
  const handleAddChildNode = async (e: React.FormEvent) => {
    e.preventDefault();
    const parentId = addChildParentId;
    if (!parentId || !newNodeName) return;

    const newNode = await createNode({
      name: newNodeName,
      nodeType: newNodeType,
      responsibility: newNodeResp,
      slaDays: Number(newNodeSla),
      requiredDocuments: ['Joint Measurement Survey Record', 'Cadastral Map Excerpt'],
      positionX: 300,
      positionY: 200,
      parcelCount: 0,
    });

    if (newNode) {
      // Auto-connect parent → child
      await createEdge(parentId, newNode.id);
    }

    setShowAddChildModal(false);
    setAddChildParentId(null);
    setNewNodeName('');
  };

  /** Open the Add Child modal for a specific parent node */
  const openAddChildModal = (parentNodeId: string) => {
    setAddChildParentId(parentNodeId);
    setNewNodeName('');
    setNewNodeType('SUB_DIVISION');
    setNewNodeResp('REVENUE_BRANCH');
    setNewNodeSla(15);
    setShowAddChildModal(true);
  };

  /**
   * Compute parcel hierarchy validation: for each node with children,
   * check if sum(children.parcelCount) === node.parcelCount
   */
  const parcelHierarchyWarnings = useMemo(() => {
    const warnings = new Map<string, { parentCount: number; childrenSum: number }>();
    const childrenMap = new Map<string, string[]>();
    for (const edge of edges) {
      if (!childrenMap.has(edge.sourceNodeId)) {
        childrenMap.set(edge.sourceNodeId, []);
      }
      childrenMap.get(edge.sourceNodeId)!.push(edge.targetNodeId);
    }
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    for (const [parentId, childIds] of childrenMap.entries()) {
      const parent = nodeMap.get(parentId);
      if (!parent) continue;
      const childrenSum = childIds.reduce((sum, cid) => {
        const child = nodeMap.get(cid);
        return sum + (child?.parcelCount || 0);
      }, 0);
      if ((parent.parcelCount ?? 0) > 0 && childrenSum !== (parent.parcelCount ?? 0)) {
        warnings.set(parentId, { parentCount: parent.parcelCount ?? 0, childrenSum });
      }
    }
    return warnings;
  }, [nodes, edges]);

  // ────────────────────────────────────────────────────
  // Form handlers
  // ────────────────────────────────────────────────────


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
    const res = await updateNode(selectedNodeId, {
      name: inspectorName,
      slaDays: Number(inspectorSla),
      responsibility: inspectorResp,
    });
    if (res) {
      setSaveSuccessMsg('✓ Saved successfully');
      setTimeout(() => setSaveSuccessMsg(null), 2500);
    }
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



  // ────────────────────────────────────────────────────
  // Loading state
  // ────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="wf-builder">
        <DemoLoading
          title="Resolving V2 Workflow Topology & Cadastral Graph…"
          subtitle="Computing DAG layout, branch structures, parcel cohorts, and statutory templates."
          fullHeight
        />
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
              <button
                type="button"
                onClick={() => {
                  if (nodes.length > 0 && !isWorkflowActive) {
                    setShowUnsavedModal(true);
                  } else {
                    window.location.href = '/boss/dashboard';
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'inherit',
                  font: 'inherit',
                }}
              >
                <BhoomiLogo size={14} strokeWidth={2.4} />
                <span>&larr; Command Center</span>
              </button>
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
          </div>
        </header>

        {/* ──────── Alerts ──────── */}
        {isWorkflowActive && (
          <div className="wf-alert wf-alert--locked">
            <span style={{ fontSize: '18px' }}>🔒</span>
            <div style={{ flex: 1 }}>
              <strong>Workflow Activated & Topology Frozen:</strong> Operational execution has started and tasks are dispatched to field officers. All mutation requests are restricted by statutory compliance (<code>WORKFLOW_ALREADY_ACTIVATED</code>).
            </div>
          </div>
        )}
        {cycleError && (
          <div className="wf-alert wf-alert--error">
            <strong>⛔ DAG Cycle Violation:</strong> {cycleError}
          </div>
        )}
        {error && (
          <div className="wf-alert wf-alert--warning">
            <strong>⚠️ Notice:</strong> {typeof error === 'string' ? error : (error as any)?.message || JSON.stringify(error)}
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
          <div
            className="wf-alert wf-alert--info"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#eff6ff',
              border: '1.5px solid #3b82f6',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🔗</span>
              <span>
                <strong>Edge Connecting Mode:</strong> Click any target node on the canvas below to connect from{' '}
                <strong>&ldquo;{nodes.find((n) => n.id === connectingFrom)?.name}&rdquo;</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setConnectingFrom(null)}
              className="wf-btn wf-btn--sm wf-btn--danger"
              style={{ marginLeft: 12, fontWeight: 600 }}
            >
              ✕ Cancel (Esc)
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
                    const isPreviewNode = previewFragment?.previewNodes?.some((pn: any) => pn.id === node.id) ?? false;

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
                          } ${isConnectSource ? 'wf-node--connect-source' : ''} ${
                            connectingFrom && !isConnectSource ? 'wf-node--connect-candidate' : ''
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
                            position: 'relative',
                          }}
                        >
                          {/* Input Port (Top Handle) */}
                          <div
                            className={`wf-node-handle wf-node-handle--target ${
                              connectingFrom && !isConnectSource ? 'wf-node-handle--active' : ''
                            }`}
                            title={
                              connectingFrom && !isConnectSource
                                ? 'Click to complete connection to this node'
                                : 'Input Port: Directed dependency entry'
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              if (connectingFrom) {
                                handleNodeSourceClick(node.id);
                              }
                            }}
                          />

                          {/* If in Edge Connecting Mode and this node is a candidate target, show floating badge */}
                          {connectingFrom && !isConnectSource && (
                            <div className="wf-node-connect-badge">
                              👉 Click to connect here
                            </div>
                          )}

                          {/* If this node is the active connection source, show badge */}
                          {isConnectSource && (
                            <div className="wf-node-connect-badge" style={{ backgroundColor: '#2576eb' }}>
                              🔗 Source: Pick target below
                            </div>
                          )}
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
                                  {getNodeTypeLabel(node.nodeType)}
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

                            {/* Officer Assignment Row */}
                            {(() => {
                              const off = getNodeOfficerInfo(node);
                              return (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 5,
                                    marginTop: 4,
                                    fontSize: '11px',
                                    color: '#1e293b',
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '4px',
                                    padding: '3px 6px',
                                  }}
                                  title={`Assigned Officer: ${off.name} (${off.email})`}
                                >
                                  <span style={{ fontSize: '11px' }}>👤</span>
                                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {off.name}
                                  </span>
                                  <span style={{ fontSize: '9.5px', color: '#64748b', marginLeft: 'auto', flexShrink: 0 }}>
                                    {off.role}
                                  </span>
                                </div>
                              );
                            })()}


                            {/* Drop overlay badge when dragging parcels over this node */}
                            {isDropTarget && (
                              <div className="wf-node-drop-indicator">
                                <span>↓ Drop to move parcels</span>
                              </div>
                            )}

                          {/* Parcel hierarchy mismatch warning */}
                          {parcelHierarchyWarnings.has(node.id) && (
                            <div
                              style={{
                                fontSize: 10.5,
                                color: '#b45309',
                                backgroundColor: '#fffbeb',
                                border: '1px solid #fcd34d',
                                borderRadius: 5,
                                padding: '3px 7px',
                                margin: '2px 0 0 0',
                                lineHeight: 1.3,
                                fontWeight: 600,
                              }}
                              title={`Parent has ${parcelHierarchyWarnings.get(node.id)!.parentCount} parcels but children sum to ${parcelHierarchyWarnings.get(node.id)!.childrenSum}`}
                            >
                              ⚠ Children: {parcelHierarchyWarnings.get(node.id)!.childrenSum} / {parcelHierarchyWarnings.get(node.id)!.parentCount}
                            </div>
                          )}

                          {/* Action buttons (visible on hover / selection) */}
                          {!isWorkflowActive && (
                            <div className="wf-node-actions">
                              <button
                                type="button"
                                className="wf-node-action-btn"
                                style={{ backgroundColor: '#f0fdf4', color: '#15803d', fontWeight: 700 }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectNode(node.id);
                                  openAddChildModal(node.id);
                                }}
                                title="Create a new child node and auto-connect it to this node"
                              >
                                ➕ Add Child
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

                          {/* Output Port (Bottom Handle) */}
                          {!isWorkflowActive && (
                            <div
                              className={`wf-node-handle wf-node-handle--source ${
                                isConnectSource ? 'wf-node-handle--active' : ''
                              }`}
                              title="Output Port: Click to connect directed edge to another node"
                              onClick={(e) => {
                                e.stopPropagation();
                                selectNode(node.id);
                                setConnectingFrom(node.id);
                              }}
                            >
                              <span style={{ fontSize: 9, lineHeight: 1, color: isConnectSource ? '#ffffff' : '#2576eb', fontWeight: 800 }}>
                                ↓
                              </span>
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
                onClick={centerCanvas}
                title="🎯 Center canvas (Reset view to middle)"
                style={{ marginTop: 4, fontSize: 13 }}
              >
                🎯
              </button>
              <button
                type="button"
                className="wf-zoom-btn"
                onClick={zoomReset}
                title="Reset view (100% zoom, 0,0 pan)"
                style={{ marginTop: 2, fontSize: 11 }}
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
                  {getNodeTypeLabel(selectedNode.nodeType)}
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
                        {getNodeTypeLabel(selectedNode.nodeType)}
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
                      <label className="wf-field-label">Assigned Statutory Officer</label>
                      {(() => {
                        const off = getNodeOfficerInfo(selectedNode);
                        return (
                          <div
                            className="wf-field-readonly"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              background: '#f8fafc',
                              padding: '8px 10px',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                            }}
                          >
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                background: '#e0e7ff',
                                color: '#3730a3',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: 13,
                                flexShrink: 0,
                              }}
                            >
                              {off.name.charAt(0)}
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontWeight: 700, fontSize: '12.5px', color: '#0f172a' }}>
                                {off.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#475569' }}>
                                {off.designation}
                              </div>
                              <div style={{ fontSize: '10.5px', color: '#2563eb', fontWeight: 600 }}>
                                ✉ {off.email}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
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

                    {/* Parcel Hierarchy Indicator */}
                    {selectedNodeId && parcelHierarchyWarnings.has(selectedNodeId) && (
                      <div
                        style={{
                          padding: '10px 14px',
                          background: '#fffbeb',
                          borderRadius: 8,
                          border: '1.5px solid #fcd34d',
                          fontSize: 12,
                          color: '#92400e',
                          lineHeight: 1.5,
                        }}
                      >
                        <strong>⚠ Parcel Mismatch:</strong> This node has <strong>{parcelHierarchyWarnings.get(selectedNodeId)!.parentCount}</strong> parcels but its immediate children sum to <strong>{parcelHierarchyWarnings.get(selectedNodeId)!.childrenSum}</strong>. Adjust child parcel counts to balance the hierarchy.
                      </div>
                    )}

                    {/* Inspector quick-actions */}
                    {!isWorkflowActive && (
                      <>
                        <button type="submit" disabled={isSaving} className="wf-btn wf-btn--primary" style={{ width: '100%', justifyContent: 'center' }}>
                          {isSaving ? 'Saving…' : (saveSuccessMsg || 'Save Properties')}
                        </button>

                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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

      {/* ── Add Child Node Modal ── */}
      {showAddChildModal && (
        <div className="wf-modal-overlay" onClick={() => { setShowAddChildModal(false); setAddChildParentId(null); }}>
          <div className="wf-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="wf-modal-title">➕ Add Child Node</h3>
            <p className="wf-modal-desc">
              Create a new child stage under <strong>&ldquo;{nodes.find(n => n.id === addChildParentId)?.name || 'Selected Node'}&rdquo;</strong>.
              The new node will be automatically connected as a direct downstream dependency.
            </p>
            <form onSubmit={handleAddChildNode} className="wf-modal-form">
              <div className="wf-field">
                <label className="wf-field-label">Parent Node</label>
                <div className="wf-field-readonly" style={{ backgroundColor: '#f0fdf4', border: '1px solid #86efac', color: '#15803d' }}>
                  🔗 {nodes.find(n => n.id === addChildParentId)?.name || '—'}
                </div>
              </div>
              <div className="wf-field">
                <label className="wf-field-label">Child Node Name</label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Revenue Scrutiny, Forest Clearance"
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
                  <option value="FOREST_DEPT">Forest Department</option>
                  <option value="ENVIRONMENT_DEPT">Environment Department</option>
                  <option value="COMPENSATION_BRANCH">Compensation Branch (SLAO)</option>
                  <option value="POSSESSION_BRANCH">Possession Branch (Tehsil)</option>
                  <option value="LEGAL_CELL">Legal Cell</option>
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
                <button type="button" onClick={() => { setShowAddChildModal(false); setAddChildParentId(null); }} className="wf-btn">
                  Cancel
                </button>
                <button type="submit" className="wf-btn wf-btn--primary" style={{ backgroundColor: '#16a34a', borderColor: '#16a34a' }}>
                  Create & Connect
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
                        {n.name} ({getNodeTypeLabel(n.nodeType)})
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
      />

      {/* ── Phase 23 Unsaved Changes Modal ── */}
      <DemoUnsavedChangesModal
        isOpen={showUnsavedModal}
        onKeepEditing={() => setShowUnsavedModal(false)}
        onDiscard={() => {
          setShowUnsavedModal(false);
          window.location.href = '/boss/dashboard';
        }}
      />
    </div>
  );
};

export default BossWorkflowBuilderPage;
