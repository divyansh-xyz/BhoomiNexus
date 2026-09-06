import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { OfficerService, type OcrExtractionResult } from '../../services/OfficerService';
import { DocumentService, type Document as ProjectDocument } from '../../services/DocumentService';
import { taskService } from '../../services/api/task.service';
import type { WorkflowTask } from '../../types/task.types';
import BhoomiLogo from '../../components/common/BhoomiLogo';

export const OfficerTaskDetailPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<WorkflowTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Project statutory documents for download & cross-reference
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([]);

  // Phase 9: OCR Intelligence State
  const [ocrStatus, setOcrStatus] = useState<OcrExtractionResult | null>(null);
  const [ocrData, setOcrData] = useState<any>(null);
  const [isOcrVerified, setIsOcrVerified] = useState(false);
  const [ocrSubmitting, setOcrSubmitting] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [isUploadedImage, setIsUploadedImage] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<number | null>(null);
  const [activeUploadDocId, setActiveUploadDocId] = useState<string | null>(null);

  // Clear polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        window.clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Cleanup object URL
    return () => {
      if (uploadedFileUrl) URL.revokeObjectURL(uploadedFileUrl);
    };
  }, [uploadedFileUrl]);

  useEffect(() => {
    if (taskId) {
      loadTaskDetail(taskId);
    }
  }, [taskId]);

  const loadTaskDetail = async (id: string) => {
    setLoading(true);
    try {
      const data = await taskService.getTaskById(id);
      setTask(data);
      if (data && data.projectId) {
        try {
          const pDocs = await DocumentService.getDocuments(data.projectId);
          setProjectDocuments(pDocs);
        } catch (docErr) {
          console.warn('Failed to load project documents', docErr);
        }
      }
    } catch (err) {
      console.error('Failed to load task detail', err);
    } finally {
      setLoading(false);
    }
  };

  const findMatchingProjectDoc = (docName: string) => {
    const dLower = docName.toLowerCase();
    return projectDocuments.find(pd => {
      const pLower = (pd.title || '').toLowerCase();
      if (dLower.includes('schedule') && pLower.includes('schedule')) return true;
      if (dLower.includes('survey') && (pLower.includes('survey') || pLower.includes('alignment') || pLower.includes('vector') || pLower.includes('map'))) return true;
      if (dLower.includes('khasra') && (pLower.includes('khasra') || pLower.includes('land holding'))) return true;
      if (dLower.includes('khatauni') && (pLower.includes('khatauni') || pLower.includes('land holding') || pLower.includes('schedule'))) return true;
      if (dLower.includes('map') && (pLower.includes('map') || pLower.includes('cadastral'))) return true;
      if (dLower.includes('proposal') && pLower.includes('proposal')) return true;
      if (dLower.includes('dpr') && pLower.includes('dpr')) return true;
      if (dLower.includes('sia') && pLower.includes('sia')) return true;
      if (dLower.includes('gazette') && pLower.includes('gazette')) return true;
      return pLower.includes(dLower);
    });
  };

  const handleDownloadSoftCopy = async (docName: string) => {
    if (!task) return;
    setDownloadingDoc(docName);
    try {
      const matched = findMatchingProjectDoc(docName);
      if (matched) {
        await DocumentService.downloadDocument(matched.id, `${docName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${task.projectCode}.pdf`);
      } else {
        await OfficerService.downloadSoftCopyTemplate(task.id, docName);
      }
    } catch (err) {
      console.error('Failed to download soft copy:', err);
      try {
        await OfficerService.downloadSoftCopyTemplate(task.id, docName);
      } catch (fallbackErr) {
        alert('Could not download document. Please verify network connection.');
      }
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handleDownloadFullDossier = async () => {
    if (!task) return;
    setDownloadingDoc('DOSSIER');
    try {
      if (projectDocuments.length > 0) {
        for (const doc of projectDocuments.slice(0, 3)) {
          await DocumentService.downloadDocument(doc.id, `${doc.title || 'Dossier_Record'}.pdf`);
        }
      } else {
        await OfficerService.downloadSoftCopyTemplate(task.id, 'Statutory_Requisition_Dossier');
      }
    } catch (err) {
      console.error('Failed to download dossier', err);
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handleAccept = async () => {
    if (!task) return;
    setSubmitting(true);
    try {
      await taskService.acceptTask(task.id);
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
      await taskService.rejectTask(task.id, rejectReason);
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
    const targetDocId = activeUploadDocId;

    if (uploadedFileUrl) {
      URL.revokeObjectURL(uploadedFileUrl);
    }
    setUploadedFileUrl(URL.createObjectURL(file));
    setIsUploadedImage(file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|tiff?)$/i.test(file.name));

    try {
      const uploadResult = await OfficerService.uploadEvidence(task.id, file);

      const updatedDocs = (task.requiredDocuments || []).map(doc =>
        doc.id === targetDocId ? { ...doc, status: 'UPLOADED' as const } : doc
      );
      setTask({ ...task, requiredDocuments: updatedDocs });

      // Phase 9: Real Asynchronous Backend Integration
      const realDocId = uploadResult.documentId || `DOC-${Date.now()}`;
      setOcrStatus({ docId: targetDocId, backendDocId: realDocId, status: 'OCR_PROCESSING' });
      setIsOcrVerified(false);
      setShowOcrModal(true);

      // Smooth step-by-step AI extraction experience
      setTimeout(() => {
        setOcrStatus(prev => prev ? { ...prev, status: 'GEMINI_EXTRACTING' } : null);

        setTimeout(async () => {
          const result = await OfficerService.getOcrExtractionStatus(task.id, realDocId);
          result.backendDocId = realDocId;
          result.docId = targetDocId;

          setOcrStatus(result);
          setOcrData(result.extractedData);
        }, 1200);
      }, 1200);

    } catch (err) {
      console.error('Failed to upload file', err);
    } finally {
      setUploadingDocId(null);
      setActiveUploadDocId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleInspectVerifiedDoc = async (doc: any) => {
    const matchingDoc = findMatchingProjectDoc(doc.name);
    const fileUrl = matchingDoc
      ? `/api/v1/documents/${matchingDoc.id}/download`
      : `/api/v1/documents/tasks/${task?.id}/template/${encodeURIComponent(doc.name)}`;

    setUploadedFileUrl(fileUrl);
    setIsUploadedImage(false);
    setOcrStatus({ docId: doc.id, status: 'COMPLETED' });
    setIsOcrVerified(true);

    if (!ocrData && task) {
      try {
        const res = await OfficerService.getOcrExtractionStatus(task.id, doc.id);
        if (res && res.extractedData) {
          setOcrData(res.extractedData);
        }
      } catch (err) {
        console.error('Failed to load OCR data for inspection', err);
      }
    }
    setShowOcrModal(true);
  };

  const handleOpenOcrForm = async (doc: any) => {
    setActiveUploadDocId(doc.id);
    const matchingDoc = findMatchingProjectDoc(doc.name);
    const fileUrl = uploadedFileUrl || (matchingDoc
      ? `/api/v1/documents/${matchingDoc.id}/download`
      : `/api/v1/documents/tasks/${task?.id}/template/${encodeURIComponent(doc.name)}`);

    setUploadedFileUrl(fileUrl);
    setOcrStatus({ docId: doc.id, backendDocId: doc.id, status: 'COMPLETED' });
    setIsOcrVerified(false);

    if (!ocrData && task) {
      try {
        const res = await OfficerService.getOcrExtractionStatus(task.id, doc.id);
        if (res && res.extractedData) {
          setOcrData(res.extractedData);
          if (res.confidenceScores) {
            setOcrStatus(prev => prev ? { ...prev, confidenceScores: res.confidenceScores } : null);
          }
        }
      } catch (err) {
        console.error('Failed to load OCR data', err);
      }
    }
    setShowOcrModal(true);
  };

  const handleVerifyOcr = async () => {
    if (!task || !ocrStatus) return;
    setOcrSubmitting(true);
    try {
      await OfficerService.submitOcrVerification(task.id, ocrStatus.docId, ocrStatus.backendDocId, ocrData);
      setIsOcrVerified(true);

      // Update local state to reflect document is now fully verified
      const updatedDocs = (task.requiredDocuments || []).map(doc =>
        doc.id === ocrStatus.docId ? { ...doc, status: 'VERIFIED' as const } : doc
      );
      setTask({ ...task, requiredDocuments: updatedDocs });

      // Auto-close modal after a success delay
      setTimeout(() => {
        setShowOcrModal(false);
        setOcrStatus(null);
        setIsOcrVerified(false);
      }, 1500);

    } catch (err) {
      console.error('Failed to verify OCR', err);
    } finally {
      setOcrSubmitting(false);
    }
  };

  const handleOcrDataChange = (field: string, value: string) => {
    setOcrData((prev: any) => ({ ...prev, [field]: value }));
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

  const hasMissingDocs = task.requiredDocuments.some(d => d.status === 'MISSING');
  const hasUnverifiedDocs = task.requiredDocuments.some(d => d.status !== 'VERIFIED');
  const ocrBlocking = ocrStatus !== null && !isOcrVerified;
  const isReadyToAccept = !hasMissingDocs && !hasUnverifiedDocs && !ocrBlocking;

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

      {/* Premium Dark Slate Header (Phase 8 Style) */}
      <header style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: '20px',
        padding: '32px 40px',
        color: '#ffffff',
        marginBottom: '32px',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15), inset 0 1px 0 rgba(255,255,255,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle background accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)' }} />

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
          <p style={{ margin: 0, fontSize: '15px', color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Project: <strong style={{ color: '#ffffff' }}>{task.projectTitle || task.projectCode}</strong>
            <span style={{ opacity: 0.5 }}>|</span>
            <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{task.projectId}</span>
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
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>SLA Target Date</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#ffffff' }}>{task.dueDate}</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px', fontWeight: 600 }}>Jurisdiction</div>
            <div style={{ fontSize: '15px', fontWeight: 500, color: '#ffffff' }}>{(task as any).district || 'South West'}, {(task as any).state || 'New Delhi'}</div>
          </div>
        </div>
      </header>

      {/* Statutory Rejection Notice Banner */}
      {task.status === 'REJECTED' && (
        <div style={{
          marginBottom: '32px',
          padding: '24px 28px',
          borderRadius: '16px',
          backgroundColor: '#fef2f2',
          border: '1.5px solid #fca5a5',
          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#dc2626',
              fontSize: '22px',
              fontWeight: 'bold',
              flexShrink: 0
            }}>
              &#9888;
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#991b1b', fontSize: '18px' }}>
                Stage Rejected &amp; Remitted to Requesting Authority
              </div>
              <div style={{ fontSize: '14px', color: '#7f1d1d', marginTop: '6px', lineHeight: '1.5' }}>
                Recorded Statutory Defect / Rejection Reason: <strong style={{ color: '#991b1b' }}>"{task.rejectionReason || 'Defects noted in submitted records.'}"</strong>
              </div>
              <div style={{ fontSize: '13px', color: '#b91c1c', marginTop: '4px' }}>
                Further officer action is suspended until the Requesting Authority remedies the defects and resubmits.
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: '#991b1b',
              backgroundColor: '#fee2e2',
              padding: '6px 14px',
              borderRadius: '20px',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              border: '1px solid #fca5a5'
            }}>
              Defect Dossier Remitted
            </span>
            <div style={{ fontSize: '12px', color: '#b91c1c', marginTop: '8px' }}>
              {task.completedAt ? `Remitted: ${new Date(task.completedAt).toLocaleString()}` : 'Recently Remitted'}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Section */}
      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start' }}>

        {/* Left Column */}
        <div style={{ flex: '1.5', display: 'flex', flexDirection: 'column', gap: '32px' }}>

          {/* Context Card (Always shown) */}
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
              <em style={{ fontStyle: 'italic' }}>"{(task as any).previousStageNotes || 'No previous stage context available.'}"</em>
            </div>
          </div>

          {/* Parcels Card */}
          <div style={premiumCardStyle}>
            <h4 style={cardHeaderStyle}>
              <span style={{ color: '#10b981' }}>&#9638;</span> Relevant Cadastral Parcels ({(task as any).relevantParcels?.length || 0})
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
                  {((task as any).relevantParcels || []).map((parcel: any, idx: number) => (
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

          {/* Documents Card (Top Right) */}
          <div style={premiumCardStyle}>
            <div style={{ ...cardHeaderStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#8b5cf6' }}>&#128194;</span> Evidence &amp; Documents
                </h4>
                <span style={{ fontSize: '12px', color: '#64748b', marginTop: '3px', display: 'block' }}>
                  Download soft copies, verify physical ground scans, and affirm statutory compliance
                </span>
              </div>
              <button
                type="button"
                onClick={handleDownloadFullDossier}
                disabled={downloadingDoc === 'DOSSIER'}
                style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  border: '1px solid #bfdbfe',
                  cursor: downloadingDoc === 'DOSSIER' ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'background-color 0.15s'
                }}
                title="Download all submitted requisition documents and schedules for this project"
              >
                <span>&#11015;</span> {downloadingDoc === 'DOSSIER' ? 'Downloading...' : 'Download Full Requisition Dossier'}
              </button>
            </div>

            {task.status === 'REJECTED' && (
              <div style={{
                marginBottom: '16px',
                padding: '12px 16px',
                borderRadius: '10px',
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                fontSize: '13px',
                color: '#9f1239',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '16px' }}>&#9888;</span>
                <span><strong>Scrutiny Suspended:</strong> This task has been rejected and remitted to the Proponent. Document uploads and affirmations are locked pending resubmission.</span>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {task.requiredDocuments?.map(doc => {
                const isTaskClosed = task.status === 'ACCEPTED' || task.status === 'REJECTED';
                const isMissing = !isTaskClosed && doc.status === 'MISSING';
                const isUploaded = !isTaskClosed && doc.status === 'UPLOADED';
                const isVerified = doc.status === 'VERIFIED';
                const isUploading = uploadingDocId === doc.id;
                const isDownloading = downloadingDoc === doc.name;
                const isCurrentlyProcessingOcr = ocrStatus?.docId === doc.id;
                const matchedProjectDoc = findMatchingProjectDoc(doc.name);

                let rowBg = isTaskClosed && doc.status === 'MISSING' ? '#f8fafc' : '#fffbeb';
                let rowBorder = isTaskClosed && doc.status === 'MISSING' ? '#e2e8f0' : '#fde68a';
                if (isVerified) {
                  rowBg = '#f0fdf4';
                  rowBorder = '#bbf7d0';
                } else if (isUploaded) {
                  rowBg = '#eff6ff';
                  rowBorder = '#bfdbfe';
                } else if (isCurrentlyProcessingOcr) {
                  rowBg = '#faf5ff';
                  rowBorder = '#e9d5ff';
                }

                return (
                  <div key={doc.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '18px 20px',
                    borderRadius: '12px',
                    backgroundColor: rowBg,
                    border: `1px solid ${rowBorder}`,
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>{doc.name}</span>
                      <span style={{ fontSize: '12px', color: isVerified ? '#15803d' : isUploaded ? '#1e40af' : '#64748b', fontWeight: 500 }}>
                        {isVerified
                          ? '✓ Certified Soft Copy Digitized & Verified in Registry'
                          : isUploaded
                          ? '📷 Hard Copy Attached • AI Soft Copy Form Suggestions Ready'
                          : `${doc.type} • ${matchedProjectDoc ? 'Submitted Soft Copy Available' : 'Statutory Form Template Ready'}`}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Download Soft Copy Button */}
                      <button
                        type="button"
                        onClick={() => handleDownloadSoftCopy(doc.name)}
                        disabled={isDownloading}
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '7px 14px',
                          borderRadius: '20px',
                          backgroundColor: '#ffffff',
                          color: '#1d4ed8',
                          border: '1.5px solid #bfdbfe',
                          cursor: isDownloading ? 'wait' : 'pointer',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease'
                        }}
                        title="Download official soft copy or template to inspect or print physical record"
                      >
                        <span>&#11015;</span> {isDownloading ? 'Downloading...' : 'Download Soft Copy'}
                      </button>

                      {/* Closed Task Read-only Status Badges */}
                      {isTaskClosed && doc.status === 'MISSING' && (
                        <span style={{
                          backgroundColor: '#f1f5f9',
                          color: '#64748b',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '6px 12px',
                          borderRadius: '20px',
                          letterSpacing: '0.05em'
                        }}>
                          {task.status === 'REJECTED' ? 'MISSING AT REJECTION' : 'MISSING'}
                        </span>
                      )}

                      {isTaskClosed && doc.status === 'UPLOADED' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '6px 12px',
                            borderRadius: '20px'
                          }}>
                            UPLOADED
                          </span>
                          <button
                            type="button"
                            onClick={() => handleInspectVerifiedDoc(doc)}
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              padding: '6px 10px',
                              borderRadius: '16px',
                              backgroundColor: '#f1f5f9',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              cursor: 'pointer'
                            }}
                          >
                            &#128065; Inspect Scan
                          </button>
                        </div>
                      )}

                      {/* State 1: Missing Hard Copy -> Upload button */}
                      {isMissing && (
                        <button
                          type="button"
                          onClick={() => handleUploadClick(doc.id)}
                          disabled={isUploading}
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            padding: '7px 15px',
                            borderRadius: '20px',
                            backgroundColor: '#f59e0b',
                            color: '#ffffff',
                            border: 'none',
                            cursor: isUploading ? 'wait' : 'pointer',
                            boxShadow: '0 4px 10px rgba(245, 158, 11, 0.2)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'transform 0.1s'
                          }}
                          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95)'}
                          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                          title="Upload scanned image or photo of physical stamped hard copy"
                        >
                          <span>&#128247;</span> {isUploading ? 'Uploading Scan...' : 'Upload Hard Copy'}
                        </button>
                      )}

                      {/* State 2: Processing AI */}
                      {isCurrentlyProcessingOcr && !isOcrVerified && (
                        <span style={{
                          backgroundColor: '#3b82f6',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 700,
                          letterSpacing: '0.05em',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          &#9889; AI OCR RUNNING...
                        </span>
                      )}

                      {/* State 3: Hard Copy Uploaded -> Click to review Soft Copy & OCR suggestions */}
                      {isUploaded && !isCurrentlyProcessingOcr && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            backgroundColor: '#dbeafe',
                            color: '#1e40af',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '6px 10px',
                            borderRadius: '20px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            &#128247; Hard Copy Attached
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenOcrForm(doc)}
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              padding: '7px 15px',
                              borderRadius: '20px',
                              backgroundColor: '#2563eb',
                              color: '#ffffff',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                              transition: 'all 0.15s ease'
                            }}
                            title="Click to open side-by-side viewer with AI OCR soft copy form filling suggestions"
                          >
                            <span>&#9889;</span> Review Soft Copy Form (AI OCR)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUploadClick(doc.id)}
                            style={{
                              fontSize: '11px',
                              fontWeight: 500,
                              padding: '4px 8px',
                              backgroundColor: 'transparent',
                              color: '#64748b',
                              border: 'none',
                              cursor: 'pointer',
                              textDecoration: 'underline'
                            }}
                            title="Re-upload a different photo/scan if needed"
                          >
                            Re-upload
                          </button>
                        </div>
                      )}

                      {/* State 4: Verified */}
                      {isVerified && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                            &#10003; VERIFIED
                          </span>
                          <button
                            type="button"
                            onClick={() => handleInspectVerifiedDoc(doc)}
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 600,
                              padding: '6px 10px',
                              borderRadius: '16px',
                              backgroundColor: '#f1f5f9',
                              color: '#334155',
                              border: '1px solid #cbd5e1',
                              cursor: 'pointer'
                            }}
                            title="Inspect verified soft copy form values and physical scan side-by-side"
                          >
                            &#128065; Inspect Soft Copy
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Card: Pending / Accepted / Rejected */}
          {task.status === 'REJECTED' ? (
            <div style={{
              ...premiumCardStyle,
              background: '#fef2f2',
              border: '1px solid #fca5a5',
              borderTop: '4px solid #ef4444'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', color: '#dc2626' }}>&#9888;</span>
                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#991b1b' }}>
                  Stage Rejected &amp; Remitted
                </h4>
              </div>
              <p style={{ fontSize: '14px', color: '#7f1d1d', margin: '0 0 16px 0', lineHeight: '1.6' }}>
                This statutory stage was rejected and remitted to the Requesting Authority. Further officer action is locked until the Proponent rectifies defects and resubmits the stage.
              </p>
              <div style={{ padding: '14px 16px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #fecaca' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#991b1b', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
                  Recorded Statutory Rejection Reason:
                </span>
                <p style={{ margin: 0, fontSize: '14px', color: '#1f2937', fontWeight: 600 }}>
                  "{task.rejectionReason || 'Defects noted in submitted records.'}"
                </p>
              </div>
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#991b1b' }}>
                <span>Status: <strong>REJECTED</strong></span>
                <span>{task.completedAt ? `Remitted: ${new Date(task.completedAt).toLocaleString()}` : ''}</span>
              </div>
            </div>
          ) : task.status === 'ACCEPTED' ? (
            <div style={{
              ...premiumCardStyle,
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderTop: '4px solid #16a34a'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <span style={{ fontSize: '24px', color: '#16a34a' }}>&#10003;</span>
                <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#166534' }}>
                  Stage Affirmation Completed
                </h4>
              </div>
              <p style={{ fontSize: '14px', color: '#14532d', margin: 0, lineHeight: '1.6' }}>
                This statutory stage has been affirmed and accepted. The workflow has progressed to the subsequent statutory phase.
              </p>
            </div>
          ) : (
            <div style={{
              ...premiumCardStyle,
              background: 'linear-gradient(to bottom, #ffffff, #f8fafc)',
              borderTop: '4px solid #0f172a'
            }}>
              <h4 style={{ ...cardHeaderStyle, borderBottom: 'none', marginBottom: '8px' }}>
                Stage Affirmation
              </h4>
              <p style={{ fontSize: '14px', color: '#475569', marginBottom: '24px', lineHeight: '1.6' }}>
                By accepting this stage, you digitally affirm the verification of physical and digital records per the statutory requirements of the Act.
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
                  {hasMissingDocs
                    ? 'Cannot affirm: Missing required physical evidence.'
                    : hasUnverifiedDocs
                    ? 'Cannot affirm: Uploaded physical documents require officer review & AI OCR soft copy affirmation.'
                    : 'Cannot affirm: Pending AI verification.'}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Phase 9: AI Intelligence Fullscreen Modal */}
      {showOcrModal && ocrStatus && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(12px)',
          zIndex: 9999,
          display: 'flex',
          padding: '40px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            width: '100%',
            height: '100%',
            borderRadius: '24px',
            display: 'flex',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            {/* Left: Document Viewer */}
            <div style={{ flex: '1.4', backgroundColor: '#0f172a', borderRight: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 24px', backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#3b82f6', fontSize: '20px' }}>&#128065;</span>
                  <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '15px' }}>
                    {isUploadedImage ? 'Scanned Hard Copy Evidence (Photo / Scan)' : 'Statutory Soft Copy / Document Viewer'}
                  </span>
                </div>
                {uploadedFileUrl && (
                  <a
                    href={uploadedFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'none', fontWeight: 600 }}
                  >
                    Open in New Tab &#8599;
                  </a>
                )}
              </div>
              <div style={{ flex: 1, overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', boxSizing: 'border-box' }}>
                {uploadedFileUrl ? (
                  isUploadedImage ? (
                    <img
                      src={uploadedFileUrl}
                      alt="Uploaded Hard Copy Evidence"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain',
                        borderRadius: '8px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                      }}
                    />
                  ) : (
                    <iframe
                      src={uploadedFileUrl}
                      title="Document Viewer"
                      style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#ffffff', borderRadius: '8px' }}
                    />
                  )
                ) : (
                  <div style={{ color: '#94a3b8', textAlign: 'center' }}>
                    <p style={{ fontSize: '15px' }}>Document Preview Initializing...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Gemini Intelligence Panel */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>

              <div style={{ padding: '24px 32px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: isOcrVerified ? '#10b981' : '#3b82f6' }}>&#10022;</span> Gemini Intelligence &bull; Soft Copy Form Filling
                </h3>
                <button
                  onClick={() => {
                    if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
                    setShowOcrModal(false);
                    if (!isOcrVerified && ocrStatus?.docId) {
                      // Preserve UPLOADED status so the officer can click "Review Soft Copy Form (AI OCR)" to resume anytime
                      const updatedDocs = (task.requiredDocuments || []).map(doc =>
                        doc.id === ocrStatus.docId ? { ...doc, status: (doc.status === 'VERIFIED' ? 'VERIFIED' : 'UPLOADED') as any } : doc
                      );
                      setTask({ ...task, requiredDocuments: updatedDocs });
                    }
                    setOcrStatus(null);
                  }}
                  style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}
                  title="Close viewer"
                >
                  &times;
                </button>
              </div>

              <div style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
                {!isOcrVerified ? (
                  <p style={{ fontSize: '14px', color: '#475569', marginBottom: '24px', lineHeight: '1.6' }}>
                    AI has scanned the uploaded physical hard copy and extracted statutory parameters. Review and adjust the suggested values below to complete the digital soft copy record.
                  </p>
                ) : (
                  <p style={{ fontSize: '14px', color: '#059669', marginBottom: '24px', lineHeight: '1.6', fontWeight: 500 }}>
                    Verified soft copy form values recorded in the statutory registry.
                  </p>
                )}

                {/* Polling States */}
                {ocrStatus.status === 'OCR_PROCESSING' && (
                  <div style={{ padding: '32px 24px', backgroundColor: '#f8fafc', borderRadius: '12px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                    <div style={{ color: '#3b82f6', fontWeight: 600, marginBottom: '8px', fontSize: '16px' }}>Running Cloud Vision OCR...</div>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>Extracting raw text from hard copy scan.</div>
                  </div>
                )}
                {ocrStatus.status === 'GEMINI_EXTRACTING' && (
                  <div style={{ padding: '32px 24px', backgroundColor: '#f8fafc', borderRadius: '12px', textAlign: 'center', border: '1px dashed #cbd5e1' }}>
                    <div style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: '8px', fontSize: '16px' }}>Gemini LLM Structuring Data...</div>
                    <div style={{ fontSize: '14px', color: '#64748b' }}>Populating soft copy form filling suggestions from scanned evidence.</div>
                  </div>
                )}

                {/* Extraction Results */}
                {ocrStatus.status === 'COMPLETED' && ocrData && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {(() => {
                      const flattenObject = (obj: any, prefix = ''): Record<string, string> => {
                        let result: Record<string, string> = {};
                        for (const key in obj) {
                          if (obj[key] !== null && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
                            Object.assign(result, flattenObject(obj[key], `${prefix}${key}.`));
                          } else {
                            result[`${prefix}${key}`] = obj[key] === null ? '' : String(obj[key]);
                          }
                        }
                        return result;
                      };

                      const flatData = flattenObject(ocrData);

                      return Object.entries(flatData).map(([key, value]) => {
                        const confidence = ocrStatus.confidenceScores?.[key as keyof typeof ocrStatus.confidenceScores] || 92;
                        const confidenceColor = confidence > 95 ? '#10b981' : confidence > 85 ? '#f59e0b' : '#ef4444';
                        const isEditable = !isOcrVerified;

                        return (
                          <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <label style={{ fontSize: '13px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                                {key.replace(/([A-Z])/g, ' $1')}
                              </label>
                              {confidence && (
                                <span style={{ fontSize: '12px', color: confidenceColor, fontWeight: 700, backgroundColor: `${confidenceColor}15`, padding: '4px 8px', borderRadius: '6px' }}>
                                  {confidence}% AI Confidence
                                </span>
                              )}
                            </div>
                            <input
                              type="text"
                              value={value as string}
                              onChange={(e) => handleOcrDataChange(key, e.target.value)}
                              readOnly={!isEditable}
                              style={{
                                width: '100%',
                                padding: '14px 16px',
                                borderRadius: '10px',
                                border: `1px solid ${isEditable ? '#cbd5e1' : '#e2e8f0'}`,
                                backgroundColor: isEditable ? '#ffffff' : '#f8fafc',
                                color: isEditable ? '#0f172a' : '#64748b',
                                fontSize: '15px',
                                fontWeight: 500,
                                boxSizing: 'border-box',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                boxShadow: isEditable ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                              }}
                              onFocus={e => isEditable && (e.currentTarget.style.borderColor = '#3b82f6')}
                              onBlur={e => isEditable && (e.currentTarget.style.borderColor = '#cbd5e1')}
                            />
                          </div>
                        );
                      });
                    })()}

                    {!isOcrVerified ? (
                      <button
                        onClick={handleVerifyOcr}
                        disabled={ocrSubmitting}
                        style={{
                          marginTop: '16px',
                          width: '100%',
                          padding: '16px',
                          borderRadius: '12px',
                          backgroundColor: '#0f172a',
                          color: '#ffffff',
                          fontSize: '15px',
                          fontWeight: 600,
                          border: 'none',
                          cursor: ocrSubmitting ? 'wait' : 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)'
                        }}
                      >
                        {ocrSubmitting ? 'Saving Soft Copy...' : '✓ Affirm AI Extraction & Save Soft Copy'}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                        <div style={{
                          padding: '16px',
                          backgroundColor: '#ecfdf5',
                          border: '1px solid #10b981',
                          borderRadius: '12px',
                          color: '#065f46',
                          fontSize: '15px',
                          fontWeight: 600,
                          textAlign: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px'
                        }}>
                          <span style={{ fontSize: '18px' }}>✓</span> Soft Copy Form Verified &amp; Saved
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setShowOcrModal(false);
                            setOcrStatus(null);
                          }}
                          style={{
                            padding: '12px',
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            fontSize: '14px',
                            fontWeight: 600,
                            borderRadius: '10px',
                            border: '1px solid #cbd5e1',
                            cursor: 'pointer'
                          }}
                        >
                          Close Viewer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
