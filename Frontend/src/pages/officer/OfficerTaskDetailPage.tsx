import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { OfficerService, type OcrExtractionResult } from '../../services/OfficerService';
import { DocumentService, type Document as ProjectDocument } from '../../services/DocumentService';
import { taskService } from '../../services/api/task.service';
import type { WorkflowTask, TaskEvidenceItem, TaskVerificationAffirmations } from '../../types/task.types';
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

  // Phase 11: Ground Evidence Repository state
  const [evidenceList, setEvidenceList] = useState<TaskEvidenceItem[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [selectedEvidenceType, setSelectedEvidenceType] = useState<TaskEvidenceItem['evidenceType']>('PANCHNAMA');
  const [evidenceSuccessNotice, setEvidenceSuccessNotice] = useState<string | null>(null);

  // Phase 11: Human Verification Affirmations state
  const [affirmations, setAffirmations] = useState<TaskVerificationAffirmations>({
    boundaryAffirmed: false,
    khasraSurveyAffirmed: false,
    ownershipLedgerAffirmed: false,
    noEncumbranceAffirmed: false,
    officerRemarks: '',
  });
  const [verifyingAffirmations, setVerifyingAffirmations] = useState(false);
  const [isAffirmationSaved, setIsAffirmationSaved] = useState(false);
  const [resubmittingDefect, setResubmittingDefect] = useState(false);

  // Project statutory documents for cross-reference
  const [projectDocuments, setProjectDocuments] = useState<ProjectDocument[]>([]);

  // Phase 9, 11 & 12: OCR & Gemini Intelligence State
  const [ocrStatus, setOcrStatus] = useState<OcrExtractionResult | null>(null);
  const [ocrData, setOcrData] = useState<any>(null);
  const [isOcrVerified, setIsOcrVerified] = useState(false);
  const [correctedFields, setCorrectedFields] = useState<Record<string, boolean>>({});
  const [ocrSubmitting, setOcrSubmitting] = useState(false);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [isUploadedImage, setIsUploadedImage] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const evidenceFileInputRef = useRef<HTMLInputElement>(null);
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
      if (data) {
        if (data.evidence && data.evidence.length > 0) {
          setEvidenceList(data.evidence);
        } else {
          try {
            const ev = await taskService.getTaskEvidence(id);
            setEvidenceList(ev);
          } catch (evErr) {
            console.warn('Failed to load task evidence', evErr);
          }
        }

        if (data.verification?.affirmations) {
          setAffirmations(data.verification.affirmations);
          setIsAffirmationSaved(data.verification.status === 'VERIFIED');
        }

        if (data.projectId) {
          try {
            const pDocs = await DocumentService.getDocuments(data.projectId);
            setProjectDocuments(pDocs);
          } catch (docErr) {
            console.warn('Failed to load project documents', docErr);
          }
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

  // Phase 11: Start Task (POST /api/v1/tasks/:taskId/start)
  const handleStartTask = async () => {
    if (!task) return;
    setSubmitting(true);
    try {
      const updated = await taskService.startTask(task.id);
      setTask(updated);
    } catch (err) {
      console.error('Failed to start task', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Phase 11: Accept Task (POST /api/v1/tasks/:taskId/accept)
  const handleAccept = async () => {
    if (!task) return;
    setSubmitting(true);
    try {
      const response = await taskService.acceptTask(task.id);
      setTask(response.task);
    } catch (err) {
      console.error('Failed to accept task', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Phase 11: Reject Task (POST /api/v1/tasks/:taskId/reject)
  const handleReject = async () => {
    if (!task || !rejectReason.trim()) return;
    setSubmitting(true);
    try {
      const response = await taskService.rejectTask(task.id, rejectReason);
      setShowRejectModal(false);
      setTask(response.task);
    } catch (err) {
      console.error('Failed to reject task', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Phase 11: Upload Evidence (POST /api/v1/tasks/:taskId/evidence)
  const handleUploadEvidenceClick = () => {
    if (evidenceFileInputRef.current) {
      evidenceFileInputRef.current.click();
    }
  };

  const handleEvidenceFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !task) return;
    const file = e.target.files[0];
    setUploadingEvidence(true);
    try {
      const newItem = await taskService.uploadTaskEvidence(task.id, file, selectedEvidenceType);
      setEvidenceList(prev => [...prev, newItem]);
      setTask(prev => prev ? { ...prev, evidence: [...(prev.evidence || []), newItem] } : null);
      setEvidenceSuccessNotice(`Evidence "${file.name}" successfully authenticated and registered.`);
      setTimeout(() => setEvidenceSuccessNotice(null), 4000);
    } catch (err) {
      console.error('Failed to upload ground evidence', err);
    } finally {
      setUploadingEvidence(false);
      if (evidenceFileInputRef.current) evidenceFileInputRef.current.value = '';
    }
  };

  // Phase 11: Save Statutory Human Verification Affirmations (POST /api/v1/documents/:documentId/verify)
  const handleSaveAffirmations = async () => {
    if (!task) return;
    setVerifyingAffirmations(true);
    try {
      const primaryDocId = task.requiredDocuments?.[0]?.id || `doc-${task.id}`;
      await DocumentService.verifyDocument(primaryDocId, {
        status: 'VERIFIED',
        verificationNotes: affirmations.officerRemarks || 'Statutory verification completed by authorized field officer.',
        correctedFields: affirmations,
      });

      setIsAffirmationSaved(true);
      setTask(prev => prev ? {
        ...prev,
        verification: {
          status: 'VERIFIED',
          affirmations: {
            ...affirmations,
            verifiedBy: task.assignedOfficer?.name || 'Ananya Patel',
            verifiedAt: new Date().toISOString(),
          }
        }
      } : null);
    } catch (err) {
      console.error('Failed to verify affirmations', err);
    } finally {
      setVerifyingAffirmations(false);
    }
  };

  // Phase 11: Proponent Correction & Resubmission Demonstration (POST /api/v1/projects/:projectId/workflow-stages/:stageId/resubmit)
  const handleSimulateResubmission = async () => {
    if (!task) return;
    setResubmittingDefect(true);
    try {
      const res = await taskService.resubmitStage(task.projectId, task.stageId, {
        explanation: 'Statutory boundary rectification completed. Revised DGPS spatial coordinates and Form 11 schedule uploaded to registry.',
        correctedDocuments: ['Form_11_Corrected_Seal.pdf'],
      });
      setTask(res.task);
      if (res.task.evidence) setEvidenceList(res.task.evidence);
    } catch (err) {
      console.error('Failed to simulate resubmission', err);
    } finally {
      setResubmittingDefect(false);
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
      const targetReqDoc = task.requiredDocuments?.find(d => d.id === targetDocId);
      const uploadResult = await OfficerService.uploadEvidence(task.id, file, {
        stageId: task.stageId,
        projectId: task.projectId,
        documentType: targetReqDoc?.type || 'STATUTORY_RECORD',
        title: targetReqDoc?.name || file.name,
      });

      const updatedDocs = (task.requiredDocuments || []).map(doc =>
        doc.id === targetDocId ? { ...doc, status: 'UPLOADED' as const } : doc
      );
      setTask({ ...task, requiredDocuments: updatedDocs });
      setCorrectedFields({});

      const realDocId = uploadResult.documentId || `DOC-${Date.now()}`;
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
            setTimeout(() => pollForExtraction(attempts + 1), 3000);
            return;
          }

          result.backendDocId = realDocId;
          result.docId = targetDocId;
          setOcrStatus(result);
          setOcrData(result.extractedData || null);
        } catch (err) {
          console.error("Polling error", err);
          setTimeout(() => pollForExtraction(attempts + 1), 3000);
        }
      };

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
      console.error('Failed to load authenticated blob preview:', err);
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
    setCorrectedFields({});
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
    setIsOcrVerified(doc.status === 'VERIFIED');
    setCorrectedFields({});
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
      await OfficerService.submitOcrVerification(task.id, ocrStatus.docId, ocrStatus.backendDocId, ocrData, {
        stageId: task.stageId,
        projectId: task.projectId,
        verificationNotes: `Field officer affirmed AI extraction parameters for document ${ocrStatus.docId}.`,
      });
      setIsOcrVerified(true);

      const updatedDocs = (task.requiredDocuments || []).map(doc =>
        doc.id === ocrStatus.docId ? { ...doc, status: 'VERIFIED' as const } : doc
      );
      setTask({ ...task, requiredDocuments: updatedDocs });

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
    setCorrectedFields((prev) => ({ ...prev, [field]: true }));
  };

  if (loading) {
    return (
      <div className="things-officer-root" style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="things-officer-loading-state">
          <BhoomiLogo size={40} strokeWidth={2.4} />
          <span className="things-officer-loading-text">
            Accessing Sovereign Acquisition Task Docket...
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

  const allAffirmationsChecked =
    affirmations.boundaryAffirmed &&
    affirmations.khasraSurveyAffirmed &&
    affirmations.ownershipLedgerAffirmed &&
    affirmations.noEncumbranceAffirmed;

  const isReadyToAccept =
    task.status === 'IN_PROGRESS' &&
    !hasMissingDocs &&
    !hasUnverifiedDocs &&
    !ocrBlocking &&
    (isAffirmationSaved || allAffirmationsChecked);

  const branchType = task.workflowNode?.branchType || 'ACQUISITION';
  const cohortLabel = task.cohortContext?.cohortBranch || 'Cohort A (North Section Corridor)';
  const primaryParcel = task.parcel || {
    id: 'parcel-101',
    ulpin: 'UP-MRT-2026-1011',
    khasraNumber: '101/1',
    village: 'Rampur Kalan',
    areaAcres: 2.45,
    tenureType: 'Private Agricultural Freehold',
    disputed: false,
  };

  return (
    <div className="things-officer-root">
      <div className="things-officer-container">

        {/* Hidden file input for document soft copy uploads */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Hidden file input for ground evidence uploads */}
        <input
          type="file"
          ref={evidenceFileInputRef}
          style={{ display: 'none' }}
          onChange={handleEvidenceFileSelected}
        />

        {/* Top Back Navigation Bar */}
        <div className="things-task-nav-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/officer/dashboard" className="things-btn-back">
            &larr; Return to Officer Dashboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`things-branch-pill branch-${branchType.toLowerCase()}`}>
              {branchType} BRANCH
            </span>
            <span className="things-cohort-pill">
              {cohortLabel}
            </span>
          </div>
        </div>

        {/* Sovereign Broadsheet Docket Masthead (Dimensions 2, 3, 4, 5) */}
        <header className="things-task-masthead">
          <div className="things-task-masthead-main">
            <div className="things-task-meta-row">
              <span className="things-task-docket-badge">
                TASK DOCKET &bull; #{task.id}
              </span>
              <span className={`things-officer-pill status-${task.status.toLowerCase()}`}>
                {task.status}
              </span>
              {task.cohortContext && (
                <span className="things-cohort-pill">
                  {task.cohortContext.unitName}
                </span>
              )}
            </div>
            <h1 className="things-task-stage-title">
              {task.stageName}
            </h1>
            <p className="things-task-project-info" style={{ marginTop: '6px' }}>
              <span>Project: <strong className="things-task-project-name">{task.projectTitle || task.projectCode}</strong></span>
              <span style={{ opacity: 0.4 }}>•</span>
              <span className="things-task-project-id font-mono">{task.projectId}</span>
            </p>
            {task.statutoryPurpose && (
              <p style={{ fontSize: '12.5px', color: 'var(--to-ash)', margin: '4px 0 0 0', lineHeight: 1.4 }}>
                <strong>Statutory Purpose:</strong> {task.statutoryPurpose} ({task.ministry || 'MoRTH / MoHUA'})
              </p>
            )}
          </div>

          <div className="things-task-stamp-card">
            <div className="things-task-stamp-block">
              <span className="things-task-stamp-label">SLA Target Window</span>
              <span className="things-task-stamp-val font-mono">{task.dueDate} ({task.slaDays} Days)</span>
            </div>
            <div className="things-task-stamp-block">
              <span className="things-task-stamp-label">Cadastral Jurisdiction</span>
              <span className="things-task-stamp-val">
                {task.district || 'Meerut'}, {task.state || 'Uttar Pradesh'}
              </span>
            </div>
            <div className="things-task-stamp-block">
              <span className="things-task-stamp-label">Responsible Cadre</span>
              <span className="things-task-stamp-val">
                {task.assignedOfficer?.name} ({task.assignedOfficer?.designation || task.department})
              </span>
            </div>
          </div>
        </header>

        {/* Statutory Rejection Notice Banner with Correction Loop Trigger */}
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
                <div className="things-task-rejection-sub" style={{ marginBottom: '12px' }}>
                  Further officer action is suspended until Requesting Authority rectifies defects. (BOSS does not return to the workflow).
                </div>

                {/* Cohort B Demonstration Button */}
                <button
                  type="button"
                  onClick={handleSimulateResubmission}
                  disabled={resubmittingDefect}
                  className="things-reopen-sim-btn"
                  title="Simulate Proponent defect rectification and resubmission via POST /api/v1/projects/:projectId/workflow-stages/:stageId/resubmit"
                >
                  <span>🔄</span>
                  {resubmittingDefect ? 'Processing Resubmission...' : 'Simulate Proponent Defect Rectification & Resubmission →'}
                </button>
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

        {/* Success Notice Banner for Evidence / Action */}
        {evidenceSuccessNotice && (
          <div style={{
            padding: '12px 18px',
            borderRadius: '8px',
            backgroundColor: 'var(--to-emerald-tint)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            color: '#059669',
            fontSize: '13.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>✓</span> {evidenceSuccessNotice}
          </div>
        )}

        {/* Main Content Section: Two-Column Layout */}
        <div className="things-task-layout-grid">

          {/* Left Column: Dimensions 1, 2, 6 (Parcel Passport, Workflow Node, Cohort Context) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Dimension 6: Cohort Context Card */}
            <div className="things-task-card">
              <div className="things-task-card-header">
                <h4 className="things-task-card-title">
                  <span style={{ color: 'var(--to-signal-blue)' }}>&#9672;</span> Cohort Execution Context
                </h4>
                <span className="things-cohort-pill">
                  {task.cohortContext?.cohortBranch || 'Parallel Branch Track'}
                </span>
              </div>
              <div className="things-cohort-banner">
                <div className="things-cohort-banner-header">
                  <div className="things-cohort-unit-title">
                    <span>🏛️</span> {task.cohortContext?.unitName || 'Meerut Sadar Sub-Division'}
                  </div>
                  <span className="things-officer-pill status-active">
                    {task.cohortContext?.cohortParcelCount || 1} Parcels Allocated
                  </span>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--to-fog)', margin: 0, lineHeight: 1.5 }}>
                  This task executes within an isolated, parallel cohort pipeline for linear land acquisition. Downstream transitions advance independently without blocking sibling cohorts.
                </p>

                {task.cohortContext?.siblingNodes && task.cohortContext.siblingNodes.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--to-fog)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Sibling Cohort Tracks:
                    </span>
                    <div className="things-cohort-sibling-list">
                      {task.cohortContext.siblingNodes.map(s => (
                        <div key={s.id} className="things-cohort-sibling-chip">
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--to-signal-blue)' }} />
                          <span>{s.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dimension 1: Parcel Passport Card */}
            <div className="things-task-card">
              <div className="things-task-card-header">
                <div>
                  <h4 className="things-task-card-title">
                    <span>&#9638;</span> Sovereign Land Parcel Passport
                  </h4>
                  <p className="things-task-card-subtitle">
                    Cadastral parameters confirmed against state revenue records &amp; Bhulekh portal
                  </p>
                </div>
                <span className="things-officer-pill status-completed">
                  ULPIN VERIFIED
                </span>
              </div>

              {/* 6-Grid Property Details */}
              <div className="things-parcel-passport-grid">
                <div className="things-parcel-prop-box">
                  <span className="things-parcel-prop-label">ULPIN</span>
                  <span className="things-parcel-prop-val mono">{primaryParcel.ulpin || 'UP-MRT-2026-1011'}</span>
                </div>
                <div className="things-parcel-prop-box">
                  <span className="things-parcel-prop-label">Khasra / Survey No.</span>
                  <span className="things-parcel-prop-val">Khasra {primaryParcel.khasraNumber}</span>
                </div>
                <div className="things-parcel-prop-box">
                  <span className="things-parcel-prop-label">Revenue Village</span>
                  <span className="things-parcel-prop-val">{primaryParcel.village}</span>
                </div>
                <div className="things-parcel-prop-box">
                  <span className="things-parcel-prop-label">Total Land Extent</span>
                  <span className="things-parcel-prop-val">
                    {primaryParcel.areaAcres} Acres ({((primaryParcel.areaAcres || 1) * 0.404686).toFixed(2)} Ha)
                  </span>
                </div>
                <div className="things-parcel-prop-box">
                  <span className="things-parcel-prop-label">Tenure Classification</span>
                  <span className="things-parcel-prop-val" style={{ fontSize: '12.5px' }}>
                    {primaryParcel.tenureType || 'Private Freehold'}
                  </span>
                </div>
                <div className="things-parcel-prop-box">
                  <span className="things-parcel-prop-label">Title / Dispute State</span>
                  <span className="things-parcel-prop-val" style={{ color: primaryParcel.disputed ? 'var(--to-rose)' : '#059669' }}>
                    {primaryParcel.disputed ? '⚠️ Disputed Title' : '✓ Clean / Freehold'}
                  </span>
                </div>
              </div>

              {/* Multi-parcel Table if present */}
              {task.relevantParcels && task.relevantParcels.length > 1 && (
                <div style={{ marginTop: '18px' }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--to-fog)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                    All Cohort Cadastral Parcels ({task.relevantParcels.length})
                  </span>
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
                        {task.relevantParcels.map((parcel) => (
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
              )}
            </div>

            {/* Dimension 2: Workflow Node & Cadre Card */}
            <div className="things-task-card">
              <div className="things-task-card-header">
                <h4 className="things-task-card-title">
                  <span>⚙️</span> Operational Workflow Node
                </h4>
                <span className={`things-branch-pill branch-${branchType.toLowerCase()}`}>
                  {branchType}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="things-parcel-prop-box">
                  <span className="things-parcel-prop-label">Node Identifier</span>
                  <span className="things-parcel-prop-val mono">{task.workflowNode?.id || task.stageId}</span>
                </div>
                <div className="things-parcel-prop-box">
                  <span className="things-parcel-prop-label">Node Type</span>
                  <span className="things-parcel-prop-val">{task.workflowNode?.type || 'SUB_DIVISION'}</span>
                </div>
                <div className="things-parcel-prop-box">
                  <span className="things-parcel-prop-label">Designated Cadre</span>
                  <span className="things-parcel-prop-val" style={{ fontSize: '12.5px' }}>
                    {task.workflowNode?.responsibility || task.department}
                  </span>
                </div>
                <div className="things-parcel-prop-box">
                  <span className="things-parcel-prop-label">Statutory SLA Window</span>
                  <span className="things-parcel-prop-val">{task.slaDays} Calendar Days</span>
                </div>
              </div>
            </div>

            {/* Previous Stage Context Callout */}
            <div className="things-task-card">
              <div className="things-task-card-header">
                <h4 className="things-task-card-title">
                  <span style={{ color: 'var(--to-signal-blue)' }}>&#9432;</span> Operational Context &amp; Handover Notes
                </h4>
              </div>
              <div className="things-task-context-callout">
                <em>
                  "{task.previousStageNotes || 'Project requisition submitted by Proponent under RFCTLARR Section 20(E).'}"
                </em>
              </div>
            </div>

          </div>

          {/* Right Column: Dimensions 7, 8, 9, 10 (Documents, Evidence, OCR, Verification & Actions) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Dimension 8: Ground Evidence Repository (POST/GET /api/v1/tasks/:taskId/evidence) */}
            <div className="things-task-card">
              <div className="things-task-card-header">
                <div>
                  <h4 className="things-task-card-title">
                    <span>🗺️</span> Ground Evidence Repository
                  </h4>
                  <p className="things-task-card-subtitle">
                    Inspection Panchnama, ground photos, and cadastral vector maps (<code style={{ fontSize: '11px' }}>/api/v1/tasks/:taskId/evidence</code>)
                  </p>
                </div>

                {/* Evidence Upload Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select
                    value={selectedEvidenceType}
                    onChange={(e) => setSelectedEvidenceType(e.target.value as any)}
                    className="things-btn-outline"
                    style={{ padding: '6px 10px', fontSize: '12px', background: '#fff' }}
                  >
                    <option value="PANCHNAMA">Inspection Panchnama</option>
                    <option value="GROUND_PHOTO">Ground Photo</option>
                    <option value="CADASTRAL_MAP">Cadastral Vector / Map</option>
                    <option value="REVENUE_EXTRACT">Revenue Extract</option>
                    <option value="OTHER">Other Ground Evidence</option>
                  </select>

                  <button
                    type="button"
                    onClick={handleUploadEvidenceClick}
                    disabled={uploadingEvidence || task.status === 'REJECTED'}
                    className="things-btn-primary"
                    title="Upload panchnama or ground photos via POST /api/v1/tasks/:taskId/evidence"
                  >
                    <span>📷</span> {uploadingEvidence ? 'Registering...' : '+ Upload Evidence'}
                  </button>
                </div>
              </div>

              {evidenceList.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed var(--to-hairline)' }}>
                  <span style={{ fontSize: '13px', color: 'var(--to-fog)' }}>
                    No ground evidence items registered yet. Upload inspection panchnama or ground photos.
                  </span>
                </div>
              ) : (
                <div className="things-evidence-list">
                  {evidenceList.map((item) => (
                    <div key={item.id} className="things-evidence-item">
                      <div className="things-evidence-meta">
                        <div className="things-evidence-icon">
                          {item.evidenceType === 'GROUND_PHOTO' ? '🖼️' : item.evidenceType === 'CADASTRAL_MAP' ? '🗺️' : '📄'}
                        </div>
                        <div>
                          <span className="things-evidence-name">{item.fileName}</span>
                          <div className="things-evidence-sub">
                            <span className="things-cohort-pill">{item.evidenceType}</span>
                            <span>•</span>
                            <span>{item.fileSize || '1.5 MB'}</span>
                            <span>•</span>
                            <span>Uploaded by {item.uploadedBy}</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {item.hash && (
                          <span className="things-evidence-hash" title={`SHA-256: ${item.hash}`}>
                            {item.hash.substring(0, 14)}...
                          </span>
                        )}
                        <span className="things-officer-pill status-completed">
                          ✓ REGISTERED
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dimension 7: Required Statutory Documents */}
            <div className="things-task-card">
              <div className="things-task-card-header">
                <div>
                  <h4 className="things-task-card-title">
                    <span>📁</span> Required Statutory Documents
                  </h4>
                  <p className="things-task-card-subtitle">
                    Official soft copy templates, uploaded scans, and certified digital records
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadFullDossier}
                  disabled={downloadingDoc === 'DOSSIER'}
                  className="things-btn-outline"
                  title="Download all submitted requisition documents and schedules for this project"
                >
                  <span>⬇️</span> {downloadingDoc === 'DOSSIER' ? 'Downloading...' : 'Download Full Requisition Dossier'}
                </button>
              </div>

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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="things-task-doc-name">
                            {doc.name}
                          </span>
                          {doc.mandatory && (
                            <span style={{ fontSize: '10.5px', color: 'var(--to-rose)', fontWeight: 700 }}>
                              *MANDATORY
                            </span>
                          )}
                        </div>
                        <span className={`things-task-doc-sub ${isVerified ? 'verified' : isUploaded ? 'uploaded' : ''}`}>
                          {isVerified
                            ? '✓ Certified Soft Copy Digitized & Verified in Registry'
                            : isUploaded
                            ? '📷 Hard Copy Attached • AI Soft Copy Form Suggestions Ready'
                            : `${doc.type} • ${matchedProjectDoc ? 'Submitted Soft Copy Available' : 'Statutory Form Template Ready'}`}
                        </span>
                      </div>

                      <div className="things-task-doc-actions">
                        <button
                          type="button"
                          onClick={() => handleDownloadSoftCopy(doc.name)}
                          disabled={isDownloading}
                          className="things-btn-outline"
                          title="Download official soft copy or template to inspect or print physical record"
                        >
                          <span>⬇️</span> {isDownloading ? 'Downloading...' : 'Download Soft Copy'}
                        </button>

                        {isMissing && (
                          <button
                            type="button"
                            onClick={() => handleUploadClick(doc.id)}
                            disabled={isUploading || task.status === 'REJECTED'}
                            className="things-btn-primary"
                            title="Upload scanned image or photo of physical stamped hard copy"
                          >
                            <span>📷</span> {isUploading ? 'Uploading...' : 'Upload Hard Copy'}
                          </button>
                        )}

                        {isCurrentlyProcessingOcr && !isOcrVerified && (
                          <span className="things-ocr-running-badge">
                            ⚡ AI OCR RUNNING...
                          </span>
                        )}

                        {isUploaded && !isCurrentlyProcessingOcr && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenOcrForm(doc)}
                              className="things-btn-primary"
                              title="Click to open side-by-side viewer with AI OCR soft copy form filling suggestions"
                            >
                              <span>⚡</span> Review Soft Copy Form
                            </button>
                          </div>
                        )}

                        {isVerified && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="things-officer-pill status-completed">
                              ✓ VERIFIED
                            </span>
                            <button
                              type="button"
                              onClick={() => handleInspectVerifiedDoc(doc)}
                              className="things-btn-outline"
                              title="Inspect verified soft copy form values and physical scan side-by-side"
                            >
                              👁️ Inspect
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dimension 9: OCR Intelligence Card */}
            <div className="things-task-card">
              <div className="things-task-card-header">
                <div>
                  <h4 className="things-task-card-title">
                    <span style={{ color: 'var(--to-signal-blue)' }}>⚡</span> Gemini OCR Intelligence
                  </h4>
                  <p className="things-task-card-subtitle">
                    Automated entity extraction and spatial boundary alignment verification
                  </p>
                </div>
                {task.ocrExtraction && (
                  <span className="things-ocr-confidence-badge">
                    {Math.round((task.ocrExtraction.confidenceScore || 0.95) * 100)}% Confidence
                  </span>
                )}
              </div>

              {task.ocrExtraction?.extractedFields ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                  {Object.entries(task.ocrExtraction.extractedFields).map(([k, v]) => (
                    <div key={k} className="things-parcel-prop-box">
                      <span className="things-parcel-prop-label">{k.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="things-parcel-prop-val">{v.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '14px', backgroundColor: '#f8fafc', borderRadius: '8px', fontSize: '13px', color: 'var(--to-fog)' }}>
                  Upload hard-copy scans in the documents section above to trigger Gemini AI extraction.
                </div>
              )}

              {/* Discrepancy Warnings (e.g. Cohort B) */}
              {task.ocrExtraction?.discrepancies && task.ocrExtraction.discrepancies.length > 0 && (
                <div className="things-discrepancy-callout">
                  <span style={{ fontSize: '18px' }}>⚠️</span>
                  <div>
                    <strong>Spatial / Statutory Discrepancy Noted:</strong>
                    <ul style={{ margin: '4px 0 0 0', paddingLeft: '18px' }}>
                      {task.ocrExtraction.discrepancies.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Dimension 10: Human Verification Affirmations (POST /api/v1/documents/:documentId/verify) */}
            <div className="things-task-card">
              <div className="things-task-card-header">
                <div>
                  <h4 className="things-task-card-title">
                    <span>✍️</span> Statutory Human Verification &amp; Affirmations
                  </h4>
                  <p className="things-task-card-subtitle">
                    Officer affirmations checklist under RFCTLARR Act 2013 (Section 91: <code style={{ fontSize: '11px' }}>POST /api/v1/documents/:documentId/verify</code>)
                  </p>
                </div>
                {isAffirmationSaved && (
                  <span className="things-officer-pill status-completed">
                    ✓ AFFIRMED &amp; STAMPED
                  </span>
                )}
              </div>

              <div className="things-affirmations-box">
                <label className="things-affirm-item">
                  <input
                    type="checkbox"
                    checked={affirmations.boundaryAffirmed}
                    onChange={(e) => setAffirmations(prev => ({ ...prev, boundaryAffirmed: e.target.checked }))}
                    disabled={isAffirmationSaved || task.status === 'ACCEPTED' || task.status === 'REJECTED'}
                    className="things-affirm-checkbox"
                  />
                  <div className="things-affirm-content">
                    <span className="things-affirm-title">1. Spatial Boundary &amp; Demarcation Affirmed</span>
                    <span className="things-affirm-desc">Boundary coordinates verified on ground inspection against cadastral GIS master layer.</span>
                  </div>
                </label>

                <label className="things-affirm-item">
                  <input
                    type="checkbox"
                    checked={affirmations.khasraSurveyAffirmed}
                    onChange={(e) => setAffirmations(prev => ({ ...prev, khasraSurveyAffirmed: e.target.checked }))}
                    disabled={isAffirmationSaved || task.status === 'ACCEPTED' || task.status === 'REJECTED'}
                    className="things-affirm-checkbox"
                  />
                  <div className="things-affirm-content">
                    <span className="things-affirm-title">2. Khasra Number &amp; Village Area Authenticated</span>
                    <span className="things-affirm-desc">Total acreage verified matching Jamabandi schedule and Section 20(E) notification.</span>
                  </div>
                </label>

                <label className="things-affirm-item">
                  <input
                    type="checkbox"
                    checked={affirmations.ownershipLedgerAffirmed}
                    onChange={(e) => setAffirmations(prev => ({ ...prev, ownershipLedgerAffirmed: e.target.checked }))}
                    disabled={isAffirmationSaved || task.status === 'ACCEPTED' || task.status === 'REJECTED'}
                    className="things-affirm-checkbox"
                  />
                  <div className="things-affirm-content">
                    <span className="things-affirm-title">3. Land Ownership &amp; Khatauni Ledger Confirmed</span>
                    <span className="things-affirm-desc">Recorded tenure rights and title-holders confirmed in official revenue ledger.</span>
                  </div>
                </label>

                <label className="things-affirm-item">
                  <input
                    type="checkbox"
                    checked={affirmations.noEncumbranceAffirmed}
                    onChange={(e) => setAffirmations(prev => ({ ...prev, noEncumbranceAffirmed: e.target.checked }))}
                    disabled={isAffirmationSaved || task.status === 'ACCEPTED' || task.status === 'REJECTED'}
                    className="things-affirm-checkbox"
                  />
                  <div className="things-affirm-content">
                    <span className="things-affirm-title">4. Nil Encumbrance &amp; Clear Title Affirmed</span>
                    <span className="things-affirm-desc">Confirmed no undisclosed court stays, bank mortgages, or pending legal disputes.</span>
                  </div>
                </label>

                <div style={{ marginTop: '10px' }}>
                  <label className="things-form-label" style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--to-ash)' }}>
                    Officer Scrutiny Remarks &amp; Statutory Notes:
                  </label>
                  <input
                    type="text"
                    value={affirmations.officerRemarks || ''}
                    onChange={(e) => setAffirmations(prev => ({ ...prev, officerRemarks: e.target.value }))}
                    disabled={isAffirmationSaved || task.status === 'ACCEPTED' || task.status === 'REJECTED'}
                    placeholder="Enter official revenue scrutiny findings..."
                    className="things-ocr-input"
                    style={{ marginTop: '6px' }}
                  />
                </div>

                {!isAffirmationSaved && task.status === 'IN_PROGRESS' && (
                  <button
                    type="button"
                    onClick={handleSaveAffirmations}
                    disabled={verifyingAffirmations || !allAffirmationsChecked}
                    className="things-btn-primary"
                    style={{ alignSelf: 'flex-start', marginTop: '6px' }}
                  >
                    <span>🔏</span> {verifyingAffirmations ? 'Signing Verification...' : 'Affirm & Digitally Stamp Scrutiny'}
                  </button>
                )}

                {isAffirmationSaved && (
                  <div style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--to-emerald-tint)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span>✓</span>
                    <span>
                      Digitally signed and stamped by <strong>{task.assignedOfficer?.name}</strong> on {task.verification?.affirmations?.verifiedAt ? new Date(task.verification.affirmations.verifiedAt).toLocaleDateString() : 'today'}.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Operational Stage Affirmation & Terminal Actions Card */}
            <div className="things-task-card">
              {task.status === 'ACCEPTED' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '24px', color: 'var(--to-emerald)' }}>✓</span>
                    <div>
                      <h4 className="things-task-card-title" style={{ margin: 0 }}>
                        Stage Statutory Acceptance Completed
                      </h4>
                      <span style={{ fontSize: '12px', color: 'var(--to-fog)' }}>
                        Statutory Milestone Reached • Downstream Execution Advanced
                      </span>
                    </div>
                  </div>
                  <p style={{ fontSize: '13.5px', color: 'var(--to-ink)', margin: '0 0 16px 0', lineHeight: 1.6 }}>
                    This acquisition cohort stage has been formally affirmed and accepted under RFCTLARR Act 2013. The runtime execution engine has updated parcel execution records and advanced the cohort to subsequent compensation/possession stages.
                  </p>
                  <div style={{ padding: '12px 16px', backgroundColor: '#f8fafc', border: '1px solid var(--to-hairline)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--to-fog)' }}>
                      Completed: {task.completedAt ? new Date(task.completedAt).toLocaleString() : new Date().toLocaleString()}
                    </span>
                    <Link to="/officer/dashboard" className="things-btn-outline" style={{ fontSize: '12px' }}>
                      Return to Dashboard
                    </Link>
                  </div>
                </div>
              ) : task.status === 'ASSIGNED' ? (
                <div>
                  <h4 className="things-task-card-title" style={{ marginBottom: '6px' }}>
                    Start Task Scrutiny
                  </h4>
                  <p className="things-task-card-subtitle" style={{ marginBottom: '18px', lineHeight: '1.5' }}>
                    This statutory task is currently ASSIGNED to your docket. Initiate scrutiny to open the operational phase and begin field verification.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartTask}
                    disabled={submitting}
                    className="things-btn-primary"
                    style={{ width: '100%', padding: '12px', fontSize: '14px', justifyContent: 'center' }}
                  >
                    {submitting ? 'Starting...' : '▶ Start Task Scrutiny (POST /api/v1/tasks/:taskId/start)'}
                  </button>
                </div>
              ) : task.status === 'REJECTED' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '20px', color: 'var(--to-rose)' }}>⚠️</span>
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
              ) : (
                <div>
                  <h4 className="things-task-card-title" style={{ marginBottom: '6px' }}>
                    Statutory Stage Decision
                  </h4>
                  <p className="things-task-card-subtitle" style={{ marginBottom: '20px', lineHeight: '1.55' }}>
                    By accepting this stage, you digitally affirm verification of physical ground records, cadastral boundaries, and ownership ledgers under RFCTLARR Act 2013.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Affirm & Accept Stage button (POST /api/v1/tasks/:taskId/accept) */}
                    <button
                      type="button"
                      onClick={handleAccept}
                      disabled={submitting || !isReadyToAccept}
                      className="things-btn-success"
                      style={{ width: '100%', padding: '12px', fontSize: '14px', justifyContent: 'center' }}
                    >
                      {submitting ? 'Processing Affirmation...' : '✓ Affirm & Accept Stage (POST /tasks/:taskId/accept)'}
                    </button>

                    {/* Reject to Proponent button (POST /api/v1/tasks/:taskId/reject) */}
                    <button
                      type="button"
                      onClick={() => setShowRejectModal(true)}
                      disabled={submitting}
                      className="things-btn-danger-outline"
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Reject to Requesting Authority (Reason Required)
                    </button>
                  </div>

                  {!isReadyToAccept && (
                    <div className="things-task-affirm-note" style={{ marginTop: '12px' }}>
                      {hasMissingDocs
                        ? 'Cannot affirm: Missing mandatory required physical documents.'
                        : hasUnverifiedDocs
                        ? 'Cannot affirm: Uploaded physical documents require officer review & AI OCR soft copy affirmation.'
                        : !isAffirmationSaved && !allAffirmationsChecked
                        ? 'Cannot affirm: Complete all 4 statutory human verification affirmations above.'
                        : 'Cannot affirm: Pending statutory verification.'}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Phase 9, 11 & 12: AI Intelligence Fullscreen Modal */}
        {showOcrModal && ocrStatus && (() => {
          let currentStep = 1;
          if (ocrStatus.status === 'OCR_PROCESSING') currentStep = 2;
          else if (ocrStatus.status === 'GEMINI_EXTRACTING') currentStep = 3;
          else if (ocrStatus.status === 'COMPLETED') {
            if (isOcrVerified) currentStep = 6;
            else if (Object.keys(correctedFields).length > 0) currentStep = 5;
            else currentStep = 4;
          }
          if (task.status === 'ACCEPTED') currentStep = 7;

          return (
            <div className="things-modal-overlay">
              <div className="things-ocr-modal-box" style={{ maxWidth: '1180px', width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>

                {/* 7-Step Statutory Pipeline Stepper (Phase 12 Acceptance Flow) */}
                <div className="things-ocr-stepper">
                  <div className={`things-ocr-step ${currentStep >= 1 ? (currentStep === 1 ? 'is-active' : 'is-completed') : ''}`}>
                    <span className="things-ocr-step-circle">{currentStep > 1 ? '✓' : '1'}</span>
                    <span>1. Upload Scan</span>
                    <span className="things-ocr-step-arrow">→</span>
                  </div>
                  <div className={`things-ocr-step ${currentStep >= 2 ? (currentStep === 2 ? 'is-active' : 'is-completed') : ''}`}>
                    <span className="things-ocr-step-circle">{currentStep > 2 ? '✓' : '2'}</span>
                    <span>2. OCR Processing</span>
                    <span className="things-ocr-step-arrow">→</span>
                  </div>
                  <div className={`things-ocr-step ${currentStep >= 3 ? (currentStep === 3 ? 'is-active' : 'is-completed') : ''}`}>
                    <span className="things-ocr-step-circle">{currentStep > 3 ? '✓' : '3'}</span>
                    <span>3. Gemini Extraction</span>
                    <span className="things-ocr-step-arrow">→</span>
                  </div>
                  <div className={`things-ocr-step ${currentStep >= 4 ? (currentStep === 4 ? 'is-active' : 'is-completed') : ''}`}>
                    <span className="things-ocr-step-circle">{currentStep > 4 ? '✓' : '4'}</span>
                    <span>4. View Confidence</span>
                    <span className="things-ocr-step-arrow">→</span>
                  </div>
                  <div className={`things-ocr-step ${currentStep >= 5 ? (currentStep === 5 ? 'is-active' : 'is-completed') : ''}`}>
                    <span className="things-ocr-step-circle">{currentStep > 5 ? '✓' : '5'}</span>
                    <span>5. Correct Fields</span>
                    <span className="things-ocr-step-arrow">→</span>
                  </div>
                  <div className={`things-ocr-step ${currentStep >= 6 ? (currentStep === 6 ? 'is-active' : 'is-completed') : ''}`}>
                    <span className="things-ocr-step-circle">{currentStep > 6 ? '✓' : '6'}</span>
                    <span>6. Human Verification</span>
                    <span className="things-ocr-step-arrow">→</span>
                  </div>
                  <div className={`things-ocr-step ${currentStep >= 7 ? 'is-completed' : ''}`}>
                    <span className="things-ocr-step-circle">7</span>
                    <span>7. Accept Stage</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  {/* Left: Document Viewer */}
                  <div className="things-ocr-viewer-pane">
                    <div className="things-ocr-viewer-header">
                      <div className="things-ocr-viewer-title">
                        <span>👁️</span>
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
                          Open in New Tab ↗
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
                      <div>
                        <h3 className="things-ocr-panel-title">
                          <span style={{ color: 'var(--to-signal-blue)' }}>✦</span> Gemini Intelligence &bull; Soft Copy Form Filling
                        </h3>
                        <div style={{ fontSize: '11px', color: 'var(--to-fog)', marginTop: '2px', fontFamily: 'var(--to-font-mono)' }}>
                          V2 Runtime: Task #{task.id} &bull; Stage {task.stageId} &bull; Project {task.projectCode}
                        </div>
                      </div>
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
                        <p style={{ fontSize: '13px', color: 'var(--to-fog)', marginBottom: '16px', lineHeight: '1.5' }}>
                          AI has processed physical scan via BullMQ/Redis and extracted statutory parameters. Review confidence and edit any field below to record human correction.
                        </p>
                      ) : (
                        <p style={{ fontSize: '13px', color: 'var(--to-ink)', marginBottom: '16px', lineHeight: '1.5', fontWeight: 600 }}>
                          Verified soft copy form values recorded in the statutory registry.
                        </p>
                      )}

                      {/* Polling States */}
                      {ocrStatus.status === 'OCR_PROCESSING' && (
                        <div style={{ padding: '28px 20px', backgroundColor: '#fafbfc', border: '1px solid var(--to-hairline)', textAlign: 'center', borderRadius: '10px' }}>
                          <div style={{ color: 'var(--to-signal-blue)', fontWeight: 600, marginBottom: '6px', fontSize: '14.5px' }}>Running Cloud Vision OCR...</div>
                          <div style={{ fontSize: '12.5px', color: 'var(--to-fog)' }}>Extracting raw text from hard copy scan. (GET /api/v1/documents/:id/processing)</div>
                        </div>
                      )}
                      {ocrStatus.status === 'GEMINI_EXTRACTING' && (
                        <div style={{ padding: '28px 20px', backgroundColor: '#fafbfc', border: '1px solid var(--to-hairline)', textAlign: 'center', borderRadius: '10px' }}>
                          <div style={{ color: 'var(--to-ink)', fontWeight: 600, marginBottom: '6px', fontSize: '14.5px' }}>Gemini LLM Structuring Data...</div>
                          <div style={{ fontSize: '12.5px', color: 'var(--to-fog)' }}>Populating soft copy form filling suggestions from scanned evidence. (GET /api/v1/documents/:id/extraction)</div>
                        </div>
                      )}

                      {(ocrStatus.status === 'EMPTY' || ocrStatus.status === 'FAILED') && (
                        <div style={{ padding: '24px 20px', backgroundColor: '#fff8f8', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span style={{ fontSize: '18px', color: 'var(--to-rose)' }}>⚠️</span>
                            <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#991b1b' }}>
                              {ocrStatus.status === 'EMPTY' ? 'No Statutory Fields Could Be Read' : 'AI Extraction Unavailable'}
                            </span>
                          </div>
                          <p style={{ fontSize: '13px', color: 'var(--to-ink)', lineHeight: 1.55, margin: '0 0 8px 0' }}>
                            {ocrStatus.status === 'EMPTY'
                              ? <>The AI classified this scan but could not extract any field values from it. Re-upload a clearer scan.</>
                              : 'The AI parser could not be reached, or it did not respond in time.'}
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
                            📷 Re-upload Scan &amp; Retry
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
                              const isCorrected = Boolean(correctedFields[key]);
                              const confidenceClass = confidence >= 90 ? 'confidence-high' : confidence >= 70 ? 'confidence-med' : 'confidence-low';
                              const isEditable = !isOcrVerified;

                              return (
                                <div key={key} className="things-ocr-field-group">
                                  <div className="things-ocr-field-header">
                                    <label className="things-ocr-field-label">
                                      {key.replace(/([A-Z])/g, ' $1')}
                                    </label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      {isCorrected && (
                                        <span className="things-ocr-corrected-badge">
                                          ✏️ Corrected by Officer
                                        </span>
                                      )}
                                      {confidence && (
                                        <span className={`things-ocr-confidence-badge ${confidenceClass}`}>
                                          {confidence}% AI Confidence
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <input
                                    type="text"
                                    value={value as string}
                                    onChange={(e) => handleOcrDataChange(key, e.target.value)}
                                    readOnly={!isEditable}
                                    className={`things-ocr-input ${isCorrected ? 'is-corrected' : ''}`}
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
                              {ocrSubmitting ? 'Verifying & Saving Soft Copy...' : '✓ Affirm AI Extraction & Save Soft Copy (POST /documents/:id/verify)'}
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
                                ✓ Soft Copy Form Verified &amp; Saved in Statutory Registry
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
                                Return to Task Docket
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          );
        })()}

        {/* Sovereign Rejection Modal (Reason Required) */}
        {showRejectModal && (
          <div className="things-modal-overlay">
            <div className="things-reject-modal-box">
              <h3 className="things-reject-title">
                Reject Workflow Stage to Requesting Authority
              </h3>
              <p className="things-reject-desc">
                Provide an official statutory reason for rejection under RFCTLARR Act 2013 (<code style={{ fontSize: '11.5px' }}>POST /api/v1/tasks/:taskId/reject</code>). This formal remittal defect notice will be transmitted directly to the Proponent for corrective action. (BOSS does not return to the workflow).
              </p>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Northern boundary offset by 1.5 meters against Gazette corridor alignment. Please correct spatial coordinates and resubmit."
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
                  {submitting ? 'Rejecting...' : 'Confirm Statutory Rejection'}
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
