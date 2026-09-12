/**
 * ============================================================
 * Phase 9: Workflow Validation and Activation Modal
 * Strictly adheres to:
 * 1. Phase Implementation.md (Section 12: Phase 9 — Workflow Validation and Activation)
 * 2. V2 API Endpoints and Behaviour.md (Lines 181–189)
 * 
 * Design: Things / Apple Restraint Aesthetic
 * Features:
 * - 6 Statutory Pre-Flight Checklist Criteria
 * - Pre-Activation Telemetry Summary
 * - 8-Step Atomic Activation Transaction Stepper
 * - Post-Activation Sovereign Execution Receipt
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import type {
  WorkflowValidationResult,
  WorkflowV2ActivationResponse,
} from '../../types/workflowV2.types';

interface WorkflowValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'validate' | 'activate';
  validationResult: WorkflowValidationResult | null;
  isActivating: boolean;
  onRunValidation: () => Promise<WorkflowValidationResult>;
  onConfirmActivate: () => Promise<WorkflowV2ActivationResponse | null>;
  isWorkflowActive: boolean;
  onOpenExecution?: () => void;
}

const TRANSACTION_STEPS = [
  { step: 1, label: 'Validate', desc: 'Pre-flight cycle, assignment, parcel & fragment check' },
  { step: 2, label: 'Freeze Topology', desc: 'Lock graph against subsequent mutation (WORKFLOW_ALREADY_ACTIVATED)' },
  { step: 3, label: 'Persist Version', desc: 'Snapshot versioned topology graph in database' },
  { step: 4, label: 'Generate Execution', desc: 'Create runtime workflow_executions instance' },
  { step: 5, label: 'Create First Tasks', desc: 'Instantiate initial parcel action items for field officers' },
  { step: 6, label: 'Audit Trail', desc: 'Record sovereign cryptographic audit log' },
  { step: 7, label: 'Notifications', desc: 'Alert Revenue, Survey & Accounts officers' },
  { step: 8, label: 'Commit Transaction', desc: 'Atomically commit database transaction' },
];

export const WorkflowValidationModal: React.FC<WorkflowValidationModalProps> = ({
  isOpen,
  onClose,
  mode: initialMode,
  validationResult: propValidationResult,
  isActivating,
  onRunValidation,
  onConfirmActivate,
  isWorkflowActive,
  onOpenExecution,
}) => {
  const [modalMode, setModalMode] = useState<'validate' | 'activate'>(initialMode);
  const [activeTxStep, setActiveTxStep] = useState<number>(0);
  const [activationReceipt, setActivationReceipt] = useState<WorkflowV2ActivationResponse | null>(null);
  const [localValidation, setLocalValidation] = useState<WorkflowValidationResult | null>(propValidationResult);
  const [isValidating, setIsValidating] = useState<boolean>(false);

  useEffect(() => {
    setModalMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    setLocalValidation(propValidationResult);
  }, [propValidationResult]);

  useEffect(() => {
    if (isOpen && !localValidation) {
      handleRunValidate();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRunValidate = async () => {
    setIsValidating(true);
    try {
      const res = await onRunValidation();
      setLocalValidation(res);
    } finally {
      setIsValidating(false);
    }
  };

  const handleExecuteActivation = async () => {
    // Stepper animation simulating the 8-step atomic transaction
    setActiveTxStep(1);
    const stepInterval = setInterval(() => {
      setActiveTxStep((prev) => {
        if (prev < 7) return prev + 1;
        clearInterval(stepInterval);
        return prev;
      });
    }, 280);

    try {
      const res = await onConfirmActivate();
      clearInterval(stepInterval);
      setActiveTxStep(8);
      if (res) {
        setActivationReceipt(res);
      }
    } catch (err) {
      clearInterval(stepInterval);
      setActiveTxStep(0);
      alert('Activation transaction encountered an error. Topology remains in Draft state.');
    }
  };

  const checklist = localValidation?.checklist || {
    validGraph: true,
    validNodeAssignments: true,
    validParcelAllocation: true,
    noDuplicateActiveMembership: true,
    noOrphanNodes: true,
    validTemplateFragments: true,
  };

  const canActivate = localValidation?.valid === true && !isWorkflowActive;

  return (
    <div className="wf-template-modal-overlay" onClick={onClose}>
      <div
        className="wf-validation-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: '740px', maxWidth: '95vw' }}
      >
        {/* Header */}
        <div className="wf-validation-header">
          <div className="wf-validation-badge-row">
            <span className="wf-validation-badge">
              🛡️ STATUTORY INTEGRITY ENGINE
            </span>
            <span className={`wf-validation-status-pill ${localValidation?.valid ? 'wf-validation-status-pill--pass' : 'wf-validation-status-pill--fail'}`}>
              {localValidation?.valid ? '✓ PRE-FLIGHT VERIFIED' : '⛔ ACTION REQUIRED'}
            </span>
            <button type="button" className="wf-template-close-btn" onClick={onClose}>
              &times;
            </button>
          </div>
          <h2 className="wf-validation-title">
            {modalMode === 'activate' ? 'Workflow Activation & Freeze Gate' : 'Pre-Flight Topology Validation'}
          </h2>
          <p className="wf-validation-subtitle">
            Section 12 (Phase 9) Transactional Safety &middot; Zero out-of-scope API compliance &middot; V2 Graph Verification
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        {!activationReceipt && (
          <div className="wf-validation-tabs">
            <button
              type="button"
              className={`wf-validation-tab ${modalMode === 'validate' ? 'wf-validation-tab--active' : ''}`}
              onClick={() => setModalMode('validate')}
            >
              1. Statutory Checklist (6 Criteria)
            </button>
            <button
              type="button"
              className={`wf-validation-tab ${modalMode === 'activate' ? 'wf-validation-tab--active' : ''}`}
              onClick={() => setModalMode('activate')}
            >
              2. Activation &amp; Task Dispatch Gate
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="wf-validation-body">
          {/* Post-Activation Receipt */}
          {activationReceipt ? (
            <div className="wf-activation-receipt">
              <div className="wf-receipt-icon">✓</div>
              <h3 className="wf-receipt-title">V2 Workflow Successfully Activated</h3>
              <p className="wf-receipt-subtitle">
                Topology is permanently frozen. Initial parcel tasks have been generated and dispatched to field officers.
              </p>

              <div className="wf-receipt-box">
                <div className="wf-receipt-row">
                  <span className="wf-receipt-label">Execution ID</span>
                  <span className="wf-receipt-val wf-receipt-mono">{activationReceipt.executionId}</span>
                </div>
                <div className="wf-receipt-row">
                  <span className="wf-receipt-label">Status</span>
                  <span className="wf-receipt-val" style={{ color: '#059669', fontWeight: 700 }}>
                    ACTIVE · FROZEN
                  </span>
                </div>
                <div className="wf-receipt-row">
                  <span className="wf-receipt-label">Activated At</span>
                  <span className="wf-receipt-val">{new Date(activationReceipt.activatedAt).toLocaleString()}</span>
                </div>
                <div className="wf-receipt-row">
                  <span className="wf-receipt-label">Initial Tasks Dispatched</span>
                  <span className="wf-receipt-val">{activationReceipt.initialTaskCount} Operational Tasks</span>
                </div>
                <div className="wf-receipt-row">
                  <span className="wf-receipt-label">Topology Version</span>
                  <span className="wf-receipt-val">v{activationReceipt.version || 1}.0 Finalized</span>
                </div>
              </div>

              <div className="wf-receipt-lock-note">
                🔒 <strong>Statutory Mutation Lock Active:</strong> Any subsequent attempts by BOSS to edit nodes, delete edges, or split cohorts will return <code>WORKFLOW_ALREADY_ACTIVATED</code>.
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 16 }}>
                <button type="button" className="wf-btn" onClick={onClose}>
                  Return to Frozen Canvas
                </button>
                {onOpenExecution && (
                  <button
                    type="button"
                    className="wf-btn wf-btn--execution"
                    onClick={() => {
                      onClose();
                      onOpenExecution();
                    }}
                  >
                    ⚡ View Runtime Execution Engine (Phase 10) &rarr;
                  </button>
                )}
              </div>
            </div>
          ) : activeTxStep > 0 ? (
            /* 8-Step Transaction Progress Stepper */
            <div className="wf-tx-stepper-container">
              <h3 className="wf-tx-title">Executing Atomic Activation Transaction</h3>
              <p className="wf-tx-sub">Processing statutory stages and dispatching initial task allocations...</p>

              <div className="wf-tx-list">
                {TRANSACTION_STEPS.map((stepItem) => {
                  const isDone = activeTxStep > stepItem.step;
                  const isCurrent = activeTxStep === stepItem.step;
                  return (
                    <div
                      key={stepItem.step}
                      className={`wf-tx-item ${isDone ? 'wf-tx-item--done' : ''} ${isCurrent ? 'wf-tx-item--current' : ''}`}
                    >
                      <div className="wf-tx-bullet">
                        {isDone ? '✓' : isCurrent ? '⏳' : stepItem.step}
                      </div>
                      <div className="wf-tx-info">
                        <div className="wf-tx-label">{stepItem.label}</div>
                        <div className="wf-tx-desc">{stepItem.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              {/* Telemetry Strip */}
              {localValidation?.telemetry && (
                <div className="wf-telemetry-strip">
                  <div className="wf-telemetry-mini-card">
                    <span className="wf-telemetry-mini-val">{localValidation.telemetry.totalNodes}</span>
                    <span className="wf-telemetry-mini-label">Nodes / Stages</span>
                  </div>
                  <div className="wf-telemetry-mini-card">
                    <span className="wf-telemetry-mini-val">{localValidation.telemetry.totalEdges}</span>
                    <span className="wf-telemetry-mini-label">Edges</span>
                  </div>
                  <div className="wf-telemetry-mini-card">
                    <span className="wf-telemetry-mini-val">{localValidation.telemetry.totalSlaDays}d</span>
                    <span className="wf-telemetry-mini-label">Total SLA Days</span>
                  </div>
                  <div className="wf-telemetry-mini-card">
                    <span className="wf-telemetry-mini-val">{localValidation.telemetry.allocatedParcelsCount}</span>
                    <span className="wf-telemetry-mini-label">Parcels Assigned</span>
                  </div>
                  <div className="wf-telemetry-mini-card">
                    <span className="wf-telemetry-mini-val">{localValidation.telemetry.estimatedInitialTasks}</span>
                    <span className="wf-telemetry-mini-label">Est. Tasks</span>
                  </div>
                </div>
              )}

              {/* 6 Statutory Pre-Flight Checklist */}
              <div className="wf-checklist-grid">
                {/* 1. valid graph */}
                <div className={`wf-checklist-card ${checklist.validGraph ? 'wf-checklist-card--pass' : 'wf-checklist-card--fail'}`}>
                  <div className="wf-checklist-header">
                    <span className="wf-checklist-name">1. Graph Topology (Cycle-Free DAG)</span>
                    <span className="wf-checklist-pill">{checklist.validGraph ? '✓ PASS' : '⛔ FAIL'}</span>
                  </div>
                  <p className="wf-checklist-desc">
                    Verified Directed Acyclic Graph structure via topological DFS. Zero closed cycles or unanchored loops.
                  </p>
                </div>

                {/* 2. valid node assignments */}
                <div className={`wf-checklist-card ${checklist.validNodeAssignments ? 'wf-checklist-card--pass' : 'wf-checklist-card--fail'}`}>
                  <div className="wf-checklist-header">
                    <span className="wf-checklist-name">2. Node &amp; Officer Assignments</span>
                    <span className="wf-checklist-pill">{checklist.validNodeAssignments ? '✓ PASS' : '⛔ FAIL'}</span>
                  </div>
                  <p className="wf-checklist-desc">
                    Every operational stage has an authenticated department responsibility (Revenue, Survey, Compensation, Possession) and statutory SLA days &gt; 0.
                  </p>
                </div>

                {/* 3. valid parcel allocation */}
                <div className={`wf-checklist-card ${checklist.validParcelAllocation ? 'wf-checklist-card--pass' : 'wf-checklist-card--fail'}`}>
                  <div className="wf-checklist-header">
                    <span className="wf-checklist-name">3. Demarcated Parcel Allocation</span>
                    <span className="wf-checklist-pill">{checklist.validParcelAllocation ? '✓ PASS' : '⛔ FAIL'}</span>
                  </div>
                  <p className="wf-checklist-desc">
                    All project parcels are accounted for in active cohorts ({localValidation?.telemetry?.allocatedParcelsCount || 0} parcels). No negative allocations.
                  </p>
                </div>

                {/* 4. no duplicate active branch membership */}
                <div className={`wf-checklist-card ${checklist.noDuplicateActiveMembership ? 'wf-checklist-card--pass' : 'wf-checklist-card--fail'}`}>
                  <div className="wf-checklist-header">
                    <span className="wf-checklist-name">4. Single Active Cohort Exclusivity</span>
                    <span className="wf-checklist-pill">{checklist.noDuplicateActiveMembership ? '✓ PASS' : '⛔ FAIL'}</span>
                  </div>
                  <p className="wf-checklist-desc">
                    No parcel belongs to multiple active mutually exclusive branches simultaneously.
                  </p>
                </div>

                {/* 5. no orphan nodes */}
                <div className={`wf-checklist-card ${checklist.noOrphanNodes ? 'wf-checklist-card--pass' : 'wf-checklist-card--fail'}`}>
                  <div className="wf-checklist-header">
                    <span className="wf-checklist-name">5. Orphan Node Sweep</span>
                    <span className="wf-checklist-pill">{checklist.noOrphanNodes ? '✓ PASS' : '⛔ FAIL'}</span>
                  </div>
                  <p className="wf-checklist-desc">
                    Zero disconnected floating nodes. Every operational stage is reachable downstream from the District root.
                  </p>
                </div>

                {/* 6. valid template fragments */}
                <div className={`wf-checklist-card ${checklist.validTemplateFragments ? 'wf-checklist-card--pass' : 'wf-checklist-card--fail'}`}>
                  <div className="wf-checklist-header">
                    <span className="wf-checklist-name">6. Statutory Template Fragment Integrity</span>
                    <span className="wf-checklist-pill">{checklist.validTemplateFragments ? '✓ PASS' : '⛔ FAIL'}</span>
                  </div>
                  <p className="wf-checklist-desc">
                    Standard fragments (Compensation RFCTLARR Sec 26–30, Possession Sec 38) retain mandatory evidentiary certificate requirements.
                  </p>
                </div>
              </div>

              {/* Errors list if any */}
              {localValidation && localValidation.errors.length > 0 && (
                <div className="wf-validation-errors-box">
                  <h4 className="wf-validation-errors-title">
                    ⛔ Statutory Violations Blocking Activation ({localValidation.errors.length})
                  </h4>
                  <ul className="wf-validation-errors-list">
                    {localValidation.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings list if any */}
              {localValidation && localValidation.warnings.length > 0 && (
                <div className="wf-validation-warnings-box">
                  <h4 className="wf-validation-warnings-title">
                    ⚠️ Operational Warnings ({localValidation.warnings.length})
                  </h4>
                  <ul className="wf-validation-warnings-list">
                    {localValidation.warnings.map((warn, idx) => (
                      <li key={idx}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Activation Gate Explanation when mode is 'activate' */}
              {modalMode === 'activate' && (
                <div className="wf-activation-gate-notice">
                  <div className="wf-activation-gate-header">
                    <span style={{ fontSize: '18px' }}>⚡</span>
                    <strong>Sovereign Atomic Activation Transaction</strong>
                  </div>
                  <p className="wf-activation-gate-text">
                    Activating the workflow initiates an 8-step atomic commit that <strong>freezes the topology</strong> permanently. The graph will be locked against editing, and runtime parcel tasks will be automatically dispatched to field officers.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!activationReceipt && activeTxStep === 0 && (
          <div className="wf-validation-footer">
            <button
              type="button"
              className="wf-btn"
              onClick={handleRunValidate}
              disabled={isValidating || isActivating}
            >
              {isValidating ? 'Running Check…' : '🔄 Re-Run Validation'}
            </button>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="wf-btn" onClick={onClose}>
                Close
              </button>
              {modalMode === 'activate' ? (
                <button
                  type="button"
                  className="wf-btn wf-btn--success"
                  disabled={!canActivate || isActivating}
                  onClick={handleExecuteActivation}
                  title={!canActivate ? 'All 6 statutory checks must pass before activation' : 'Execute atomic activation'}
                >
                  {isActivating ? 'Activating…' : '🚀 Commit & Activate Workflow'}
                </button>
              ) : (
                <button
                  type="button"
                  className="wf-btn wf-btn--primary"
                  disabled={!canActivate}
                  onClick={() => setModalMode('activate')}
                >
                  Proceed to Activation &rarr;
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkflowValidationModal;
