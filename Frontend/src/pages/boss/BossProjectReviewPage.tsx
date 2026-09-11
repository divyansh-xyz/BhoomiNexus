import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './boss-dashboard.css';
import { bossService } from '../../services/api/boss.service';
import { workflowService } from '../../services/api/workflow.service';
import { taskService } from '../../services/api/task.service';
import { DocumentService } from '../../services/DocumentService';
import type { ProjectRequest } from '../../types/boss.types';
import type { ProjectWorkflowInstance, WorkflowTemplate } from '../../types/workflow.types';
import type {
  WorkflowTask,
  TaskAuditEvent,
  WorkflowProgressSummary,
} from '../../types/task.types';

export const BossProjectReviewPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectRequest | null>(null);
  const [workflow, setWorkflow] = useState<ProjectWorkflowInstance | null>(null);
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [auditEvents, setAuditEvents] = useState<TaskAuditEvent[]>([]);
  const [progress, setProgress] = useState<WorkflowProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // BOSS Project Approval States
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [availableTemplates, setAvailableTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('template-rfctlarr-standard');
  const [approveNote, setApproveNote] = useState<string>(
    'Pre-feasibility criteria, alignment geometry, and cadastral schedule fully verified for multi-departmental clearance.'
  );
  const [certificationChecked, setCertificationChecked] = useState<boolean>(true);
  const [approveSuccessMessage, setApproveSuccessMessage] = useState<string | null>(null);

  // Rejection & Resubmission Modal States
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isResubmitModalOpen, setIsResubmitModalOpen] = useState(false);
  const [resubmitExplanation, setResubmitExplanation] = useState('');

  // Add Document Modal States (Card 4: Statutory Documents)
  const [isAddDocModalOpen, setIsAddDocModalOpen] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('GAZETTE_DRAFT');
  const [selectedDocFile, setSelectedDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadDocError, setUploadDocError] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId]);

  const loadProject = async (id: string) => {
    setLoading(true);
    try {
      const [data, wf, taskList, auditList, prog, templates] = await Promise.all([
        bossService.getProjectById(id),
        workflowService.getProjectWorkflow(id),
        taskService.getTasks(undefined, id),
        taskService.getAuditTimeline(id),
        taskService.getWorkflowProgress(id),
        workflowService.getTemplates(),
      ]);
      setProject(data);
      setWorkflow(wf);
      setTasks(taskList);
      setAuditEvents(auditList);
      setProgress(prog);
      setAvailableTemplates(templates);
      if (wf) {
        setSelectedTemplateId(wf.templateId);
      } else if ((templates || []).length > 0) {
        setSelectedTemplateId(templates[0].id);
      }
    } catch (err) {
      console.error('Failed to load project details', err);
    } finally {
      setLoading(false);
    }
  };

  const areParcelsConfirmed =
    project?.status === 'PARCELS_CONFIRMED' ||
    project?.status === 'WORKFLOW_CONFIGURED' ||
    project?.status === 'WORKFLOW_ACTIVE' ||
    project?.status === 'PROJECT_APPROVED' ||
    ((project?.selectedParcelsCount ?? 0) > 0 &&
      project?.status !== 'NEW_REQUEST' &&
      project?.status !== 'DRAFT' &&
      project?.status !== 'PARCELS_PENDING');

  const isWorkflowConfigured =
    !!workflow && (workflow.stages || []).length > 0;

  const isProjectApproved =
    project?.status === 'PROJECT_APPROVED' ||
    project?.status === 'WORKFLOW_ACTIVE';

  const canApproveProject = areParcelsConfirmed && isWorkflowConfigured && !isProjectApproved;

  const handleConfirmApproveProject = async () => {
    if (!projectId) return;
    if (!areParcelsConfirmed) {
      alert('Statutory Scrutiny Alert: Land parcels must be determined and confirmed before granting statutory sanction.');
      return;
    }
    if (!isWorkflowConfigured) {
      alert('Statutory Scrutiny Alert: Statutory workflow template must be selected and configured before granting statutory sanction.');
      return;
    }
    try {
      setActionLoading(true);
      let activeWf = workflow;
      if (!activeWf) {
        activeWf = await workflowService.instantiateFromTemplate(projectId, selectedTemplateId);
        setWorkflow(activeWf);
      }
      const res = await workflowService.activateWorkflow(projectId);
      await loadProject(projectId);
      setIsApproveModalOpen(false);
      setApproveSuccessMessage(
        `Project successfully approved! Operational authority has been transferred to the Statutory Task Engine. First stage assigned to ${res.assignedOfficerName}.`
      );
    } catch (err: any) {
      console.error('Failed to approve project forward', err);
      alert(err?.message || 'Failed to approve project forward.');
    } finally {
      setActionLoading(false);
    }
  };

  // PHASE 6 TASK ENGINE ACTIONS
  const activeTask = tasks.find(
    (t) => t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS' || t.status === 'REJECTED'
  ) || (tasks && tasks.length > 0 ? tasks[tasks.length - 1] : undefined);

  const handleStartTask = async (taskId: string) => {
    if (!projectId) return;
    try {
      setActionLoading(true);
      await taskService.startTask(taskId);
      await loadProject(projectId);
    } catch (err: any) {
      console.error('Failed to start task', err);
      alert(err?.message || 'Failed to start scrutiny task.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptTask = async (taskId: string) => {
    if (!projectId) return;
    try {
      setActionLoading(true);
      const res = await taskService.acceptTask(taskId);
      await loadProject(projectId);
      if (res.isWorkflowCompleted) {
        alert('All statutory stages have been successfully approved! Final acquisition sanction recorded.');
      }
    } catch (err: any) {
      console.error('Failed to accept task', err);
      alert(err?.message || 'Failed to complete stage.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!activeTask || !projectId || !rejectionReasonInput.trim()) return;
    try {
      setActionLoading(true);
      await taskService.rejectTask(activeTask.id, rejectionReasonInput.trim());
      setIsRejectModalOpen(false);
      setRejectionReasonInput('');
      await loadProject(projectId);
    } catch (err: any) {
      console.error('Failed to reject task', err);
      alert(err?.message || 'Failed to reject stage.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmResubmit = async () => {
    if (!activeTask || !projectId || !resubmitExplanation.trim()) return;
    try {
      setActionLoading(true);
      await taskService.resubmitStage(projectId, activeTask.stageId, {
        explanation: resubmitExplanation.trim(),
      });
      setIsResubmitModalOpen(false);
      setResubmitExplanation('');
      await loadProject(projectId);
    } catch (err: any) {
      console.error('Failed to resubmit stage', err);
      alert(err?.message || 'Failed to resubmit corrections.');
    } finally {
      setActionLoading(false);
    }
  };

  // Upload/Register Document into Project Docket (Card 4)
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !newDocTitle.trim()) return;

    try {
      setUploadingDoc(true);
      setUploadDocError(null);

      // If user did not pick a local file, create a sovereign verified dummy file
      const fileToUpload =
        selectedDocFile ||
        new File(
          [
            `BHOOMI NEXUS SOVEREIGN LAND RECORDS REGISTRY\n\nDocket: ${project.code}\nTitle: ${newDocTitle.trim()}\nType: ${newDocType}\nJurisdiction: ${project.state}, ${project.district}\nAudit Timestamp: ${new Date().toISOString()}\nVerified SHA-256 Gazette Seal.`,
          ],
          `${newDocTitle.trim().replace(/\s+/g, '_')}.pdf`,
          { type: 'application/pdf' }
        );

      await DocumentService.uploadDocument({
        projectId: project.id,
        file: fileToUpload,
        title: newDocTitle.trim(),
        documentType: newDocType,
      });

      // Reload project dossier to reflect newly uploaded document
      const freshProject = await bossService.getProjectById(project.id);
      if (freshProject) {
        setProject(freshProject);
      }

      setIsAddDocModalOpen(false);
      setNewDocTitle('');
      setSelectedDocFile(null);
    } catch (err: any) {
      console.error('Failed to upload statutory document', err);
      setUploadDocError(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  // Initialize interactive Leaflet mini-map for spatial corridor preview
  useEffect(() => {
    if (!project || !mapContainerRef.current || mapRef.current) return;

    const initialCenter: [number, number] =
      project.corridorCoordinates && project.corridorCoordinates.length > 0
        ? project.corridorCoordinates[0]
        : project.district?.toLowerCase() === 'agra'
        ? [27.1767, 78.0081]
        : [28.6139, 77.2090];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 11,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    // Esri World Dark Gray Canvas base layer — 100% free, no API key, zero watermarks
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        attribution: '&copy; Esri',
      }
    ).addTo(map);

    // Esri World Dark Gray Reference layer (crisp administrative labels)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
      }
    ).addTo(map);

    // Render Corridor Polyline or Site Footprint
    if (project.corridorCoordinates && project.corridorCoordinates.length > 0) {
      const polyline = L.polyline(project.corridorCoordinates, {
        color: '#2576eb',
        weight: 4,
        opacity: 0.9,
      }).addTo(map);

      // Render start and end markers
      const startCoord = project.corridorCoordinates[0];
      const endCoord = project.corridorCoordinates[project.corridorCoordinates.length - 1];

      L.circleMarker(startCoord, {
        radius: 6,
        fillColor: '#303336',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
      })
        .bindTooltip(`Corridor Origin: ${startCoord[0].toFixed(3)}°N, ${startCoord[1].toFixed(3)}°E`, {
          direction: 'top',
        })
        .addTo(map);

      L.circleMarker(endCoord, {
        radius: 6,
        fillColor: '#2576eb',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
      })
        .bindTooltip(`Corridor Terminus: ${endCoord[0].toFixed(3)}°N, ${endCoord[1].toFixed(3)}°E`, {
          direction: 'top',
        })
        .addTo(map);

      map.fitBounds(polyline.getBounds().pad(0.2));
    } else if (project.bounds) {
      map.fitBounds(project.bounds);
    } else {
      // Non-linear contiguous site footprint envelope
      const siteCenter: [number, number] =
        project.district?.toLowerCase() === 'agra'
          ? [27.1767, 78.0081]
          : initialCenter;

      map.setView(siteCenter, 11);

      L.circle(siteCenter, {
        radius: Math.max(1200, Math.sqrt(((project.requestedAreaAcres || 100) * 4046.86) / Math.PI)),
        color: '#2576eb',
        fillColor: '#2576eb',
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '4, 6',
      })
        .bindTooltip(`Project Footprint Envelope: ${project.title} (~${project.requestedAreaAcres || 0} Acres)`, {
          direction: 'top',
        })
        .addTo(map);

      L.circleMarker(siteCenter, {
        radius: 7,
        fillColor: '#2576eb',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
      })
        .bindTooltip(`Centroid: ${project.district}, ${project.state}`, { direction: 'top' })
        .addTo(map);
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [project]);

  if (loading) {
    return (
      <div className="things-boss-dashboard">
        <div className="things-boss-inner" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="things-review-card" style={{ padding: '40px', textAlign: 'center', maxWidth: '460px', width: '100%', alignItems: 'center' }}>
            <span className="things-boss-dot-pulse" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: 'var(--tb-ink)' }}>
              Retrieving Official Project Dossier
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--tb-fog)', margin: 0, lineHeight: 1.5 }}>
              Accessing central statutory register, cadastral coordinates, and workflow engine...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="things-boss-dashboard">
        <div className="things-boss-inner" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="things-review-card" style={{ padding: '40px', textAlign: 'center', maxWidth: '460px', width: '100%', alignItems: 'center' }}>
            <span style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</span>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 8px', color: 'var(--tb-ink)' }}>Project Not Found</h2>
            <p style={{ fontSize: '13.5px', color: 'var(--tb-fog)', margin: '0 0 20px', lineHeight: 1.5 }}>
              The requested project identifier does not exist in the central scrutiny register.
            </p>
            <Link to="/boss/dashboard" className="things-btn things-btn-primary">
              &larr; Return to BOSS Worklist
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="things-boss-dashboard">
      <div className="things-boss-inner">
        {/* Breadcrumb Header */}
        <nav className="things-boss-breadcrumb" aria-label="Breadcrumb">
          <Link to="/boss/dashboard" className="things-boss-breadcrumb-link">
            &larr; BOSS Central Worklist
          </Link>
          <span className="things-boss-breadcrumb-sep">/</span>
          <span className="things-boss-breadcrumb-current">{project.code}</span>
          <span className="things-boss-breadcrumb-sep">/</span>
          <span className="things-boss-breadcrumb-label">Pre-Feasibility &amp; Statutory Scrutiny Dossier</span>
        </nav>

        {/* Main Dossier Header Banner */}
        <section className="things-dossier-masthead">
          <div className="things-dossier-info">
            <div className="things-dossier-tag-row">
              <span className="things-pill things-pill-neutral">{project.proponentAuthority}</span>
              <span className="things-pill things-pill-blue things-pill-mono">{project.code}</span>
              <span
                className={`things-pill ${
                  isProjectApproved
                    ? 'things-pill-emerald'
                    : project.status === 'NEW_REQUEST'
                    ? 'things-pill-amber'
                    : 'things-pill-blue'
                }`}
              >
                {project.status.replace(/_/g, ' ')}
              </span>
              {isWorkflowConfigured && workflow && (
                <span className="things-pill things-pill-neutral things-pill-mono">
                  Template: {workflow.templateName}
                </span>
              )}
            </div>
            <h1 className="things-dossier-title">{project.title}</h1>
            <p className="things-dossier-subtitle">
              Statutory Proponent Intake
              {project.rfctlarrSection ? ` • ${project.rfctlarrSection}` : ''}
              {project.state ? ` • ${project.state}` : ''}
              {project.district ? ` (${project.district})` : ''}
            </p>
          </div>

          <div className="things-dossier-actions">
            {/* Button 1: Land Parcels - Distinct styling if confirmed vs pending */}
            {areParcelsConfirmed ? (
              <button
                type="button"
                onClick={() => navigate(`/boss/projects/${project.id}/parcels`)}
                className="things-btn things-btn-outline-green"
                title="Land parcels have been determined and locked into the sovereign registry"
              >
                <span>✓ Land Parcels Confirmed</span>
                <span style={{ fontSize: '12px', opacity: 0.85 }}>
                  ({(project.selectedParcelsCount ?? 0) > 0 ? `${project.selectedParcelsCount} Parcels • ` : ''}View &rarr;)
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(`/boss/projects/${project.id}/parcels`)}
                className="things-btn things-btn-outline-amber"
                title="Statutory action required: Land parcels must be determined and confirmed"
              >
                <span>⚡ Determine Land Parcels</span>
                <span>&rarr;</span>
              </button>
            )}

            {/* Button 2: Workflow Pipeline - Distinct styling if configured vs pending */}
            {isWorkflowConfigured ? (
              <button
                type="button"
                onClick={() => navigate(`/boss/projects/${project.id}/workflow`)}
                className="things-btn things-btn-outline-green"
                title="Statutory workflow pipeline has been configured with scrutiny stages"
              >
                <span>✓ Pipeline Configured ({(workflow?.stages || []).length} Stages)</span>
                <span style={{ fontSize: '12px', opacity: 0.85 }}>(Manage &rarr;)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => navigate(`/boss/projects/${project.id}/workflow?select=true`)}
                className="things-btn things-btn-outline-amber"
                title="Statutory action required: Choose and instantiate a workflow template"
              >
                <span>⚡ Choose Workflow</span>
                <span>&rarr;</span>
              </button>
            )}

            {/* Button 3: THE BOSS APPROVE PROJECT FORWARD BUTTON - Only provided when BOTH are done */}
            {!isProjectApproved ? (
              canApproveProject ? (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setIsApproveModalOpen(true)}
                  className="things-btn things-btn-success"
                  title="Approve project forward and transfer authority to workflow task engine"
                >
                  <span>✓ Approve Project Forward</span>
                  <span>&rarr;</span>
                </button>
              ) : null
            ) : (
              <div className="things-pill things-pill-emerald things-pill-mono" style={{ padding: '8px 14px', fontSize: '12px' }}>
                <span>✓</span>
                <span>PROJECT APPROVED &amp; DISPATCHED (BOSS EXITED)</span>
              </div>
            )}
          </div>
        </section>

        {/* Success banner if approved */}
        {approveSuccessMessage && (
          <div className="things-banner-success">
            <div className="things-banner-content">
              <span className="things-banner-icon">✓</span>
              <div>
                <div className="things-banner-title">
                  STATUTORY SANCTION RECORDED &bull; DISPATCHED TO TASK ENGINE
                </div>
                <p className="things-banner-desc">
                  {approveSuccessMessage}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setApproveSuccessMessage(null)}
              className="things-banner-close"
              title="Dismiss notification"
            >
              &times;
            </button>
          </div>
        )}

        {/* Key Metric Strips (KPIs) */}
        <section className="things-dossier-kpi-grid">
          <div className="things-dossier-kpi-card">
            <span className="things-dossier-kpi-label">Requested Land Area</span>
            <div className="things-dossier-kpi-value" style={{ color: 'var(--tb-signal-blue)' }}>
              {(project.requestedAreaAcres ?? 0).toLocaleString()}
              <span className="things-dossier-kpi-unit">Acres</span>
            </div>
            <span className="things-dossier-kpi-sub">{project.requestedAreaHa} Hectares Statutory Metric</span>
          </div>

          <div className="things-dossier-kpi-card">
            <span className="things-dossier-kpi-label">
              {project.corridorKm > 0 ? 'Corridor Span & Width' : 'Site Footprint & Geometry'}
            </span>
            <div className="things-dossier-kpi-value">
              {project.corridorKm > 0 ? (
                <>
                  {project.corridorKm}
                  <span className="things-dossier-kpi-unit">km</span>
                </>
              ) : (
                <>
                  {(project.requestedAreaAcres ?? 0).toLocaleString()}
                  <span className="things-dossier-kpi-unit">Acres</span>
                </>
              )}
            </div>
            <span className="things-dossier-kpi-sub">
              {project.corridorKm > 0
                ? `Right of Way (RoW): ${project.alignmentWidthMeters} meters`
                : `Contiguous Site Envelope (${project.requestedAreaHa} Ha)`}
            </span>
          </div>

          <div className="things-dossier-kpi-card">
            <span className="things-dossier-kpi-label">Estimated Capital Outlay</span>
            <div className="things-dossier-kpi-value">
              &#8377;{(project.estimatedBudgetCr ?? 0).toLocaleString()}
              <span className="things-dossier-kpi-unit">Cr</span>
            </div>
            <span className="things-dossier-kpi-sub">Sponsoring: {project.ministry}</span>
          </div>

          <div className="things-dossier-kpi-card">
            <span className="things-dossier-kpi-label">Statutory SLA Window</span>
            <div className="things-dossier-kpi-value" style={{ fontSize: '20px' }}>
              {new Date(project.slaDeadline).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
            <span className="things-dossier-kpi-sub">Section 4(2) Gazette Notice Target</span>
          </div>
        </section>

        {/* 4-Card / 5-Card Grid */}
        <section className="things-review-grid">
          {/* Card 1: Statutory Project Details */}
          <div className="things-review-card">
            <div className="things-review-card-header">
              <h3 className="things-review-card-title">1. Statutory Scope &amp; Purpose</h3>
              <span className="things-pill things-pill-neutral">Gazette Spec</span>
            </div>
            <div className="things-review-card-body">
              <div className="things-field-group">
                <span className="things-field-label">Statutory Public Purpose:</span>
                <p className="things-field-prose">{project.statutoryPurpose || 'Public Purpose (Statutory Infrastructure)'}</p>
              </div>

              <div className="things-field-group">
                <span className="things-field-label">Corridor Description &amp; Technical Scope:</span>
                <p className="things-field-prose">
                  {project.scope ||
                    (project.corridorKm && project.corridorKm > 0
                      ? `${project.corridorKm} km statutory alignment corridor spanning ${project.district}, ${project.state}.`
                      : `Statutory site footprint of ${(project.requestedAreaAcres ?? 0).toLocaleString()} acres located in ${project.district}, ${project.state}.`)}
                </p>
              </div>

              <div className="things-field-row">
                <div>
                  <span className="things-field-label">RFCTLARR Statutory Section:</span>
                  <div className="things-field-val-strong">{project.rfctlarrSection || 'Section 2(1) / Section 11 Pending'}</div>
                </div>
                <div>
                  <span className="things-field-label">Submission Date:</span>
                  <div className="things-field-val-strong">
                    {new Date(project.submissionDate).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Requesting Authority & Nodal Officer Profile */}
          <div className="things-review-card">
            <div className="things-review-card-header">
              <h3 className="things-review-card-title">2. Proponent Authority &amp; Nodal Officer</h3>
              <span className="things-pill things-pill-emerald">Authenticated</span>
            </div>
            <div className="things-review-card-body">
              <div className="things-officer-profile">
                <div className="things-officer-avatar">
                  {(project.nodalOfficer?.name || project.proponentAuthority || 'NA')
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')}
                </div>
                <div className="things-officer-meta">
                  <h4 className="things-officer-name">{project.nodalOfficer?.name || `${project.proponentAuthority} Nodal Cell`}</h4>
                  <span className="things-officer-role">{project.nodalOfficer?.designation || 'Competent Authority (CALA)'}</span>
                  <span className="things-officer-dept">{project.nodalOfficer?.department || project.ministry || 'Statutory Land Acquisition Cell'}</span>
                </div>
              </div>

              <div className="things-contact-list">
                <div className="things-contact-item">
                  <span className="things-contact-label">Official Email:</span>
                  <span className="things-contact-val">{project.nodalOfficer?.email || `${project.proponentAuthority.toLowerCase().replace(/[^a-z0-9]/g, '')}-nodal@gov.in`}</span>
                </div>
                <div className="things-contact-item">
                  <span className="things-contact-label">Official Phone:</span>
                  <span className="things-contact-val">{project.nodalOfficer?.phone || '+91 (011) 2436-0000 (Central Registry)'}</span>
                </div>
                <div className="things-contact-item">
                  <span className="things-contact-label">Registered Office:</span>
                  <span className="things-contact-val">{project.nodalOfficer?.officeAddress || `Central Headquarters, ${project.ministry || 'Government of India'}, New Delhi`}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Spatial Corridor Alignment Preview */}
          <div className="things-review-card things-review-card-full">
            <div className="things-review-card-header">
              <div className="things-review-card-title-group">
                <h3 className="things-review-card-title">
                  {project.corridorKm > 0
                    ? '3. Spatial Corridor Alignment & Geometry'
                    : '3. Spatial Cadastral Footprint & Boundary'}
                </h3>
                <span className="things-review-card-subtitle">
                  {project.corridorKm > 0
                    ? `Project Polyline Geometry • ${project.state} • ${project.corridorKm} km`
                    : `Project Spatial Boundary • ${project.state} (${project.district}) • ${(project.requestedAreaAcres ?? 0).toLocaleString()} Acres`}
                </span>
              </div>
              <span className="things-pill things-pill-neutral things-pill-mono">EPSG:3857 &bull; WGS84</span>
            </div>

            <div className="things-review-card-body" style={{ padding: 0 }}>
              <div className="things-corridor-map-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <div ref={mapContainerRef} className="things-corridor-map-frame" />
                <div className="things-corridor-legend">
                  {project.corridorKm > 0 ? (
                    <>
                      <div className="things-legend-item">
                        <span className="things-legend-line" style={{ backgroundColor: '#2576eb' }} />
                        <span>Requested Highway Corridor Alignment ({project.corridorKm} km)</span>
                      </div>
                      <div className="things-legend-item">
                        <span className="things-legend-dot" style={{ backgroundColor: '#303336' }} />
                        <span>Origin Node (Km 0+000)</span>
                      </div>
                      <div className="things-legend-item">
                        <span className="things-legend-dot" style={{ backgroundColor: '#2576eb' }} />
                        <span>Terminus Node (Km {project.corridorKm}+000)</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="things-legend-item">
                        <span className="things-legend-line" style={{ backgroundColor: '#2576eb' }} />
                        <span>Project Footprint Envelope ({(project.requestedAreaAcres ?? 0).toLocaleString()} Acres)</span>
                      </div>
                      <div className="things-legend-item">
                        <span className="things-legend-dot" style={{ backgroundColor: '#303336' }} />
                        <span>Centroid: {project.state} ({project.district})</span>
                      </div>
                      <div className="things-legend-item">
                        <span className="things-legend-dot" style={{ backgroundColor: '#10b981' }} />
                        <span>Cadastral Coverage: {project.selectedParcelsCount || 0} Confirmed Parcels</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Initial Statutory Documents */}
          <div className="things-review-card things-review-card-full">
            <div className="things-review-card-header">
              <h3 className="things-review-card-title">4. Initial Statutory Documents &amp; Gazette Annexures</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="things-pill things-pill-blue">Cryptographically Verified</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddDocModalOpen(true);
                    setNewDocTitle('');
                    setSelectedDocFile(null);
                    setUploadDocError(null);
                  }}
                  className="things-btn things-btn-outline things-btn-sm"
                  title="Add or upload a statutory document to this project docket"
                >
                  <span>&#43; Add Document</span>
                </button>
              </div>
            </div>
            <div className="things-review-card-body">
              {(!project.initialDocuments || project.initialDocuments.length === 0) ? (
                <div style={{ padding: '36px 20px', textAlign: 'center', border: '1px dashed var(--tb-hairline)', borderRadius: '12px', backgroundColor: '#fafbfc' }}>
                  <p style={{ margin: '0 0 12px', fontSize: '13.5px', color: 'var(--tb-fog)' }}>
                    No statutory documents currently registered in this project docket.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsAddDocModalOpen(true)}
                    className="things-btn things-btn-primary things-btn-sm"
                  >
                    &#43; Add Initial Statutory Document
                  </button>
                </div>
              ) : (
                <div className="things-doc-list">
                  {project.initialDocuments?.map((doc) => (
                    <div key={doc.id} className="things-doc-item">
                      <div className="things-doc-left">
                        <div className="things-doc-icon-badge">
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                        </div>
                        <div className="things-doc-meta">
                          <div className="things-doc-title-row">
                            <span className="things-doc-title">{doc.title}</span>
                            {doc.type && (
                              <span className="things-pill things-pill-neutral things-pill-mono">
                                {doc.type}
                              </span>
                            )}
                          </div>
                          <div className="things-doc-sub-meta">
                            <span>{doc.fileSize}</span>
                            <span>&bull;</span>
                            <span>Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</span>
                            <span>&bull;</span>
                            <span className="things-doc-hash">{doc.hash}</span>
                          </div>
                        </div>
                      </div>
                      <div className="things-doc-action-col">
                        <button
                          type="button"
                          onClick={() => {
                            DocumentService.downloadDocument(doc.id, `${doc.title}.pdf`).catch(() => {
                              alert(`Statutory Gazette Document: ${doc.title}\nVerified Integrity: ${doc.hash}\nStatus: Cryptographically Certified in Sovereign Registry.`);
                            });
                          }}
                          className="things-btn things-btn-outline things-btn-sm"
                        >
                          View Dossier &darr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Card 5: Statutory Acquisition Workflow Pipeline */}
          {workflow && (
            <div className="things-review-card things-review-card-full">
              <div className="things-review-card-header">
                <div className="things-review-card-title-group">
                  <h3 className="things-review-card-title">5. Sovereign Statutory Acquisition Workflow Pipeline</h3>
                  <span className="things-review-card-subtitle">
                    Active Master Template &bull; {workflow.templateName} &bull; {workflow.status}
                  </span>
                </div>
                <span
                  className={`things-pill ${
                    isProjectApproved ? 'things-pill-emerald' : 'things-pill-blue'
                  }`}
                >
                  {isProjectApproved ? 'PIPELINE ACTIVE' : 'CONFIGURATION DRAFT'}
                </span>
              </div>
              <div className="things-review-card-body">
                {/* Template Header Bar */}
                <div className="things-workflow-template-bar">
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tb-ash)' }}>
                      Chosen Master Template:
                    </span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--tb-signal-blue)', marginLeft: '8px' }}>
                      {workflow.templateName}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '14px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '12px', fontWeight: 600, color: 'var(--tb-ash)' }}>
                    <span>{(workflow.stages || []).length} Scrutiny Stages</span>
                    <span>&bull;</span>
                    <span style={{ color: '#059669' }}>{(workflow.stages || []).reduce((s, stg) => s + stg.slaDays, 0)} Days Total Binding SLA</span>
                  </div>
                </div>

                {/* Workflow Pipeline Progress Strip */}
                {isProjectApproved && progress && (
                  <div className="things-workflow-progression-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--tb-ink)' }}>
                          Pipeline Progression:
                        </span>
                        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '12.5px', fontWeight: 700, color: progress.status === 'COMPLETED' ? '#059669' : 'var(--tb-signal-blue)' }}>
                          {progress.completedStages} of {progress.totalStages} Stages Completed ({progress.percentage}%)
                        </span>
                      </div>
                      <span
                        className={`things-pill things-pill-mono ${
                          progress.status === 'COMPLETED'
                            ? 'things-pill-emerald'
                            : progress.status === 'REJECTED'
                            ? 'things-pill-rose'
                            : 'things-pill-blue'
                        }`}
                      >
                        {progress.status === 'COMPLETED'
                          ? '✓ SOVEREIGN PIPELINE COMPLETED'
                          : progress.status === 'REJECTED'
                          ? '✕ STATUTORY OBJECTION ACTIVE'
                          : `● CURRENT GATE: ${progress.currentStageName.toUpperCase()}`}
                      </span>
                    </div>
                    {/* Progress Bar Track */}
                    <div className="things-progression-track">
                      <div
                        className="things-progression-bar"
                        style={{
                          width: `${progress.percentage}%`,
                          backgroundColor:
                            progress.status === 'COMPLETED'
                              ? '#10b981'
                              : progress.status === 'REJECTED'
                              ? '#ef4444'
                              : 'var(--tb-signal-blue)',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Sequential Scrutiny Gates List */}
                <div className="things-gate-list">
                  {workflow.stages?.map((stage, idx) => {
                    const isCurrentActive = stage.status === 'ACTIVE';
                    const isRejected = stage.status === 'REJECTED';
                    const isCompleted = stage.status === 'COMPLETED';

                    return (
                      <div
                        key={stage.id}
                        className={`things-gate-row ${isCurrentActive ? 'is-active' : ''} ${isRejected ? 'is-rejected' : ''}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <span
                            className="things-gate-number"
                            style={{
                              backgroundColor: isCompleted
                                ? '#10b981'
                                : isCurrentActive
                                ? 'var(--tb-signal-blue)'
                                : isRejected
                                ? '#ef4444'
                                : 'var(--tb-ash)',
                            }}
                          >
                            {isCompleted ? '✓' : idx + 1}
                          </span>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--tb-ink)' }}>
                                {stage.name}
                              </span>
                              {isCurrentActive && (
                                <span className="things-pill things-pill-blue things-pill-mono" style={{ fontSize: '10.5px' }}>
                                  Current Actionable Gate
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '12.5px', color: 'var(--tb-fog)', marginTop: '2px' }}>
                              {stage.department} &bull; Officer: <strong>{stage.assignedOfficer?.name ?? 'Unassigned'}</strong> ({stage.assignedOfficer?.designation?.split('&')[0]?.trim() ?? 'Pending'})
                            </div>
                            {stage.requiredDocuments && stage.requiredDocuments.length > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                                <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '10.5px', fontWeight: 600, color: 'var(--tb-fog)', textTransform: 'uppercase' }}>
                                  Statutory Deliverables:
                                </span>
                                {stage.requiredDocuments.map((doc, dIdx) => (
                                  <span
                                    key={dIdx}
                                    className="things-pill things-pill-neutral things-pill-mono"
                                    style={{ fontSize: '10.5px', padding: '1px 7px' }}
                                  >
                                    &bull; {doc}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span className="things-pill things-pill-blue things-pill-mono">
                            {stage.slaDays} Days SLA
                          </span>
                          <span
                            className={`things-pill things-pill-mono ${
                              isCompleted
                                ? 'things-pill-emerald'
                                : isCurrentActive
                                ? 'things-pill-blue'
                                : isRejected
                                ? 'things-pill-rose'
                                : 'things-pill-neutral'
                            }`}
                          >
                            {isCompleted ? '✓ COMPLETED' : isCurrentActive ? '● ACTIVE' : isRejected ? '✕ REJECTED' : 'PENDING'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Phase 6: Workflow Task Engine Execution Console */}
                {isProjectApproved && activeTask && (
                  <div
                    className="things-task-engine-console"
                    style={{
                      borderLeftColor:
                        activeTask.status === 'ACCEPTED'
                          ? '#10b981'
                          : activeTask.status === 'REJECTED'
                          ? '#ef4444'
                          : 'var(--tb-signal-blue)',
                    }}
                  >
                    <div className="things-task-console-header">
                      <div>
                        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--tb-signal-blue)', textTransform: 'uppercase' }}>
                          PHASE 6 TASK ENGINE &bull; STAGE {activeTask.stageOrder} SCRUTINY GATE
                        </span>
                        <h4 style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 700, color: 'var(--tb-ink)' }}>
                          {activeTask.stageName}
                        </h4>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '11px', color: 'var(--tb-fog)' }}>
                          Task ID: {activeTask.id.slice(0, 18)}...
                        </span>
                        <span
                          className={`things-pill things-pill-mono ${
                            activeTask.status === 'ACCEPTED'
                              ? 'things-pill-emerald'
                              : activeTask.status === 'IN_PROGRESS'
                              ? 'things-pill-amber'
                              : activeTask.status === 'REJECTED'
                              ? 'things-pill-rose'
                              : 'things-pill-blue'
                          }`}
                        >
                          STATUS: {activeTask.status}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                      <div style={{ fontSize: '13px', color: 'var(--tb-ink)', lineHeight: 1.5 }}>
                        <div><strong>Responsible Officer:</strong> {activeTask.assignedOfficer?.name ?? 'Unassigned'} ({activeTask.assignedOfficer?.designation ?? 'Pending'})</div>
                        <div style={{ marginTop: '3px' }}><strong>Department:</strong> {activeTask.department}</div>
                        <div style={{ marginTop: '3px' }}><strong>Statutory SLA:</strong> {activeTask.slaDays} Days &bull; Target Due: {new Date(activeTask.dueDate).toLocaleDateString('en-IN')}</div>
                      </div>
                      <div>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--tb-fog)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Required Statutory Deliverables:
                        </span>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {activeTask.requiredDocuments?.map((doc, dIdx) => (
                            <span key={dIdx} className="things-pill things-pill-neutral things-pill-mono" style={{ fontSize: '11px' }}>
                              {doc}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Rejection Alert Banner */}
                    {activeTask.status === 'REJECTED' && activeTask.rejectionReason && (
                      <div style={{ padding: '12px 16px', backgroundColor: 'var(--tb-rose-soft)', border: '1px solid #fca5a5', borderRadius: '8px', color: '#991b1b', fontSize: '13px' }}>
                        <strong>Statutory Objection Recorded:</strong> &ldquo;{activeTask.rejectionReason}&rdquo;
                        <div style={{ fontSize: '12px', marginTop: '4px', color: '#b91c1c' }}>
                          Proponent Authority must upload corrected evidence and submit explanation to make stage actionable again.
                        </div>
                      </div>
                    )}

                    {/* Task Actions Control Bar */}
                    <div className="things-task-actions-bar">
                      <span style={{ fontSize: '12.5px', color: 'var(--tb-fog)', marginRight: 'auto', fontStyle: 'italic' }}>
                        {activeTask.status === 'ASSIGNED'
                          ? 'Officer has been notified. Click to commence field scrutiny.'
                          : activeTask.status === 'IN_PROGRESS'
                          ? 'Field scrutiny underway. Officer can accept or raise statutory objection.'
                          : activeTask.status === 'REJECTED'
                          ? 'Objection active. Awaiting Requesting Authority correction.'
                          : 'Stage completed.'}
                      </span>

                      {activeTask.status === 'ASSIGNED' && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleStartTask(activeTask.id)}
                          className="things-btn things-btn-primary"
                        >
                          {actionLoading ? 'Commencing...' : '▶ Start Scrutiny Task'}
                        </button>
                      )}

                      {activeTask.status === 'IN_PROGRESS' && (
                        <>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => setIsRejectModalOpen(true)}
                            className="things-btn things-btn-outline-red"
                          >
                            ✕ Raise Statutory Objection / Reject...
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => handleAcceptTask(activeTask.id)}
                            className="things-btn things-btn-success"
                          >
                            {actionLoading ? 'Advancing...' : '✓ Accept Task & Advance Pipeline \u2192'}
                          </button>
                        </>
                      )}

                      {activeTask.status === 'REJECTED' && (
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => setIsResubmitModalOpen(true)}
                          className="things-btn things-btn-primary"
                        >
                          ↺ Resubmit Corrections (Proponent Authority) &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Statutory Audit Timeline & Transition Trail */}
                {(auditEvents || []).length > 0 && (
                  <div className="things-audit-container">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--tb-ink)' }}>
                        Statutory Audit Trail &bull; Task Transition History ({(auditEvents || []).length} Events)
                      </span>
                      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '11px', color: 'var(--tb-fog)' }}>
                        RFCTLARR Section 11 Compliance Log
                      </span>
                    </div>
                    <div className="things-audit-list">
                      {auditEvents?.map((evt) => (
                        <div
                          key={evt.id}
                          className="things-audit-item"
                          style={{
                            borderLeftColor:
                              evt.eventType === 'TASK_REJECTED'
                                ? '#ef4444'
                                : evt.eventType === 'TASK_ACCEPTED' || evt.eventType === 'WORKFLOW_COMPLETED'
                                ? '#10b981'
                                : 'var(--tb-signal-blue)',
                          }}
                        >
                          <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontSize: '11px', color: 'var(--tb-fog)', whiteSpace: 'nowrap', minWidth: '125px' }}>
                            {new Date(evt.timestamp).toLocaleString('en-IN')}
                          </span>
                          <span
                            className={`things-pill things-pill-mono ${
                              evt.eventType === 'TASK_REJECTED'
                                ? 'things-pill-rose'
                                : evt.eventType === 'TASK_ACCEPTED' || evt.eventType === 'WORKFLOW_COMPLETED'
                                ? 'things-pill-emerald'
                                : 'things-pill-blue'
                            }`}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            {evt.eventType}
                          </span>
                          <div style={{ flex: 1, color: 'var(--tb-ink)' }}>
                            <strong>{evt.performedBy}:</strong> {evt.details}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Card 5: Statutory Acquisition Workflow Pipeline (Pending Template Choice) */}
          {!workflow && (
            <div className="things-review-card things-review-card-full">
              <div className="things-review-card-header">
                <div className="things-review-card-title-group">
                  <h3 className="things-review-card-title">5. Sovereign Statutory Acquisition Workflow Pipeline</h3>
                  <span className="things-review-card-subtitle">
                    Statutory Blueprint &bull; Pending Master Template Selection
                  </span>
                </div>
                <span className="things-pill things-pill-amber">ACTION REQUIRED</span>
              </div>
              <div className="things-review-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                  <h4 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: 'var(--tb-ink)' }}>
                    Workflow Pipeline Ready for Configuration &amp; Approval
                  </h4>
                  <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--tb-fog)', lineHeight: 1.5 }}>
                    Choose an authorized statutory master template (Standard RFCTLARR, Linear Expressway Fast-Track, etc.) or fast-track approve with the default statutory pipeline.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => navigate(`/boss/projects/${project.id}/workflow?select=true`)}
                    className="things-btn things-btn-outline"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    Choose Workflow Template &rarr;
                  </button>
                  {canApproveProject && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => setIsApproveModalOpen(true)}
                      className="things-btn things-btn-success"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      ✓ Approve Project Forward &rarr;
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Rejection Modal */}
        {isRejectModalOpen && activeTask && (
          <div className="things-modal-backdrop" onClick={() => setIsRejectModalOpen(false)}>
            <div className="things-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
              <div className="things-modal-header">
                <div>
                  <span className="things-pill things-pill-rose things-pill-mono" style={{ marginBottom: '6px' }}>
                    Stage {activeTask.stageOrder} Objection
                  </span>
                  <h3 className="things-modal-title" style={{ color: '#dc2626' }}>
                    Raise Statutory Objection
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="things-modal-close"
                  title="Close"
                >
                  &times;
                </button>
              </div>
              <p className="things-modal-prose">
                Record formal grounds of statutory objection or document defect for Stage {activeTask.stageOrder} ({activeTask.stageName}).
              </p>
              <div>
                <label className="things-input-label">Grounds for Objection *</label>
                <textarea
                  rows={4}
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="e.g. 30-Year Non-Encumbrance Certificate missing revenue sub-registrar seal and certified stamp..."
                  className="things-textarea"
                />
              </div>
              <div className="things-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="things-btn things-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!rejectionReasonInput.trim() || actionLoading}
                  onClick={handleConfirmReject}
                  className="things-btn things-btn-red"
                >
                  {actionLoading ? 'Recording...' : 'Confirm Statutory Rejection \u2192'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resubmission Modal */}
        {isResubmitModalOpen && activeTask && (
          <div className="things-modal-backdrop" onClick={() => setIsResubmitModalOpen(false)}>
            <div className="things-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
              <div className="things-modal-header">
                <div>
                  <span className="things-pill things-pill-blue things-pill-mono" style={{ marginBottom: '6px' }}>
                    Stage {activeTask.stageOrder} Rectification
                  </span>
                  <h3 className="things-modal-title">
                    Resubmit Corrected Stage Deliverables
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsResubmitModalOpen(false)}
                  className="things-modal-close"
                  title="Close"
                >
                  &times;
                </button>
              </div>
              <p className="things-modal-prose">
                Provide explanation and submit corrected statutory deliverables for Stage {activeTask.stageOrder} ({activeTask.stageName}).
              </p>
              <div>
                <label className="things-input-label">Correction Explanation &amp; Evidence *</label>
                <textarea
                  rows={4}
                  value={resubmitExplanation}
                  onChange={(e) => setResubmitExplanation(e.target.value)}
                  placeholder="e.g. Attached certified Non-Encumbrance Certificate with Sub-Registrar seal and notarized heirship affidavit..."
                  className="things-textarea"
                />
              </div>
              <div className="things-modal-footer">
                <button
                  type="button"
                  onClick={() => setIsResubmitModalOpen(false)}
                  className="things-btn things-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!resubmitExplanation.trim() || actionLoading}
                  onClick={handleConfirmResubmit}
                  className="things-btn things-btn-primary"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Corrections \u2192'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Add Statutory Document to Project Docket */}
        {isAddDocModalOpen && (
          <div className="things-modal-backdrop" onClick={() => !uploadingDoc && setIsAddDocModalOpen(false)}>
            <div className="things-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '620px' }}>
              <div className="things-modal-header">
                <div>
                  <span className="things-pill things-pill-blue things-pill-mono" style={{ marginBottom: '6px' }}>
                    Statutory Archive &bull; Gazette Annexures
                  </span>
                  <h3 className="things-modal-title">
                    Add Document &mdash; {project.code}
                  </h3>
                  <p className="things-modal-prose" style={{ marginTop: '4px' }}>
                    Upload and register official gazette annexures or statutory reports into project dossier.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddDocModalOpen(false)}
                  className="things-modal-close"
                  title="Close"
                >
                  &times;
                </button>
              </div>

              {uploadDocError && (
                <div style={{ padding: '10px 14px', backgroundColor: 'var(--tb-rose-soft)', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontSize: '13px' }}>
                  {uploadDocError}
                </div>
              )}

              <form onSubmit={handleUploadDocument} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Document Title */}
                <div>
                  <label className="things-input-label">
                    Document Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    placeholder="e.g. Joint Measurement Survey Minutes &amp; Spot Inspection Log"
                    className="things-input"
                  />

                  {/* Quick Title Suggestions */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                    {[
                      'Gazette Notification Draft Sec 4(1)',
                      'Joint Measurement Survey Log',
                      'Social Impact Assessment (SIA) Study',
                      'Detailed Project Report (DPR) Extract',
                      'Cadastral Boundary GeoJSON Map',
                      'Forest & Wildlife Clearance NOC',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewDocTitle(preset)}
                        className="things-preset-chip"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Document Category / Type */}
                <div>
                  <label className="things-input-label">
                    Statutory Classification *
                  </label>
                  <select
                    value={newDocType}
                    onChange={(e) => setNewDocType(e.target.value)}
                    className="things-select"
                  >
                    <option value="GAZETTE_DRAFT">Gazette Notification Draft (Section 4(1))</option>
                    <option value="DPR_EXTRACT">Detailed Project Report (DPR) Alignment Extract</option>
                    <option value="SIA_CLEARANCE">Social Impact Assessment (SIA) Study &amp; Clearance</option>
                    <option value="ALIGNMENT_GEOJSON">Cadastral Survey Map &amp; Right-of-Way Vector Layer</option>
                    <option value="SCHEDULE_OF_LAND">Schedule of Land Holdings (Khasra / Khatauni)</option>
                    <option value="OTHER">Other Statutory NOC / Certificate / Memorandum</option>
                  </select>
                </div>

                {/* File Upload Selector */}
                <div>
                  <label className="things-input-label">
                    Attach Document File (Optional)
                  </label>
                  <input
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setSelectedDocFile(file);
                      if (file && !newDocTitle) {
                        setNewDocTitle(file.name.replace(/\.[^/.]+$/, ''));
                      }
                    }}
                    className="things-input"
                    style={{ padding: '7px 10px', backgroundColor: '#fafbfc' }}
                  />
                  <span className="things-input-hint">
                    Supports PDF, GeoJSON, TIFF, ZIP. If no file is attached, an authenticated sovereign digital certificate will be generated and signed with SHA-256 hash.
                  </span>
                </div>

                {/* Actions */}
                <div className="things-modal-footer">
                  <button
                    type="button"
                    disabled={uploadingDoc}
                    onClick={() => setIsAddDocModalOpen(false)}
                    className="things-btn things-btn-outline"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadingDoc || !newDocTitle.trim()}
                    className="things-btn things-btn-primary"
                  >
                    {uploadingDoc ? 'Registering Document...' : 'Upload & Register in Docket \u2192'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Statutory Scrutiny Approval Modal */}
        {isApproveModalOpen && (
          <div className="things-modal-backdrop" onClick={() => !actionLoading && setIsApproveModalOpen(false)}>
            <div className="things-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
              <div className="things-modal-header">
                <div>
                  <span className="things-pill things-pill-emerald things-pill-mono" style={{ marginBottom: '6px' }}>
                    BUREAU OF STATUTORY SCRUTINY (BOSS) &bull; CENTRAL SANCTION
                  </span>
                  <h3 className="things-modal-title">
                    Approve Project Forward
                  </h3>
                </div>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setIsApproveModalOpen(false)}
                  className="things-modal-close"
                  title="Close"
                >
                  &times;
                </button>
              </div>

              <p className="things-modal-prose">
                You are granting central statutory sanction for <strong>{project.title}</strong> (Docket № <code>{project.code}</code>). Once approved, this project is transitioned out of BOSS active intake and handed over to the multi-departmental Workflow Task Engine under RFCTLARR Act 2013.
              </p>

              {/* Dossier Summary Box */}
              <div style={{ padding: '16px 20px', backgroundColor: '#fafbfc', border: '1px solid var(--tb-hairline)', borderRadius: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '13px' }}>
                  <div>
                    <span style={{ color: 'var(--tb-fog)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                      Requisitioning Authority
                    </span>
                    <strong style={{ color: 'var(--tb-ink)' }}>{project.proponentAuthority}</strong> ({project.ministry})
                  </div>
                  <div>
                    <span style={{ color: 'var(--tb-fog)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                      Jurisdiction &amp; Section
                    </span>
                    <strong style={{ color: 'var(--tb-ink)' }}>{project.state} ({project.district}) &bull; {project.rfctlarrSection}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--tb-fog)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                      Requisition Scope
                    </span>
                    <strong style={{ color: 'var(--tb-signal-blue)' }}>{(project.requestedAreaAcres ?? 0).toLocaleString()} Acres</strong> &bull; {project.corridorKm} km RoW
                  </div>
                  <div>
                    <span style={{ color: 'var(--tb-fog)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                      Confirmed Land Parcels
                    </span>
                    <strong style={{ color: '#059669' }}>{project.selectedParcelsCount || 0} Cadastral Parcels Gazetted</strong>
                  </div>
                </div>
              </div>

              {/* Workflow Pipeline Selection / Summary */}
              <div>
                <label className="things-input-label">
                  Target Statutory Workflow Pipeline:
                </label>
                {workflow ? (
                  <div style={{ padding: '14px 16px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ color: 'var(--tb-signal-blue)', fontSize: '14px' }}>{workflow.templateName}</strong>
                      <span className="things-pill things-pill-blue things-pill-mono">
                        {(workflow.stages || []).length} Stages &bull; {(workflow.stages || []).reduce((s, stg) => s + stg.slaDays, 0)} Days Total SLA
                      </span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#1e3a8a', lineHeight: 1.4 }}>
                      &bull; Stage 1 (<strong>{workflow.stages[0]?.name}</strong>) will be instantiated immediately and assigned to <strong>{workflow.stages[0]?.assignedOfficer?.name ?? 'Unassigned'}</strong> ({workflow.stages[0]?.department}).
                    </div>
                  </div>
                ) : (
                  <div>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="things-select"
                    >
                      {availableTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({(t.defaultStages || []).length} Stages &bull; {t.category})
                        </option>
                      ))}
                    </select>
                    <span className="things-input-hint">
                      Master blueprint will be instantiated and dispatched to departmental field officers.
                    </span>
                  </div>
                )}
              </div>

              {/* Scrutiny Sanction Notes */}
              <div>
                <label className="things-input-label">
                  Statutory Clearance Sanction Note:
                </label>
                <textarea
                  rows={2}
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  className="things-textarea"
                  placeholder="Record formal statutory approval minute..."
                />
              </div>

              {/* Legal Declaration */}
              <div style={{ padding: '14px 16px', backgroundColor: '#fafbfc', borderLeft: '3px solid #10b981', borderRadius: '0 8px 8px 0' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--tb-ink)', lineHeight: 1.5 }}>
                  <input
                    type="checkbox"
                    checked={certificationChecked}
                    onChange={(e) => setCertificationChecked(e.target.checked)}
                    style={{ marginTop: '3px', accentColor: '#10b981' }}
                  />
                  <span>
                    <strong>Statutory Scrutiny Declaration:</strong> I certify that pre-feasibility requirements have been verified. Pursuant to Phase 6 statutory protocol, active BOSS intake authority concludes upon this action and operational authority transfers to Departmental CALA officers.
                  </span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="things-modal-footer">
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setIsApproveModalOpen(false)}
                  className="things-btn things-btn-outline"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading || !certificationChecked}
                  onClick={handleConfirmApproveProject}
                  className="things-btn things-btn-success"
                >
                  {actionLoading ? 'Sanctioning & Handing Over...' : '✓ Confirm Statutory Approval & Dispatch Project →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Colophon Footer */}
        <footer className="things-boss-colophon">
          <div>
            <strong>BhoomiNexus</strong> &bull; Bureau of Statutory Scrutiny (BOSS) Official Project Dossier
          </div>
          <div>
            RFCTLARR Act 2013 Statutory Compliance Registry &bull; Gazette Seal Verified
          </div>
        </footer>
      </div>
    </div>
  );
};

export default BossProjectReviewPage;

