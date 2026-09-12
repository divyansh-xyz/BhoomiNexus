import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { possessionV2Service } from '../../services/api/possessionV2.service';
import type { PossessionDashboardData } from '../../services/api/possessionV2.service';
import type { PossessionRecord } from '../../types/workflowV2.types';
import type { WorkflowTask } from '../../types/task.types';
import BhoomiLogo from '../../components/common/BhoomiLogo';
import './possession.css';

export const PossessionDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<PossessionDashboardData | null>(null);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [records, setRecords] = useState<PossessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Complete Possession Modal state
  const [selectedRecord, setSelectedRecord] = useState<PossessionRecord | null>(null);
  const [possessionDate, setPossessionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState<string>('');
  const [panchnamaDocName, setPanchnamaDocName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. GET /api/v1/possession/dashboard (Spec Line 291)
      const dashData = await possessionV2Service.getDashboard();
      setStats(dashData);

      // 2. GET /api/v1/possession/tasks?assignedTo=me (Spec Line 294)
      const taskList = await possessionV2Service.getMyTasks();
      setTasks(taskList);

      // 3. Load possession records
      const r1 = await possessionV2Service.getRecord('poss-rec-101');
      const r2 = await possessionV2Service.getRecord('poss-rec-102');
      const r3 = await possessionV2Service.getRecord('poss-rec-103');
      const r4 = await possessionV2Service.getRecord('poss-rec-104');

      const loadedRecords = [r1, r2, r3, r4].filter(Boolean) as PossessionRecord[];
      setRecords(loadedRecords);
    } catch (err) {
      console.error('Failed to load possession dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Action: Complete Possession Handover
   * Calls: POST /api/v1/possession/records/:recordId/complete
   * (Spec Line 303)
   * 
   * DIRECT SINGLE-STEP: NO SECOND APPROVAL STEP.
   */
  const handleCompletePossessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setIsProcessing(true);
    try {
      const updated = await possessionV2Service.completePossession(selectedRecord.id, {
        possessionDate,
        remarks: remarks || 'Panchnama executed and parcel physical possession vested unconditionally under Section 38 RFCTLARR 2013.',
      });

      // Update local state and reload dashboard stats
      setRecords((prev) => prev.map((r) => (r.id === selectedRecord.id ? updated : r)));
      const newDash = await possessionV2Service.getDashboard();
      setStats(newDash);

      // Reload tasks to reflect updated status
      const updatedTasks = await possessionV2Service.getMyTasks();
      setTasks(updatedTasks);

      setSelectedRecord(null);
      setRemarks('');
      setPanchnamaDocName('');
      setActionSuccess(`✓ Possession Formally Completed for parcel ${selectedRecord.parcelId} (No 2nd approval needed).`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to complete possession');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Reset demo state
   */
  const handleResetDemoState = async () => {
    possessionV2Service.resetDemoState();
    await loadData();
    setActionSuccess('↻ Possession demo state reset to initial baseline.');
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const filteredRecords = records.filter((r) => {
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      r.parcelId.toLowerCase().includes(q) ||
      (r.remarks && r.remarks.toLowerCase().includes(q));
    return matchesStatus && matchesQuery;
  });

  // Find Demo Parcel 1 and Demo Parcel 2 for live display
  const demoRecord1 = records.find((r) => r.parcelId === 'MH-PUN-HAV-084/2A');
  const demoRecord2 = records.find((r) => r.parcelId === 'MH-PUN-HAV-084/2B');
  const isParcel1Completed = demoRecord1?.status === 'POSSESSION_TAKEN' || demoRecord1?.status === 'COMPLETED';

  return (
    <div className="poss-workspace">
      {/* SLAO Top Masthead */}
      <div className="poss-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <BhoomiLogo size={20} strokeWidth={2.4} />
            <span className="poss-tehsil-badge">
              Revenue Field Operations • {user?.authority || 'Tehsil Competent Authority'}
            </span>
          </div>
          <h1 className="poss-title">
            Physical Demarcation &amp; Possession Vesting
          </h1>
          <p className="poss-subtitle">
            Ground joint panchnama, boundary pillar pegging, and statutory vesting of unencumbered title under RFCTLARR Section 38
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={handleResetDemoState}
            className="poss-btn poss-btn-outline"
            title="Reset demo data to initial seed"
          >
            ↻ Reset Demo State
          </button>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="poss-btn poss-btn-outline"
          >
            {loading ? 'Refreshing...' : '↻ Refresh Data'}
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

      {/* Acceptance Demo Dual-Parcel Callout Banner */}
      <div className="poss-direct-banner">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e' }}>
              Phase 14 Acceptance Demonstration Status
            </span>
            <span style={{ fontSize: '11px', color: '#115e59' }}>
              (Section 17 Direct Execution: No Second Approval Step)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12.5px', color: '#134e4a' }}>
            <span>
              <strong>Demo Parcel 1</strong> (<code>MH-PUN-HAV-084/2A</code>):{' '}
              <span className={`poss-badge ${isParcel1Completed ? 'poss-badge-completed' : 'poss-badge-scheduled'}`}>
                {isParcel1Completed ? 'POSSESSION COMPLETED' : demoRecord1?.status.replace('_', ' ') || 'SCHEDULED'}
              </span>
              {isParcel1Completed && ' (Vested under Sec 38)'}
            </span>
            <span style={{ color: '#99f6e4' }}>|</span>
            <span>
              <strong>Demo Parcel 2</strong> (<code>MH-PUN-HAV-084/2B</code>):{' '}
              <span className="poss-badge poss-badge-pending">
                {demoRecord2?.status || 'PENDING'}
              </span>
              {' (Remains Pending Demarcation)'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Link
            to="/possession/tasks/TASK-POSS-101-1"
            className="poss-btn poss-btn-teal"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            Inspect Demo Parcel 1 &rarr;
          </Link>
          <Link
            to="/possession/tasks/TASK-POSS-101-2"
            className="poss-btn poss-btn-outline"
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            Inspect Demo Parcel 2 &rarr;
          </Link>
        </div>
      </div>

      {/* Live KPI Cards */}
      <div className="poss-kpi-grid">
        <div className="poss-kpi-card">
          <div className="poss-kpi-label">Total Acquisition Parcels</div>
          <div className="poss-kpi-value">
            {stats?.totalParcels?.toLocaleString() ?? records.length}
          </div>
          <div className="poss-kpi-caption">In Project Cadastre Boundary</div>
        </div>

        <div className="poss-kpi-card">
          <div className="poss-kpi-label">Possession Taken</div>
          <div className="poss-kpi-value" style={{ color: '#0d9488' }}>
            {stats?.possessionTaken?.toLocaleString() ?? 2}
          </div>
          <div className="poss-kpi-caption">Vested Free from Encroachment (Sec 38)</div>
        </div>

        <div className="poss-kpi-card">
          <div className="poss-kpi-label">Pending Demarcation</div>
          <div className="poss-kpi-value" style={{ color: '#d97706' }}>
            {stats?.possessionPending?.toLocaleString() ?? 2}
          </div>
          <div className="poss-kpi-caption">Compensation Cleared</div>
        </div>

        <div className="poss-kpi-card">
          <div className="poss-kpi-label">Scheduled Inspections</div>
          <div className="poss-kpi-value" style={{ color: '#2563eb' }}>
            {stats?.inspectionsScheduled ?? 1}
          </div>
          <div className="poss-kpi-caption">Circle Inspector Assigned</div>
        </div>

        <div className="poss-kpi-card">
          <div className="poss-kpi-label">Disputed Encroachments</div>
          <div className="poss-kpi-value" style={{ color: '#dc2626' }}>
            {stats?.disputedParcels ?? 1}
          </div>
          <div className="poss-kpi-caption">Under Revenue Police Review</div>
        </div>
      </div>

      {/* Assigned Field Demarcation Tasks Queue */}
      <div className="poss-card" style={{ marginBottom: '24px' }}>
        <div className="poss-card-header">
          <h2 className="poss-card-title">
            <span>⚡ Assigned Field Demarcation Tasks ({tasks.length})</span>
          </h2>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            GET /api/v1/possession/tasks?assignedTo=me
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tasks.map((t) => {
            const linkedRec = records.find((r) => r.taskId === t.id || r.parcelId === t.parcel?.id);
            const isParcel1 = t.id === 'TASK-POSS-101-1';
            const isCompleted = linkedRec?.status === 'POSSESSION_TAKEN' || linkedRec?.status === 'COMPLETED';

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
                  <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: '#f0fdfa', color: '#0d9488', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: 700 }}>
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
                        className={`poss-badge ${
                          isCompleted
                            ? 'poss-badge-completed'
                            : linkedRec?.status === 'INSPECTION_SCHEDULED'
                            ? 'poss-badge-scheduled'
                            : 'poss-badge-pending'
                        }`}
                      >
                        {isCompleted ? 'POSSESSION COMPLETED' : linkedRec?.status.replace('_', ' ') || 'PENDING'}
                      </span>
                      {isParcel1 ? (
                        <span style={{ fontSize: '11px', background: '#ccfbf1', color: '#0f766e', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                          Acceptance Demo Parcel 1
                        </span>
                      ) : (
                        <span style={{ fontSize: '11px', background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                          Acceptance Demo Parcel 2 (Pending)
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#475569' }}>
                      Village: <strong>{t.parcel?.village || 'Haveli'}</strong> • Area: <strong>{t.parcel?.areaAcres || 2.45} Acres</strong> • Due: {t.dueDate}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Link
                    to={`/possession/tasks/${t.id}`}
                    className="poss-btn poss-btn-teal"
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    Execute Possession Handover &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cadastral Possession Handover Register */}
      <div className="poss-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Table Toolbar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Cadastral Possession Handover Register
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              Field inspections, joint panchnama records, and Section 38 vesting certificates
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', borderRadius: '6px', border: '1px solid #cbd5e1', overflow: 'hidden' }}>
              {['ALL', 'PENDING', 'INSPECTION_SCHEDULED', 'POSSESSION_TAKEN', 'DISPUTED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  style={{
                    padding: '6px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    border: 'none',
                    backgroundColor: filterStatus === st ? '#0d9488' : '#ffffff',
                    color: filterStatus === st ? '#ffffff' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  {st.replace('_', ' ')}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search parcel ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                width: '180px',
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
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Project Code</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Possession Status</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Handover Date</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Field Notes / Panchnama</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((r) => {
                const isTaken = r.status === 'POSSESSION_TAKEN' || r.status === 'COMPLETED';

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
                    <td style={{ padding: '14px 14px', color: '#475569', fontSize: '12px', fontFamily: 'monospace' }}>
                      {r.projectId}
                    </td>
                    <td style={{ padding: '14px 14px' }}>
                      <span
                        className={`poss-badge ${
                          isTaken
                            ? 'poss-badge-completed'
                            : r.status === 'INSPECTION_SCHEDULED'
                            ? 'poss-badge-scheduled'
                            : r.status === 'DISPUTED'
                            ? 'poss-badge-disputed'
                            : 'poss-badge-pending'
                        }`}
                      >
                        {isTaken ? 'POSSESSION COMPLETED' : r.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ padding: '14px 14px', color: '#334155', fontSize: '12px' }}>
                      {r.possessionDate || 'Not Handed Over'}
                    </td>
                    <td style={{ padding: '14px 14px', color: '#64748b', fontSize: '12px', maxWidth: '320px' }}>
                      {r.remarks || '—'}
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {r.taskId ? (
                          <Link
                            to={`/possession/tasks/${r.taskId}`}
                            className="poss-btn poss-btn-outline"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                          >
                            Inspect &rarr;
                          </Link>
                        ) : null}

                        {!isTaken && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecord(r);
                              setRemarks('');
                              setPanchnamaDocName('');
                            }}
                            className="poss-btn poss-btn-teal"
                            style={{ padding: '4px 10px', fontSize: '11px' }}
                          >
                            Execute Handover
                          </button>
                        )}

                        {isTaken && (
                          <span style={{ fontSize: '11.5px', color: '#0d9488', fontWeight: 600, padding: '4px 6px' }}>
                            ✓ Vested
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Complete Possession Modal */}
      {selectedRecord && (
        <div className="poss-modal-overlay">
          <div className="poss-modal-card">
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              Execute Section 38 Possession Handover
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>
              Confirming physical handover &amp; vesting for parcel <strong>{selectedRecord.parcelId}</strong> (No 2nd approval required).
            </p>

            <form onSubmit={handleCompletePossessionSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Possession Demarcation Date
                  </label>
                  <input
                    type="date"
                    required
                    value={possessionDate}
                    onChange={(e) => setPossessionDate(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Panchnama &amp; Demarcation Remarks
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Boundary stones pegged in presence of Talathi, Sarpanch, and NHAI Site Engineer."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Attach Panchnama Document / Geotagged Photo Reference
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PANCHNAMA_PARCEL_084_2A_SIGNED.pdf"
                    value={panchnamaDocName}
                    onChange={(e) => setPanchnamaDocName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="poss-btn poss-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="poss-btn poss-btn-teal"
                >
                  {isProcessing ? 'Recording with Cadastre...' : 'Confirm Possession'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PossessionDashboardPage;
