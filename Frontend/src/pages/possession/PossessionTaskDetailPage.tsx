import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { possessionV2Service } from '../../services/api/possessionV2.service';
import type { PossessionRecord, PossessionEvidenceItem } from '../../types/workflowV2.types';
import type { WorkflowTask } from '../../types/task.types';
import BhoomiLogo from '../../components/common/BhoomiLogo';
import './possession.css';

export const PossessionTaskDetailPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [task, setTask] = useState<WorkflowTask | null>(null);
  const [record, setRecord] = useState<PossessionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Evidence Upload Modal
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [evidenceTitle, setEvidenceTitle] = useState('Geotagged North Boundary Peg Photo');
  const [evidenceType, setEvidenceType] = useState<string>('GEOTAGGED_PHOTO');
  const [photoLat, setPhotoLat] = useState<number>(18.5208);
  const [photoLng, setPhotoLng] = useState<number>(73.8572);

  // Confirm Possession Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [possessionDate, setPossessionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [demarcationRemarks, setDemarcationRemarks] = useState<string>(
    'Joint field inspection conducted with Circle Inspector, Talathi, and NHAI PIU Pune. 6 reinforced boundary pillars pegged along outer alignment. All standing encumbrances cleared. Possession vested unconditionally under Section 38 RFCTLARR 2013.'
  );

  useEffect(() => {
    if (taskId) {
      loadTaskAndRecord(taskId);
    }
  }, [taskId]);

  const loadTaskAndRecord = async (tId: string) => {
    setLoading(true);
    setError(null);
    try {
      // 1. GET /api/v1/possession/tasks?assignedTo=me
      const currentTask = await possessionV2Service.getTaskById(tId);
      if (!currentTask) {
        setError(`Possession task "${tId}" not found.`);
        setLoading(false);
        return;
      }
      setTask(currentTask);

      // 2. GET /api/v1/possession/records/:recordId
      const possRecord = await possessionV2Service.getRecord(tId);
      if (possRecord) {
        setRecord(possRecord);
      } else {
        const fallbackRec = await possessionV2Service.getRecord('poss-rec-101');
        if (fallbackRec) setRecord(fallbackRec);
      }
    } catch (err: any) {
      console.error('Failed to load possession task details', err);
      setError(err?.message || 'Error retrieving possession record');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Action 1: Upload / Attach Geotagged Field Evidence
   * Calls: POST /api/v1/possession/records/:recordId/evidence
   * (Spec Line 300)
   */
  const handleUploadEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    setIsProcessing(true);
    try {
      const newEv = await possessionV2Service.uploadEvidence(record.id, {
        title: evidenceTitle,
        type: evidenceType,
        coordinates: { lat: photoLat, lng: photoLng },
      });

      setRecord((prev) =>
        prev
          ? {
              ...prev,
              evidenceItems: [newEv, ...(prev.evidenceItems || [])],
            }
          : null
      );
      setShowEvidenceModal(false);
      setActionSuccess(`✓ Geotagged evidence "${evidenceTitle}" successfully uploaded (GPS: ${photoLat}° N, ${photoLng}° E).`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      alert(err?.message || 'Failed to upload evidence');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Action 2: Direct Single-Step Possession Vesting Confirmation
   * Calls: POST /api/v1/possession/records/:recordId/complete
   * (Spec Line 303)
   * 
   * NO SECOND APPROVAL STEP: Execution immediately finalizes possession!
   */
  const handleConfirmPossessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    setIsProcessing(true);
    try {
      const completed = await possessionV2Service.completePossession(record.id, {
        possessionDate,
        remarks: demarcationRemarks,
      });

      setRecord(completed);
      setTask((prev) => (prev ? { ...prev, status: 'ACCEPTED', completedAt: new Date().toISOString() } : null));
      setShowConfirmModal(false);
      setActionSuccess('✓ Possession Formally Completed! Parcel title vested in Government under RFCTLARR Section 38 (No second approval required).');
      setTimeout(() => setActionSuccess(null), 5000);
    } catch (err: any) {
      alert(err?.message || 'Failed to complete possession');
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Reset demo state
   */
  const handleResetDemo = () => {
    possessionV2Service.resetDemoState();
    if (taskId) {
      loadTaskAndRecord(taskId);
    }
    setActionSuccess('↻ Demo state reset to initial baseline.');
    setTimeout(() => setActionSuccess(null), 3000);
  };

  if (loading) {
    return (
      <div className="poss-workspace" style={{ padding: '60px 0', textAlign: 'center' }}>
        <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
          Loading field demarcation task and cadastral possession record...
        </div>
      </div>
    );
  }

  if (error || !task || !record) {
    return (
      <div className="poss-workspace" style={{ padding: '40px 0' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '24px', color: '#991b1b' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Task Lookup Error</h2>
          <p style={{ margin: '0 0 16px 0', fontSize: '13px' }}>{error || 'Record or task could not be retrieved.'}</p>
          <Link to="/possession/dashboard" className="poss-btn poss-btn-outline">
            &larr; Back to Possession Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isPossessionTaken = record.status === 'POSSESSION_TAKEN' || record.status === 'COMPLETED';
  const hasEvidence = record.evidenceItems && record.evidenceItems.length > 0;

  return (
    <div className="poss-workspace">
      {/* Top Breadcrumb & Reset */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <Link
          to="/possession/dashboard"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569', textDecoration: 'none', fontWeight: 500 }}
        >
          <span>&larr;</span> Back to Possession Dashboard
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={handleResetDemo}
            className="poss-btn poss-btn-outline"
            style={{ fontSize: '11.5px', padding: '4px 10px' }}
            title="Reset to initial demo seed"
          >
            ↻ Reset Demo State
          </button>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Task ID: <code style={{ color: '#0f172a', fontWeight: 600 }}>{task.id}</code>
          </span>
        </div>
      </div>

      {/* SLAO / Tehsil Masthead */}
      <div className="poss-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <BhoomiLogo size={20} strokeWidth={2.4} />
            <span className="poss-tehsil-badge">
              Revenue Field Operations • {user?.authority || 'Tehsil Competent Authority'}
            </span>
            <span
              className={`poss-badge ${
                isPossessionTaken
                  ? 'poss-badge-taken'
                  : record.status === 'INSPECTION_SCHEDULED'
                  ? 'poss-badge-scheduled'
                  : record.status === 'DISPUTED'
                  ? 'poss-badge-disputed'
                  : 'poss-badge-pending'
              }`}
            >
              {isPossessionTaken ? 'POSSESSION COMPLETED' : record.status.replace('_', ' ')}
            </span>
          </div>
          <h1 className="poss-title">
            Direct Physical Possession Execution — Parcel {record.parcelId}
          </h1>
          <p className="poss-subtitle">
            {task.projectTitle} • Project Code: <strong style={{ color: '#0f172a' }}>{task.projectCode}</strong> • Demarcation Officer: {task.assignedOfficer.name}
          </p>
        </div>

        {/* Global Action Trigger Bar (Direct execution with NO second approval step) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!isPossessionTaken && (
            <>
              <button
                type="button"
                onClick={() => setShowEvidenceModal(true)}
                disabled={isProcessing}
                className="poss-btn poss-btn-outline"
                id="btn-upload-evidence"
              >
                📷 Upload Geotagged Photo / Evidence
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={isProcessing}
                className="poss-btn poss-btn-teal"
                id="btn-confirm-possession"
              >
                ✓ Confirm Demarcation &amp; Vest Possession (Sec 38)
              </button>
            </>
          )}

          {isPossessionTaken && (
            <span style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '6px', background: '#ccfbf1', color: '#115e59', fontWeight: 700, border: '1px solid #99f6e4' }}>
              ✓ Possession Completed &amp; Vested
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

      {/* Direct Execution Stepper: Open parcel -> perform possession -> upload evidence/photo -> confirm -> completed */}
      <div className="poss-stepper-container">
        <div className="poss-stepper">
          {/* Step 1: Open Parcel */}
          <div className="poss-step-item completed">
            <div className="poss-step-circle">①</div>
            <div className="poss-step-content">
              <span className="poss-step-title">Open Parcel</span>
              <span className="poss-step-sub">Cadastral Boundary</span>
            </div>
          </div>
          <div className="poss-step-line completed" />

          {/* Step 2: Perform Possession */}
          <div className={`poss-step-item ${record.demarcationDetails?.boundaryStonesPegged ? 'completed' : 'active'}`}>
            <div className="poss-step-circle">②</div>
            <div className="poss-step-content">
              <span className="poss-step-title">Demarcate Ground</span>
              <span className="poss-step-sub">Pillars &amp; Witness Pegging</span>
            </div>
          </div>
          <div className={`poss-step-line ${hasEvidence || isPossessionTaken ? 'completed' : ''}`} />

          {/* Step 3: Upload Evidence */}
          <div className={`poss-step-item ${hasEvidence ? 'completed' : 'active'}`}>
            <div className="poss-step-circle">③</div>
            <div className="poss-step-content">
              <span className="poss-step-title">Upload Evidence</span>
              <span className="poss-step-sub">Geotagged Photo &amp; Panchnama</span>
            </div>
          </div>
          <div className={`poss-step-line ${isPossessionTaken ? 'completed' : ''}`} />

          {/* Step 4: Confirm (No 2nd Approval) */}
          <div className={`poss-step-item ${isPossessionTaken ? 'completed' : 'active'}`}>
            <div className="poss-step-circle">④</div>
            <div className="poss-step-content">
              <span className="poss-step-title">Confirm Direct</span>
              <span className="poss-step-sub">No Second Approval</span>
            </div>
          </div>
          <div className={`poss-step-line ${isPossessionTaken ? 'completed' : ''}`} />

          {/* Step 5: Completed */}
          <div className={`poss-step-item ${isPossessionTaken ? 'completed' : ''}`}>
            <div className="poss-step-circle">⑤</div>
            <div className="poss-step-content">
              <span className="poss-step-title">Possession Completed</span>
              <span className="poss-step-sub">Vested in Government</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Cadastral Context & Field Execution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '20px', marginBottom: '24px' }}>
        {/* Left Column (8 cols): Cadastral Details & Ground Panchnama */}
        <div style={{ gridColumn: 'span 8', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Cadastral Parcel Passport */}
          <div className="poss-card" id="cadastral-passport">
            <div className="poss-card-header">
              <h2 className="poss-card-title">
                <span>📍 Cadastral Land Parcel Passport &amp; Perimeter Coordinates</span>
              </h2>
              <span style={{ fontSize: '11.5px', background: '#f1f5f9', color: '#475569', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                ULPIN: {record.parcelDetails?.ulpin || 'MH2708402A190084'}
              </span>
            </div>

            <div className="poss-attr-grid">
              <div>
                <div className="poss-attr-label">Khasra / Survey No</div>
                <div className="poss-attr-value mono">{record.parcelDetails?.khasraNumber || record.parcelId}</div>
              </div>
              <div>
                <div className="poss-attr-label">Village &amp; Taluka</div>
                <div className="poss-attr-value">{record.parcelDetails?.village || 'Haveli'}, {record.parcelDetails?.taluka || 'Haveli'}</div>
              </div>
              <div>
                <div className="poss-attr-label">District &amp; State</div>
                <div className="poss-attr-value">{record.parcelDetails?.district || 'Pune'}, {record.parcelDetails?.state || 'Maharashtra'}</div>
              </div>
              <div>
                <div className="poss-attr-label">Vested Land Area</div>
                <div className="poss-attr-value">{record.parcelDetails?.areaAcres || 2.45} Acres</div>
              </div>
              <div>
                <div className="poss-attr-label">Tenure Classification</div>
                <div className="poss-attr-value">{record.parcelDetails?.tenureType || 'Occupant Class I (Bhumiswami)'}</div>
              </div>
              <div>
                <div className="poss-attr-label">Boundary Pillars Pegged</div>
                <div className="poss-attr-value" style={{ color: '#0d9488', fontWeight: 600 }}>
                  ✓ {record.parcelDetails?.boundaryPegsCount || 6} Reinforced Concrete Pillars
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>GPS Cadastral Bounding Box: </span>
              <code style={{ color: '#0f172a', fontWeight: 600 }}>
                {record.parcelDetails?.boundaryCoordinates || '18.5204° N, 73.8567° E to 18.5218° N, 73.8582° E'}
              </code>
            </div>
          </div>

          {/* Field Demarcation & Witness Roster */}
          <div className="poss-card" id="demarcation-roster">
            <div className="poss-card-header">
              <h2 className="poss-card-title">
                <span>📋 Field Demarcation Inspection &amp; Panchnama Verification</span>
              </h2>
              <span style={{ fontSize: '11px', color: '#0d9488', fontWeight: 700 }}>
                RFCTLARR SECTION 38 STATUTORY VESTING
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px', marginBottom: '16px' }}>
              <div style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '14px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ color: '#0d9488', fontSize: '16px' }}>✓</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e' }}>Boundary Pegging Completed</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#115e59' }}>
                  Corner pillars embedded into ground with red reflective survey markers.
                </p>
              </div>

              <div style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '14px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ color: '#0d9488', fontSize: '16px' }}>✓</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e' }}>Unencumbered Site Affirmation</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#115e59' }}>
                  Zero unauthorized occupants, standing structures, or crop claims remaining.
                </p>
              </div>
            </div>

            {/* Revenue Witnesses List */}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '8px' }}>
                Joint Panchnama Signatory Witnesses (Section 38):
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(record.demarcationDetails?.revenueWitnesses || [
                  'Shri S. V. Kulkarni (Village Talathi, Haveli Saza)',
                  'Shri P. M. Jadhav (Circle Inspector, Uruli Circle)',
                  'Er. Rahul S. Mehta (NHAI PIU Pune Site Engineer)',
                  'Ramesh Balasaheb Shinde (Primary Khatedar / Former Title Holder)',
                ]).map((wit, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: '#f8fafc',
                      borderRadius: '6px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12.5px',
                    }}
                  >
                    <span style={{ color: '#1e293b', fontWeight: 500 }}>{wit}</span>
                    <span style={{ color: '#059669', fontWeight: 600, fontSize: '11px' }}>✓ Signature Verified</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Panchnama Remarks */}
            <div style={{ marginTop: '16px' }}>
              <div className="poss-attr-label">Panchnama Field Notes &amp; Statutory Remarks</div>
              <p style={{ margin: 0, fontSize: '13px', color: '#334155', lineHeight: 1.6, background: '#f8fafc', padding: '12px 16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {record.remarks || 'Joint field panchnama executed. Ready for statutory vesting sign-off.'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Geotagged Evidence & Statutory Certificate */}
        <div style={{ gridColumn: 'span 4', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Statutory Section 38 Vesting Seal */}
          {isPossessionTaken ? (
            <div className="poss-vesting-seal">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px' }}>🏛️</span>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#14532d' }}>
                    Sovereign Land Vesting Certificate
                  </div>
                  <div style={{ fontSize: '11px', color: '#166534' }}>
                    Issued under RFCTLARR Act 2013 • Section 38
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '12.5px', color: '#15803d', lineHeight: 1.5, marginBottom: '14px' }}>
                This certifies that physical possession of Parcel <strong>{record.parcelId}</strong> has been taken free from all encumbrances and title is unconditionally vested in the Government of Maharashtra for NHAI Project <strong>{task.projectCode}</strong>.
              </div>

              <div style={{ borderTop: '1px dashed #86efac', paddingTop: '10px', fontSize: '11.5px', color: '#166534' }}>
                <div>Demarcation Date: <strong>{record.possessionDate || '2026-09-12'}</strong></div>
                <div>Authorized Officer: <strong>{task.assignedOfficer.name}</strong></div>
                <div style={{ marginTop: '4px', fontWeight: 700, color: '#14532d' }}>
                  ✓ Status: Possession Completed (Final &amp; Binding)
                </div>
              </div>
            </div>
          ) : (
            <div className="poss-direct-banner">
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f766e', marginBottom: '2px' }}>
                  Direct Single-Step Execution
                </div>
                <div style={{ fontSize: '12px', color: '#115e59', lineHeight: 1.4 }}>
                  No second approval step required. Submitting the demarcation details and evidence immediately marks possession completed.
                </div>
              </div>
            </div>
          )}

          {/* Geotagged Field Evidence Gallery */}
          <div className="poss-card" id="geotagged-evidence-gallery">
            <div className="poss-card-header">
              <h2 className="poss-card-title">
                <span>📷 Geotagged Field Evidence</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowEvidenceModal(true)}
                className="poss-btn poss-btn-outline"
                style={{ padding: '3px 8px', fontSize: '11px' }}
              >
                + Add Photo
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(record.evidenceItems && record.evidenceItems.length > 0 ? record.evidenceItems : []).map((ev) => (
                <div key={ev.id} className="poss-geotag-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span className="poss-geotag-badge">
                      {ev.type.replace('_', ' ')}
                    </span>
                    <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>
                      {ev.size || '2.4 MB'}
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', marginBottom: '6px' }}>
                    {ev.title}
                  </div>

                  {ev.coordinates && (
                    <div style={{ fontSize: '11px', color: '#5eead4', fontFamily: 'monospace', marginBottom: '4px' }}>
                      📍 GPS: {ev.coordinates.lat}° N, {ev.coordinates.lng}° E
                    </div>
                  )}

                  <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                    Captured: {new Date(ev.uploadedAt).toLocaleDateString()} by {ev.capturedBy || task.assignedOfficer.name}
                  </div>
                </div>
              ))}

              {(!record.evidenceItems || record.evidenceItems.length === 0) && (
                <div style={{ textAlign: 'center', padding: '24px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>📷</div>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#334155' }}>No Geotagged Photos Attached</div>
                  <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', marginBottom: '10px' }}>
                    Attach boundary pegging photos before statutory vesting sign-off.
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEvidenceModal(true)}
                    className="poss-btn poss-btn-teal"
                    style={{ fontSize: '11.5px', padding: '5px 12px' }}
                  >
                    + Attach Geotagged Photo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Geotagged Photo Upload Modal (POST /api/v1/possession/records/:id/evidence) */}
      {showEvidenceModal && (
        <div className="poss-modal-overlay">
          <div className="poss-modal-card">
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              Upload Geotagged Field Evidence
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0', lineHeight: 1.5 }}>
              Attach boundary demarcation photos with GPS coordinates for parcel <strong>{record.parcelId}</strong>.
            </p>

            <form onSubmit={handleUploadEvidenceSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Evidence Title / Photo Name
                  </label>
                  <input
                    type="text"
                    required
                    value={evidenceTitle}
                    onChange={(e) => setEvidenceTitle(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Evidence Type
                  </label>
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  >
                    <option value="GEOTAGGED_PHOTO">Geotagged Boundary Photo</option>
                    <option value="PANCHNAMA">Joint Panchnama Document</option>
                    <option value="DEMARCATION_SKETCH">Demarcation Sketch / Pillar Peg Map</option>
                    <option value="VESTING_CERTIFICATE">Section 38 Statutory Vesting Certificate</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      GPS Latitude (° N)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={photoLat}
                      onChange={(e) => setPhotoLat(Number(e.target.value))}
                      style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                      GPS Longitude (° E)
                    </label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={photoLng}
                      onChange={(e) => setPhotoLng(Number(e.target.value))}
                      style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowEvidenceModal(false)}
                  className="poss-btn poss-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="poss-btn poss-btn-teal"
                >
                  {isProcessing ? 'Uploading Evidence...' : 'Upload Geotagged Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Possession Modal (POST /api/v1/possession/records/:id/complete) */}
      {showConfirmModal && (
        <div className="poss-modal-overlay">
          <div className="poss-modal-card">
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '0 0 8px 0' }}>
              Confirm Physical Possession &amp; Section 38 Vesting
            </h3>
            <div style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '10px 14px', borderRadius: '8px', marginBottom: '16px', fontSize: '12.5px', color: '#0f766e' }}>
              ⚡ <strong>Direct Execution:</strong> This action will vest parcel <strong>{record.parcelId}</strong> unconditionally in the Government. No secondary approval step is required.
            </div>

            <form onSubmit={handleConfirmPossessionSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                    Demarcation &amp; Vesting Date
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
                    Final Panchnama Remarks &amp; Site Clearance Notes
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={demarcationRemarks}
                    onChange={(e) => setDemarcationRemarks(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', fontSize: '13px', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="poss-btn poss-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="poss-btn poss-btn-teal"
                >
                  {isProcessing ? 'Vesting Title in Government...' : 'Confirm & Complete Possession'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PossessionTaskDetailPage;
