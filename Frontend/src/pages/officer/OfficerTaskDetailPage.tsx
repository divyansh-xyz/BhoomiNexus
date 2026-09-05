import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { OfficerService, type TaskDetail } from '../../services/OfficerService';
import BhoomiLogo from '../../components/common/BhoomiLogo';

export const OfficerTaskDetailPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadDocId, setActiveUploadDocId] = useState<string | null>(null);

  useEffect(() => {
    if (taskId) {
      loadTaskDetail(taskId);
    }
  }, [taskId]);

  const loadTaskDetail = async (id: string) => {
    setLoading(true);
    try {
      const data = await OfficerService.getTaskDetail(id);
      setTask(data);
    } catch (err) {
      console.error('Failed to load task detail', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!task) return;
    setSubmitting(true);
    try {
      await OfficerService.acceptTask(task.id);
      navigate('/officer/dashboard');
    } catch (err) {
      console.error('Failed to accept task', err);
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!task || !rejectReason.trim()) return;
    setSubmitting(true);
    try {
      await OfficerService.rejectTask(task.id, rejectReason);
      setShowRejectModal(false);
      navigate('/officer/dashboard');
    } catch (err) {
      console.error('Failed to reject task', err);
      setSubmitting(false);
    }
  };
  
  const handleUploadClick = (docId: string) => {
    setActiveUploadDocId(docId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeUploadDocId || !task) return;
    
    const file = e.target.files[0];
    setUploadingDocId(activeUploadDocId);
    
    try {
      await OfficerService.uploadEvidence(task.id, file);
      
      const updatedDocs = task.requiredDocuments.map(doc => 
        doc.id === activeUploadDocId ? { ...doc, status: 'UPLOADED' as const } : doc
      );
      
      setTask({ ...task, requiredDocuments: updatedDocs });
    } catch (err) {
      console.error('Failed to upload file', err);
    } finally {
      setUploadingDocId(null);
      setActiveUploadDocId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="boss-page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div className="boss-loading-ledger" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <BhoomiLogo size={40} strokeWidth={2.4} />
          <span style={{ fontSize: '18px', fontWeight: 500, color: '#475569' }}>Accessing Task Dossier...</span>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="boss-page-container" style={{ padding: '40px' }}>
        <div className="boss-empty-ledger" style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '40px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', textAlign: 'center', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '24px', color: '#0f172a', marginBottom: '12px' }}>Task Not Found</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>The specified task ID does not exist or you do not have permission.</p>
          <Link to="/officer/dashboard" className="btn-cta-outline" style={{ padding: '10px 20px', borderRadius: '6px' }}>&larr; Return to Dashboard</Link>
        </div>
      </div>
    );
  }

  const isReadyToAccept = !task.requiredDocuments.some(d => d.status === 'MISSING');

  // Premium Light-Theme Card Style
  const premiumCardStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.03), 0 1px 3px rgba(0, 0, 0, 0.02)',
    border: '1px solid #e2e8f0',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  };

  const cardHeaderStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 600,
    color: '#0f172a',
    letterSpacing: '-0.01em',
    paddingBottom: '16px',
    marginBottom: '20px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  return (
    <div className="boss-page-container" style={{ padding: '0 24px 40px 24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Hidden file input for uploads */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        onChange={handleFileChange} 
      />

      <div style={{ marginBottom: '16px', marginTop: '16px' }}>
        <Link to="/officer/dashboard" style={{ color: '#64748b', textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
          &larr; Back to Dashboard
        </Link>
      </div>

      {/* Premium Dark Blue Header */}
      <header style={{ 
        background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 100%)', 
        borderRadius: '20px', 
        padding: '32px 40px', 
        color: '#ffffff',
        marginBottom: '32px',
        boxShadow: '0 10px 30px rgba(30, 58, 138, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle background accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #60a5fa, #34d399)' }} />
        
        <div style={{ flex: 1, zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ 
              background: 'rgba(255,255,255,0.15)', 
              color: '#ffffff',
              padding: '6px 12px', 
              borderRadius: '20px', 
              fontSize: '12px', 
              fontWeight: 700, 
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}>
              Task Docket &bull; {task.id}
            </span>
            <span className={`status-pill pill-${task.status.toLowerCase()}`} style={{ 
              padding: '6px 12px', 
              fontSize: '12px', 
              fontWeight: 700, 
              borderRadius: '20px', 
              textTransform: 'uppercase' 
            }}>
              {task.status}
            </span>
          </div>
          <h1 style={{ fontSize: '36px', fontWeight: 700, margin: '0 0 12px 0', letterSpacing: '-0.02em', lineHeight: '1.2' }}>
            {task.stageName}
          </h1>
          <p style={{ margin: 0, fontSize: '15px', color: '#bfdbfe', display: 'flex', alignItems: 'center', gap: '8px' }}>
             Project: <strong style={{ color: '#ffffff' }}>{task.projectName}</strong>
             <span style={{ opacity: 0.5 }}>|</span>
             <span style={{ fontFamily: 'monospace', color: '#93c5fd' }}>{task.projectId}</span>
          </p>
        </div>

        <div style={{ 
          background: 'rgba(255,255,255,0.1)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)', 
          borderRadius: '16px', 
          padding: '20px',
          minWidth: '240px',
          zIndex: 1
        }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#bfdbfe', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>SLA Target Date</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>{task.dueDate}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#bfdbfe', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>Jurisdiction</div>
            <div style={{ fontSize: '15px', fontWeight: 500, color: '#ffffff' }}>{task.district}, {task.state}</div>
          </div>
        </div>
      </header>

      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>
        
        {/* Left Column */}
        <div style={{ flex: '1.5', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Context Card */}
          <div style={premiumCardStyle}>
            <h4 style={cardHeaderStyle}>
              <span style={{ color: '#3b82f6' }}>&#9432;</span> Previous Stage Context
            </h4>
            <div style={{ 
              backgroundColor: '#eff6ff', 
              borderLeft: '4px solid #3b82f6', 
              padding: '16px 20px', 
              borderRadius: '0 8px 8px 0',
              color: '#1e3a8a',
              fontSize: '15px',
              lineHeight: '1.6'
            }}>
              <em style={{ fontStyle: 'italic' }}>"{task.previousStageNotes}"</em>
            </div>
          </div>

          {/* Parcels Card */}
          <div style={premiumCardStyle}>
            <h4 style={cardHeaderStyle}>
              <span style={{ color: '#10b981' }}>&#9638;</span> Relevant Cadastral Parcels ({task.relevantParcels.length})
            </h4>
            
            <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc' }}>
                    <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>Parcel ID</th>
                    <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>Survey No.</th>
                    <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>Village</th>
                    <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #e2e8f0', textTransform: 'uppercase' }}>Area</th>
                  </tr>
                </thead>
                <tbody>
                  {task.relevantParcels.map((parcel, idx) => (
                    <tr key={parcel.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafaf9', transition: 'background-color 0.2s' }}>
                      <td style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', fontFamily: 'monospace', color: '#0f172a', fontWeight: 500 }}>{parcel.id}</td>
                      <td style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#334155' }}>{parcel.surveyNumber}</td>
                      <td style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', color: '#475569' }}>{parcel.village}</td>
                      <td style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', color: '#475569', fontWeight: 500 }}>{parcel.area}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Column */}
        <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '32px' }}>
          
          {/* Documents Card */}
          <div style={premiumCardStyle}>
            <h4 style={cardHeaderStyle}>
              <span style={{ color: '#8b5cf6' }}>&#128194;</span> Evidence &amp; Documents
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {task.requiredDocuments.map(doc => {
                const isMissing = doc.status === 'MISSING';
                const isUploading = uploadingDocId === doc.id;
                
                return (
                  <div key={doc.id} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    padding: '20px', 
                    borderRadius: '12px', 
                    backgroundColor: isMissing ? '#fffbeb' : '#f0fdf4',
                    border: `1px solid ${isMissing ? '#fde68a' : '#bbf7d0'}`,
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>{doc.name}</span>
                      <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>{doc.type}</span>
                    </div>
                    {isMissing ? (
                      <button 
                        onClick={() => handleUploadClick(doc.id)}
                        disabled={isUploading}
                        style={{ 
                          fontSize: '13px', 
                          fontWeight: 600,
                          padding: '8px 16px', 
                          borderRadius: '20px',
                          backgroundColor: '#f59e0b',
                          color: '#ffffff',
                          border: 'none',
                          cursor: isUploading ? 'wait' : 'pointer',
                          boxShadow: '0 4px 10px rgba(245, 158, 11, 0.2)',
                          transition: 'transform 0.1s'
                        }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        {isUploading ? 'Uploading...' : 'Upload File'}
                      </button>
                    ) : (
                      <span style={{ 
                        backgroundColor: '#22c55e', 
                        color: '#ffffff', 
                        fontSize: '11px', 
                        fontWeight: 700,
                        letterSpacing: '0.05em',
                        padding: '6px 12px', 
                        borderRadius: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        ✓ {doc.status}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Card */}
          <div style={{
            ...premiumCardStyle,
            background: 'linear-gradient(to bottom, #ffffff, #f8fafc)',
            borderTop: '4px solid #0f172a'
          }}>
            <h4 style={{ ...cardHeaderStyle, borderBottom: 'none', marginBottom: '8px' }}>
              Stage Affirmation
            </h4>
            <p style={{ fontSize: '14px', color: '#475569', marginBottom: '24px', lineHeight: '1.6' }}>
              By accepting this stage, you digitally affirm the verification of physical and digital records per the statutory requirements of the RFCTLARR Act.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button 
                onClick={handleAccept}
                disabled={submitting || !isReadyToAccept}
                style={{ 
                  width: '100%', 
                  padding: '16px', 
                  borderRadius: '12px',
                  backgroundColor: (!submitting && isReadyToAccept) ? '#1e3a8a' : '#cbd5e1', 
                  color: '#ffffff', 
                  fontSize: '15px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: (!submitting && isReadyToAccept) ? 'pointer' : 'not-allowed',
                  boxShadow: (!submitting && isReadyToAccept) ? '0 10px 20px rgba(30, 58, 138, 0.2)' : 'none',
                  transition: 'all 0.2s',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {submitting ? (
                  <>Processing...</>
                ) : (
                  <>✓ Affirm &amp; Accept Stage</>
                )}
              </button>
              
              <button 
                onClick={() => setShowRejectModal(true)}
                disabled={submitting}
                style={{ 
                  width: '100%', 
                  padding: '16px', 
                  borderRadius: '12px',
                  backgroundColor: 'transparent',
                  color: '#ef4444', 
                  fontSize: '15px',
                  fontWeight: 600,
                  border: '1px solid #fca5a5',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={e => !submitting && (e.currentTarget.style.backgroundColor = '#fef2f2')}
                onMouseOut={e => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Reject to Proponent
              </button>
            </div>
            
            {!isReadyToAccept && (
              <div style={{ 
                marginTop: '16px', 
                padding: '12px', 
                backgroundColor: '#fef2f2', 
                borderRadius: '8px',
                border: '1px solid #fca5a5',
                color: '#b91c1c', 
                fontSize: '13px', 
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}>
                <span style={{ fontSize: '16px' }}>&#9888;</span> Cannot affirm: Missing required evidence.
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Premium Rejection Modal */}
      {showRejectModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(15, 23, 42, 0.6)', 
          backdropFilter: 'blur(4px)',
          zIndex: 9999, 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center' 
        }}>
          <div style={{ 
            backgroundColor: '#ffffff', 
            borderRadius: '20px', 
            padding: '32px', 
            width: '520px', 
            maxWidth: '90%', 
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' 
          }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>
              Reject Workflow Stage
            </h3>
            <p style={{ fontSize: '15px', color: '#475569', marginBottom: '24px', lineHeight: '1.5' }}>
              Please provide a clear statutory reason for rejection. This will be sent back to the Requesting Authority for correction.
            </p>
            
            <textarea 
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Missing signature on physical scan of Form B..."
              style={{ 
                width: '100%', 
                boxSizing: 'border-box', 
                minHeight: '120px', 
                backgroundColor: '#f8fafc', 
                border: '1px solid #cbd5e1', 
                color: '#0f172a', 
                padding: '16px', 
                borderRadius: '12px', 
                marginBottom: '24px', 
                fontFamily: "'Inter', sans-serif",
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#3b82f6'}
              onBlur={e => e.currentTarget.style.borderColor = '#cbd5e1'}
            />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
              <button 
                onClick={() => setShowRejectModal(false)}
                disabled={submitting}
                style={{ 
                  padding: '12px 24px',
                  borderRadius: '10px',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleReject}
                disabled={!rejectReason.trim() || submitting}
                style={{ 
                  padding: '12px 24px',
                  borderRadius: '10px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontWeight: 600,
                  border: 'none',
                  cursor: (!rejectReason.trim() || submitting) ? 'not-allowed' : 'pointer',
                  opacity: (!rejectReason.trim() || submitting) ? 0.6 : 1,
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
                }}
              >
                {submitting ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficerTaskDetailPage;
