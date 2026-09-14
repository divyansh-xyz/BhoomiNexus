import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { compensationV2Service } from '../../services/api/compensationV2.service';
import type { CompensationDashboardData } from '../../services/api/compensationV2.service';
import type { CompensationRecord } from '../../types/workflowV2.types';
import type { WorkflowTask } from '../../types/task.types';
import BhoomiLogo from '../../components/common/BhoomiLogo';
import './compensation.css';

export const CompensationDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<CompensationDashboardData | null>(null);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [records, setRecords] = useState<CompensationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Mark Paid Modal state
  const [selectedRecord, setSelectedRecord] = useState<CompensationRecord | null>(null);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isProcessing, setIsProcessing] = useState(false);

  // New Record Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectId, setNewProjectId] = useState(() => localStorage.getItem('bhoomi_demo_active_project_id') || '4ed46de6-586e-4459-b011-f090a1c3bafd');
  const [newParcelId, setNewParcelId] = useState('');
  const [newBeneficiary, setNewBeneficiary] = useState('');
  const [newAssessedAmount, setNewAssessedAmount] = useState<number>(0);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. GET /api/v1/compensation/dashboard (Spec Line 268)
      const dashData = await compensationV2Service.getDashboard();
      setStats(dashData);

      // 2. GET /api/v1/compensation/tasks?assignedTo=me (Spec Line 271)
      const taskList = await compensationV2Service.getMyTasks();
      setTasks(taskList);

      // 3. Load records from service store
      // Service handles record matching and updates
      const r1 = await compensationV2Service.getRecord('comp-rec-001');
      const r2 = await compensationV2Service.getRecord('comp-rec-002');
      const r3 = await compensationV2Service.getRecord('comp-rec-003');
      const r4 = await compensationV2Service.getRecord('comp-rec-004');

      const loadedRecords = [r1, r2, r3, r4].filter(Boolean) as CompensationRecord[];
      setRecords(loadedRecords);
    } catch (err) {
      console.error('Failed to load compensation dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Action: Mark Paid
   * Calls: POST /api/v1/compensation/records/:recordId/mark-paid
   * (Spec Line 283)
   */
  const handleMarkPaidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setIsProcessing(true);
    try {
      const updated = await compensationV2Service.markPaid(selectedRecord.id, {
        paidAmount: Number(paidAmount),
        paymentDate,
        referenceNo: paymentRef,
        remarks: 'Direct statutory payment confirmed by Compensation Officer',
      });

      // Update local state and reload dashboard stats
      setRecords((prev) => prev.map((r) => (r.id === selectedRecord.id ? updated : r)));
      const newDash = await compensationV2Service.getDashboard();
      setStats(newDash);

      // Reload tasks to reflect updated status
      const updatedTasks = await compensationV2Service.getMyTasks();
      setTasks(updatedTasks);

      setSelectedRecord(null);
      setActionSuccess(`✓ Disbursal recorded for parcel ${selectedRecord.parcelId}.`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to record payment');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Action: Create Record
   * Calls: POST /api/v1/compensation/records
   * (Spec Line 277)
   */
  const handleCreateRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const created = await compensationV2Service.createRecord({
        projectId: newProjectId,
        parcelId: newParcelId,
        beneficiaryName: newBeneficiary,
        assessedAmount: Number(newAssessedAmount),
        remarks: 'Preliminary statutory valuation prepared by SLAO desk',
      });

      setRecords((prev) => [created, ...prev]);
      const newDash = await compensationV2Service.getDashboard();
      setStats(newDash);

      setShowCreateModal(false);
      setNewParcelId('');
      setNewBeneficiary('');
      setNewAssessedAmount(0);
      setActionSuccess('✓ New statutory compensation award recorded.');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to create record');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Reset demo state for interactive testing
   */
  const handleResetDemoState = async () => {
    compensationV2Service.resetDemoState();
    await loadData();
    setActionSuccess('↻ Demo state reset to initial seeds.');
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const filteredRecords = records.filter((r) => {
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      r.beneficiaryName.toLowerCase().includes(q) ||
      r.parcelId.toLowerCase().includes(q) ||
      (r.referenceNo && r.referenceNo.toLowerCase().includes(q));
    return matchesStatus && matchesQuery;
  });

  // Find Demo Parcel 1 for live display
  const demoRecord1 = records.find((r) => r.parcelId === '07-104-5829-1021' || r.parcelId === 'MH-PUN-HAV-084/2A') || records[0];

  return (
    <div className="comp-workspace">
      {/* SLAO Top Masthead */}
      <div className="comp-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <BhoomiLogo size={20} strokeWidth={2.4} />
            <span className="comp-slao-badge">
              Special Land Acquisition Office (SLAO) • {user?.authority || 'Competent Authority'}
            </span>
          </div>
          <h1 className="comp-title">
            Compensation Awards &amp; PFMS Disbursals
          </h1>
          <p className="comp-subtitle">
            Statutory award determination, solatium calculation (100%), and PFMS Direct Benefit Transfers under RFCTLARR Sections 26–30
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleResetDemoState}
            className="comp-btn comp-btn-outline"
            title="Reset demo data to initial seed"
          >
            ↻ Reset Demo State
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="comp-btn comp-btn-amber"
          >
            + New Compensation Award
          </button>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="comp-btn comp-btn-outline"
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccess && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', padding: '12px 18px', borderRadius: '8px', marginBottom: '20px', fontSize: '13.5px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{actionSuccess}</span>
          <button type="button" onClick={() => setActionSuccess(null)} style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontSize: '16px' }}>&times;</button>
        </div>
      )}

      {/* Acceptance Demo Callout Banner */}
      {records.length === 0 ? (
        <div className="comp-demo-banner" style={{ background: '#f8fafc', borderColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontSize: '24px' }}>⏳</div>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#0f172a', marginBottom: '2px' }}>
                Awaiting Acquisition Branch Completion
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b' }}>
                The Processing Officer (Ananya Patel) has not yet approved the acquisition stage. Only land parcels that complete acquisition clearance will be routed to this compensation queue.
              </div>
            </div>
          </div>
          <Link
            to="/officer/dashboard"
            className="comp-btn comp-btn-outline"
            style={{ fontSize: '12px', padding: '6px 12px', whiteSpace: 'nowrap' }}
          >
            View Officer Docket &rarr;
          </Link>
        </div>
      ) : (
        <div className="comp-demo-banner">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                Acquisition Stage Cleared &bull; Compensation Pipeline Active
              </span>
              <span style={{ fontSize: '11px', color: '#059669', fontWeight: 600 }}>
                ✓ {records.length} Land Parcel(s) Cleared by Processing Officer
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12.5px', color: '#334155' }}>
              <span>
                <strong>Cleared Parcel</strong> (<code>{demoRecord1?.parcelDetails?.khasraNumber ? `Khasra ${demoRecord1.parcelDetails.khasraNumber} • ${demoRecord1.parcelId}` : '07-104-5829-1021'}</code>):{' '}
                <span className={`comp-badge ${demoRecord1?.status === 'DISBURSED' ? 'comp-badge-paid' : demoRecord1?.status === 'APPROVED' ? 'comp-badge-approved' : 'comp-badge-assessed'}`}>
                  {demoRecord1?.status || 'ASSESSED'}
                </span>
                {demoRecord1?.status === 'DISBURSED' && ' (Paid via PFMS)'}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link
              to="/compensation/tasks/TASK-COMP-101-1"
              className="comp-btn comp-btn-primary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              Inspect Cleared Parcel &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* KPI Cards: Dynamic Totals reflecting Cleared Acquisition Parcels */}
      <div className="comp-kpi-grid">
        <div className="comp-kpi-card">
          <div className="comp-kpi-label">Total Assessed</div>
          <div className="comp-kpi-value">
            ₹{((stats?.totalAssessed || 0) / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Lakh
          </div>
          <div className="comp-kpi-caption">Market Value + 100% Solatium</div>
        </div>

        <div className="comp-kpi-card">
          <div className="comp-kpi-label">Awards Approved</div>
          <div className="comp-kpi-value" style={{ color: '#2563eb' }}>
            ₹{((stats?.totalApproved || 0) / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Lakh
          </div>
          <div className="comp-kpi-caption">Collector Sanctioned (Sec 28)</div>
        </div>

        <div className="comp-kpi-card">
          <div className="comp-kpi-label">Total Disbursed</div>
          <div className="comp-kpi-value" style={{ color: '#059669' }}>
            ₹{((stats?.totalDisbursed || 0) / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Lakh
          </div>
          <div className="comp-kpi-caption">PFMS Direct Benefit Transferred</div>
        </div>

        <div className="comp-kpi-card">
          <div className="comp-kpi-label">Pending Disbursal</div>
          <div className="comp-kpi-value" style={{ color: '#d97706' }}>
            ₹{((stats?.pendingDisbursement || 0) / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} Lakh
          </div>
          <div className="comp-kpi-caption">Awaiting Sanction / Transfer</div>
        </div>

        <div className="comp-kpi-card">
          <div className="comp-kpi-label">Claims Registered</div>
          <div className="comp-kpi-value">
            {stats?.recordsCount || records.length} Parcels
          </div>
          <div className="comp-kpi-caption">
            {stats?.disputedCount || 0} Title Disputes (Sec 64)
          </div>
        </div>
      </div>

      {/* Assigned Compensation Tasks Queue */}
      <div className="comp-card" style={{ marginBottom: '24px' }}>
        <div className="comp-card-header">
          <h2 className="comp-card-title">
            <span>⚡ Assigned Compensation Officer Tasks ({tasks.length})</span>
          </h2>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            GET /api/v1/compensation/tasks?assignedTo=me
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tasks.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📋</div>
              <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>No Compensation Tasks Available</div>
              <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
                Parcels must complete the Acquisition Verification &amp; Final Clearance branch before appearing in this queue.
              </p>
            </div>
          ) : (
            tasks.map((t) => {
            const linkedRec = records.find((r) => r.taskId === t.id || r.parcelId === t.parcel?.id);
            const isParcel1 = t.id === 'TASK-COMP-101-1';
            return (
              <div
                key={t.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700 }}>
                    {isParcel1 ? '1' : '2'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                        {t.parcel?.khasraNumber ? `Parcel ${t.parcel.khasraNumber}` : t.id}
                      </span>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>
                        ({t.parcel?.id || t.id})
                      </span>
                      <span
                        className={`comp-badge ${
                          linkedRec?.status === 'DISBURSED'
                            ? 'comp-badge-paid'
                            : linkedRec?.status === 'APPROVED'
                            ? 'comp-badge-approved'
                            : 'comp-badge-assessed'
                        }`}
                      >
                        {linkedRec?.status || 'ASSESSED'}
                      </span>
                      {isParcel1 ? (
                        <span className="comp-demo-pill parcel1">Acceptance Demo Parcel 1</span>
                      ) : (
                        <span className="comp-demo-pill parcel2">Acceptance Demo Parcel 2 (Pending)</span>
                      )}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#475569' }}>
                      Khatedar: <strong>{linkedRec?.beneficiaryName || 'Beneficiary'}</strong> • Assessed: ₹{linkedRec?.assessedAmount.toLocaleString()} • Pending: ₹{linkedRec?.pendingAmount?.toLocaleString() ?? linkedRec?.assessedAmount.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Link
                    to={`/compensation/tasks/${t.id}`}
                    className="comp-btn comp-btn-primary"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    Inspect Task Details (10 Dimensions) &rarr;
                  </Link>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>

      {/* Statutory Compensation Ledger Table */}
      <div className="comp-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table Toolbar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Statutory Compensation Ledger
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              Individual parcel awards, beneficiary bank references, and payment lifecycle
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
              {['ALL', 'ASSESSED', 'APPROVED', 'DISBURSED', 'DISPUTED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: 'none',
                    backgroundColor: filterStatus === st ? '#d97706' : '#ffffff',
                    color: filterStatus === st ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search beneficiary / parcel..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                width: '210px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 18px', fontWeight: 600 }}>Parcel ID</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Beneficiary Name</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Assessed (Sec 26-27)</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Approved (Sec 28)</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Paid Amount</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Pending Amount</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>PFMS Reference</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '36px 20px', textAlign: 'center', color: '#64748b' }}>
                    <div style={{ fontSize: '24px', marginBottom: '8px' }}>📑</div>
                    <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>No Compensation Records Available</div>
                    <div style={{ fontSize: '12.5px' }}>
                      {records.length === 0
                        ? 'Parcels will be transferred to this ledger once the Processing Officer approves the Acquisition stage.'
                        : 'No records match the active search or status filter.'}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                const isPaid = r.status === 'DISBURSED';
                const approvedAmt = r.approvedAmount || 0;
                const paidAmt = r.paidAmount || 0;
                const pendingAmt = r.pendingAmount !== undefined ? r.pendingAmount : Math.max(0, (approvedAmt || r.assessedAmount) - paidAmt);

                return (
                  <tr
                    key={r.id}
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 18px', fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>
                      {r.parcelId}
                    </td>
                    <td style={{ padding: '14px 14px', color: '#1e293b', fontWeight: 500 }}>
                      {r.beneficiaryName}
                    </td>
                    <td style={{ padding: '14px 14px', color: '#334155' }}>
                      ₹{r.assessedAmount.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 14px', color: approvedAmt > 0 ? '#1d4ed8' : '#94a3b8', fontWeight: approvedAmt > 0 ? 600 : 400 }}>
                      {approvedAmt > 0 ? `₹${approvedAmt.toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '14px 14px', color: paidAmt > 0 ? '#059669' : '#94a3b8', fontWeight: paidAmt > 0 ? 600 : 400 }}>
                      {paidAmt > 0 ? `₹${paidAmt.toLocaleString()}` : '—'}
                    </td>
                    <td style={{ padding: '14px 14px', color: pendingAmt > 0 ? '#b45309' : '#059669', fontWeight: 600 }}>
                      ₹{pendingAmt.toLocaleString()}
                    </td>
                    <td style={{ padding: '14px 14px' }}>
                      <span
                        className={`comp-badge ${
                          isPaid
                            ? 'comp-badge-paid'
                            : r.status === 'APPROVED'
                            ? 'comp-badge-approved'
                            : r.status === 'DISPUTED'
                            ? 'comp-badge-disputed'
                            : 'comp-badge-assessed'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 14px', color: '#64748b', fontSize: '11.5px', fontFamily: 'monospace' }}>
                      {r.referenceNo || 'Pending Disbursal'}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {r.taskId ? (
                          <Link
                            to={`/compensation/tasks/${r.taskId}`}
                            className="comp-btn comp-btn-outline"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                          >
                            Inspect &rarr;
                          </Link>
                        ) : null}

                        {!isPaid && r.status !== 'DISPUTED' && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecord(r);
                              setPaidAmount(r.approvedAmount || r.assessedAmount);
                              setPaymentRef(`PFMS-${Date.now().toString().slice(-6)}`);
                            }}
                            className="comp-btn comp-btn-success"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                          >
                            Mark Paid
                          </button>
                        )}

                        {isPaid && (
                          <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600, padding: '4px 6px' }}>
                            ✓ Disbursed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mark Paid Disbursal Modal */}
      {selectedRecord && (
        <div className="comp-modal-overlay">
          <div className="comp-modal-card">
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              Record PFMS Disbursal
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>
              Confirm statutory direct benefit transfer for parcel <strong>{selectedRecord.parcelId}</strong> to Khatedar <strong>{selectedRecord.beneficiaryName}</strong>.
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
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    PFMS / Bank Transaction Reference
                  </label>
                  <input
                    type="text"
                    required
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Payment Value Date
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="comp-btn comp-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="comp-btn comp-btn-success"
                >
                  {isProcessing ? 'Recording with Ledger...' : 'Confirm Disbursal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create New Award Modal */}
      {showCreateModal && (
        <div className="comp-modal-overlay">
          <div className="comp-modal-card">
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              Create Statutory Compensation Award
            </h3>
            <form onSubmit={handleCreateRecordSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Project Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={newProjectId}
                    onChange={(e) => setNewProjectId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Parcel Cadastral ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MH-PUN-HAV-092/1"
                    value={newParcelId}
                    onChange={(e) => setNewParcelId(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Beneficiary Name (Khatedar)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aniket Sanjay Kulkarni"
                    value={newBeneficiary}
                    onChange={(e) => setNewBeneficiary(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Assessed Award (₹)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 4500000"
                    value={newAssessedAmount}
                    onChange={(e) => setNewAssessedAmount(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="comp-btn comp-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="comp-btn comp-btn-amber"
                >
                  {isProcessing ? 'Creating Award...' : 'Create Award'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompensationDashboardPage;
