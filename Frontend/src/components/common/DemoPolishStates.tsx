import React, { useEffect } from 'react';
import './demo-polish.css';

/* ─────────────────────────────────────────────────────────────
   1. DemoLoading — Restrained Apple-grade institutional loader
   ───────────────────────────────────────────────────────────── */
export interface DemoLoadingProps {
  title?: string;
  subtitle?: string;
  fullHeight?: boolean;
}

export const DemoLoading: React.FC<DemoLoadingProps> = ({
  title = 'Resolving Statutory Cadastre Records…',
  subtitle = 'Querying live land parcels, survey maps, and revenue records.',
  fullHeight = false,
}) => (
  <div
    style={
      fullHeight
        ? { minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }
        : undefined
    }
  >
    <div className="polish-loading-card">
      <div className="polish-spinner" />
      <div className="polish-loading-title">{title}</div>
      <div className="polish-loading-sub">{subtitle}</div>
      <div className="polish-pulse-bar">
        <div className="polish-pulse-bar-fill" />
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   2. DemoEmpty — Quiet empty state with clear title & action
   ───────────────────────────────────────────────────────────── */
export interface DemoEmptyProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const DemoEmpty: React.FC<DemoEmptyProps> = ({
  icon = '📂',
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="polish-empty-card">
    <div className="polish-empty-icon">{icon}</div>
    <div className="polish-empty-title">{title}</div>
    <div className="polish-empty-desc">{description}</div>
    {actionLabel && onAction && (
      <button type="button" className="polish-btn-primary" onClick={onAction}>
        {actionLabel}
      </button>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   3. DemoError — Defect notice with technical code & retry
   ───────────────────────────────────────────────────────────── */
export interface DemoErrorProps {
  title?: string;
  message: string;
  errorCode?: string;
  onRetry?: () => void;
}

export const DemoError: React.FC<DemoErrorProps> = ({
  title = 'Statutory Operation Interrupted',
  message,
  errorCode = 'ERR_SOVEREIGN_SVC',
  onRetry,
}) => (
  <div className="polish-error-card">
    <div className="polish-error-header">
      <span className="polish-error-badge">{errorCode}</span>
      <div className="polish-error-title">{title}</div>
    </div>
    <div className="polish-error-desc">{message}</div>
    {onRetry && (
      <button type="button" className="polish-btn-secondary" onClick={onRetry}>
        ↻ Retry Operation
      </button>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   4. DemoPermissionDenied — Sovereign 403 scope boundary notice
   ───────────────────────────────────────────────────────────── */
export interface DemoPermissionDeniedProps {
  requiredScope: string;
  userRole?: string;
  onReturn?: () => void;
  returnLabel?: string;
}

export const DemoPermissionDenied: React.FC<DemoPermissionDeniedProps> = ({
  requiredScope,
  userRole = 'UNAUTHORIZED_ROLE',
  onReturn,
  returnLabel = 'Return to Authorized Dashboard',
}) => (
  <div className="polish-permission-card">
    <div className="polish-permission-seal">⛔</div>
    <div className="polish-permission-title">Sovereign Scope Boundary Enforced</div>
    <div className="polish-permission-desc">
      Access to this jurisdictional record requires{' '}
      <span className="polish-role-pill">{requiredScope}</span> authority. Your authenticated
      role <span className="polish-role-pill">{userRole}</span> does not hold oversight permissions
      for this surface.
    </div>
    {onReturn && (
      <button type="button" className="polish-btn-primary" onClick={onReturn}>
        {returnLabel} &rarr;
      </button>
    )}
  </div>
);

/* ─────────────────────────────────────────────────────────────
   5. DemoSuccessToast — Auto-dismissing green toast
   ───────────────────────────────────────────────────────────── */
export interface DemoSuccessToastProps {
  message: string;
  onClose?: () => void;
  durationMs?: number;
}

export const DemoSuccessToast: React.FC<DemoSuccessToastProps> = ({
  message,
  onClose,
  durationMs = 4000,
}) => {
  useEffect(() => {
    if (!onClose) return;
    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [onClose, durationMs]);

  return (
    <div className="polish-toast">
      <span style={{ color: 'var(--polish-emerald)', fontWeight: 700 }}>✓</span>
      <span className="polish-toast-text">{message}</span>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--polish-fog)' }}
        >
          ✕
        </button>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   6. DemoConfirmationModal — General purpose confirmation
   ───────────────────────────────────────────────────────────── */
export interface DemoConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DemoConfirmationModal: React.FC<DemoConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="polish-modal-backdrop" onClick={onCancel}>
      <div className="polish-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="polish-modal-title">{title}</div>
        <div className="polish-modal-msg">{message}</div>
        <div className="polish-modal-actions">
          <button type="button" className="polish-btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={isDestructive ? 'polish-btn-danger' : 'polish-btn-primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   7. DemoUnsavedChangesModal — Prompt before discarding edits
   ───────────────────────────────────────────────────────────── */
export interface DemoUnsavedChangesModalProps {
  isOpen: boolean;
  onKeepEditing: () => void;
  onDiscard: () => void;
}

export const DemoUnsavedChangesModal: React.FC<DemoUnsavedChangesModalProps> = ({
  isOpen,
  onKeepEditing,
  onDiscard,
}) => {
  if (!isOpen) return null;

  return (
    <div className="polish-modal-backdrop" onClick={onKeepEditing}>
      <div className="polish-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="polish-modal-title">Unsaved Topology Modifications</div>
        <div className="polish-modal-msg">
          You have uncommitted node or cohort adjustments on this workflow graph. Leaving now will
          discard these changes. Are you sure you wish to leave?
        </div>
        <div className="polish-modal-actions">
          <button type="button" className="polish-btn-secondary" onClick={onKeepEditing}>
            Keep Editing
          </button>
          <button type="button" className="polish-btn-danger" onClick={onDiscard}>
            Discard &amp; Leave
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   8. DemoActivationWarningModal — High-stakes statutory freeze notice
   ───────────────────────────────────────────────────────────── */
export interface DemoActivationWarningModalProps {
  isOpen: boolean;
  projectCode: string;
  nodeCount: number;
  parcelCount: number;
  isActivating: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DemoActivationWarningModal: React.FC<DemoActivationWarningModalProps> = ({
  isOpen,
  projectCode,
  nodeCount,
  parcelCount,
  isActivating,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="polish-modal-backdrop" onClick={onCancel}>
      <div className="polish-modal-box" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <div className="polish-modal-title" style={{ margin: 0 }}>
            Statutory Workflow Activation &amp; Topology Freeze
          </div>
        </div>
        <div className="polish-modal-msg" style={{ fontSize: '13px' }}>
          <p style={{ marginBottom: '10px' }}>
            Activating workflow for <strong>{projectCode}</strong> will irrevocably freeze all{' '}
            <strong>{nodeCount} graph nodes</strong> and <strong>{parcelCount} cadastral parcels</strong>.
          </p>
          <div
            style={{
              background: '#fef7e0',
              border: '1px solid #f9e2af',
              borderRadius: '6px',
              padding: '10px 12px',
              fontSize: '12px',
              color: '#855800',
              lineHeight: 1.45,
            }}
          >
            <strong>RFCTLARR Statutory Warning:</strong> Once active, topological stages cannot be
            deleted, added, or reordered. Processing tasks will immediately dispatch to assigned
            department officers.
          </div>
        </div>
        <div className="polish-modal-actions">
          <button type="button" className="polish-btn-secondary" onClick={onCancel} disabled={isActivating}>
            Review Graph First
          </button>
          <button
            type="button"
            className="polish-btn-primary"
            onClick={onConfirm}
            disabled={isActivating}
            style={{ backgroundColor: '#137333' }}
          >
            {isActivating ? 'Freezing Topology…' : 'I Confirm: Activate Workflow'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   9. DemoGisLoadingOverlay — Sleek dark GIS projection overlay
   ───────────────────────────────────────────────────────────── */
export interface DemoGisLoadingOverlayProps {
  message?: string;
  subMessage?: string;
}

export const DemoGisLoadingOverlay: React.FC<DemoGisLoadingOverlayProps> = ({
  message = 'Projecting Geospatial Cadastre Layers…',
  subMessage = 'Fetching DGPS boundary vectors and satellite survey overlays',
}) => (
  <div className="polish-gis-overlay">
    <div className="polish-gis-spinner" />
    <div className="polish-gis-text">{message}</div>
    <div className="polish-gis-sub">{subMessage}</div>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   10. DemoDocumentProcessing — OCR scanning animation & confidence
   ───────────────────────────────────────────────────────────── */
export interface DemoDocumentProcessingProps {
  fileName: string;
  confidencePercent?: number;
  extractedFieldsCount?: number;
  isProcessing?: boolean;
}

export const DemoDocumentProcessing: React.FC<DemoDocumentProcessingProps> = ({
  fileName,
  confidencePercent = 98.4,
  extractedFieldsCount = 6,
  isProcessing = false,
}) => (
  <div className="polish-ocr-box">
    {isProcessing && <div className="polish-scan-line" />}
    <div className="polish-ocr-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '16px' }}>📄</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--polish-ink)' }}>{fileName}</div>
          <div style={{ fontSize: '11px', color: 'var(--polish-fog)' }}>
            {isProcessing ? 'Optical Character Recognition in progress…' : `${extractedFieldsCount} statutory fields parsed`}
          </div>
        </div>
      </div>
      <div className="polish-confidence-meter">
        <div className="polish-confidence-bar">
          <div
            className="polish-confidence-bar-fill"
            style={{ width: `${confidencePercent}%` }}
          />
        </div>
        <span>{confidencePercent.toFixed(1)}% OCR</span>
      </div>
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   11. DemoTaskCompleted — Celebratory sovereign sign-off card
   ───────────────────────────────────────────────────────────── */
export interface DemoTaskCompletedProps {
  title?: string;
  taskName: string;
  officerName: string;
  nextStepLabel?: string;
  onNextStep?: () => void;
}

export const DemoTaskCompleted: React.FC<DemoTaskCompletedProps> = ({
  title = 'Task Accepted & Recorded in Sovereign Registry',
  taskName,
  officerName,
  nextStepLabel = 'Return to Officer Queue',
  onNextStep,
}) => (
  <div className="polish-completed-card">
    <div className="polish-completed-check">✓</div>
    <div className="polish-completed-title">{title}</div>
    <div className="polish-completed-sub">
      <strong>{taskName}</strong> signed off by <strong>{officerName}</strong>. Statutory evidence
      and affirmations have been anchored with cryptographic timestamp.
    </div>
    {onNextStep && (
      <button type="button" className="polish-btn-primary" onClick={onNextStep}>
        {nextStepLabel} &rarr;
      </button>
    )}
  </div>
);
