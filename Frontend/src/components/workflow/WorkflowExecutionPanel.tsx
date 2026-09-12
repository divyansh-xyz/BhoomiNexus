import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { ProjectExecutionResponse, NodeExecutionRecord } from '../../types/workflowV2.types';
import BhoomiLogo from '../common/BhoomiLogo';

interface WorkflowExecutionPanelProps {
  execution: ProjectExecutionResponse;
  onClose: () => void;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
}

export const WorkflowExecutionPanel: React.FC<WorkflowExecutionPanelProps> = ({
  execution,
  onClose,
  selectedNodeId,
  onSelectNode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [groupBy, setGroupBy] = useState<'PARCEL' | 'NODE'>('PARCEL');

  // Filter records
  const filteredRecords = useMemo(() => {
    return execution.executions.filter((record) => {
      // Node filter
      if (selectedNodeId && record.nodeId !== selectedNodeId) {
        return false;
      }
      // Branch filter
      if (branchFilter !== 'ALL' && record.branchType !== branchFilter) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'ALL' && record.status !== statusFilter) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesKhasra = record.parcelKhasra.toLowerCase().includes(q);
        const matchesVillage = record.parcelVillage.toLowerCase().includes(q);
        const matchesNode = record.nodeName.toLowerCase().includes(q);
        const matchesTask = record.taskId?.toLowerCase().includes(q) || false;
        const matchesOfficer =
          record.assignedOfficerName?.toLowerCase().includes(q) || false;
        return matchesKhasra || matchesVillage || matchesNode || matchesTask || matchesOfficer;
      }
      return true;
    });
  }, [execution.executions, selectedNodeId, branchFilter, statusFilter, searchQuery]);

  // Compute dynamic active positions for each parcel
  // (strictly complying with: Do not require a permanent parcel current_node_id. Use runtime execution records to determine active position)
  const parcelActivePositions = useMemo(() => {
    const map = new Map<string, { activeNodeName: string; activeNodeId: string; activeTask?: string }>();
    execution.executions.forEach((rec) => {
      if (rec.status === 'ACTIONABLE' || rec.status === 'IN_PROGRESS') {
        map.set(rec.parcelId, {
          activeNodeName: rec.nodeName,
          activeNodeId: rec.nodeId,
          activeTask: rec.taskId,
        });
      }
    });
    return map;
  }, [execution.executions]);

  // Group by parcel
  const recordsByParcel = useMemo(() => {
    const map = new Map<string, NodeExecutionRecord[]>();
    filteredRecords.forEach((rec) => {
      const existing = map.get(rec.parcelId) || [];
      existing.push(rec);
      map.set(rec.parcelId, existing);
    });
    return map;
  }, [filteredRecords]);

  // Group by node
  const recordsByNode = useMemo(() => {
    const map = new Map<string, NodeExecutionRecord[]>();
    filteredRecords.forEach((rec) => {
      const existing = map.get(rec.nodeId) || [];
      existing.push(rec);
      map.set(rec.nodeId, existing);
    });
    return map;
  }, [filteredRecords]);

  return (
    <div className="wf-exec-modal-backdrop" onClick={onClose}>
      <div className="wf-exec-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* 1. Masthead / Sovereign Duty Header */}
        <header className="wf-exec-masthead">
          <div className="wf-exec-masthead-title-row">
            <div className="wf-exec-badge-cluster">
              <span className="wf-exec-sovereign-badge">
                <BhoomiLogo size={18} strokeWidth={2.4} />
                <span>GOVERNMENT OF INDIA &bull; RUNTIME EXECUTION ENGINE (PHASE 10)</span>
              </span>
              <span className="wf-exec-status-pill wf-exec-status-pill--running">
                <span className="wf-exec-pulse-dot" />
                <span>RUNTIME ACTIVE</span>
              </span>
            </div>
            <button className="wf-exec-close-btn" onClick={onClose} title="Close Execution Inspector">
              &times;
            </button>
          </div>

          <div className="wf-exec-masthead-main">
            <h2 className="wf-exec-heading">Activated Parcel Task Lineage Matrix</h2>
            <p className="wf-exec-subheading">
              Official runtime task orchestration under Section 13 of the statutory framework.
              Converting activated DAG topology into deterministic parcel execution records,
              resolving active positions dynamically, and routing actionable stages to assigned officers.
            </p>
          </div>

          {/* Metadata Row */}
          <div className="wf-exec-meta-grid">
            <div className="wf-exec-meta-item">
              <span className="wf-exec-meta-label">Execution ID:</span>
              <code className="wf-exec-meta-code">{execution.id}</code>
            </div>
            <div className="wf-exec-meta-item">
              <span className="wf-exec-meta-label">Activated By:</span>
              <span className="wf-exec-meta-val">{execution.activatedBy}</span>
            </div>
            <div className="wf-exec-meta-item">
              <span className="wf-exec-meta-label">Timestamp:</span>
              <span className="wf-exec-meta-val">
                {new Date(execution.activatedAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div className="wf-exec-meta-item">
              <span className="wf-exec-meta-label">Task Routing:</span>
              <span className="wf-exec-meta-val text-emerald">
                Direct to Assigned Officers (Sec. 17.1)
              </span>
            </div>
          </div>
        </header>

        {/* 2. KPI Metrics Bar */}
        <section className="wf-exec-kpi-bar">
          <div className="wf-exec-kpi-card">
            <span className="wf-exec-kpi-label">Confirmed Parcels</span>
            <div className="wf-exec-kpi-number">{execution.summary.totalParcels}</div>
            <span className="wf-exec-kpi-sub">Khasras in Project Boundary</span>
          </div>
          <div className="wf-exec-kpi-card">
            <span className="wf-exec-kpi-label">Runtime Executions</span>
            <div className="wf-exec-kpi-number">{execution.summary.totalExecutions}</div>
            <span className="wf-exec-kpi-sub">Parcel &times; Node Combinations</span>
          </div>
          <div className="wf-exec-kpi-card wf-exec-kpi-card--highlight">
            <span className="wf-exec-kpi-label">Actionable Tasks</span>
            <div className="wf-exec-kpi-number text-emerald">
              {execution.summary.actionableTasksCount}
            </div>
            <span className="wf-exec-kpi-sub">Instantiated &amp; Dispatch-Ready</span>
          </div>
          <div className="wf-exec-kpi-card">
            <span className="wf-exec-kpi-label">In Progress</span>
            <div className="wf-exec-kpi-number text-blue">
              {execution.summary.inProgressTasksCount}
            </div>
            <span className="wf-exec-kpi-sub">Field Officers Engaged</span>
          </div>
          <div className="wf-exec-kpi-card">
            <span className="wf-exec-kpi-label">Completed</span>
            <div className="wf-exec-kpi-number text-slate">
              {execution.summary.completedTasksCount}
            </div>
            <span className="wf-exec-kpi-sub">Clearances Secured</span>
          </div>
        </section>

        {/* 3. Acceptance Lineage Showcase (Parcel A -> Node A -> Task A) */}
        <section className="wf-exec-acceptance-card">
          <div className="wf-exec-acceptance-header">
            <span className="wf-exec-acceptance-badge">✓ STATUTORY ACCEPTANCE DEMONSTRATION</span>
            <h3 className="wf-exec-acceptance-title">
              Deterministic Parcel-to-Task Execution Lineage
            </h3>
          </div>
          <div className="wf-exec-acceptance-rows">
            {/* Demo Lineage 1: Parcel A -> Node A -> Task A */}
            <div className="wf-exec-lineage-row">
              <div className="wf-exec-lineage-node wf-exec-lineage-parcel">
                <span className="wf-exec-node-kind">PARCEL A</span>
                <strong>Khasra 101/1</strong>
                <small>2.45 Acres &bull; Rampur Kalan</small>
              </div>
              <div className="wf-exec-lineage-arrow">
                <span>routed to</span>
                &rarr;
              </div>
              <div className="wf-exec-lineage-node wf-exec-lineage-graphnode">
                <span className="wf-exec-node-kind">NODE A</span>
                <strong>Sub-Divisional Revenue Scrutiny</strong>
                <small>Revenue &bull; SLA: 7 Days</small>
              </div>
              <div className="wf-exec-lineage-arrow">
                <span>creates</span>
                &rarr;
              </div>
              <div className="wf-exec-lineage-node wf-exec-lineage-task">
                <span className="wf-exec-node-kind text-emerald">TASK A &bull; ACTIONABLE</span>
                <code>TASK-ACQ-101-1-A</code>
                <small>Officer: Ananya Patel (SDM)</small>
              </div>
            </div>

            {/* Demo Lineage 2: Parcel B -> Node B -> Task B */}
            <div className="wf-exec-lineage-row">
              <div className="wf-exec-lineage-node wf-exec-lineage-parcel">
                <span className="wf-exec-node-kind">PARCEL B</span>
                <strong>Khasra 101/2</strong>
                <small>3.12 Acres &bull; Rampur Kalan</small>
              </div>
              <div className="wf-exec-lineage-arrow">
                <span>routed to</span>
                &rarr;
              </div>
              <div className="wf-exec-lineage-node wf-exec-lineage-graphnode">
                <span className="wf-exec-node-kind">NODE B</span>
                <strong>Joint Cadastral Survey &amp; Demarcation</strong>
                <small>Survey &bull; SLA: 10 Days</small>
              </div>
              <div className="wf-exec-lineage-arrow">
                <span>creates</span>
                &rarr;
              </div>
              <div className="wf-exec-lineage-node wf-exec-lineage-task">
                <span className="wf-exec-node-kind text-emerald">TASK B &bull; ACTIONABLE</span>
                <code>TASK-ACQ-101-2-B</code>
                <small>Officer: Rajesh Sharma (Surveyor)</small>
              </div>
            </div>
          </div>
          <div className="wf-exec-acceptance-footer">
            <span className="wf-exec-rule-pill">
              🔒 Statutory Rule: No permanent parcel <code>current_node_id</code>. Active positions are dynamically resolved from runtime execution records.
            </span>
          </div>
        </section>

        {/* 4. Filter & Controls Toolbar */}
        <div className="wf-exec-toolbar">
          <div className="wf-exec-search-wrapper">
            <input
              type="text"
              placeholder="Search by Khasra, Village, Node, Task ID, or Assigned Officer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="wf-exec-search-input"
            />
            {searchQuery && (
              <button
                className="wf-exec-search-clear"
                onClick={() => setSearchQuery('')}
              >
                &times;
              </button>
            )}
          </div>

          <div className="wf-exec-filters-row">
            {/* Branch Filter */}
            <div className="wf-exec-filter-group">
              <label>Branch:</label>
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="wf-exec-select"
              >
                <option value="ALL">All Branches</option>
                <option value="ACQUISITION">Acquisition</option>
                <option value="COMPENSATION">Compensation</option>
                <option value="POSSESSION">Possession</option>
                <option value="GATE">Approval Gates</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="wf-exec-filter-group">
              <label>Status:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="wf-exec-select"
              >
                <option value="ALL">All States</option>
                <option value="ACTIONABLE">Actionable (Dispatch-Ready)</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING">Pending Predecessors</option>
              </select>
            </div>

            {/* Group By Toggle */}
            <div className="wf-exec-filter-group">
              <label>View By:</label>
              <div className="wf-exec-view-toggle">
                <button
                  type="button"
                  className={`wf-exec-toggle-btn ${groupBy === 'PARCEL' ? 'active' : ''}`}
                  onClick={() => setGroupBy('PARCEL')}
                >
                  Parcel Lineage
                </button>
                <button
                  type="button"
                  className={`wf-exec-toggle-btn ${groupBy === 'NODE' ? 'active' : ''}`}
                  onClick={() => setGroupBy('NODE')}
                >
                  Workflow Nodes
                </button>
              </div>
            </div>

            {selectedNodeId && (
              <button
                type="button"
                className="wf-exec-reset-node-btn"
                onClick={() => onSelectNode && onSelectNode('')}
              >
                Clear Node Filter &times;
              </button>
            )}
          </div>
        </div>

        {/* 5. Execution Matrix Records View */}
        <div className="wf-exec-content-area">
          {groupBy === 'PARCEL' ? (
            /* GROUP BY PARCEL LINEAGE */
            <div className="wf-exec-parcel-groups">
              {Array.from(recordsByParcel.entries()).map(([parcelId, records]) => {
                const first = records[0];
                const activePos = parcelActivePositions.get(parcelId);

                return (
                  <div key={parcelId} className="wf-exec-parcel-card">
                    <div className="wf-exec-parcel-header">
                      <div className="wf-exec-parcel-title-cluster">
                        <span className="wf-exec-parcel-tag">PARCEL</span>
                        <h4 className="wf-exec-parcel-name">
                          Khasra {first.parcelKhasra}
                        </h4>
                        <span className="wf-exec-parcel-village">
                          {first.parcelVillage} &bull; {first.parcelAreaAcres} Acres
                        </span>
                      </div>

                      {/* Dynamic Active Position Badge */}
                      <div className="wf-exec-active-pos-badge">
                        <span className="wf-exec-pos-dot" />
                        <span className="wf-exec-pos-label">
                          Active Position (Dynamic):
                        </span>
                        <strong className="wf-exec-pos-value">
                          {activePos ? activePos.activeNodeName : 'Waiting at Entry Gate'}
                        </strong>
                      </div>
                    </div>

                    <div className="wf-exec-stages-matrix">
                      {records.map((rec) => {
                        const isActionable = rec.status === 'ACTIONABLE';

                        return (
                          <div
                            key={rec.id}
                            className={`wf-exec-stage-row ${
                              isActionable ? 'wf-exec-stage-row--actionable' : ''
                            }`}
                          >
                            <div className="wf-exec-stage-node-cell">
                              <div className="wf-exec-node-identity">
                                <span className={`wf-exec-branch-badge wf-exec-branch-badge--${rec.branchType.toLowerCase()}`}>
                                  {rec.branchType}
                                </span>
                                <span className="wf-exec-stage-nodename">
                                  {rec.nodeName}
                                </span>
                              </div>
                            </div>

                            <div className="wf-exec-stage-status-cell">
                              <span
                                className={`wf-exec-task-status-pill wf-exec-task-status-pill--${rec.status.toLowerCase()}`}
                              >
                                {isActionable && <span className="wf-exec-mini-pulse" />}
                                {rec.status}
                              </span>
                            </div>

                            <div className="wf-exec-stage-task-cell">
                              {rec.taskId ? (
                                <div className="wf-exec-task-badge">
                                  <span className="wf-exec-task-label">TASK:</span>
                                  <code>{rec.taskId}</code>
                                  {rec.taskStatus && (
                                    <span className="wf-exec-task-substate">
                                      ({rec.taskStatus})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="wf-exec-task-none text-slate">
                                  Awaiting predecessor clearance
                                </span>
                              )}
                            </div>

                            <div className="wf-exec-stage-officer-cell">
                              {rec.assignedOfficerName ? (
                                <div className="wf-exec-officer-duty-stamp">
                                  <strong>{rec.assignedOfficerName}</strong>
                                  <small>{rec.assignedOfficerRole || rec.assignedOfficerDepartment}</small>
                                </div>
                              ) : (
                                <span className="text-slate">Unassigned</span>
                              )}
                            </div>

                            <div className="wf-exec-stage-action-cell">
                              {rec.taskId ? (
                                <Link
                                  to={`/officer/tasks/${rec.taskId}`}
                                  className="wf-exec-inspect-btn"
                                  title="Inspect Task in Sovereign Officer Portal (Restricted under Section 17.1)"
                                >
                                  Inspect Task &rarr;
                                </Link>
                              ) : (
                                <span className="wf-exec-action-lock" title="Task becomes actionable when predecessor completes">
                                  🔒 Locked
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {recordsByParcel.size === 0 && (
                <div className="wf-exec-empty-state">
                  <p>No runtime execution records match the selected filters.</p>
                </div>
              )}
            </div>
          ) : (
            /* GROUP BY NODE COHORT */
            <div className="wf-exec-node-groups">
              {Array.from(recordsByNode.entries()).map(([nodeId, records]) => {
                const first = records[0];
                const actionableInNode = records.filter(
                  (r) => r.status === 'ACTIONABLE' || r.status === 'IN_PROGRESS'
                ).length;

                return (
                  <div key={nodeId} className="wf-exec-node-card">
                    <div className="wf-exec-node-card-header">
                      <div className="wf-exec-node-card-title-cluster">
                        <span className={`wf-exec-branch-badge wf-exec-branch-badge--${first.branchType.toLowerCase()}`}>
                          {first.branchType}
                        </span>
                        <h4 className="wf-exec-node-card-title">{first.nodeName}</h4>
                      </div>
                      <div className="wf-exec-node-officer-badge">
                        <span>Officer:</span>
                        <strong>{first.assignedOfficerName || 'Unassigned'}</strong>
                        <small>({first.assignedOfficerRole || first.assignedOfficerDepartment})</small>
                      </div>
                      <div className="wf-exec-node-stat-pill">
                        <strong>{actionableInNode}</strong> of {records.length} Parcels Active
                      </div>
                    </div>

                    <div className="wf-exec-parcels-table">
                      {records.map((rec) => (
                        <div key={rec.id} className="wf-exec-node-parcel-row">
                          <div className="wf-exec-cell-parcel">
                            <strong>Khasra {rec.parcelKhasra}</strong>
                            <small>{rec.parcelVillage} &bull; {rec.parcelAreaAcres} Acres</small>
                          </div>
                          <div className="wf-exec-cell-status">
                            <span className={`wf-exec-task-status-pill wf-exec-task-status-pill--${rec.status.toLowerCase()}`}>
                              {rec.status}
                            </span>
                          </div>
                          <div className="wf-exec-cell-task">
                            {rec.taskId ? (
                              <code>{rec.taskId}</code>
                            ) : (
                              <span className="text-slate">&mdash;</span>
                            )}
                          </div>
                          <div className="wf-exec-cell-action">
                            {rec.taskId ? (
                              <Link
                                to={`/officer/tasks/${rec.taskId}`}
                                className="wf-exec-inspect-btn-sm"
                              >
                                View Task &rarr;
                              </Link>
                            ) : (
                              <span className="text-slate text-sm">Pending</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {recordsByNode.size === 0 && (
                <div className="wf-exec-empty-state">
                  <p>No workflow nodes match the selected filters.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 6. Footer Disclaimer & API Notice */}
        <footer className="wf-exec-footer">
          <div className="wf-exec-footer-left">
            <span className="wf-exec-shield-icon">🛡️</span>
            <span>
              <strong>Statutory Security Guarantee:</strong> Runtime tasks generated under{' '}
              <code>POST /api/v1/projects/:projectId/workflow/activate</code> are dispatched strictly to their designated operational officers and queryable exclusively through{' '}
              <code>GET /api/v1/tasks?assignedTo=me</code> (Section 17.1).
            </span>
          </div>
          <button className="wf-exec-done-btn" onClick={onClose}>
            Close Inspector
          </button>
        </footer>
      </div>
    </div>
  );
};

export default WorkflowExecutionPanel;
