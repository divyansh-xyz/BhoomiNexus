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
      <div className="landing-page-root" style={{ minHeight: '100vh', backgroundColor: 'var(--color-blush-paper)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <BhoomiLogo size={42} strokeWidth={2.4} />
          <span style={{ fontSize: '18px', fontFamily: 'var(--font-copernicus)', fontStyle: 'italic', color: '#000000' }}>
            Accessing Statutory Task Docket...
          </span>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="landing-page-root" style={{ minHeight: '100vh', backgroundColor: 'var(--color-blush-paper)', padding: '60px 24px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff', border: '1px solid #000000', borderRadius: '0px', padding: '40px', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-copernicus)', fontSize: '24px', color: '#000000', marginBottom: '12px', fontWeight: 400 }}>
            Task Docket Not Found
          </h2>
          <p style={{ color: 'var(--color-fossil-gray)', marginBottom: '24px', fontStyle: 'italic', fontSize: '15px' }}>
            The specified task docket ID does not exist or you do not have appropriate statutory permissions.
          </p>
          <Link to="/officer/dashboard" className="btn-cta-outline" style={{ padding: '8px 18px', fontSize: '13px' }}>
            &larr; Return to Officer Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const hasMissingDocs = task.requiredDocuments.some(d => d.status === 'MISSING');
  const hasUnverifiedDocs = task.requiredDocuments.some(d => d.status !== 'VERIFIED');
  const ocrBlocking = ocrStatus !== null && !isOcrVerified;
  const isReadyToAccept = !hasMissingDocs && !hasUnverifiedDocs && !ocrBlocking;

  return (
    <div className="landing-page-root" style={{ minHeight: '100vh', backgroundColor: 'var(--color-blush-paper)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px 80px 24px' }}>

        {/* Hidden file input for uploads */}
        <input
          type="file"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Back navigation */}
        <div style={{ marginBottom: '24px' }}>
          <Link
            to="/officer/dashboard"
            className="btn-cta-outline"
            style={{ padding: '6px 14px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            &larr; Return to Officer Dashboard
          </Link>
        </div>

        {/* Sovereign Broadsheet Docket Masthead */}
        <header style={{
          backgroundColor: '#ffffff',
          border: '1px solid #000000',
          borderRadius: '0px',
          padding: '28px 32px',
          marginBottom: '32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '24px'
        }}>
          <div style={{ flex: 1, minWidth: '320px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span style={{
                fontFamily: 'monospace',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '+1.5px',
                textTransform: 'uppercase',
                color: '#000000',
                border: '1px solid #000000',
                padding: '3px 8px'
              }}>
                TASK DOCKET &bull; {task.id}
              </span>
              <span style={{
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase',
                borderRadius: '0px',
                letterSpacing: '+1px',
                border: '1px solid #000000',
                backgroundColor: task.status === 'ACCEPTED' ? '#000000' : 'var(--color-paper-tint)',
                color: task.status === 'ACCEPTED' ? '#ffffff' : (task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') ? '#0058fe' : '#000000',
                borderColor: (task.status === 'ASSIGNED' || task.status === 'IN_PROGRESS') ? '#0058fe' : '#000000'
              }}>
                {task.status}
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-copernicus)', fontSize: '34px', fontWeight: 400, color: '#000000', margin: '0 0 10px 0', letterSpacing: '-1.2px', lineHeight: 1.15 }}>
              {task.stageName}
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-fossil-gray)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span>Project: <strong style={{ color: '#000000', fontFamily: 'var(--font-copernicus)' }}>{task.projectTitle || task.projectCode}</strong></span>
              <span style={{ opacity: 0.5 }}>|</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--color-fossil-gray)' }}>{task.projectId}</span>
            </p>
          </div>

          <div style={{
            backgroundColor: 'var(--color-paper-tint)',
            border: '1px solid #000000',
            borderRadius: '0px',
            padding: '16px 20px',
            minWidth: '240px'
          }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#000000', textTransform: 'uppercase', letterSpacing: '+1.5px', marginBottom: '4px', fontWeight: 700 }}>
                SLA Target Date
              </div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: '#000000', fontFamily: 'monospace' }}>
                {task.dueDate}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#000000', textTransform: 'uppercase', letterSpacing: '+1.5px', marginBottom: '4px', fontWeight: 700 }}>
                Cadastral Jurisdiction
              </div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#000000' }}>
                {(task as any).district || 'South West'}, {(task as any).state || 'New Delhi'}
              </div>
            </div>
          </div>
        </header>

        {/* Statutory Rejection Notice Banner */}
        {task.status === 'REJECTED' && (
          <div style={{
            marginBottom: '32px',
            padding: '24px 28px',
            borderRadius: '0px',
            backgroundColor: '#ffffff',
            border: '2px solid #000000',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1, minWidth: '300px' }}>
              <div style={{
                width: '36px',
                height: '36px',
                border: '1px solid #000000',
                borderRadius: '0px',
                backgroundColor: 'var(--color-paper-tint)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#000000',
                fontSize: '18px',
                fontWeight: 'bold',
                flexShrink: 0
              }}>
                &#9888;
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-copernicus)', fontWeight: 400, color: '#000000', fontSize: '20px' }}>
                  Stage Rejected &amp; Remitted to Requesting Authority
                </div>
                <div style={{ fontSize: '14px', color: '#000000', marginTop: '6px', lineHeight: '1.5' }}>
                  Recorded Statutory Defect / Rejection Reason:{' '}
                  <em style={{ fontFamily: 'var(--font-copernicus)', fontStyle: 'italic', fontWeight: 600 }}>
                    "{task.rejectionReason || 'Defects noted in submitted records.'}"
                  </em>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-fossil-gray)', marginTop: '4px', fontStyle: 'italic' }}>
                  Further officer action is suspended until the Requesting Authority remedies the defects and resubmits.
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#000000',
                border: '1px solid #000000',
                padding: '4px 10px',
                borderRadius: '0px',
                textTransform: 'uppercase',
                letterSpacing: '+1.5px'
              }}>
                Defect Dossier Remitted
              </span>
              <div style={{ fontSize: '12px', color: 'var(--color-fossil-gray)', marginTop: '8px', fontFamily: 'monospace' }}>
                {task.completedAt ? `Remitted: ${new Date(task.completedAt).toLocaleString()}` : 'Recently Remitted'}
              </div>
            </div>
          </div>
        )}

        {/* Main Content Section: Two-Column Editorial Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.9fr', gap: '32px', alignItems: 'flex-start' }}>

          {/* Left Column: Statutory Context & Cadastral Parcels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Context Card */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #000000',
              borderRadius: '0px',
              padding: '24px'
            }}>
              <h4 style={{
                fontFamily: 'var(--font-copernicus)',
                fontSize: '18px',
                fontWeight: 400,
                color: '#000000',
                paddingBottom: '12px',
                marginBottom: '16px',
                borderBottom: '1px solid #000000',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ color: '#0058fe' }}>&#9432;</span> Previous Stage Context
              </h4>
              <div style={{
                backgroundColor: 'var(--color-blush-paper)',
                border: '1px solid rgba(0,0,0,0.15)',
                borderLeft: '3px solid #0058fe',
                padding: '16px 20px',
                borderRadius: '0px',
                color: '#000000',
                fontSize: '14px',
                lineHeight: '1.6'
              }}>
                <em style={{ fontStyle: 'italic', fontFamily: 'var(--font-copernicus)' }}>
                  "{(task as any).previousStageNotes || 'No previous stage context available.'}"
                </em>
              </div>
            </div>

            {/* Parcels Card */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #000000',
              borderRadius: '0px',
              padding: '24px'
            }}>
              <h4 style={{
                fontFamily: 'var(--font-copernicus)',
                fontSize: '18px',
                fontWeight: 400,
                color: '#000000',
                paddingBottom: '12px',
                marginBottom: '16px',
                borderBottom: '1px solid #000000',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>&#9638;</span> Relevant Cadastral Parcels ({(task as any).relevantParcels?.length || 0})
              </h4>

              <div style={{ overflowX: 'auto', border: '1px solid #000000' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--color-paper-tint)', borderBottom: '1px solid #000000' }}>
                      <th style={{ padding: '12px', fontSize: '11px', color: '#000000', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '+1.5px' }}>Parcel ID</th>
                      <th style={{ padding: '12px', fontSize: '11px', color: '#000000', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '+1.5px' }}>Survey No.</th>
                      <th style={{ padding: '12px', fontSize: '11px', color: '#000000', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '+1.5px' }}>Village</th>
                      <th style={{ padding: '12px', fontSize: '11px', color: '#000000', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '+1.5px' }}>Area</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((task as any).relevantParcels || []).map((parcel: any, idx: number) => (
                      <tr
                        key={parcel.id}
                        style={{
                          backgroundColor: idx % 2 === 0 ? '#ffffff' : 'var(--color-blush-paper)',
                          borderBottom: '1px solid rgba(0,0,0,0.1)'
                        }}
                      >
                        <td style={{ padding: '12px', fontFamily: 'monospace', color: '#000000', fontSize: '13px' }}>{parcel.id}</td>
                        <td style={{ padding: '12px', fontWeight: 700, color: '#000000', fontSize: '13.5px' }}>{parcel.surveyNumber}</td>
                        <td style={{ padding: '12px', color: '#000000', fontSize: '13.5px' }}>{parcel.village}</td>
                        <td style={{ padding: '12px', color: '#000000', fontSize: '13.5px' }}>{parcel.area}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Column: Evidence, OCR Intelligence & Statutory Affirmation */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

            {/* Evidence & Documents Card */}
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #000000',
              borderRadius: '0px',
              padding: '24px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '12px',
                paddingBottom: '14px',
                marginBottom: '20px',
                borderBottom: '1px solid #000000'
              }}>
                <div>
                  <h4 style={{ margin: 0, fontFamily: 'var(--font-copernicus)', fontSize: '18px', fontWeight: 400, color: '#000000', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>&#128194;</span> Evidence &amp; Documents
                  </h4>
                  <span style={{ fontSize: '12px', color: 'var(--color-fossil-gray)', marginTop: '3px', display: 'block', fontStyle: 'italic' }}>
                    Download soft copies, verify physical ground scans, and affirm statutory compliance
                  </span>
                </div>

                {/* Download Full Requisition Dossier button */}
                <button
                  type="button"
                  onClick={handleDownloadFullDossier}
                  disabled={downloadingDoc === 'DOSSIER'}
                  className="btn-cta-outline"
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    borderRadius: '0px',
                    cursor: downloadingDoc === 'DOSSIER' ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px'
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
                  borderRadius: '0px',
                  backgroundColor: 'var(--color-paper-tint)',
                  border: '1px solid #000000',
                  fontSize: '13px',
                  color: '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '16px' }}>&#9888;</span>
                  <span><strong>Scrutiny Suspended:</strong> This task has been rejected and remitted to the Proponent. Document uploads and affirmations are locked pending resubmission.</span>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px',
                        borderRadius: '0px',
                        backgroundColor: isVerified ? 'var(--color-paper-tint)' : 'var(--color-blush-paper)',
                        border: '1px solid #000000',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#000000', fontFamily: 'var(--font-copernicus)' }}>
                          {doc.name}
                        </span>
                        <span style={{ fontSize: '12px', color: isVerified ? '#000000' : isUploaded ? '#0058fe' : 'var(--color-fossil-gray)', fontStyle: 'italic' }}>
                          {isVerified
                            ? '✓ Certified Soft Copy Digitized & Verified in Registry'
                            : isUploaded
                            ? '📷 Hard Copy Attached • AI Soft Copy Form Suggestions Ready'
                            : `${doc.type} • ${matchedProjectDoc ? 'Submitted Soft Copy Available' : 'Statutory Form Template Ready'}`}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* 1. Download Soft Copy button */}
                        <button
                          type="button"
                          onClick={() => handleDownloadSoftCopy(doc.name)}
                          disabled={isDownloading}
                          className="btn-cta-outline"
                          style={{
                            fontSize: '12px',
                            padding: '6px 12px',
                            borderRadius: '0px',
                            cursor: isDownloading ? 'wait' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                          title="Download official soft copy or template to inspect or print physical record"
                        >
                          <span>&#11015;</span> {isDownloading ? 'Downloading...' : 'Download Soft Copy'}
                        </button>

                        {/* Closed Task Read-only Status Badges */}
                        {isTaskClosed && doc.status === 'MISSING' && (
                          <span style={{
                            border: '1px solid #000000',
                            color: '#000000',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: '0px',
                            letterSpacing: '+1px'
                          }}>
                            {task.status === 'REJECTED' ? 'MISSING AT REJECTION' : 'MISSING'}
                          </span>
                        )}

                        {isTaskClosed && doc.status === 'UPLOADED' && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                              border: '1px solid #000000',
                              color: '#000000',
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '4px 8px',
                              borderRadius: '0px'
                            }}>
                              UPLOADED
                            </span>
                            <button
                              type="button"
                              onClick={() => handleInspectVerifiedDoc(doc)}
                              className="btn-cta-outline"
                              style={{ fontSize: '11.5px', padding: '5px 10px', borderRadius: '0px' }}
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
                            className="btn-cta-black"
                            style={{
                              fontSize: '12px',
                              padding: '6px 14px',
                              borderRadius: '0px',
                              cursor: isUploading ? 'wait' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                            title="Upload scanned image or photo of physical stamped hard copy"
                          >
                            <span>&#128247;</span> {isUploading ? 'Uploading Scan...' : 'Upload Hard Copy'}
                          </button>
                        )}

                        {/* State 2: Processing AI */}
                        {isCurrentlyProcessingOcr && !isOcrVerified && (
                          <span style={{
                            backgroundColor: '#0058fe',
                            color: '#ffffff',
                            fontSize: '11px',
                            fontWeight: 700,
                            letterSpacing: '+1px',
                            padding: '5px 10px',
                            borderRadius: '0px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            &#9889; AI OCR RUNNING...
                          </span>
                        )}

                        {/* State 3: Hard Copy Uploaded -> Review Soft Copy & OCR suggestions */}
                        {isUploaded && !isCurrentlyProcessingOcr && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenOcrForm(doc)}
                              className="btn-cta-blue"
                              style={{
                                fontSize: '12px',
                                padding: '6px 14px',
                                borderRadius: '0px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}
                              title="Click to open side-by-side viewer with AI OCR soft copy form filling suggestions"
                            >
                              <span>&#9889;</span> Review Soft Copy Form (AI OCR)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUploadClick(doc.id)}
                              style={{
                                fontSize: '11.5px',
                                fontFamily: 'var(--font-copernicus)',
                                fontStyle: 'italic',
                                backgroundColor: 'transparent',
                                color: '#000000',
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
                              border: '1px solid #000000',
                              backgroundColor: '#000000',
                              color: '#ffffff',
                              fontSize: '11px',
                              fontWeight: 700,
                              letterSpacing: '+1px',
                              padding: '4px 8px',
                              borderRadius: '0px'
                            }}>
                              &#10003; VERIFIED
                            </span>
                            <button
                              type="button"
                              onClick={() => handleInspectVerifiedDoc(doc)}
                              className="btn-cta-outline"
                              style={{ fontSize: '11.5px', padding: '5px 10px', borderRadius: '0px' }}
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
            <div style={{
              backgroundColor: '#ffffff',
              border: '1px solid #000000',
              borderRadius: '0px',
              padding: '24px'
            }}>
              {task.status === 'REJECTED' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '20px' }}>&#9888;</span>
                    <h4 style={{ margin: 0, fontFamily: 'var(--font-copernicus)', fontSize: '18px', fontWeight: 400, color: '#000000' }}>
                      Stage Rejected &amp; Remitted
                    </h4>
                  </div>
                  <p style={{ fontSize: '14px', color: '#000000', margin: '0 0 16px 0', lineHeight: '1.6' }}>
                    This statutory stage was rejected and remitted to the Requesting Authority. Further officer action is locked until the Proponent rectifies defects and resubmits the stage.
                  </p>
                  <div style={{ padding: '14px 16px', backgroundColor: 'var(--color-blush-paper)', border: '1px solid #000000' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '+1.5px', display: 'block', marginBottom: '4px' }}>
                      Recorded Statutory Rejection Reason:
                    </span>
                    <p style={{ margin: 0, fontSize: '14px', color: '#000000', fontStyle: 'italic', fontFamily: 'var(--font-copernicus)' }}>
                      "{task.rejectionReason || 'Defects noted in submitted records.'}"
                    </p>
                  </div>
                </div>
              ) : task.status === 'ACCEPTED' ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '20px' }}>&#10003;</span>
                    <h4 style={{ margin: 0, fontFamily: 'var(--font-copernicus)', fontSize: '18px', fontWeight: 400, color: '#000000' }}>
                      Stage Affirmation Completed
                    </h4>
                  </div>
                  <p style={{ fontSize: '14px', color: '#000000', margin: 0, lineHeight: '1.6' }}>
                    This statutory stage has been affirmed and accepted. The workflow has progressed to the subsequent statutory phase in accordance with RFCTLARR Act 2013.
                  </p>
                </div>
              ) : (
                <div>
                  <h4 style={{ fontFamily: 'var(--font-copernicus)', fontSize: '18px', fontWeight: 400, color: '#000000', marginBottom: '8px' }}>
                    Stage Affirmation
                  </h4>
                  <p style={{ fontSize: '14px', color: 'var(--color-fossil-gray)', marginBottom: '20px', lineHeight: '1.55', fontStyle: 'italic' }}>
                    By accepting this stage, you digitally affirm the verification of physical and digital records per the statutory requirements of the Act.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Affirm & Accept Stage button */}
                    <button
                      type="button"
                      onClick={handleAccept}
                      disabled={submitting || !isReadyToAccept}
                      className={(!submitting && isReadyToAccept) ? 'btn-cta-black' : 'btn-cta-outline'}
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '0px',
                        fontSize: '14px',
                        cursor: (!submitting && isReadyToAccept) ? 'pointer' : 'not-allowed',
                        opacity: (!submitting && isReadyToAccept) ? 1 : 0.4
                      }}
                    >
                      {submitting ? 'Processing Affirmation...' : '✓ Affirm & Accept Stage'}
                    </button>

                    {/* Reject to Proponent button */}
                    <button
                      type="button"
                      onClick={() => setShowRejectModal(true)}
                      disabled={submitting}
                      className="btn-cta-outline"
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '0px',
                        fontSize: '14px',
                        cursor: submitting ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Reject to Proponent
                    </button>
                  </div>

                  {!isReadyToAccept && (
                    <div style={{
                      marginTop: '16px',
                      padding: '12px 16px',
                      backgroundColor: 'var(--color-blush-paper)',
                      border: '1px solid #000000',
                      borderRadius: '0px',
                      color: '#000000',
                      fontSize: '13px',
                      textAlign: 'center',
                      fontStyle: 'italic'
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
        </div>

        {/* Phase 9: AI Intelligence Fullscreen Modal (Broadsheet Style) */}
        {showOcrModal && ocrStatus && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 9999,
            display: 'flex',
            padding: '32px',
            boxSizing: 'border-box'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              width: '100%',
              height: '100%',
              borderRadius: '0px',
              border: '2px solid #000000',
              display: 'flex',
              overflow: 'hidden',
              boxShadow: 'none'
            }}>
              {/* Left: Document Viewer */}
              <div style={{ flex: '1.3', backgroundColor: '#000000', borderRight: '1px solid #000000', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '16px 24px', backgroundColor: 'var(--color-paper-tint)', borderBottom: '1px solid #000000', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>&#128065;</span>
                    <span style={{ fontWeight: 600, color: '#000000', fontSize: '14px', fontFamily: 'var(--font-copernicus)' }}>
                      {isUploadedImage ? 'Scanned Hard Copy Evidence (Physical Scan)' : 'Statutory Soft Copy / Document Viewer'}
                    </span>
                  </div>
                  {uploadedFileUrl && (
                    <a
                      href={uploadedFileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-cta-outline"
                      style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '0px' }}
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
                          borderRadius: '0px',
                          border: '1px solid #ffffff'
                        }}
                      />
                    ) : (
                      <iframe
                        src={uploadedFileUrl}
                        title="Document Viewer"
                        style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#ffffff', borderRadius: '0px' }}
                      />
                    )
                  ) : (
                    <div style={{ color: '#ffffff', textAlign: 'center', fontFamily: 'var(--font-copernicus)', fontStyle: 'italic' }}>
                      <p style={{ fontSize: '15px' }}>Document Preview Initializing...</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Gemini Intelligence Panel */}
              <div style={{ flex: '1', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>

                <div style={{ padding: '20px 28px', borderBottom: '1px solid #000000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0, fontFamily: 'var(--font-copernicus)', fontSize: '18px', fontWeight: 400, color: '#000000', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#0058fe' }}>&#10022;</span> Gemini Intelligence &bull; Soft Copy Form Filling
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
                    style={{
                      border: '1px solid #000000',
                      backgroundColor: 'transparent',
                      padding: '2px 8px',
                      fontSize: '18px',
                      cursor: 'pointer',
                      color: '#000000',
                      lineHeight: 1,
                      borderRadius: '0px'
                    }}
                    title="Close viewer"
                  >
                    &times;
                  </button>
                </div>

                <div style={{ padding: '28px', overflowY: 'auto', flex: 1 }}>
                  {!isOcrVerified ? (
                    <p style={{ fontSize: '14px', color: 'var(--color-fossil-gray)', marginBottom: '24px', lineHeight: '1.55', fontStyle: 'italic' }}>
                      AI has scanned the uploaded physical hard copy and extracted statutory parameters. Review and adjust the suggested values below to complete the digital soft copy record.
                    </p>
                  ) : (
                    <p style={{ fontSize: '14px', color: '#000000', marginBottom: '24px', lineHeight: '1.55', fontWeight: 600 }}>
                      Verified soft copy form values recorded in the statutory registry.
                    </p>
                  )}

                  {/* Polling States */}
                  {ocrStatus.status === 'OCR_PROCESSING' && (
                    <div style={{ padding: '32px 24px', backgroundColor: 'var(--color-blush-paper)', border: '1px solid #000000', textAlign: 'center', borderRadius: '0px' }}>
                      <div style={{ color: '#0058fe', fontWeight: 600, marginBottom: '8px', fontSize: '15px' }}>Running Cloud Vision OCR...</div>
                      <div style={{ fontSize: '13px', color: 'var(--color-fossil-gray)', fontStyle: 'italic' }}>Extracting raw text from hard copy scan.</div>
                    </div>
                  )}
                  {ocrStatus.status === 'GEMINI_EXTRACTING' && (
                    <div style={{ padding: '32px 24px', backgroundColor: 'var(--color-blush-paper)', border: '1px solid #000000', textAlign: 'center', borderRadius: '0px' }}>
                      <div style={{ color: '#000000', fontWeight: 600, marginBottom: '8px', fontSize: '15px' }}>Gemini LLM Structuring Data...</div>
                      <div style={{ fontSize: '13px', color: 'var(--color-fossil-gray)', fontStyle: 'italic' }}>Populating soft copy form filling suggestions from scanned evidence.</div>
                    </div>
                  )}

                  {(ocrStatus.status === 'EMPTY' || ocrStatus.status === 'FAILED') && (
                    <div style={{ padding: '28px 24px', backgroundColor: 'var(--color-blush-paper)', border: '1px solid #000000', borderRadius: '0px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <span style={{ fontSize: '18px' }}>&#9888;</span>
                        <span style={{ fontWeight: 600, fontSize: '15px', color: '#000000', fontFamily: 'var(--font-copernicus)' }}>
                          {ocrStatus.status === 'EMPTY' ? 'No Statutory Fields Could Be Read' : 'AI Extraction Unavailable'}
                        </span>
                      </div>
                      <p style={{ fontSize: '13.5px', color: '#000000', lineHeight: 1.6, margin: '0 0 8px 0' }}>
                        {ocrStatus.status === 'EMPTY'
                          ? <>The AI classified this scan{ocrStatus.documentType ? <> as <strong>{ocrStatus.documentType.replace(/_/g, ' ')}</strong></> : null} but could not extract any field values from it. This usually means the scan is too faint, skewed, or handwritten.</>
                          : 'The AI parser could not be reached, or it did not respond in time. No values have been auto-filled.'}
                      </p>
                      {ocrStatus.missingFields && ocrStatus.missingFields.length > 0 && (
                        <p style={{ fontSize: '12.5px', color: 'var(--color-fossil-gray)', margin: '0 0 8px 0', fontStyle: 'italic' }}>
                          Expected but not found: {ocrStatus.missingFields.join(', ')}
                        </p>
                      )}
                      <p style={{ fontSize: '13px', color: '#000000', margin: '0 0 18px 0', lineHeight: 1.6 }}>
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
                        className="btn-cta-black"
                        style={{ width: '100%', padding: '12px', fontSize: '13.5px', borderRadius: '0px', cursor: 'pointer' }}
                      >
                        &#128247; Re-upload Scan &amp; Retry AI Extraction
                      </button>
                    </div>
                  )}

                  {/* Extraction Results */}
                  {ocrStatus.status === 'COMPLETED' && ocrData && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

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
                            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: '#000000', textTransform: 'uppercase', letterSpacing: '+1px' }}>
                                  {key.replace(/([A-Z])/g, ' $1')}
                                </label>
                                {confidence && (
                                  <span style={{ fontSize: '11px', color: '#000000', fontWeight: 700, border: '1px solid #000000', padding: '2px 6px', borderRadius: '0px', fontFamily: 'monospace' }}>
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
                                  padding: '10px 12px',
                                  borderRadius: '0px',
                                  border: '1px solid #000000',
                                  backgroundColor: isEditable ? '#ffffff' : 'var(--color-blush-paper)',
                                  color: '#000000',
                                  fontSize: '14px',
                                  fontFamily: 'var(--font-body-serif)',
                                  boxSizing: 'border-box',
                                  outline: 'none'
                                }}
                              />
                            </div>
                          );
                        });
                      })()}

                      {!isOcrVerified ? (
                        <button
                          onClick={handleVerifyOcr}
                          disabled={ocrSubmitting}
                          className="btn-cta-black"
                          style={{
                            marginTop: '16px',
                            width: '100%',
                            padding: '14px',
                            borderRadius: '0px',
                            fontSize: '14px',
                            cursor: ocrSubmitting ? 'wait' : 'pointer'
                          }}
                        >
                          {ocrSubmitting ? 'Saving Soft Copy...' : '✓ Affirm AI Extraction & Save Soft Copy'}
                        </button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                          <div style={{
                            padding: '14px',
                            backgroundColor: 'var(--color-paper-tint)',
                            border: '1px solid #000000',
                            borderRadius: '0px',
                            color: '#000000',
                            fontSize: '14px',
                            fontWeight: 600,
                            textAlign: 'center',
                            fontFamily: 'var(--font-copernicus)'
                          }}>
                            ✓ Soft Copy Form Verified &amp; Saved
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setShowOcrModal(false);
                              setOcrStatus(null);
                            }}
                            className="btn-cta-outline"
                            style={{
                              padding: '10px',
                              fontSize: '13px',
                              borderRadius: '0px'
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

        {/* Sovereign Rejection Modal */}
        {showRejectModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'var(--color-blush-paper)',
              border: '2px solid #000000',
              borderRadius: '0px',
              padding: '32px',
              width: '540px',
              maxWidth: '100%',
              boxShadow: 'none'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontFamily: 'var(--font-copernicus)', fontSize: '24px', fontWeight: 400, color: '#000000' }}>
                Reject Workflow Stage
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--color-fossil-gray)', marginBottom: '20px', lineHeight: '1.55', fontStyle: 'italic' }}>
                Provide an official statutory reason for rejection under RFCTLARR Act 2013. This formal remittal notice will be transmitted to the Requesting Authority for corrective action.
              </p>

              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Missing signature on physical scan of Form B or boundary mismatch..."
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  minHeight: '120px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #000000',
                  color: '#000000',
                  padding: '14px',
                  borderRadius: '0px',
                  marginBottom: '24px',
                  fontFamily: 'var(--font-body-serif)',
                  fontSize: '14px',
                  resize: 'vertical',
                  outline: 'none'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  disabled={submitting}
                  className="btn-cta-outline"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '0px',
                    fontSize: '13px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={!rejectReason.trim() || submitting}
                  className="btn-cta-black"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '0px',
                    fontSize: '13px',
                    cursor: (!rejectReason.trim() || submitting) ? 'not-allowed' : 'pointer',
                    opacity: (!rejectReason.trim() || submitting) ? 0.4 : 1
                  }}
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
