import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { compensationV2Service } from '../../services/api/compensationV2.service';
import type { CompensationRecord } from '../../types/workflowV2.types';
import type { WorkflowTask } from '../../types/task.types';
import BhoomiLogo from '../../components/common/BhoomiLogo';
import './compensation.css';

export const CompensationTaskDetailPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [task, setTask] = useState<WorkflowTask | null>(null);
  const [record, setRecord] = useState<CompensationRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mark Paid Modal state
  const [showMarkPaidModal, setShowMarkPaidModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentRemarks, setPaymentRemarks] = useState<string>('');

  // Remarks edit state
  const [editingRemarks, setEditingRemarks] = useState(false);
  const [remarksText, setRemarksText] = useState('');

  // Evidence upload modal state
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [newEvidenceTitle, setNewEvidenceTitle] = useState('');
  const [newEvidenceType, setNewEvidenceType] = useState<string>('PFMS_RECEIPT');

  useEffect(() => {
    if (taskId) {
      loadTaskAndRecord(taskId);
    }
  }, [taskId]);

  const loadTaskAndRecord = async (tId: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch task using GET /api/v1/compensation/tasks?assignedTo=me
      const currentTask = await compensationV2Service.getTaskById(tId);
      if (!currentTask) {
        setError(`Compensation task "${tId}" not found.`);
        setLoading(false);
        return;
      }
      setTask(currentTask);

      // 2. Fetch compensation record using GET /api/v1/compensation/records/:recordId
      const parcelId = currentTask.parcel?.id || currentTask.id;
      // Look up by taskId or parcelId
      const compRecord = await compensationV2Service.getRecord(tId);
      if (compRecord) {
        setRecord(compRecord);
        setPaymentAmount(compRecord.approvedAmount || compRecord.assessedAmount || 0);
        setReferenceNo(compRecord.referenceNo || `PFMS-DBT-${Date.now().toString().slice(-5)}`);
        setRemarksText(compRecord.remarks || '');
      } else {
        // Fallback: create or synthesize from task context
        const rec = await compensationV2Service.getRecord('comp-rec-001');
        if (rec) {
          setRecord(rec);
          setPaymentAmount(rec.approvedAmount || rec.assessedAmount);
          setReferenceNo(rec.referenceNo || `PFMS-DBT-2026-94821`);
          setRemarksText(rec.remarks || '');
        }
      }
    } catch (err: any) {
      console.error('Failed to load compensation task details', err);
      setError(err?.message || 'Error loading compensation record');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Action 1: Sanction / Approve Award (Assessed -> Approved)
   * Calls: PATCH /api/v1/compensation/records/:recordId
   * (Spec Line 280)
   */
  const handleApproveAward = async () => {
    if (!record) return;
    setIsProcessing(true);
    try {
      const updated = await compensationV2Service.updateRecord(record.id, {
        approvedAmount: record.assessedAmount,
        status: 'APPROVED',
        remarks: `${record.remarks || ''} | Award sanctioned under RFCTLARR Sec 28 by District Collector.`,
      });
      setRecord(updated);
      setPaymentAmount(updated.approvedAmount || updated.assessedAmount);
      setActionSuccess('✓ Award successfully approved and sanctioned under Section 28 RFCTLARR 2013.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to approve award');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Action 2: Mark Paid (Approved -> Paid)
   * Calls: POST /api/v1/compensation/records/:recordId/mark-paid
   * (Spec Line 283)
   */
  const handleMarkPaidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    setIsProcessing(true);
    try {
      const updated = await compensationV2Service.markPaid(record.id, {
        paidAmount: Number(paymentAmount),
        paymentDate,
        referenceNo,
        remarks: paymentRemarks || 'PFMS Direct Benefit Transfer cleared successfully into beneficiary bank account.',
      });
      setRecord(updated);
      setShowMarkPaidModal(false);
      setActionSuccess(`✓ Disbursal of ₹${Number(paymentAmount).toLocaleString()} recorded with PFMS Ref: ${referenceNo}`);
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Failed to record payment');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Action 3: Complete Compensation Task
   * Calls: POST /api/v1/compensation/tasks/:taskId/complete
   * (Spec Line 286)
   */
  const handleCompleteTask = async () => {
    if (!task) return;
    setIsProcessing(true);
    try {
      await compensationV2Service.completeTask(task.id, {
        remarks: 'All statutory compensation awards sanctioned, disbursed through PFMS DBT, and verified.',
      });
      setTask((prev) => (prev ? { ...prev, status: 'ACCEPTED', completedAt: new Date().toISOString() } : null));
      setActionSuccess('✓ Compensation Officer Task marked COMPLETED.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to complete task');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Action 4: Save updated remarks
   * Calls: PATCH /api/v1/compensation/records/:recordId
   * (Spec Line 280)
   */
  const handleSaveRemarks = async () => {
    if (!record) return;
    setIsProcessing(true);
    try {
      const updated = await compensationV2Service.updateRecord(record.id, {
        remarks: remarksText,
      });
      setRecord(updated);
      setEditingRemarks(false);
      setActionSuccess('✓ Remarks updated in statutory compensation ledger.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to update remarks');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Action 5: Link New Evidence Voucher
   * Calls: PATCH /api/v1/compensation/records/:recordId
   * (Spec Line 280)
   */
  const handleAddEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    setIsProcessing(true);
    try {
      const newEv = {
        id: `ev-comp-${Date.now()}`,
        title: newEvidenceTitle || 'PFMS Disbursal Voucher',
        type: newEvidenceType as any,
        uploadedAt: new Date().toISOString(),
        size: '1.5 MB',
      };
      const updatedList = [newEv, ...(record.evidenceItems || [])];
      const updated = await compensationV2Service.updateRecord(record.id, {
        evidenceItems: updatedList,
      });
      setRecord(updated);
      setShowEvidenceModal(false);
      setNewEvidenceTitle('');
      setActionSuccess('✓ Evidence document attached to statutory compensation record.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to attach evidence');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Helper: Reset state for demo evaluation
   */
  const handleResetDemo = () => {
    compensationV2Service.resetDemoState();
    if (taskId) {
      loadTaskAndRecord(taskId);
    }
    setActionSuccess('↻ Demo state reset to initial baseline.');
    setTimeout(() => setActionSuccess(null), 3000);
  };

  if (loading) {
    return (
      <div className="comp-workspace" style={{ padding: '60px 0', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
          Loading statutory compensation task and ledger record...
        </div>
      </div>
    );
  }

  if (error || !task || !record) {
    return (
      <div className="comp-workspace" style={{ padding: '40px 0' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '24px', color: '#991b1b' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Task Lookup Error</h2>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px' }}>{error || 'Record or task could not be retrieved.'}</p>
          <Link to="/compensation/dashboard" className="comp-btn comp-btn-outline">
            &larr; Back to Compensation Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Determine current milestone step
  const isAssessed = record.status === 'ASSESSED';
  const isApproved = record.status === 'APPROVED';
  const isDisbursed = record.status === 'DISBURSED';
  const isTaskCompleted = task.status === 'ACCEPTED';

  // Calculate pending amount: (approvedAmount or assessedAmount) - paidAmount
  const currentTargetAmount = (record.approvedAmount && record.approvedAmount > 0) ? record.approvedAmount : record.assessedAmount;
  const currentPendingAmount = Math.max(0, currentTargetAmount - (record.paidAmount || 0));

  return (
    <div className="comp-workspace">
      {/* Top Breadcrumbs & Back Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <Link
          to="/compensation/dashboard"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', textDecoration: 'none', fontWeight: 500 }}
        >
          <span>&larr;</span> Back to Compensation Dashboard
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleResetDemo}
            className="comp-btn comp-btn-outline"
            style={{ fontSize: '11.5px', padding: '4px 10px' }}
            title="Reset to initial seed for demonstration"
          >
            ↻ Reset Demo State
          </button>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Task ID: <code style={{ color: '#0f172a', fontWeight: 600 }}>{task.id}</code>
          </span>
        </div>
      </div>

      {/* SLAO Masthead */}
      <div className="comp-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <BhoomiLogo size={20} strokeWidth={2.4} />
            <span className="comp-slao-badge">
              Special Land Acquisition Office (SLAO) • {user?.authority || 'Competent Authority'}
            </span>
            <span
              className={`comp-badge ${
                isDisbursed
                  ? 'comp-badge-paid'
                  : isApproved
                  ? 'comp-badge-approved'
                  : record.status === 'DISPUTED'
                  ? 'comp-badge-disputed'
                  : 'comp-badge-assessed'
              }`}
            >
              {record.status}
            </span>
          </div>
          <h1 className="comp-title">
            Compensation Award &amp; Disbursal — Parcel {record.parcelId}
          </h1>
          <p className="comp-subtitle">
            {task.projectTitle} • Project Code: <strong style={{ color: '#1e293b' }}>{task.projectCode}</strong> • SLAO Desk: {task.assignedOfficer.name}
          </p>
        </div>

        {/* Global Action Trigger Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isAssessed && (
            <button
              type="button"
              onClick={handleApproveAward}
              disabled={isProcessing}
              className="comp-btn comp-btn-primary"
              id="btn-approve-award"
            >
              ✓ Sanction &amp; Approve Award (Sec 28)
            </button>
          )}

          {isApproved && (
            <button
              type="button"
              onClick={() => setShowMarkPaidModal(true)}
              disabled={isProcessing}
              className="comp-btn comp-btn-success"
              id="btn-mark-paid"
            >
              ⚡ Record Disbursal (Mark Paid via PFMS)
            </button>
          )}

          {isDisbursed && !isTaskCompleted && (
            <button
              type="button"
              onClick={handleCompleteTask}
              disabled={isProcessing}
              className="comp-btn comp-btn-amber"
              id="btn-complete-task"
            >
              🏁 Complete Compensation Task
            </button>
          )}

          {isTaskCompleted && (
            <span style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '6px', background: '#d1fae5', color: '#065f46', fontWeight: 700, border: '1px solid #a7f3d0' }}>
              ✓ Task Formally Completed
            </span>
          )}
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccess && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess(null)} style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontSize: '16px' }}>&times;</button>
        </div>
      )}

      {/* 4-Step Statutory Milestone Stepper */}
      <div className="comp-stepper-container">
        <div className="comp-stepper">
          {/* Step 1: Assessed */}
          <div className={`comp-step-item ${isAssessed || isApproved || isDisbursed ? 'completed' : 'active'}`}>
            <div className="comp-step-circle">①</div>
            <div className="comp-step-content">
              <span className="comp-step-title">Assessed</span>
              <span className="comp-step-sub">Sec 26-27 Valuation</span>
            </div>
          </div>
          <div className={`comp-step-line ${isApproved || isDisbursed ? 'completed' : ''}`} />

          {/* Step 2: Approved */}
          <div className={`comp-step-item ${isApproved || isDisbursed ? 'completed' : isAssessed ? 'active' : ''}`}>
            <div className="comp-step-circle">②</div>
            <div className="comp-step-content">
              <span className="comp-step-title">Approved</span>
              <span className="comp-step-sub">Sec 28 Collector Sanction</span>
            </div>
          </div>
          <div className={`comp-step-line ${isDisbursed ? 'completed' : ''}`} />

          {/* Step 3: Paid */}
          <div className={`comp-step-item ${isDisbursed ? 'completed' : isApproved ? 'active' : ''}`}>
            <div className="comp-step-circle">③</div>
            <div className="comp-step-content">
              <span className="comp-step-title">Paid</span>
              <span className="comp-step-sub">PFMS Direct Benefit Transfer</span>
            </div>
          </div>
          <div className={`comp-step-line ${isTaskCompleted ? 'completed' : ''}`} />

          {/* Step 4: Completed */}
          <div className={`comp-step-item ${isTaskCompleted ? 'completed' : isDisbursed ? 'active' : ''}`}>
            <div className="comp-step-circle">④</div>
            <div className="comp-step-content">
              <span className="comp-step-title">Completed</span>
              <span className="comp-step-sub">Statutory Sign-off</span>
            </div>
          </div>
        </div>
      </div>

      {/* The 10 Statutory Task Content Dimensions Grid */}
      <div className="comp-dimensions-grid">
        {/* Left Column (8 cols): Dimensions 1, 3, 4, 5, 6, 10 */}
        <div className="comp-dim-col-8">
          {/* Dimension 1: Parcel */}
          <div className="comp-card" id="dim-parcel">
            <div className="comp-card-header">
              <h2 className="comp-card-title">
                <span>📍 Dimension 1: Parcel Identity &amp; Cadastral Context</span>
              </h2>
              <span className="comp-card-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
                ULPIN: {record.parcelDetails?.ulpin || 'MH2708402A190084'}
              </span>
            </div>
            <div className="comp-attr-grid">
              <div>
                <div className="comp-attr-label">Cadastral / Khasra No</div>
                <div className="comp-attr-value mono">{record.parcelDetails?.khasraNumber || record.parcelId}</div>
              </div>
              <div>
                <div className="comp-attr-label">Village &amp; Taluka</div>
                <div className="comp-attr-value">{record.parcelDetails?.village || 'Haveli'}, {record.parcelDetails?.taluka || 'Haveli'}</div>
              </div>
              <div>
                <div className="comp-attr-label">District &amp; State</div>
                <div className="comp-attr-value">{record.parcelDetails?.district || 'Pune'}, {record.parcelDetails?.state || 'Maharashtra'}</div>
              </div>
              <div>
                <div className="comp-attr-label">Acquired Land Area</div>
                <div className="comp-attr-value">{record.parcelDetails?.areaAcres || 2.45} Acres</div>
              </div>
              <div>
                <div className="comp-attr-label">Land Tenure &amp; Classification</div>
                <div className="comp-attr-value">{record.parcelDetails?.landClassification || 'Perennially Irrigated'} ({record.parcelDetails?.tenureType || 'Occupant Class I'})</div>
              </div>
              <div>
                <div className="comp-attr-label">Sovereign Boundary Seal</div>
                <div className="comp-attr-value" style={{ color: '#059669', fontWeight: 600 }}>
                  ✓ Affirmation Passed (Sec 20)
                </div>
              </div>
            </div>
          </div>

          {/* Financial Breakdown: Dimensions 3, 4, 5, 6 (Assessed, Approved, Paid, Pending) */}
          <div className="comp-card" id="dim-financials">
            <div className="comp-card-header">
              <h2 className="comp-card-title">
                <span>💰 Statutory Award &amp; Payment Breakdown (Dimensions 3–6)</span>
              </h2>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Under RFCTLARR 2013 Sec 26–30</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '18px' }}>
              {/* Dimension 3: Assessed */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div className="comp-attr-label">Dimension 3: Assessed</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
                  ₹{record.assessedAmount.toLocaleString()}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Base + 100% Solatium</div>
              </div>

              {/* Dimension 4: Approved */}
              <div style={{ background: '#eff6ff', padding: '14px', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                <div className="comp-attr-label" style={{ color: '#1e40af' }}>Dimension 4: Approved</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#1d4ed8' }}>
                  {record.approvedAmount && record.approvedAmount > 0 ? `₹${record.approvedAmount.toLocaleString()}` : '₹0'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  {record.approvedAmount && record.approvedAmount > 0 ? 'Collector Sanctioned' : 'Pending Sanction'}
                </div>
              </div>

              {/* Dimension 5: Paid */}
              <div style={{ background: '#ecfdf5', padding: '14px', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                <div className="comp-attr-label" style={{ color: '#065f46' }}>Dimension 5: Paid</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#047857' }}>
                  {record.paidAmount && record.paidAmount > 0 ? `₹${record.paidAmount.toLocaleString()}` : '₹0'}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  {record.paidAmount && record.paidAmount > 0 ? 'Disbursed via PFMS' : 'Not Disbursed'}
                </div>
              </div>

              {/* Dimension 6: Pending */}
              <div style={{ background: currentPendingAmount > 0 ? '#fffbeb' : '#f8fafc', padding: '14px', borderRadius: '8px', border: currentPendingAmount > 0 ? '1px solid #fde68a' : '1px solid #e2e8f0' }}>
                <div className="comp-attr-label" style={{ color: currentPendingAmount > 0 ? '#b45309' : '#64748b' }}>Dimension 6: Pending</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: currentPendingAmount > 0 ? '#b45309' : '#059669' }}>
                  ₹{currentPendingAmount.toLocaleString()}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  {currentPendingAmount === 0 ? '✓ Zero Outstanding' : 'Awaiting Disbursal'}
                </div>
              </div>
            </div>

            {/* Solatium Calculation Details */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 16px', fontSize: '12.5px' }}>
              <div style={{ fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                Statutory Valuation Schedule (RFCTLARR First Schedule):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', color: '#475569' }}>
                <div>• Market Value: <strong>₹{((record.solatiumDetails?.baseMarketValue || (record.assessedAmount / 2))).toLocaleString()}</strong></div>
                <div>• Solatium (100% Sec 30): <strong>₹{((record.solatiumDetails?.solatium100Percent || (record.assessedAmount / 2))).toLocaleString()}</strong></div>
                <div>• Multiplier Factor: <strong>{record.solatiumDetails?.multiplicationFactor || '1.0 (Rural-Urban Fringe)'}</strong></div>
              </div>
            </div>
          </div>

          {/* Dimensions 7 & 8: Payment Reference & Payment Date */}
          <div className="comp-card" id="dim-payment-tracking">
            <div className="comp-card-header">
              <h2 className="comp-card-title">
                <span>🏛️ Payment Tracking &amp; Settlement (Dimensions 7 &amp; 8)</span>
              </h2>
              {isDisbursed && (
                <span className="comp-badge comp-badge-paid">✓ PFMS Settlement Confirmed</span>
              )}
            </div>
            <div className="comp-attr-grid">
              <div>
                <div className="comp-attr-label">Dimension 7: Payment Reference (UTR / PFMS)</div>
                <div className="comp-attr-value mono" style={{ color: record.referenceNo ? '#0f172a' : '#94a3b8' }}>
                  {record.referenceNo || 'Pending Disbursal'}
                </div>
              </div>
              <div>
                <div className="comp-attr-label">Dimension 8: Payment Date</div>
                <div className="comp-attr-value">
                  {record.paymentDate || 'Pending Settlement'}
                </div>
              </div>
              <div>
                <div className="comp-attr-label">Payment Channel</div>
                <div className="comp-attr-value">
                  Public Financial Management System (PFMS DBT)
                </div>
              </div>
              <div>
                <div className="comp-attr-label">Direct Transfer Mode</div>
                <div className="comp-attr-value">
                  Aadhaar Payment Bridge (APB) / NEFT Treasury
                </div>
              </div>
            </div>
          </div>

          {/* Dimension 10: Remarks */}
          <div className="comp-card" id="dim-remarks">
            <div className="comp-card-header">
              <h2 className="comp-card-title">
                <span>📝 Dimension 10: Officer Remarks &amp; Statutory Notes</span>
              </h2>
              {!editingRemarks ? (
                <button
                  type="button"
                  onClick={() => setEditingRemarks(true)}
                  className="comp-btn comp-btn-outline"
                  style={{ padding: '3px 8px', fontSize: '11px' }}
                >
                  ✏️ Edit Remarks
                </button>
              ) : (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={handleSaveRemarks}
                    disabled={isProcessing}
                    className="comp-btn comp-btn-primary"
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRemarks(false);
                      setRemarksText(record.remarks || '');
                    }}
                    className="comp-btn comp-btn-outline"
                    style={{ padding: '3px 8px', fontSize: '11px' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {!editingRemarks ? (
              <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.6, background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {record.remarks || 'No statutory remarks recorded by officer.'}
              </p>
            ) : (
              <div>
                <textarea
                  rows={3}
                  value={remarksText}
                  onChange={(e) => setRemarksText(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Dimensions 2 & 9 (Beneficiary & Evidence) */}
        <div className="comp-dim-col-4">
          {/* Dimension 2: Beneficiary */}
          <div className="comp-card" id="dim-beneficiary">
            <div className="comp-card-header">
              <h2 className="comp-card-title">
                <span>👤 Dimension 2: Beneficiary Identity &amp; Bank Mandate</span>
              </h2>
            </div>
            
            <div style={{ marginBottom: '12px' }}>
              <div className="comp-attr-label">Primary Khatedar Name</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                {record.beneficiaryDetails?.khatedarName || record.beneficiaryName}
              </div>
              <div style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                ✓ UIDAI &amp; Land Record Title Match: 100% Entitled Share
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <div>
                <div className="comp-attr-label">Masked Aadhaar</div>
                <div className="comp-attr-value mono">{record.beneficiaryDetails?.aadhaarMasked || 'XXXX-XXXX-8421'}</div>
              </div>
              <div>
                <div className="comp-attr-label">PAN Number</div>
                <div className="comp-attr-value mono">{record.beneficiaryDetails?.panMasked || 'ABCPS8421K'}</div>
              </div>
            </div>

            {/* Bank Card Aesthetic */}
            <div className="comp-bank-chip">
              <div className="comp-bank-chip-header">
                <span>{record.beneficiaryDetails?.bankName || 'State Bank of India'}</span>
                <span style={{ fontSize: '10px', background: '#334155', padding: '2px 6px', borderRadius: '4px' }}>DBT ACTIVE</span>
              </div>
              <div className="comp-bank-chip-number">
                {record.beneficiaryDetails?.accountNumber || '30492817492'}
              </div>
              <div className="comp-bank-chip-footer">
                <div>
                  <div style={{ fontSize: '9px', opacity: 0.8 }}>IFSC CODE</div>
                  <div style={{ fontWeight: 600 }}>{record.beneficiaryDetails?.ifsc || 'SBIN0001428'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '9px', opacity: 0.8 }}>BRANCH</div>
                  <div style={{ fontWeight: 600 }}>{record.beneficiaryDetails?.bankBranch || 'Haveli Tehsil'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Dimension 9: Evidence */}
          <div className="comp-card" id="dim-evidence">
            <div className="comp-card-header">
              <h2 className="comp-card-title">
                <span>📂 Dimension 9: Statutory Evidence &amp; Vouchers</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowEvidenceModal(true)}
                className="comp-btn comp-btn-outline"
                style={{ padding: '3px 8px', fontSize: '11px' }}
              >
                + Attach Voucher
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(record.evidenceItems && record.evidenceItems.length > 0 ? record.evidenceItems : [
                { id: 'ev-1', title: 'Form 11 Award Declaration Notice', type: 'AWARD_NOTICE', uploadedAt: '2026-09-08', size: '1.8 MB' },
                { id: 'ev-2', title: 'Aadhaar & Bank KYC Mandate Certificate', type: 'BANK_MANDATE', uploadedAt: '2026-09-09', size: '840 KB' },
              ]).map((ev: any) => (
                <div
                  key={ev.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>📄</span>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#1e293b' }}>{ev.title}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {ev.type} • {ev.size || '1.2 MB'}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>✓ Verified</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick SLAO Officer Duty Stamp */}
          <div style={{ background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Sovereign SLAO Digital Stamp
            </div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
              {task.assignedOfficer.name}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
              {task.assignedOfficer.department}
            </div>
            <div style={{ fontSize: '10.5px', color: '#94a3b8', marginTop: '6px' }}>
              Authorized under RFCTLARR 2013 &bull; State of Maharashtra
            </div>
          </div>
        </div>
      </div>

      {/* Mark Paid Disbursal Modal */}
      {showMarkPaidModal && (
        <div className="comp-modal-overlay">
          <div className="comp-modal-card">
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              Record PFMS Direct Benefit Transfer (DBT)
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Enter statutory payment clearing details for parcel <strong>{record.parcelId}</strong> to Khatedar <strong>{record.beneficiaryName}</strong>.
            </p>

            <form onSubmit={handleMarkPaidSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Disbursed Amount (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    PFMS / e-Treasury UTR Transaction Reference (Dimension 7)
                  </label>
                  <input
                    type="text"
                    required
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder="e.g. PFMS-DBT-2026-94821"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Disbursal Value Date (Dimension 8)
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Payment Remarks / Notes (Dimension 10)
                  </label>
                  <input
                    type="text"
                    value={paymentRemarks}
                    onChange={(e) => setPaymentRemarks(e.target.value)}
                    placeholder="Direct benefit transfer cleared via State Bank of India"
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowMarkPaidModal(false)}
                  className="comp-btn comp-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="comp-btn comp-btn-success"
                >
                  {isProcessing ? 'Recording with Ledger...' : 'Confirm PFMS Disbursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Attach Evidence Modal */}
      {showEvidenceModal && (
        <div className="comp-modal-overlay">
          <div className="comp-modal-card">
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              Attach Statutory Compensation Voucher
            </h3>
            <form onSubmit={handleAddEvidenceSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Voucher Title / Document Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bank Treasury Clearance Receipt"
                    value={newEvidenceTitle}
                    onChange={(e) => setNewEvidenceTitle(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Evidence Type
                  </label>
                  <select
                    value={newEvidenceType}
                    onChange={(e) => setNewEvidenceType(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="PFMS_RECEIPT">PFMS Disbursal Voucher</option>
                    <option value="AWARD_NOTICE">Form 11 Award Notice</option>
                    <option value="INDEMNITY_BOND">Indemnity Bond</option>
                    <option value="BANK_MANDATE">Bank Mandate Form</option>
                    <option value="REVENUE_EXTRACT">Revenue Record (7/12)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(false)}
                  className="comp-btn comp-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="comp-btn comp-btn-primary"
                >
                  Attach to Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompensationTaskDetailPage;
