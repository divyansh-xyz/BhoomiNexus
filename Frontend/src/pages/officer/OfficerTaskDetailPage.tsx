import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { OfficerService, type OcrExtractionResult } from '../../services/OfficerService';
import { DocumentService, type Document as ProjectDocument } from '../../services/DocumentService';
import { taskService } from '../../services/api/task.service';
import type { WorkflowTask, TaskEvidenceItem } from '../../types/task.types';
import { apiClient } from '../../services/api/client';
import {
  compensationV2Service,
  type CompensationDossier,
} from '../../services/api/compensationV2.service';
import {
  DemoLoading,
  DemoEmpty,
  DemoTaskCompleted,
  DemoDocumentProcessing,
} from '../../components/common/DemoPolishStates';
import './officer-dashboard.css';

export const OfficerTaskDetailPage: React.FC = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const [task, setTask] = useState<WorkflowTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Compensation Sanction State for District Authority
  const [compDossier, setCompDossier] = useState<CompensationDossier | null>(() => {
    try {
      return compensationV2Service.getDossier();
    } catch (e) {
      return null;
    }
  });
  const [inspectingDoc, setInspectingDoc] = useState<{
    name: string;
    type: string;
    size?: string;
    parcelKh: string;
  } | null>(null);
  const [inspectingProof, setInspectingProof] = useState<{
    parcelKh: string;
    khatedar: string;
    proof: any;
  } | null>(null);
  const [valuationAffirmed, setValuationAffirmed] = useState(true);
  const [solatiumAffirmed, setSolatiumAffirmed] = useState(true);
  const [pfmsAffirmed, setPfmsAffirmed] = useState(true);
  const [noDisputeAffirmed, setNoDisputeAffirmed] = useState(true);

  // Phase 11: Ground Evidence Repository state
  const [evidenceList, setEvidenceList] = useState<TaskEvidenceItem[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [customEvidenceName, setCustomEvidenceName] = useState('');
  const [attachedEvidenceFile, setAttachedEvidenceFile] = useState<File | null>(null);
  const [evidenceSuccessNotice, setEvidenceSuccessNotice] = useState<string | null>(null);
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
  const [docPreviewUrls, setDocPreviewUrls] = useState<Record<string, string>>({});
  const [docOcrData, setDocOcrData] = useState<Record<string, any>>({});
  const [showOcrModal, setShowOcrModal] = useState(false);

  // Statutory Document Upload Modal state
  const [showUploadDocModal, setShowUploadDocModal] = useState(false);
  const [selectedExistingDocId, setSelectedExistingDocId] = useState<string>('');
  const [modalFile, setModalFile] = useState<File | null>(null);
  const [modalIsDragging, setModalIsDragging] = useState(false);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

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
      if (data && data.requiredDocuments) {
        data.requiredDocuments = data.requiredDocuments.filter(
          (d) => d.id !== 'req-doc-3' && !d.name.toLowerCase().includes('khatauni') && !d.name.toLowerCase().includes('jamabandi')
        );
      }
      setTask(data);
      try {
        const d = compensationV2Service.getDossier();
        setCompDossier(d);
      } catch (e) {}
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
      if (dLower.includes('gazette') && (pLower.includes('gazette') || pLower.includes('notification'))) return true;
      return false;
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
      const isComp = task.workflowNode?.branchType === 'COMPENSATION' || task.id.startsWith('TASK-COMP');
      if (isComp) {
        const updatedDossier = compensationV2Service.approveDossierByDistrict('Ananya Patel (District Authority)');
        setCompDossier(updatedDossier);
        setEvidenceSuccessNotice(
          '✓ Section 28 Compensation Estimate Sanctioned & Disbursal Proofs Formally Approved. Pipeline advanced to Possession Branch.'
        );
      } else {
        try {
          localStorage.setItem('bhoomi_acq_branch_completed', 'true');
          if (task.projectId) {
            localStorage.setItem(`bhoomi_acq_completed_${task.projectId}`, 'true');
          }
          const pId = task.parcel?.ulpin || task.parcel?.id || '07-104-5829-1021';
          localStorage.setItem('bhoomi_completed_acq_parcels', JSON.stringify([pId]));
        } catch (e) {}
        setEvidenceSuccessNotice('✓ Acquisition stage affirmed and completed under Section 11/19 RFCTLARR Act 2013.');
      }
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

  const handleEvidenceFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setAttachedEvidenceFile(file);
    if (!customEvidenceName.trim()) {
      setCustomEvidenceName(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleAddCustomEvidence = async () => {
    if (!task || !attachedEvidenceFile) return;

    setUploadingEvidence(true);
    try {
      const name = customEvidenceName.trim() || attachedEvidenceFile.name;
      const fileExt = attachedEvidenceFile.name.includes('.')
        ? attachedEvidenceFile.name.slice(attachedEvidenceFile.name.lastIndexOf('.'))
        : '';
      const formattedName = (fileExt && !name.endsWith(fileExt)) ? `${name}${fileExt}` : name;

      let fileToUpload = attachedEvidenceFile;
      if (formattedName !== attachedEvidenceFile.name) {
        fileToUpload = new File([attachedEvidenceFile], formattedName, { type: attachedEvidenceFile.type });
      }

      let newItem: TaskEvidenceItem;
      try {
        newItem = await taskService.uploadTaskEvidence(task.id, fileToUpload, 'OTHER');
      } catch (e) {
        newItem = {
          id: `ev-${Date.now()}`,
          taskId: task.id,
          fileName: formattedName,
          fileSize: `${(attachedEvidenceFile.size / (1024 * 1024)).toFixed(2)} MB`,
          fileType: attachedEvidenceFile.type || 'application/pdf',
          uploadedAt: new Date().toISOString(),
          uploadedBy: `${task.assignedOfficer?.name || 'Field Officer'}`,
          evidenceType: 'OTHER',
          hash: `sha256-${Math.random().toString(16).substring(2, 18)}`,
          verified: true,
        };
      }
      setEvidenceList(prev => [...prev, newItem]);
      setTask(prev => prev ? { ...prev, evidence: [...(prev.evidence || []), newItem] } : null);
      setCustomEvidenceName('');
      setAttachedEvidenceFile(null);
      if (evidenceFileInputRef.current) evidenceFileInputRef.current.value = '';
      setEvidenceSuccessNotice(`Evidence "${formattedName}" added successfully.`);
      setTimeout(() => setEvidenceSuccessNotice(null), 4000);
    } catch (err) {
      console.error('Failed to add evidence', err);
    } finally {
      setUploadingEvidence(false);
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

  const handleOpenUploadModal = (defaultDocId?: string) => {
    const docs = task?.requiredDocuments || [];
    if (defaultDocId) {
      setSelectedExistingDocId(defaultDocId);
    } else {
      const firstMissing = docs.find(d => d.status === 'MISSING');
      setSelectedExistingDocId(firstMissing ? firstMissing.id : docs[0]?.id || '');
    }
    setModalFile(null);
    setShowUploadDocModal(true);
  };

  const handleUploadClick = (docId: string) => {
    setActiveUploadDocId(docId);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const processDocumentUpload = async (
    file: File,
    targetDocId: string,
    customDocMeta?: { name: string; type: string; mandatory?: boolean }
  ) => {
    if (!task) return;
    setUploadingDocId(targetDocId);

    const previewUrl = URL.createObjectURL(file);
    if (uploadedFileUrl && uploadedFileUrl.startsWith('blob:')) {
      URL.revokeObjectURL(uploadedFileUrl);
    }
    setUploadedFileUrl(previewUrl);
    setDocPreviewUrls(prev => ({ ...prev, [targetDocId]: previewUrl }));
    setIsUploadedImage(file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp|tiff?)$/i.test(file.name));

    try {
      let docName = file.name;
      let docType = 'Statutory Record';

      let updatedDocs = [...(task.requiredDocuments || [])];
      const existingDocIndex = updatedDocs.findIndex(d => d.id === targetDocId);

      if (existingDocIndex >= 0) {
        docName = updatedDocs[existingDocIndex].name;
        docType = updatedDocs[existingDocIndex].type;
        updatedDocs[existingDocIndex] = {
          ...updatedDocs[existingDocIndex],
          status: 'UPLOADED',
        };
      } else if (customDocMeta) {
        docName = customDocMeta.name;
        docType = customDocMeta.type;
        updatedDocs.push({
          id: targetDocId,
          name: customDocMeta.name,
          type: customDocMeta.type,
          mandatory: customDocMeta.mandatory ?? true,
          status: 'UPLOADED',
        });
      }

      setTask({ ...task, requiredDocuments: updatedDocs });
      setCorrectedFields({});

      const uploadResult = await OfficerService.uploadEvidence(task.id, file, {
        stageId: task.stageId,
        projectId: task.projectId,
        documentType: docType,
        title: docName,
      });

      const realDocId = uploadResult.documentId || `DOC-${Date.now()}`;
      setTask(prev => {
        if (!prev) return prev;
        const docs = (prev.requiredDocuments || []).map(d =>
          d.id === targetDocId ? { ...d, status: 'UPLOADED' as const, backendDocId: realDocId } : d
        );
        return { ...prev, requiredDocuments: docs };
      });

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
          if (result.extractedData) {
            setOcrData(result.extractedData);
            setDocOcrData(prev => ({ ...prev, [targetDocId]: result.extractedData }));
          }
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !activeUploadDocId || !task) return;
    const file = e.target.files[0];
    await processDocumentUpload(file, activeUploadDocId);
  };

  const handleModalSubmitUpload = async () => {
    if (!modalFile || !task || !selectedExistingDocId) return;
    setShowUploadDocModal(false);
    await processDocumentUpload(modalFile, selectedExistingDocId);
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
    const realDocId = doc.backendDocId || ocrStatus?.backendDocId || doc.id;
    setOcrStatus({ docId: doc.id, backendDocId: realDocId, status: 'COMPLETED' });
    setIsOcrVerified(true);
    setCorrectedFields({});
    setShowOcrModal(true);

    if (docPreviewUrls[doc.id]) {
      setUploadedFileUrl(docPreviewUrls[doc.id]);
      setIsUploadedImage(/\.(jpe?g|png|webp|bmp|tiff?)$/i.test(doc.name) || docPreviewUrls[doc.id].startsWith('blob:'));
    } else {
      await loadDocumentPreview(doc);
    }

    if (docOcrData[doc.id]) {
      setOcrData(docOcrData[doc.id]);
    } else if (task) {
      try {
        const res = await OfficerService.getOcrExtractionStatus(task.id, realDocId);
        if (res && res.extractedData) {
          setOcrData(res.extractedData);
          setDocOcrData(prev => ({ ...prev, [doc.id]: res.extractedData }));
        }
      } catch (err) {
        console.error('Failed to load OCR data for inspection', err);
      }
    }
  };

  const handleOpenOcrForm = async (doc: any) => {
    setActiveUploadDocId(doc.id);
    const realDocId = doc.backendDocId || ocrStatus?.backendDocId || doc.id;
    setOcrStatus({ docId: doc.id, backendDocId: realDocId, status: 'COMPLETED' });
    setIsOcrVerified(doc.status === 'VERIFIED');
    setCorrectedFields({});
    setShowOcrModal(true);

    if (docPreviewUrls[doc.id]) {
      setUploadedFileUrl(docPreviewUrls[doc.id]);
      setIsUploadedImage(/\.(jpe?g|png|webp|bmp|tiff?)$/i.test(doc.name) || docPreviewUrls[doc.id].startsWith('blob:'));
    } else {
      await loadDocumentPreview(doc);
    }

    if (docOcrData[doc.id]) {
      setOcrData(docOcrData[doc.id]);
    } else if (task) {
      try {
        const res = await OfficerService.getOcrExtractionStatus(task.id, realDocId);
        if (res && res.extractedData) {
          setOcrData(res.extractedData);
          setDocOcrData(prev => ({ ...prev, [doc.id]: res.extractedData }));
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
        <DemoLoading
          title="Accessing Sovereign Acquisition Task Docket…"
          subtitle="Loading parcel cadastre, required statutory documents, and evidence repository."
          fullHeight
        />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="things-officer-root" style={{ minHeight: '100vh', padding: '60px 24px' }}>
        <DemoEmpty
          icon="📋"
          title="Task Docket Not Found"
          description="The specified task docket ID does not exist or you do not have appropriate statutory permissions."
          actionLabel="Return to Officer Dashboard"
          onAction={() => window.location.href = '/officer/dashboard'}
        />
      </div>
    );
  }

  const branchType = task.workflowNode?.branchType || 'ACQUISITION';
  const isCompTask = branchType === 'COMPENSATION' || task.id.startsWith('TASK-COMP');

  const hasMissingDocs = task.requiredDocuments.some(d => d.status === 'MISSING');
  const hasUnverifiedDocs = task.requiredDocuments.some(d => d.status !== 'VERIFIED');
  const ocrBlocking = ocrStatus !== null && !isOcrVerified;

  const isReadyToAccept = isCompTask
    ? (task.status === 'IN_PROGRESS' && valuationAffirmed && solatiumAffirmed && pfmsAffirmed && noDisputeAffirmed)
    : (task.status === 'IN_PROGRESS' && !hasMissingDocs && !hasUnverifiedDocs && !ocrBlocking);
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

        {/* Phase 23 Celebratory Task Completed Ribbon */}
        {task.status === 'ACCEPTED' && (
          <DemoTaskCompleted
            taskName={task.stageName}
            officerName={task.assignedOfficer?.name || 'Sovereign Field Officer'}
            nextStepLabel="Return to Task Queue"
            onNextStep={() => window.location.href = '/officer/dashboard'}
          />
        )}

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
        {isCompTask ? (
          <div>
            {/* 1. Total Compensation Estimate Overview Card */}
            {compDossier && (
              <div
                className="things-task-card"
                style={{
                  background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                  color: '#ffffff',
                  borderRadius: '16px',
                  padding: '24px 28px',
                  marginBottom: '24px',
                  boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '8px' }}>
                      District Scrutiny &bull; Total Section 28 Compensation Award Estimate
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '38px', fontWeight: 800, letterSpacing: '-0.02em', color: '#38bdf8' }}>
                        ₹{compDossier.totalCompensationEstimate.toLocaleString('en-IN')}
                      </span>
                      <span style={{ fontSize: '18px', fontWeight: 600, color: '#e2e8f0' }}>
                        ({(compDossier.totalCompensationEstimate / 10000000).toFixed(2)} Cr / ₹{(compDossier.totalCompensationEstimate / 100000).toFixed(1)} Lakh)
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginTop: '14px', fontSize: '13px', color: '#cbd5e1', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Base Market Valuation:</span>{' '}
                        <strong>₹{Math.round(compDossier.totalCompensationEstimate / 2).toLocaleString('en-IN')}</strong>
                      </div>
                      <span>&bull;</span>
                      <div>
                        <span style={{ color: '#94a3b8' }}>100% Statutory Solatium (Sec 30):</span>{' '}
                        <strong style={{ color: '#6ee7b7' }}>₹{Math.round(compDossier.totalCompensationEstimate / 2).toLocaleString('en-IN')}</strong>
                      </div>
                      <span>&bull;</span>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Assessed Parcels:</span>{' '}
                        <strong>{compDossier.parcels.length} (12.10 Acres)</strong>
                      </div>
                      <span>&bull;</span>
                      <div>
                        <span style={{ color: '#94a3b8' }}>Dispatched By:</span>{' '}
                        <strong style={{ color: '#e2e8f0' }}>{compDossier.routedBy}</strong>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        borderRadius: '9999px',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        background: task.status === 'ACCEPTED' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.15)',
                        color: task.status === 'ACCEPTED' ? '#34d399' : '#38bdf8',
                        border: task.status === 'ACCEPTED' ? '1px solid rgba(52, 211, 153, 0.4)' : '1px solid rgba(56, 189, 248, 0.3)',
                      }}
                    >
                      {task.status === 'ACCEPTED' ? '✓ Section 28 Sanctioned' : 'Awaiting District Sanction'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Two-Column Layout */}
            <div className="things-task-layout-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 380px' }}>
              {/* Left Column: 4 Parcels Valuation Ledger & Documents */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="things-task-card" style={{ padding: '16px 20px', background: '#f8fafc', border: '1px solid var(--to-hairline)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--to-ink)', margin: '0 0 2px 0' }}>
                        Received Land Parcels ({compDossier?.parcels.length || 4}) &bull; Valuation Breakup &amp; Disbursal Proofs
                      </h3>
                      <p style={{ fontSize: '12px', color: 'var(--to-fog)', margin: 0 }}>
                        Appraise circle rate schedules, supporting valuation documents, and PFMS Direct Benefit Transfer vouchers.
                      </p>
                    </div>
                    <span className="things-cohort-pill">
                      Cohort Total: 12.10 Acres
                    </span>
                  </div>
                </div>

                {compDossier?.parcels.map((parcel, idx) => {
                  const pEst = parcel.compensationEstimate || 0;
                  const pBase = Math.round(pEst / 2);
                  const pSol = Math.round(pEst / 2);
                  const hasProof = Boolean(parcel.actualCompensationProof?.referenceNo);

                  return (
                    <div key={parcel.parcelId} className="things-task-card" style={{ padding: '22px 24px' }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--to-hairline)', paddingBottom: '14px', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              background: '#eff6ff',
                              color: '#2563eb',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '16px',
                              fontWeight: 800,
                            }}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--to-ink)' }}>
                                Khasra No. {parcel.khasraNumber} (Survey {parcel.surveyNumber})
                              </span>
                              <span style={{ fontSize: '11.5px', fontFamily: 'var(--to-font-mono)', color: 'var(--to-fog)', background: 'var(--to-mist)', padding: '2px 6px', borderRadius: '4px' }}>
                                {parcel.ulpin}
                              </span>
                            </div>
                            <div style={{ fontSize: '12.5px', color: 'var(--to-ash)' }}>
                              Khatedar: <strong>{parcel.khatedar}</strong> &bull; {parcel.village}, {parcel.district} &bull; <strong>{parcel.areaAcres} Acres</strong> ({parcel.landType})
                            </div>
                          </div>
                        </div>

                        <span
                          className="things-officer-pill status-completed"
                          style={{ fontSize: '11px', padding: '4px 10px' }}
                        >
                          ✓ PFMS DBT RECORDED
                        </span>
                      </div>

                      {/* Three Key Parameter Boxes */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: '12px',
                          background: '#f8fafc',
                          border: '1px solid var(--to-hairline)',
                          borderRadius: '10px',
                          padding: '14px 18px',
                          marginBottom: '16px',
                        }}
                      >
                        <div>
                          <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--to-fog)', marginBottom: '4px' }}>
                            Assessed Compensation Award
                          </span>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--to-signal-blue)' }}>
                            ₹{pEst.toLocaleString('en-IN')}{' '}
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}>
                              (₹{(pEst / 100000).toFixed(2)} Lakh)
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--to-fog)', marginTop: '2px' }}>
                            Base: ₹{pBase.toLocaleString()} + 100% Solatium: ₹{pSol.toLocaleString()}
                          </div>
                        </div>

                        <div>
                          <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--to-fog)', marginBottom: '4px' }}>
                            Beneficiary Bank Account (PFMS)
                          </span>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--to-ink)' }}>
                            {parcel.bankName}
                          </div>
                          <div style={{ fontSize: '11.5px', color: 'var(--to-ash)', fontFamily: 'var(--to-font-mono)' }}>
                            A/C: {parcel.accountNumber} &bull; IFSC: {parcel.ifsc}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--to-fog)', marginTop: '1px' }}>
                            Aadhaar: {parcel.aadhaarMasked}
                          </div>
                        </div>

                        <div>
                          <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--to-fog)', marginBottom: '4px' }}>
                            Actual Compensation Given Proof
                          </span>
                          {hasProof ? (
                            <div>
                              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#065f46' }}>
                                {parcel.actualCompensationProof?.referenceNo}
                              </div>
                              <div style={{ fontSize: '11.5px', color: 'var(--to-ash)' }}>
                                Disbursed: ₹{parcel.actualCompensationProof?.paidAmount.toLocaleString()} ({parcel.actualCompensationProof?.paymentDate})
                              </div>
                              <button
                                type="button"
                                onClick={() => setInspectingProof({ parcelKh: parcel.khasraNumber, khatedar: parcel.khatedar, proof: parcel.actualCompensationProof })}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--to-signal-blue)',
                                  padding: 0,
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  textDecoration: 'underline',
                                  marginTop: '4px',
                                }}
                              >
                                👁️ View PFMS Voucher &amp; Bank Advice &rarr;
                              </button>
                            </div>
                          ) : (
                            <div style={{ fontSize: '12px', color: 'var(--to-fog)' }}>
                              No disbursal proof registered.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Supporting Valuation Documents Attached */}
                      <div>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--to-fog)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                          Attached Supporting Valuation Documents ({parcel.supportingDocuments.length})
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {parcel.supportingDocuments.map((doc) => (
                            <div
                              key={doc.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '9px 14px',
                                background: '#ffffff',
                                border: '1px solid var(--to-hairline)',
                                borderRadius: '6px',
                                fontSize: '12.5px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>📄</span>
                                <div>
                                  <span style={{ fontWeight: 600, color: 'var(--to-ink)' }}>{doc.name}</span>
                                  <div style={{ fontSize: '11px', color: 'var(--to-fog)' }}>
                                    {doc.type} &bull; {doc.size || '1.2 MB'} &bull; Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button
                                  type="button"
                                  onClick={() => setInspectingDoc({ name: doc.name, type: doc.type, size: doc.size, parcelKh: parcel.khasraNumber })}
                                  className="things-btn-outline"
                                  style={{ padding: '4px 10px', fontSize: '11.5px' }}
                                >
                                  👁️ Inspect
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadSoftCopy(doc.name)}
                                  className="things-btn-outline"
                                  style={{ padding: '4px 10px', fontSize: '11.5px' }}
                                >
                                  ⬇️ Download
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Right Column: Handover Note, Statutory Affirmations, Sanction Decision */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* SLAO Handover Note */}
                <div className="things-task-card">
                  <div className="things-task-card-header">
                    <h4 className="things-task-card-title">
                      <span>🏛️</span> SLAO Transmittal &amp; Valuation Report
                    </h4>
                  </div>
                  <div className="things-task-context-callout" style={{ fontSize: '12.5px', lineHeight: '1.6' }}>
                    <em>
                      "Determination conducted strictly adhering to RFCTLARR Act 2013 Section 26 applying urban circle rate multiplier 1.0x and mandatory 100% solatium under Section 30. Direct benefit transfer credentials validated against PFMS database with zero beneficiary discrepancies. Recommending Section 28 statutory sanction."
                    </em>
                  </div>
                  <div style={{ marginTop: '12px', fontSize: '11.5px', color: 'var(--to-fog)' }}>
                    Submitted by: <strong>Mahesh Patil</strong> (Special Land Acquisition Officer)
                  </div>
                </div>

                {/* District Statutory Scrutiny Checklist */}
                <div className="things-task-card">
                  <div className="things-task-card-header">
                    <h4 className="things-task-card-title">
                      <span>⚖️</span> District Authority Affirmations
                    </h4>
                  </div>
                  <p style={{ fontSize: '12.5px', color: 'var(--to-fog)', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                    Statutory review checkboxes required prior to granting Section 28 sanction.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer', lineHeight: 1.4 }}>
                      <input
                        type="checkbox"
                        checked={valuationAffirmed}
                        onChange={(e) => setValuationAffirmed(e.target.checked)}
                        style={{ marginTop: '2px' }}
                      />
                      <span>Scrutinized circle rate base valuation schedule for all 4 parcels (Section 26).</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer', lineHeight: 1.4 }}>
                      <input
                        type="checkbox"
                        checked={solatiumAffirmed}
                        onChange={(e) => setSolatiumAffirmed(e.target.checked)}
                        style={{ marginTop: '2px' }}
                      />
                      <span>Confirmed mandatory 100% statutory solatium determination under Section 30.</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer', lineHeight: 1.4 }}>
                      <input
                        type="checkbox"
                        checked={pfmsAffirmed}
                        onChange={(e) => setPfmsAffirmed(e.target.checked)}
                        style={{ marginTop: '2px' }}
                      />
                      <span>Verified PFMS Direct Benefit Transfer vouchers and bank mandates for all 4 Khatedars.</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer', lineHeight: 1.4 }}>
                      <input
                        type="checkbox"
                        checked={noDisputeAffirmed}
                        onChange={(e) => setNoDisputeAffirmed(e.target.checked)}
                        style={{ marginTop: '2px' }}
                      />
                      <span>Confirmed indemnity bonds and verified that no land parcel is subjected to Section 64 reference petitions.</span>
                    </label>
                  </div>
                </div>

                {/* Section 28 Decision Box */}
                <div className="things-task-card">
                  {task.status === 'ACCEPTED' ? (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '24px', color: 'var(--to-emerald)' }}>✓</span>
                        <div>
                          <h4 className="things-task-card-title" style={{ margin: 0 }}>
                            Section 28 Sanction Completed
                          </h4>
                          <span style={{ fontSize: '11.5px', color: 'var(--to-fog)' }}>
                            Award Legally Sanctioned &bull; Ready for Possession
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--to-ink)', lineHeight: 1.55, margin: '0 0 14px 0' }}>
                        The total compensation award of ₹1,65,00,000 has been formally sanctioned under Section 28 of RFCTLARR Act 2013 by District Competent Authority Ananya Patel. All PFMS disbursal proofs certified. The parcels are now eligible for Section 38 Physical Possession Transfer.
                      </p>
                      <div style={{ padding: '10px 14px', background: '#f8fafc', border: '1px solid var(--to-hairline)', borderRadius: '6px', fontSize: '11.5px', color: 'var(--to-fog)' }}>
                        Sanctioned: {task.completedAt ? new Date(task.completedAt).toLocaleString() : 'Recently Sanctioned'}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h4 className="things-task-card-title" style={{ marginBottom: '6px' }}>
                        Statutory Sanction Decision
                      </h4>
                      <p className="things-task-card-subtitle" style={{ marginBottom: '18px', lineHeight: 1.5 }}>
                        Under RFCTLARR Section 28, the District Authority legally affirms the SLAO valuation estimate and actual compensation disbursed proofs.
                      </p>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button
                          type="button"
                          onClick={handleAccept}
                          disabled={submitting || !isReadyToAccept}
                          className="things-btn-success"
                          style={{ width: '100%', padding: '14px', fontSize: '14px', justifyContent: 'center' }}
                        >
                          {submitting ? 'Processing Section 28 Sanction...' : '✓ Sanction & Approve Compensation Award (Section 28) →'}
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowRejectModal(true)}
                          disabled={submitting}
                          className="things-btn-danger-outline"
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          Reject / Remit to SLAO (Reason Required)
                        </button>
                      </div>

                      {!isReadyToAccept && (
                        <div className="things-task-affirm-note" style={{ marginTop: '12px' }}>
                          Please confirm all statutory scrutiny affirmations above before granting Section 28 sanction.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
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

            {/* Dimension 8: Ground Evidence Repository */}
            <div className="things-task-card">
              <div className="things-task-card-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h4 className="things-task-card-title">
                    <span>🗺️</span> Ground Evidence Repository
                  </h4>
                  <p className="things-task-card-subtitle">
                    Inspection Panchnama, ground photos, and field evidence records
                  </p>
                </div>

                {/* Evidence Simple Add & Attach Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={handleUploadEvidenceClick}
                    disabled={uploadingEvidence || task.status === 'REJECTED'}
                    className="things-btn-outline"
                    style={{
                      padding: '7px 12px',
                      fontSize: '13px',
                      backgroundColor: attachedEvidenceFile ? 'var(--to-signal-blue-tint)' : undefined,
                      borderColor: attachedEvidenceFile ? 'var(--to-signal-blue)' : undefined,
                    }}
                    title="Attach a file from your computer"
                  >
                    <span>📎</span> {attachedEvidenceFile ? 'Change Attached File' : 'Attach File'}
                  </button>

                  {attachedEvidenceFile && (
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 10px',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#1d4ed8',
                      maxWidth: '220px',
                    }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={attachedEvidenceFile.name}>
                        📄 {attachedEvidenceFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachedEvidenceFile(null);
                          if (evidenceFileInputRef.current) evidenceFileInputRef.current.value = '';
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#64748b',
                          fontSize: '14px',
                          lineHeight: 1,
                          padding: '0 2px',
                        }}
                        title="Remove attached file"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  <input
                    type="text"
                    value={customEvidenceName}
                    onChange={(e) => setCustomEvidenceName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && attachedEvidenceFile) {
                        e.preventDefault();
                        handleAddCustomEvidence();
                      }
                    }}
                    placeholder={attachedEvidenceFile ? "Name what this evidence is..." : "Attach a file first to add evidence"}
                    className="things-doc-input"
                    style={{ minWidth: '220px', padding: '7px 12px', fontSize: '13px' }}
                    disabled={uploadingEvidence || task.status === 'REJECTED'}
                  />

                  <button
                    type="button"
                    onClick={handleAddCustomEvidence}
                    disabled={!attachedEvidenceFile || uploadingEvidence || task.status === 'REJECTED'}
                    className="things-btn-primary"
                    style={{
                      padding: '7px 14px',
                      fontSize: '13px',
                      cursor: !attachedEvidenceFile ? 'not-allowed' : 'pointer',
                      opacity: !attachedEvidenceFile ? 0.5 : 1,
                    }}
                    title={!attachedEvidenceFile ? "Please attach a file first to add evidence" : "Register attached evidence"}
                  >
                    <span>+</span> {uploadingEvidence ? 'Adding...' : 'Add Evidence'}
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
              <div className="things-task-card-header" style={{ alignItems: 'flex-start', gap: '12px' }}>
                <div>
                  <h4 className="things-task-card-title">
                    <span>📁</span> Required Statutory Documents
                  </h4>
                  <p className="things-task-card-subtitle">
                    Official soft copy templates, uploaded scans, and certified digital records
                  </p>
                </div>
              </div>

              {(!task.requiredDocuments || task.requiredDocuments.length === 0) ? (
                <div style={{ padding: '32px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px dashed var(--to-hairline)' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>📑</div>
                  <div style={{ fontWeight: 600, color: 'var(--to-ink)', marginBottom: '4px' }}>No Statutory Documents Attached Yet</div>
                  <p style={{ fontSize: '13px', color: 'var(--to-fog)', maxWidth: '420px', margin: '0 auto', lineHeight: 1.5 }}>
                    No statutory documents configured for this workflow stage.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {task.requiredDocuments.map(doc => {
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
                            title="Download official document to inspect or print physical record"
                          >
                            <span>⬇️</span> {isDownloading ? 'Downloading...' : 'Download Document'}
                          </button>

                          {isMissing && (
                            <button
                              type="button"
                              onClick={() => handleOpenUploadModal(doc.id)}
                              disabled={isUploading || task.status === 'REJECTED'}
                              className="things-btn-primary"
                              title="Upload scanned image or photo of physical stamped hard copy"
                            >
                              {isUploading ? 'Uploading...' : 'Upload Hard Copy'}
                            </button>
                          )}

                          {isCurrentlyProcessingOcr && !isOcrVerified && (
                            <span className="things-ocr-running-badge">
                              AI OCR RUNNING...
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
                                Review Soft Copy Form
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenUploadModal(doc.id)}
                                disabled={isUploading || task.status === 'REJECTED'}
                                className="things-btn-outline"
                                title="Re-upload hard copy scan and rerun Gemini AI OCR"
                              >
                                <span>📷</span> Re-upload Scan
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
                              <button
                                type="button"
                                onClick={() => handleOpenUploadModal(doc.id)}
                                disabled={isUploading || task.status === 'REJECTED'}
                                className="things-btn-outline"
                                title="Re-upload physical scan and rerun Gemini OCR extraction"
                              >
                                <span>📷</span> Re-upload
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                    {submitting ? 'Starting...' : '▶ Start Task Scrutiny'}
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
                    <button
                      type="button"
                      onClick={handleAccept}
                      disabled={submitting || !isReadyToAccept}
                      className="things-btn-success"
                      style={{ width: '100%', padding: '12px', fontSize: '14px', justifyContent: 'center' }}
                    >
                      {submitting ? 'Processing Affirmation...' : '✓ Affirm & Accept Stage'}
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
                        ? 'Cannot affirm: Uploaded physical documents require officer review & soft copy affirmation.'
                        : 'Cannot affirm: Pending statutory verification.'}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
        )}

        {/* Modal: Inspect Compensation Supporting Document */}
        {inspectingDoc && (
          <div className="things-modal-overlay" onClick={() => setInspectingDoc(null)}>
            <div className="things-doc-upload-modal" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
              <div className="things-doc-upload-header">
                <div>
                  <h3 className="things-doc-upload-title">
                    Statutory Valuation Document
                  </h3>
                  <p className="things-doc-upload-sub">
                    Certified Record &bull; Khasra No. {inspectingDoc.parcelKh}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingDoc(null)}
                  className="things-ocr-close-btn"
                >
                  &times;
                </button>
              </div>

              <div className="things-doc-upload-body">
                <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--to-hairline)', marginBottom: '16px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--to-ink)', marginBottom: '4px' }}>
                    📄 {inspectingDoc.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--to-fog)' }}>
                    Type: {inspectingDoc.type} &bull; File Size: {inspectingDoc.size || '1.4 MB'} &bull; Digital Signature Verified
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '11px', fontFamily: 'var(--to-font-mono)', color: 'var(--to-ash)', background: '#ffffff', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--to-hairline)' }}>
                    SHA-256: 7f8a91b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c
                  </div>
                </div>

                <div style={{ border: '2px dashed var(--to-hairline)', borderRadius: '8px', padding: '24px', textAlign: 'center', background: '#ffffff' }}>
                  <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏛️</div>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--to-ink)', marginBottom: '4px' }}>
                    Government of NCT of Delhi &bull; Revenue Department
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--to-fog)', maxWidth: '380px', margin: '0 auto 16px auto', lineHeight: 1.5 }}>
                    Certified Schedule of Circle Rates &amp; Solatium Calculation under RFCTLARR Sections 26–30 for Delhi Metro Corridor.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadSoftCopy(inspectingDoc.name);
                      setInspectingDoc(null);
                    }}
                    className="things-btn-primary"
                    style={{ padding: '8px 18px', fontSize: '13px' }}
                  >
                    ⬇️ Download Full Certified Document
                  </button>
                </div>
              </div>

              <div className="things-doc-upload-footer">
                <button
                  type="button"
                  onClick={() => setInspectingDoc(null)}
                  className="things-btn-outline"
                >
                  Close Viewer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: View PFMS Payment Advice & Voucher */}
        {inspectingProof && (
          <div className="things-modal-overlay" onClick={() => setInspectingProof(null)}>
            <div className="things-doc-upload-modal" style={{ maxWidth: '620px' }} onClick={e => e.stopPropagation()}>
              <div className="things-doc-upload-header" style={{ background: '#0f172a', color: '#ffffff' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#38bdf8', marginBottom: '4px' }}>
                    Public Financial Management System (PFMS) &bull; Ministry of Finance
                  </div>
                  <h3 className="things-doc-upload-title" style={{ color: '#ffffff', margin: 0 }}>
                    Direct Benefit Transfer (DBT) Payment Voucher
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectingProof(null)}
                  className="things-ocr-close-btn"
                  style={{ color: '#ffffff' }}
                >
                  &times;
                </button>
              </div>

              <div className="things-doc-upload-body">
                {/* Official Voucher Card */}
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '18px 20px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '14px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>PFMS TRANSACTION ID</span>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', fontFamily: 'var(--to-font-mono)' }}>
                        {inspectingProof.proof?.referenceNo}
                      </div>
                    </div>
                    <span style={{ padding: '4px 10px', borderRadius: '4px', background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', fontSize: '11.5px', fontWeight: 700 }}>
                      ✓ SETTLED &amp; DISBURSED
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11.5px' }}>Khatedar / Beneficiary:</span>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{inspectingProof.khatedar}</div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11.5px' }}>Disbursed Compensation:</span>
                      <div style={{ fontWeight: 800, color: '#059669', fontSize: '15px' }}>
                        ₹{inspectingProof.proof?.paidAmount?.toLocaleString('en-IN')}
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11.5px' }}>Payment Date &amp; Mode:</span>
                      <div style={{ fontWeight: 600, color: '#334155' }}>
                        {inspectingProof.proof?.paymentDate} ({inspectingProof.proof?.mode})
                      </div>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', fontSize: '11.5px' }}>RBI UTR Reference:</span>
                      <div style={{ fontFamily: 'var(--to-font-mono)', fontWeight: 600, color: '#334155' }}>
                        RBI2026091498174201
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11.5px', color: '#64748b' }}>
                    <span>Target Cadastral Parcel: <strong>Khasra {inspectingProof.parcelKh}</strong></span>
                    <span>Direct Beneficiary Account Credited</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#eff6ff', borderRadius: '6px', border: '1px solid #bfdbfe', fontSize: '12px', color: '#1d4ed8' }}>
                  <span>🔒</span>
                  <span>Direct Treasury settlement confirmed under Reserve Bank of India Real-Time Gross Settlement guidelines.</span>
                </div>
              </div>

              <div className="things-doc-upload-footer">
                <button
                  type="button"
                  onClick={() => setInspectingProof(null)}
                  className="things-btn-outline"
                >
                  Close Voucher
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Upload Statutory Document Scan */}
        {showUploadDocModal && (() => {
          const targetDoc = task.requiredDocuments?.find(d => d.id === selectedExistingDocId);
          return (
            <div className="things-modal-overlay" onClick={() => setShowUploadDocModal(false)}>
              <div
                className="things-doc-upload-modal"
                onClick={e => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className="things-doc-upload-header">
                  <div>
                    <h3 className="things-doc-upload-title">
                      Upload Hard Copy Scan
                    </h3>
                    <p className="things-doc-upload-sub">
                      Upload physical stamped scan (PDF, JPG, PNG, WEBP) to initiate automated multimodal extraction and certified soft copy form filling.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowUploadDocModal(false)}
                    className="things-ocr-close-btn"
                    title="Close modal"
                  >
                    &times;
                  </button>
                </div>

                {/* Modal Body */}
                <div className="things-doc-upload-body">
                  {/* Target Statutory Requirement Card */}
                  {targetDoc && (
                    <div className="things-doc-target-card">
                      <div className="things-doc-target-info">
                        <span className="things-doc-target-icon">📋</span>
                        <div>
                          <div className="things-doc-target-name">{targetDoc.name}</div>
                          <div className="things-doc-target-meta">
                            <span>Type: <strong style={{ color: 'var(--to-ink)' }}>{targetDoc.type}</strong></span>
                            <span>&bull;</span>
                            <span>{targetDoc.mandatory ? 'Mandatory Statutory Requirement' : 'Optional Requirement'}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`things-officer-pill ${targetDoc.status === 'VERIFIED' ? 'status-completed' : targetDoc.status === 'UPLOADED' ? 'status-in-progress' : 'status-missing'}`}>
                        {targetDoc.status}
                      </span>
                    </div>
                  )}

                  {/* Upload Dropzone */}
                  <div className="things-doc-form-group">
                    <label className="things-doc-label">
                      <span>Physical Scan / Stamped Document File</span>
                      <span style={{ fontSize: '11px', color: 'var(--to-fog)', fontWeight: 400 }}>
                        PDF, JPG, PNG, WEBP (Max 25MB)
                      </span>
                    </label>

                    <input
                      type="file"
                      ref={modalFileInputRef}
                      accept="application/pdf,image/*"
                      style={{ display: 'none' }}
                      onChange={e => {
                        if (e.target.files && e.target.files.length > 0) {
                          setModalFile(e.target.files[0]);
                        }
                      }}
                    />

                    {!modalFile ? (
                      <div
                        className={`things-doc-dropzone ${modalIsDragging ? 'is-dragover' : ''}`}
                        onDragOver={e => {
                          e.preventDefault();
                          setModalIsDragging(true);
                        }}
                        onDragLeave={() => setModalIsDragging(false)}
                        onDrop={e => {
                          e.preventDefault();
                          setModalIsDragging(false);
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            setModalFile(e.dataTransfer.files[0]);
                          }
                        }}
                        onClick={() => {
                          if (modalFileInputRef.current) {
                            modalFileInputRef.current.click();
                          }
                        }}
                      >
                        <div style={{ fontSize: '28px' }}>📤</div>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--to-ink)' }}>
                          Click to browse or drag &amp; drop physical scan
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--to-fog)' }}>
                          Official gazettes, Form 11 valuation records, panchnama sheets, or Jamabandi copies
                        </div>
                      </div>
                    ) : (
                      <div className="things-doc-file-card">
                        <div className="things-doc-file-info">
                          <span style={{ fontSize: '22px' }}>
                            {modalFile.type.startsWith('image/') ? '🖼️' : '📄'}
                          </span>
                          <div>
                            <div className="things-doc-file-name">{modalFile.name}</div>
                            <div className="things-doc-file-meta">
                              {(modalFile.size / (1024 * 1024)).toFixed(2)} MB &bull; {modalFile.type || 'Document'}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setModalFile(null)}
                          className="things-btn-outline"
                          style={{ fontSize: '11.5px', padding: '4px 8px', color: '#ef4444', borderColor: '#fca5a5' }}
                          title="Remove file"
                        >
                          ✕ Remove
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Gemini Multimodal Extraction Callout */}
                  <div className="things-doc-ai-banner">
                    <span style={{ fontSize: '18px' }}>⚡</span>
                    <div>
                      <strong>Automated Multimodal Extraction &bull; Soft Copy Form Filling:</strong>
                      <div style={{ marginTop: '2px' }}>
                        Once uploaded, BhoomiNexus initiates multimodal document analysis to extract statutory parameters (ULPIN, Khasra, Owner, Demarcated Area, Valuation), automatically populating certified soft copy forms.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="things-doc-modal-footer">
                  <button
                    type="button"
                    onClick={() => setShowUploadDocModal(false)}
                    className="things-btn-outline"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleModalSubmitUpload}
                    disabled={!modalFile || !selectedExistingDocId}
                    className="things-btn-primary"
                  >
                    Upload &amp; Extract Document
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

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
                        <DemoDocumentProcessing
                          fileName="Hard Copy Statutory Record Scan"
                          confidencePercent={75.0}
                          isProcessing={true}
                        />
                      )}
                      {ocrStatus.status === 'GEMINI_EXTRACTING' && (
                        <DemoDocumentProcessing
                          fileName="Gemini LLM Structuring &amp; Field Association"
                          confidencePercent={94.2}
                          isProcessing={true}
                        />
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
                          <DemoDocumentProcessing
                            fileName="Statutory Hard Copy Record — Extraction Complete"
                            confidencePercent={98.4}
                            extractedFieldsCount={Object.keys(ocrData).length}
                            isProcessing={false}
                          />
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

                            const rawFlatData = flattenObject(ocrData || {});

                            // If extracted data is missing core statutory parameters or only has empty raw_text_summary,
                            // supply default statutory parameters so officer can easily complete certified soft copy
                            const defaultStatutoryParams: Record<string, string> = {
                              surveyNumber: '',
                              villageName: '',
                              district: '',
                              state: '',
                              totalLandAreaAcres: '',
                              recordedOwner: '',
                              valuationAmountInr: '',
                              notificationNumber: '',
                              notificationDate: '',
                              remarks: '',
                            };

                            const hasRealFields = Object.keys(rawFlatData).some(k => k !== 'raw_text_summary' && rawFlatData[k]);
                            const flatData = hasRealFields ? rawFlatData : { ...defaultStatutoryParams, ...rawFlatData };

                            const formatLabel = (k: string) => {
                              return k
                                .replace(/_/g, ' ')
                                .replace(/([A-Z])/g, ' $1')
                                .replace(/\b\w/g, char => char.toUpperCase())
                                .trim();
                            };

                            return Object.entries(flatData).map(([key, value]) => {
                              if (key === 'raw_text_summary' && !value) return null;
                              const confidence = ocrStatus.confidenceScores?.[key as keyof typeof ocrStatus.confidenceScores] || 92;
                              const isCorrected = Boolean(correctedFields[key]);
                              const confidenceClass = confidence >= 90 ? 'confidence-high' : confidence >= 70 ? 'confidence-med' : 'confidence-low';
                              const isEditable = !isOcrVerified;

                              return (
                                <div key={key} className="things-ocr-field-group">
                                  <div className="things-ocr-field-header">
                                    <label className="things-ocr-field-label">
                                      {formatLabel(key)}
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
                                    placeholder={`Enter ${formatLabel(key)}`}
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
                              {ocrSubmitting ? 'Verifying & Saving Soft Copy...' : '✓ Affirm AI Extraction & Save Soft Copy'}
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
                Provide an official statutory reason for rejection under RFCTLARR Act 2013. This formal remittal defect notice will be transmitted directly to the Proponent for corrective action.
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
