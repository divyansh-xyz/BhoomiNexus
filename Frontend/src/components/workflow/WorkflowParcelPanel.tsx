import React, { useState, useMemo } from 'react';
import type { WorkflowNode, WorkflowNodeParcel } from '../../types/workflowV2.types';

interface WorkflowParcelPanelProps {
  selectedNode: WorkflowNode;
  parcels: WorkflowNodeParcel[];
  siblingNodes: WorkflowNode[];
  onMoveParcels: (sourceNodeId: string, targetNodeId: string, parcelIds: string[]) => Promise<boolean>;
  onOpenMoveModal: (preselectedParcelIds?: string[]) => void;
  onViewPassport: (parcel: WorkflowNodeParcel) => void;
  isSaving?: boolean;
}

export const WorkflowParcelPanel: React.FC<WorkflowParcelPanelProps> = ({
  selectedNode,
  parcels,
  siblingNodes,
  onMoveParcels,
  onOpenMoveModal,
  onViewPassport,
  isSaving = false,
}) => {
  // Multi-selection state: Set of parcelId
  const [selectedParcelIds, setSelectedParcelIds] = useState<Set<string>>(new Set());
  const [draggedParcelId, setDraggedParcelId] = useState<string | null>(null);
  const [isQuickMoving, setIsQuickMoving] = useState<boolean>(false);

  // Compute total area in acres and hectares
  const totalAreaAcres = useMemo(() => {
    return parcels.reduce((sum, p) => sum + (p.areaAcres || 0), 0);
  }, [parcels]);

  const totalAreaHa = useMemo(() => {
    return parcels.reduce((sum, p) => sum + (p.areaHa || ((p.areaAcres || 0) * 0.404686)), 0);
  }, [parcels]);

  // Toggle single parcel
  const handleToggleSelect = (parcelId: string) => {
    setSelectedParcelIds((prev) => {
      const next = new Set(prev);
      if (next.has(parcelId)) {
        next.delete(parcelId);
      } else {
        next.add(parcelId);
      }
      return next;
    });
  };

  // Toggle select all
  const handleSelectAllToggle = () => {
    if (selectedParcelIds.size === parcels.length && parcels.length > 0) {
      setSelectedParcelIds(new Set());
    } else {
      setSelectedParcelIds(new Set(parcels.map((p) => p.parcelId)));
    }
  };

  // One-click cursor quick switch to a specific sibling node
  const handleQuickSwitchToSibling = async (targetNodeId: string) => {
    const idsToMove = Array.from(selectedParcelIds);
    if (idsToMove.length === 0) return;
    setIsQuickMoving(true);
    try {
      const ok = await onMoveParcels(selectedNode.id, targetNodeId, idsToMove);
      if (ok) {
        setSelectedParcelIds(new Set());
      }
    } finally {
      setIsQuickMoving(false);
    }
  };

  // Drag-and-drop support: Start dragging parcel(s)
  const handleDragStart = (e: React.DragEvent, parcelId: string) => {
    let idsToTransfer: string[];
    if (selectedParcelIds.has(parcelId)) {
      idsToTransfer = Array.from(selectedParcelIds);
    } else {
      idsToTransfer = [parcelId];
      setSelectedParcelIds(new Set([parcelId]));
    }
    setDraggedParcelId(parcelId);
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        sourceNodeId: selectedNode.id,
        parcelIds: idsToTransfer,
      })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedParcelId(null);
  };

  const selectedCount = selectedParcelIds.size;
  const isAllSelected = parcels.length > 0 && selectedCount === parcels.length;
  const isIndeterminate = selectedCount > 0 && selectedCount < parcels.length;

  return (
    <div className="wf-parcel-panel">
      {/* Panel Top Summary Bar */}
      <div className="wf-parcel-summary-bar">
        <div className="wf-parcel-summary-left">
          <span className="wf-parcel-cohort-badge">Cohort</span>
          <span className="wf-parcel-cohort-title" title={selectedNode.name}>
            {selectedNode.name}
          </span>
        </div>
        <div className="wf-parcel-summary-metrics">
          <span className="wf-parcel-metric-pill">
            <strong>{parcels.length}</strong> {parcels.length === 1 ? 'Parcel' : 'Parcels'}
          </span>
          <span className="wf-parcel-metric-pill wf-parcel-metric-area">
            <strong>{totalAreaAcres.toFixed(2)}</strong> Ac
            <span className="wf-parcel-metric-sub">({totalAreaHa.toFixed(2)} Ha)</span>
          </span>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="wf-parcel-toolbar">
        <div className="wf-parcel-toolbar-left">
          <label className="wf-parcel-select-all-label">
            <input
              type="checkbox"
              checked={isAllSelected}
              ref={(el) => {
                if (el) el.indeterminate = isIndeterminate;
              }}
              onChange={handleSelectAllToggle}
              className="wf-parcel-checkbox"
            />
            <span>
              {selectedCount > 0
                ? `${selectedCount} of ${parcels.length} selected`
                : 'Select all'}
            </span>
          </label>
        </div>

        <div className="wf-parcel-toolbar-actions">
          {/* Move Button */}
          <button
            type="button"
            className="wf-btn wf-btn-sm wf-btn-outline"
            disabled={selectedCount === 0 || isSaving || isQuickMoving}
            onClick={() => onOpenMoveModal(Array.from(selectedParcelIds))}
            title="Open move parcels dialog"
          >
            ⇄ Move ({selectedCount})
          </button>

          {/* View Passport for highlighted/selected */}
          {selectedCount === 1 && (
            <button
              type="button"
              className="wf-btn wf-btn-sm wf-btn-secondary"
              onClick={() => {
                const singleId = Array.from(selectedParcelIds)[0];
                const p = parcels.find((item) => item.parcelId === singleId);
                if (p) onViewPassport(p);
              }}
              title="View sovereign Bhu-Aadhaar Passport"
            >
              📜 View Passport
            </button>
          )}
        </div>
      </div>

      {/* Cursor Quick-Switch Sibling Bar (Visible when parcels are selected) */}
      {selectedCount > 0 && (
        <div className="wf-parcel-quick-switch-bar">
          <div className="wf-quick-switch-header">
            <span className="wf-quick-switch-icon">⚡</span>
            <span className="wf-quick-switch-label">
              Quick switch <strong>{selectedCount}</strong> {selectedCount === 1 ? 'parcel' : 'parcels'} to sibling with cursor:
            </span>
          </div>
          <div className="wf-quick-switch-pills">
            {siblingNodes.length === 0 ? (
              <span className="wf-quick-switch-empty">
                No sibling branches yet. Split this node or add a branch to enable switching.
              </span>
            ) : (
              siblingNodes.map((sibling) => (
                <button
                  key={sibling.id}
                  type="button"
                  className="wf-quick-switch-pill-btn"
                  disabled={isSaving || isQuickMoving}
                  onClick={() => handleQuickSwitchToSibling(sibling.id)}
                  title={`Switch selected parcel(s) to ${sibling.name}`}
                >
                  <span className="wf-quick-switch-arrow">→</span>
                  <span className="wf-quick-switch-target-name">{sibling.name}</span>
                  <span className="wf-quick-switch-target-count">
                    ({sibling.parcelCount ?? 0})
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Parcels Table / List */}
      <div className="wf-parcel-table-container">
        {parcels.length === 0 ? (
          <div className="wf-parcel-empty-state">
            <div className="wf-parcel-empty-icon">🌱</div>
            <div className="wf-parcel-empty-title">Cohort Currently Empty</div>
            <div className="wf-parcel-empty-desc">
              This node starts with 0 parcels per Phase 6 rules.
              Use cursor to drag or move parcels from a sibling cohort into this branch.
            </div>
          </div>
        ) : (
          <table className="wf-parcel-table">
            <thead>
              <tr>
                <th style={{ width: '36px' }} aria-label="Select"></th>
                <th style={{ width: '18%' }}>Parcel</th>
                <th style={{ width: '18%' }}>Survey</th>
                <th style={{ width: '28%' }}>ULPIN</th>
                <th style={{ width: '20%' }}>Village</th>
                <th style={{ width: '16%' }}>Area</th>
                <th style={{ width: '40px' }} aria-label="Actions"></th>
              </tr>
            </thead>
            <tbody>
              {parcels.map((p) => {
                const isSelected = selectedParcelIds.has(p.parcelId);
                const pName = p.parcelName || `Parcel ${p.parcelId.slice(-4)}`;
                const pSurvey = p.surveyNumber || 'SV-101';
                const pUlpin = p.ulpin || '27-104-5829-1021';
                const pVillage = p.village || 'Rampur Khas';
                const pAcres = p.areaAcres ? p.areaAcres.toFixed(2) : '3.45';

                return (
                  <tr
                    key={p.parcelId}
                    className={`wf-parcel-row ${isSelected ? 'wf-parcel-row--selected' : ''} ${
                      draggedParcelId === p.parcelId ? 'wf-parcel-row--dragging' : ''
                    }`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, p.parcelId)}
                    onDragEnd={handleDragEnd}
                    onClick={() => handleToggleSelect(p.parcelId)}
                  >
                    {/* Checkbox */}
                    <td
                      className="wf-parcel-td-check"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(p.parcelId)}
                        className="wf-parcel-checkbox"
                      />
                    </td>

                    {/* Parcel Name with Drag Handle */}
                    <td className="wf-parcel-td-name">
                      <span className="wf-parcel-drag-handle" title="Drag with cursor to sibling node">
                        ⠿
                      </span>
                      <span className="wf-parcel-name-text">{pName}</span>
                    </td>

                    {/* Survey No */}
                    <td className="wf-parcel-td-survey">
                      <span className="wf-parcel-survey-code">{pSurvey}</span>
                    </td>

                    {/* 14-Digit ULPIN */}
                    <td className="wf-parcel-td-ulpin">
                      <span className="wf-ulpin-pill" title={`Bhu-Aadhaar: ${pUlpin}`}>
                        {pUlpin}
                      </span>
                    </td>

                    {/* Village */}
                    <td className="wf-parcel-td-village">
                      <span className="wf-parcel-village-text">{pVillage}</span>
                    </td>

                    {/* Area */}
                    <td className="wf-parcel-td-area">
                      <span className="wf-parcel-area-text">{pAcres} Ac</span>
                    </td>

                    {/* Row Passport Action */}
                    <td
                      className="wf-parcel-td-action"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="wf-parcel-row-passport-btn"
                        onClick={() => onViewPassport(p)}
                        title="View Sovereign Passport"
                      >
                        📜
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer Info */}
      <div className="wf-parcel-panel-footer">
        <span className="wf-parcel-drag-tip">
          💡 Tip: Select parcels and click a sibling pill above, or drag with your cursor directly onto any sibling node card on the canvas!
        </span>
      </div>
    </div>
  );
};

export default WorkflowParcelPanel;
