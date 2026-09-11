import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { OfficerService, type OcrExtractionResult } from '../../services/OfficerService';
import { DocumentService, type Document as ProjectDocument } from '../../services/DocumentService';
import { taskService } from '../../services/api/task.service';
import type { WorkflowTask } from '../../types/task.types';
import { apiClient } from '../../services/api/client';
import BhoomiLogo from '../../components/common/BhoomiLogo';
import './officer-dashboard.css';

export const OfficerTaskDetailPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const [task, setTask] = useState<WorkflowTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
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
      if (uploadedFileUrl && uploadedFileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(uploadedFileUrl);
      }
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

      const realDocId = uploadResult.documentId || `DOC-${Date.now()}`;
      // Smooth step-by-step AI extraction experience
      setOcrStatus({ docId: targetDocId, backendDocId: realDocId, status: 'OCR_PROCESSING' });
      setIsOcrVerified(false);
      setShowOcrModal(true);

      const pollForExtraction = async (attempts = 0) => {
        if (attempts > 30) {
          console.warn('OCR polling timed out');
          setOcrStatus(prev => prev ? { ...prev, status: 'FAILED' } : null);
          return;
        }

        try {
          if (attempts === 1) {
            setOcrStatus(prev => prev ? { ...prev, status: 'GEMINI_EXTRACTING' } : null);
          }

          const result = await OfficerService.getOcrExtractionStatus(task.id, realDocId);

          if (result.status === 'PENDING' || result.status === 'OCR_PROCESSING' || result.status === 'GEMINI_EXTRACTING') {
            // Still processing, try again in 3 seconds
            setTimeout(() => pollForExtraction(attempts + 1), 3000);
            return;
          }

          // COMPLETED, EMPTY or FAILED are all terminal.
          result.backendDocId = realDocId;
          result.docId = targetDocId;
          setOcrStatus(result);
          setOcrData(result.extractedData || null);
        } catch (err) {
          console.error("Polling error", err);
          setTimeout(() => pollForExtraction(attempts + 1), 3000);
        }
      };

      // Start polling
      setTimeout(() => pollForExtraction(0), 2000);

    } catch (err) {
      console.error('Failed to upload file', err);
    } finally {
      setUploadingDocId(null);
      setActiveUploadDocId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const loadDocumentPreview = async (doc: any) => {
    setPreviewLoading(true);
    const matchingDoc = findMatchingProjectDoc(doc.name);
    const downloadEndpoint = matchingDoc
      ? `/documents/${matchingDoc.id}/download`
      : `/documents/tasks/${task?.id}/template/${encodeURIComponent(doc.name)}`;

    try {
      const res = await apiClient.get(downloadEndpoint, { responseType: 'blob' });
      const contentType = String((res.headers && res.headers['content-type']) || 'application/pdf');
      const blob = new Blob([res.data], { type: contentType });
      if (uploadedFileUrl && uploadedFileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(uploadedFileUrl);
      }
      const objectUrl = URL.createObjectURL(blob);
      setUploadedFileUrl(objectUrl);
      setIsUploadedImage(contentType.startsWith('image/'));
    } catch (err) {
      console.error('Failed to load authenticated blob preview, using token query fallback:', err);
      const token = localStorage.getItem('bhoomi_auth_token');
      const fallbackUrl = `/api/v1${downloadEndpoint}${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      setUploadedFileUrl(fallbackUrl);
      setIsUploadedImage(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleInspectVerifiedDoc = async (doc: any) => {
    setOcrStatus({ docId: doc.id, status: 'COMPLETED' });
    setIsOcrVerified(true);
    setShowOcrModal(true);
    await loadDocumentPreview(doc);

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
  };

  const handleOpenOcrForm = async (doc: any) => {
    setActiveUploadDocId(doc.id);
    setOcrStatus({ docId: doc.id, backendDocId: doc.id, status: 'COMPLETED' });
    setIsOcrVerified(false);
    setShowOcrModal(true);

    if (!uploadedFileUrl) {
      await loadDocumentPreview(doc);
    }

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
      <div className="things-officer-root" style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="things-officer-loading-state">
          <BhoomiLogo size={40} strokeWidth={2.4} />
          <span className="things-officer-loading-text">
            Accessing Statutory Task Docket...
          </span>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="things-officer-root" style={{ minHeight: '100vh', padding: '60px 24px' }}>
        <div className="things-task-card" style={{ maxWidth: '560px', margin: '0 auto', textAlign: 'center', padding: '40px' }}>
          <h2 className="things-task-stage-title" style={{ fontSize: '24px', marginBottom: '10px' }}>
            Task Docket Not Found
          </h2>
          <p className="things-task-card-subtitle" style={{ fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
            The specified task docket ID does not exist or you do not have appropriate statutory permissions.
          </p>
          <div>
            <Link to="/officer/dashboard" className="things-btn-outline">
              &larr; Return to Officer Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const hasMissingDocs = task.requiredDocuments.some(d => d.status === 'MISSING');
  const hasUnverifiedDocs = task.requiredDocuments.some(d => d.status !== 'VERIFIED');
  const ocrBlocking = ocrStatus !== null && !isOcrVerified;
  const isReadyToAccept = !hasMissingDocs && !hasUnverifiedDocs && !ocrBlocking;

  return (
    <div className="things-officer-root">
      <div className="things-officer-container">

        {/* Hidden file input for uploads */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Back navigation */}
        <div className="things-task-nav-bar">
          <Link to="/officer/dashboard" className="things-btn-back">
            &larr; Return to Officer Dashboard
          </Link>
        </div>

        {/* Sovereign Broadsheet Docket Masthead */}
        <header className="things-task-masthead">
          <div className="things-task-masthead-main">
            <div className="things-task-meta-row">
              <span className="things-task-docket-badge">
                TASK DOCKET &bull; #{task.id.split('-').pop()}
              </span>
              <span className={`things-officer-pill status-${task.status.toLowerCase()}`}>
                {task.status}
              </span>
            </div>
            <h1 className="things-task-stage-title">
              {task.stageName}
            </h1>
            <p className="things-task-project-info">
              <span>Project: <strong className="things-task-project-name">{task.projectTitle || task.projectCode}</strong></span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span className="things-task-project-id">{task.projectId}</span>
            </p>
          </div>

          <div className="things-task-stamp-card">
            <div className="things-task-stamp-block">
              <span className="things-task-stamp-label">SLA Target Date</span>
              <span className="things-task-stamp-val font-mono">{task.dueDate}</span>
            </div>
            <div className="things-task-stamp-block">
              <span className="things-task-stamp-label">Cadastral Jurisdiction</span>
              <span className="things-task-stamp-val">
                {(task as any).district || 'South West'}, {(task as any).state || 'New Delhi'}
              </span>
            </div>
          </div>
        </header>

        {/* Statutory Rejection Notice Banner */}
        {task.status === 'REJECTED' && (
          <div className="things-task-rejection-banner">
            <div className="things-task-rejection-left">
              <div className="things-task-rejection-icon">
                &#9888;
              </div>
              <div>
                <h3 className="things-task-rejection-title">
                  Stage Rejected &amp; Remitted to Requesting Authority
                </h3>
                <div className="things-task-rejection-reason">
                  Recorded Statutory Defect / Rejection Reason:{' '}
                  <strong>
                    "{task.rejectionReason || 'Defects noted in submitted records.'}"
                  </strong>
                </div>
                <div className="things-task-rejection-sub">
                  Further officer action is suspended until the Requesting Authority remedies the defects and resubmits.
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span className="things-officer-pill status-rejected">
                Defect Dossier Remitted
              </span>
              <div style={{ fontSize: '12px', color: 'var(--to-fog)', marginTop: '8px', fontFamily: 'var(--to-font-mono)' }}>
                {task.completedAt ? `Remitted: ${new Date(task.completedAt).toLocaleString()}` : 'Recently Remitted'}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Section: Two-Column Layout */}
        <div className="things-task-layout-grid">

          {/* Left Column: Statutory Context & Cadastral Parcels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Context Card */}
            <div className="things-task-card">
              <div className="things-task-card-header">
                <h4 className="things-task-card-title">
                  <span style={{ color: 'var(--to-signal-blue)' }}>&#9432;</span> Previous Stage Context
                </h4>
              </div>
              <div className="things-task-context-callout">
                <em>
                  "{(task as any).previousStageNotes || 'No previous stage context available.'}"
                </em>
              </div>
            </div>

            {/* Parcels Card */}
            <div className="things-task-card">
              <div className="things-task-card-header">
                <h4 className="things-task-card-title">
                  <span>&#9638;</span> Relevant Cadastral Parcels ({(task as any).relevantParcels?.length || 0})
                </h4>
              </div>

              <div className="things-officer-table-wrap">
                <table className="things-officer-table">
                  <thead>
                    <tr>
                      <th>Parcel ID</th>
                      <th>Survey No.</th>
                      <th>Village</th>
                      <th>Area</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((task as any).relevantParcels || []).map((parcel: any) => (
                      <tr key={parcel.id}>
                        <td style={{ fontFamily: 'var(--to-font-mono)', fontSize: '12.5px' }}>{parcel.id}</td>
                        <td style={{ fontWeight: 600 }}>{parcel.surveyNumber}</td>
                        <td>{parcel.village}</td>
                        <td>{parcel.area}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Evidence, OCR Intelligence & Statutory Affirmation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Evidence & Documents Card */}
            <div className="things-task-card">
              <div className="things-task-card-header">
                <div>
                  <h4 className="things-task-card-title">
                    <span>&#128194;</span> Evidence &amp; Documents
                  </h4>
                  <p className="things-task-card-subtitle">
                    Download soft copies, verify physical ground scans, and affirm statutory compliance
                  </p>
                </div>

                {/* Download Full Requisition Dossier button */}
                <button
                  type="button"
                  onClick={handleDownloadFullDossier}
                  disabled={downloadingDoc === 'DOSSIER'}
                  className="things-btn-outline"
                  title="Download all submitted requisition documents and schedules for this project"
                >
                  <span>&#11015;</span> {downloadingDoc === 'DOSSIER' ? 'Downloading...' : 'Download Full Requisition Dossier'}
                </button>
              </div>

              {task.status === 'REJECTED' && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: '#fff8f8',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  fontSize: '13px',
                  color: '#991b1b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '15px' }}>&#9888;</span>
                  <span><strong>Scrutiny Suspended:</strong> This task has been rejected and remitted to the Proponent. Document uploads and affirmations are locked pending resubmission.</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {task.requiredDocuments?.map(doc => {
                  const isTaskClosed = task.status === 'ACCEPTED' || task.status === 'REJECTED';
                  const isMissing = !isTaskClosed && doc.status === 'MISSING';
                  const isUploaded = !isTaskClosed && doc.status === 'UPLOADED';
                  const isVerified = doc.status === 'VERIFIED';
                  const isUploading = uploadingDocId === doc.id;
                  const isDownloading = downloadingDoc === doc.name;
                  const isCurrentlyProcessingOcr = ocrStatus?.docId === doc.id;
                  const matchedProjectDoc = findMatchingProjectDoc(doc.name);

                  return (
                    <div
                      key={doc.id}
                      className={`things-task-doc-row ${isVerified ? 'is-verified' : ''}`}
                    >
                      <div className="things-task-doc-info">
                        <span className="things-task-doc-name">
                          {doc.name}
                        </span>
                        <span className={`things-task-doc-sub ${isVerified ? 'verified' : isUploaded ? 'uploaded' : ''}`}>
                          {isVerified
                            ? '✓ Certified Soft Copy Digitized & Verified in Registry'
                            : isUploaded
                            ? '📷 Hard Copy Attached • AI Soft Copy Form Suggestions Ready'
                            : `${doc.type} • ${matchedProjectDoc ? 'Submitted Soft Copy Available' : 'Statutory Form Template Ready'}`}
                        </span>
                      </div>

                      <div className="things-task-doc-actions">
                        {/* 1. Download Soft Copy button */}
                        <button
                          type="button"
                          onClick={() => handleDownloadSoftCopy(doc.name)}
                          disabled={isDownloading}
                          className="things-btn-outline"
                          title="Download official soft copy or template to inspect or print physical record"
                        >
                          <span>&#11015;</span> {isDownloading ? 'Downloading...' : 'Download Soft Copy'}
                        </button>

                        {/* Closed Task Read-only Status Badges */}
                        {isTaskClosed && doc.status === 'MISSING' && (
                          <span className="things-officer-pill status-rejected">
                            {task.status === 'REJECTED' ? 'MISSING AT REJECTION' : 'MISSING'}
                          </span>
                        )}

                        {isTaskClosed && doc.status === 'UPLOADED' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="things-officer-pill status-pending">
                              UPLOADED
                            </span>
                            <button
                              type="button"
                              onClick={() => handleInspectVerifiedDoc(doc)}
                              className="things-btn-outline"
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
                            className="things-btn-primary"
                            title="Upload scanned image or photo of physical stamped hard copy"
                          >
                            <span>&#128247;</span> {isUploading ? 'Uploading Scan...' : 'Upload Hard Copy'}
                          </button>
                        )}

                        {/* State 2: Processing AI */}
                        {isCurrentlyProcessingOcr && !isOcrVerified && (
                          <span className="things-ocr-running-badge">
                            &#9889; AI OCR RUNNING...
                          </span>
                        )}

                        {/* State 3: Hard Copy Uploaded -> Review Soft Copy & OCR suggestions */}
                        {isUploaded && !isCurrentlyProcessingOcr && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenOcrForm(doc)}
                              className="things-btn-primary"
                              title="Click to open side-by-side viewer with AI OCR soft copy form filling suggestions"
                            >
                              <span>&#9889;</span> Review Soft Copy Form (AI OCR)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUploadClick(doc.id)}
                              style={{
                                fontSize: '12px',
                                backgroundColor: 'transparent',
                                color: 'var(--to-fog)',
                                border: 'none',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                padding: '4px 6px'
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
                            <span className="things-officer-pill status-completed">
                              &#10003; VERIFIED
                            </span>
                            <button
                              type="button"
                              onClick={() => handleInspectVerifiedDoc(doc)}
                              className="things-btn-outline"
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

            {/* Stage Affirmation Card */}
            <div className="things-task-card">
              {task.status === 'REJECTED' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '20px', color: 'var(--to-rose)' }}>&#9888;</span>
                    <h4 className="things-task-card-title" style={{ margin: 0 }}>
                      Stage Rejected &amp; Remitted
                    </h4>
                  </div>
                  <p style={{ fontSize: '13.5px', color: 'var(--to-ink)', margin: '0 0 16px 0', lineHeight: '1.6' }}>
                    This statutory stage was rejected and remitted to the Requesting Authority. Further officer action is locked until the Proponent rectifies defects and resubmits the stage.
                  </p>
                  <div style={{ padding: '14px 16px', backgroundColor: '#fafbfc', border: '1px solid var(--to-hairline)', borderRadius: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--to-fog)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '4px' }}>
                      Recorded Statutory Rejection Reason:
                    </span>
                    <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--to-ink)', fontStyle: 'italic' }}>
                      "{task.rejectionReason || 'Defects noted in submitted records.'}"
                    </p>
                  </div>
                </div>
              ) : task.status === 'ACCEPTED' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '20px', color: 'var(--to-emerald)' }}>&#10003;</span>
                    <h4 className="things-task-card-title" style={{ margin: 0 }}>
                      Stage Affirmation Completed
                    </h4>
                  </div>
                  <p style={{ fontSize: '13.5px', color: 'var(--to-ink)', margin: 0, lineHeight: '1.6' }}>
                    This statutory stage has been affirmed and accepted. The workflow has progressed to the subsequent statutory phase in accordance with RFCTLARR Act 2013.
                  </p>
                </div>
              ) : (
                <div>
                  <h4 className="things-task-card-title" style={{ marginBottom: '6px' }}>
                    Stage Affirmation
                  </h4>
                  <p className="things-task-card-subtitle" style={{ marginBottom: '20px', lineHeight: '1.55' }}>
                    By accepting this stage, you digitally affirm the verification of physical and digital records per the statutory requirements of the Act.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Affirm & Accept Stage button */}
                    <button
                      type="button"
                      onClick={handleAccept}
                      disabled={submitting || !isReadyToAccept}
                      className="things-btn-success"
                      style={{ width: '100%' }}
                    >
                      {submitting ? 'Processing Affirmation...' : '✓ Affirm & Accept Stage'}
                    </button>

                    {/* Reject to Proponent button */}
                    <button
                      type="button"
                      onClick={() => setShowRejectModal(true)}
                      disabled={submitting}
                      className="things-btn-danger-outline"
                      style={{ width: '100%' }}
                    >
                      Reject to Proponent
                    </button>
                  </div>

                  {!isReadyToAccept && (
                    <div className="things-task-affirm-note">
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
        </div>

        {/* Phase 9: AI Intelligence Fullscreen Modal (Things Style) */}
        {showOcrModal && ocrStatus && (
          <div className="things-modal-overlay">
            <div className="things-ocr-modal-box">
              {/* Left: Document Viewer */}
              <div className="things-ocr-viewer-pane">
                <div className="things-ocr-viewer-header">
                  <div className="things-ocr-viewer-title">
                    <span>&#128065;</span>
                    <span>
                      {isUploadedImage ? 'Scanned Hard Copy Evidence (Physical Scan)' : 'Statutory Soft Copy / Document Viewer'}
                    </span>
                  </div>
                  {uploadedFileUrl && (
                    <a
                      href={uploadedFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="things-btn-outline"
                      style={{ fontSize: '11.5px', padding: '4px 10px', backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}
                    >
                      Open in New Tab &#8599;
                    </a>
                  )}
                </div>
                <div className="things-ocr-viewer-body">
                  {previewLoading ? (
                    <div style={{ color: 'var(--to-fog)', textAlign: 'center' }}>
                      <p style={{ fontSize: '14px' }}>Loading certified document preview...</p>
                    </div>
                  ) : uploadedFileUrl ? (
                    isUploadedImage ? (
                      <img
                        src={uploadedFileUrl}
                        alt="Uploaded Hard Copy Evidence"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 255, 255, 0.15)'
                        }}
                      />
                    ) : (
                      <iframe
                        src={uploadedFileUrl}
                        title="Document Viewer"
                        style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#ffffff', borderRadius: '6px' }}
                      />
                    )
                  ) : (
                    <div style={{ color: 'var(--to-fog)', textAlign: 'center' }}>
                      <p style={{ fontSize: '14px' }}>Document Preview Initializing...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Gemini Intelligence Panel */}
              <div className="things-ocr-panel-pane">
                <div className="things-ocr-panel-header">
                  <h3 className="things-ocr-panel-title">
                    <span style={{ color: 'var(--to-signal-blue)' }}>&#10022;</span> Gemini Intelligence &bull; Soft Copy Form Filling
                  </h3>
                  <button
                    onClick={() => {
                      if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
                      setShowOcrModal(false);
                      if (!isOcrVerified && ocrStatus?.docId) {
                        const updatedDocs = (task.requiredDocuments || []).map(doc =>
                          doc.id === ocrStatus.docId ? { ...doc, status: (doc.status === 'VERIFIED' ? 'VERIFIED' : 'UPLOADED') as any } : doc
                        );
                        setTask({ ...task, requiredDocuments: updatedDocs });
                      }
                      setOcrStatus(null);
                    }}
                    className="things-ocr-close-btn"
                    title="Close viewer"
                  >
                    &times;
                  </button>
                </div>

                <div className="things-ocr-panel-body">
                  {!isOcrVerified ? (
                    <p style={{ fontSize: '13.5px', color: 'var(--to-fog)', marginBottom: '20px', lineHeight: '1.55' }}>
                      AI has scanned the uploaded physical hard copy and extracted statutory parameters. Review and adjust the suggested values below to complete the digital soft copy record.
                    </p>
                  ) : (
                    <p style={{ fontSize: '13.5px', color: 'var(--to-ink)', marginBottom: '20px', lineHeight: '1.55', fontWeight: 600 }}>
                      Verified soft copy form values recorded in the statutory registry.
                    </p>
                  )}

                  {/* Polling States */}
                  {ocrStatus.status === 'OCR_PROCESSING' && (
                    <div style={{ padding: '28px 20px', backgroundColor: '#fafbfc', border: '1px solid var(--to-hairline)', textAlign: 'center', borderRadius: '10px' }}>
                      <div style={{ color: 'var(--to-signal-blue)', fontWeight: 600, marginBottom: '6px', fontSize: '14.5px' }}>Running Cloud Vision OCR...</div>
                      <div style={{ fontSize: '12.5px', color: 'var(--to-fog)' }}>Extracting raw text from hard copy scan.</div>
                    </div>
                  )}
                  {ocrStatus.status === 'GEMINI_EXTRACTING' && (
                    <div style={{ padding: '28px 20px', backgroundColor: '#fafbfc', border: '1px solid var(--to-hairline)', textAlign: 'center', borderRadius: '10px' }}>
                      <div style={{ color: 'var(--to-ink)', fontWeight: 600, marginBottom: '6px', fontSize: '14.5px' }}>Gemini LLM Structuring Data...</div>
                      <div style={{ fontSize: '12.5px', color: 'var(--to-fog)' }}>Populating soft copy form filling suggestions from scanned evidence.</div>
                    </div>
                  )}

                  {(ocrStatus.status === 'EMPTY' || ocrStatus.status === 'FAILED') && (
                    <div style={{ padding: '24px 20px', backgroundColor: '#fff8f8', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '18px', color: 'var(--to-rose)' }}>&#9888;</span>
                        <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#991b1b' }}>
                          {ocrStatus.status === 'EMPTY' ? 'No Statutory Fields Could Be Read' : 'AI Extraction Unavailable'}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--to-ink)', lineHeight: 1.55, margin: '0 0 8px 0' }}>
                        {ocrStatus.status === 'EMPTY'
                          ? <>The AI classified this scan{ocrStatus.documentType ? <> as <strong>{ocrStatus.documentType.replace(/_/g, ' ')}</strong></> : null} but could not extract any field values from it. This usually means the scan is too faint, skewed, or handwritten.</>
                          : 'The AI parser could not be reached, or it did not respond in time. No values have been auto-filled.'}
                      </p>
                      {ocrStatus.missingFields && ocrStatus.missingFields.length > 0 && (
                        <p style={{ fontSize: '12px', color: 'var(--to-fog)', margin: '0 0 8px 0' }}>
                          Expected but not found: {ocrStatus.missingFields.join(', ')}
                        </p>
                      )}
                      <p style={{ fontSize: '12.5px', color: 'var(--to-ash)', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                        Nothing has been pre-filled, since affirming unverified values would enter them into the statutory registry. Re-upload a clearer scan to try again.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const docId = ocrStatus.docId;
                          setShowOcrModal(false);
                          setOcrStatus(null);
                          handleUploadClick(docId);
                        }}
                        className="things-btn-primary"
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        &#128247; Re-upload Scan &amp; Retry AI Extraction
                      </button>
                    </div>
                  )}

                  {/* Extraction Results */}
                  {ocrStatus.status === 'COMPLETED' && ocrData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

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
                          const isEditable = !isOcrVerified;

                          return (
                            <div key={key} className="things-ocr-field-group">
                              <div className="things-ocr-field-header">
                                <label className="things-ocr-field-label">
                                  {key.replace(/([A-Z])/g, ' $1')}
                                </label>
                                {confidence && (
                                  <span className="things-ocr-confidence-badge">
                                    {confidence}% AI Confidence
                                  </span>
                                )}
                              </div>
                              <input
                                type="text"
                                value={value as string}
                                onChange={(e) => handleOcrDataChange(key, e.target.value)}
                                readOnly={!isEditable}
                                className="things-ocr-input"
                              />
                            </div>
                          );
                        });
                      })()}

                      {!isOcrVerified ? (
                        <button
                          onClick={handleVerifyOcr}
                          disabled={ocrSubmitting}
                          className="things-btn-primary"
                          style={{
                            marginTop: '12px',
                            width: '100%',
                            padding: '12px',
                            fontSize: '13.5px',
                            justifyContent: 'center'
                          }}
                        >
                          {ocrSubmitting ? 'Saving Soft Copy...' : '✓ Affirm AI Extraction & Save Soft Copy'}
                        </button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                          <div style={{
                            padding: '12px',
                            backgroundColor: 'var(--to-emerald-tint)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            borderRadius: '8px',
                            color: '#059669',
                            fontSize: '13.5px',
                            fontWeight: 600,
                            textAlign: 'center'
                          }}>
                            ✓ Soft Copy Form Verified &amp; Saved
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowOcrModal(false);
                              setOcrStatus(null);
                            }}
                            className="things-btn-outline"
                            style={{ width: '100%', justifyContent: 'center' }}
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

        {/* Sovereign Rejection Modal */}
        {showRejectModal && (
          <div className="things-modal-overlay">
            <div className="things-reject-modal-box">
              <h3 className="things-reject-title">
                Reject Workflow Stage
              </h3>
              <p className="things-reject-desc">
                Provide an official statutory reason for rejection under RFCTLARR Act 2013. This formal remittal notice will be transmitted to the Requesting Authority for corrective action.
              </p>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Missing signature on physical scan of Form B or boundary mismatch..."
                className="things-reject-textarea"
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  disabled={submitting}
                  className="things-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || submitting}
                  className="things-btn-danger"
                >
                  {submitting ? 'Rejecting...' : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficerTaskDetailPage;
