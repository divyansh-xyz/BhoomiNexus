import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { bossService } from '../../services/api/boss.service';
import { workflowService } from '../../services/api/workflow.service';
import { taskService } from '../../services/api/task.service';
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

  const isProjectApproved =
    workflow?.status === 'ACTIVE' ||
    project?.status === 'PROJECT_APPROVED' ||
    project?.status === 'WORKFLOW_ACTIVE';

  const handleConfirmApproveProject = async () => {
    if (!projectId) return;
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

  // Initialize interactive Leaflet mini-map for spatial corridor preview
  useEffect(() => {
    if (!project || !mapContainerRef.current || mapRef.current) return;

    const initialCenter: [number, number] =
      project.corridorCoordinates && project.corridorCoordinates.length > 0
        ? project.corridorCoordinates[0]
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

    // Render Corridor Polyline
    if (project.corridorCoordinates && project.corridorCoordinates.length > 0) {
      const polyline = L.polyline(project.corridorCoordinates, {
        color: '#0058fe',
        weight: 4,
        opacity: 0.9,
      }).addTo(map);

      // Render start and end markers
      const startCoord = project.corridorCoordinates[0];
      const endCoord = project.corridorCoordinates[project.corridorCoordinates.length - 1];

      L.circleMarker(startCoord, {
        radius: 6,
        fillColor: '#000000',
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
        fillColor: '#0058fe',
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
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [project]);

  if (loading) {
    return (
      <div className="boss-page-container">
        <div className="boss-loading-placeholder">
          <span>Retrieving Official Project Dossier...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="boss-page-container">
        <div className="boss-error-box">
          <h2>Project Not Found</h2>
          <p>The requested project identifier does not exist in the central scrutiny register.</p>
          <Link to="/boss/dashboard" className="btn-cta-black" style={{ marginTop: '16px' }}>
            &larr; Return to BOSS Worklist
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="boss-page-container">
      {/* Breadcrumb Header */}
      <div className="boss-breadcrumb-bar">
        <Link to="/boss/dashboard" className="boss-breadcrumb-link">
          &larr; BOSS Central Worklist
        </Link>
        <span className="boss-breadcrumb-sep">/</span>
        <span className="boss-breadcrumb-current">{project.code}</span>
        <span className="boss-breadcrumb-sep">/</span>
        <span className="boss-breadcrumb-label">Pre-Feasibility &amp; Statutory Scrutiny Dossier</span>
      </div>

      {/* Main Dossier Header Banner */}
      <section className="boss-dossier-masthead">
        <div className="boss-dossier-title-group">
          <div className="boss-dossier-tag-row">
            <span className="editorial-tag">{project.proponentAuthority}</span>
            <span className="boss-code-tag">{project.code}</span>
            <span className="boss-status-tag">{project.status.replace(/_/g, ' ')}</span>
            {workflow && (
              <span className="boss-code-tag" style={{ backgroundColor: '#0058fe', color: '#ffffff' }}>
                Template: {workflow.templateName}
              </span>
            )}
          </div>
          <h1 className="boss-dossier-title">{project.title}</h1>
          <p className="boss-dossier-subtitle">
            Statutory Proponent Intake &bull; {project.rfctlarrSection} &bull; {project.state} ({project.district})
          </p>
        </div>

        <div className="boss-dossier-actions-top" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate(`/boss/projects/${project.id}/parcels`)}
            className="btn-cta-outline"
            style={{ fontSize: '14px', padding: '11px 20px' }}
          >
            View Land Parcels &rarr;
          </button>
          {workflow ? (
            <button
              type="button"
              onClick={() => navigate(`/boss/projects/${project.id}/workflow`)}
              className="btn-cta-outline"
              style={{ fontSize: '14px', padding: '11px 20px' }}
            >
              Manage Pipeline ({(workflow.stages || []).length} Stages) &rarr;
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/boss/projects/${project.id}/workflow?select=true`)}
              className="btn-cta-outline"
              style={{ fontSize: '14px', padding: '11px 20px' }}
            >
              Choose Workflow &rarr;
            </button>
          )}

          {/* THE BOSS APPROVE PROJECT FORWARD BUTTON */}
          {!isProjectApproved ? (
            <button
              type="button"
              disabled={actionLoading}
              onClick={() => setIsApproveModalOpen(true)}
              className="btn-cta-blue"
              style={{
                fontSize: '14px',
                padding: '11px 24px',
                backgroundColor: '#15803d',
                borderColor: '#15803d',
                color: '#ffffff',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(21, 128, 61, 0.3)',
                cursor: 'pointer',
              }}
              title="Approve project forward and transfer authority to workflow task engine"
            >
              <span>✓ Approve Project Forward</span>
              <span style={{ fontSize: '16px' }}>&rarr;</span>
            </button>
          ) : (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 18px',
                backgroundColor: '#dcfce7',
                border: '1.5px solid #86efac',
                color: '#15803d',
                fontSize: '13px',
                fontFamily: 'monospace',
                fontWeight: 700,
              }}
            >
              <span style={{ fontSize: '15px' }}>✓</span>
              <span>PROJECT APPROVED &amp; DISPATCHED (BOSS EXITED)</span>
            </div>
          )}
        </div>
      </section>

      {/* Success banner if approved */}
      {approveSuccessMessage && (
        <div
          style={{
            margin: '18px 0 0 0',
            padding: '14px 20px',
            backgroundColor: '#f0fdf4',
            border: '2px solid #16a34a',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '22px', color: '#16a34a' }}>✓</span>
            <div>
              <strong style={{ color: '#15803d', fontSize: '14px', fontFamily: 'var(--font-copernicus)' }}>
                STATUTORY SANCTION RECORDED &bull; DISPATCHED TO TASK ENGINE
              </strong>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#166534' }}>
                {approveSuccessMessage}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setApproveSuccessMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#16a34a',
              fontWeight: 700,
            }}
          >
            &times;
          </button>
        </div>
      )}

      <div className="hairline-fullwidth" />

      {/* Key Metric Strips */}
      <section className="boss-project-kpi-bar">
        <div className="boss-kpi-item">
          <span className="kpi-label">Requested Land Area</span>
          <div className="kpi-value text-signal-blue">
            {(project.requestedAreaAcres ?? 0).toLocaleString()}<span className="kpi-unit"> Acres</span>
          </div>
          <span className="kpi-sub">{project.requestedAreaHa} Hectares Statutory Metric</span>
        </div>

        <div className="boss-kpi-item">
          <span className="kpi-label">Corridor Span &amp; Width</span>
          <div className="kpi-value">
            {project.corridorKm}<span className="kpi-unit"> km</span>
          </div>
          <span className="kpi-sub">Right of Way (RoW): {project.alignmentWidthMeters} meters</span>
        </div>

        <div className="boss-kpi-item">
          <span className="kpi-label">Estimated Capital Outlay</span>
          <div className="kpi-value">
            &#8377;{(project.estimatedBudgetCr ?? 0).toLocaleString()}<span className="kpi-unit"> Cr</span>
          </div>
          <span className="kpi-sub">Sponsoring: {project.ministry}</span>
        </div>

        <div className="boss-kpi-item">
          <span className="kpi-label">Statutory SLA Window</span>
          <div className="kpi-value" style={{ fontSize: '20px' }}>
            {new Date(project.slaDeadline).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </div>
          <span className="kpi-sub">Section 4(2) Gazette Notice Target</span>
        </div>
      </section>

      <div className="hairline-fullwidth" />

      {/* 4-Card Broadsheet Grid */}
      <section className="boss-dossier-grid">
        {/* Card 1: Statutory Project Details */}
        <div className="boss-card">
          <div className="boss-card-header">
            <h3 className="boss-card-title">1. Statutory Scope &amp; Purpose</h3>
            <span className="boss-card-badge">Gazette Spec</span>
          </div>
          <div className="boss-card-body">
            <div className="boss-field-group">
              <span className="field-label">Statutory Public Purpose:</span>
              <p className="field-prose">{project.statutoryPurpose}</p>
            </div>

            <div className="boss-field-group">
              <span className="field-label">Corridor Description &amp; Technical Scope:</span>
              <p className="field-prose">{project.scope}</p>
            </div>

            <div className="boss-field-row">
              <div>
                <span className="field-label">RFCTLARR Statutory Section:</span>
                <span className="field-value-strong">{project.rfctlarrSection}</span>
              </div>
              <div>
                <span className="field-label">Submission Date:</span>
                <span className="field-value-strong">
                  {new Date(project.submissionDate).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Requesting Authority & Nodal Officer Profile */}
        <div className="boss-card">
          <div className="boss-card-header">
            <h3 className="boss-card-title">2. Proponent Authority &amp; Nodal Officer</h3>
            <span className="boss-card-badge">Authenticated</span>
          </div>
          <div className="boss-card-body">
            <div className="boss-officer-profile-box">
              <div className="officer-initials-badge">
                {(project.nodalOfficer?.name ?? 'Unassigned')
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div>
                <h4 className="officer-name">{project.nodalOfficer?.name ?? 'Unassigned'}</h4>
                <span className="officer-role">{project.nodalOfficer?.designation ?? 'Pending'}</span>
                <span className="officer-dept">{project.nodalOfficer?.department ?? 'Pending'}</span>
              </div>
            </div>

            <div className="boss-contact-details">
              <div className="contact-row">
                <span className="contact-label">Official Email:</span>
                <span className="contact-value">{project.nodalOfficer?.email ?? 'N/A'}</span>
              </div>
              <div className="contact-row">
                <span className="contact-label">Official Phone:</span>
                <span className="contact-value">{project.nodalOfficer?.phone ?? 'N/A'}</span>
              </div>
              <div className="contact-row">
                <span className="contact-label">Registered Office:</span>
                <span className="contact-value">{project.nodalOfficer?.officeAddress ?? 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Spatial Corridor Alignment Preview */}
        <div className="boss-card" style={{ gridColumn: 'span 2' }}>
          <div className="boss-card-header">
            <div>
              <h3 className="boss-card-title">3. Spatial Corridor Alignment &amp; Geometry</h3>
              <span className="boss-card-subtitle">
                Project Polyline Geometry &bull; {project.state} &bull; {project.corridorKm} km
              </span>
            </div>
            <span className="boss-card-badge">EPSG:3857 &bull; WGS84</span>
          </div>

          <div className="boss-corridor-map-wrapper">
            <div ref={mapContainerRef} className="boss-corridor-map-frame" />
            <div className="boss-corridor-legend">
              <div className="legend-item">
                <span className="legend-line" style={{ backgroundColor: '#0058fe' }} />
                <span>Requested Highway Corridor Alignment ({project.corridorKm} km)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: '#000000' }} />
                <span>Origin Node (Km 0+000)</span>
              </div>
              <div className="legend-item">
                <span className="legend-dot" style={{ backgroundColor: '#0058fe' }} />
                <span>Terminus Node (Km {project.corridorKm}+000)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Initial Statutory Documents */}
        <div className="boss-card" style={{ gridColumn: 'span 2' }}>
          <div className="boss-card-header">
            <h3 className="boss-card-title">4. Initial Statutory Documents &amp; Gazette Annexures</h3>
            <span className="boss-card-badge">Cryptographically Verified</span>
          </div>
          <div className="boss-card-body">
            <div className="boss-documents-list">
              {project.initialDocuments?.map((doc) => (
                <div key={doc.id} className="boss-doc-item">
                  <div className="doc-icon-col">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="doc-meta-col">
                    <span className="doc-title">{doc.title}</span>
                    <div className="doc-sub-meta">
                      <span>{doc.fileSize}</span>
                      <span>&bull;</span>
                      <span>Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</span>
                      <span>&bull;</span>
                      <span className="doc-hash">{doc.hash}</span>
                    </div>
                  </div>
                  <div className="doc-action-col">
                    <button
                      type="button"
                      onClick={() => alert(`Statutory Gazette Document: ${doc.title}\nVerified Integrity: ${doc.hash}`)}
                      className="btn-cta-outline"
                      style={{ padding: '6px 14px', fontSize: '12px' }}
                    >
                      View Dossier &darr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 5: Statutory Acquisition Workflow Pipeline */}
        {workflow && (
          <div className="boss-card" style={{ gridColumn: 'span 2' }}>
            <div className="boss-card-header">
              <div>
                <h3 className="boss-card-title">5. Sovereign Statutory Acquisition Workflow Pipeline</h3>
                <span className="boss-card-subtitle">
                  Active Master Template &bull; {workflow.templateName} &bull; {workflow.status}
                </span>
              </div>
              <span
                className="boss-card-badge"
                style={{
                  backgroundColor: workflow.status === 'ACTIVATED' ? '#dcfce7' : '#eff6ff',
                  color: workflow.status === 'ACTIVATED' ? '#15803d' : '#0058fe',
                  borderColor: workflow.status === 'ACTIVATED' ? '#86efac' : '#bfdbfe',
                }}
              >
                {workflow.status === 'ACTIVATED' ? 'PIPELINE ACTIVE' : 'CONFIGURATION DRAFT'}
              </span>
            </div>
            <div className="boss-card-body">
              {/* Statutory Sign-off & Handoff Banner (when not yet approved) */}
              {!isProjectApproved && (
                <div
                  style={{
                    marginBottom: '20px',
                    padding: '16px 20px',
                    background: '#f0fdf4',
                    border: '2px solid #16a34a',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '20px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 800, color: '#15803d', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                        STATUTORY SCRUTINY SIGN-OFF &bull; READY FOR DISPATCH
                      </span>
                      <span style={{ fontSize: '11px', background: '#dcfce7', color: '#15803d', padding: '1px 6px', fontWeight: 700, border: '1px solid #86efac' }}>
                        ACTION REQUIRED
                      </span>
                    </div>
                    <h4 style={{ margin: '0 0 4px', fontFamily: 'var(--font-copernicus)', fontSize: '16px', color: '#000000', fontWeight: 700 }}>
                      Approve Project Forward to Activate Clearance Pipeline
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#374151', lineHeight: '1.4' }}>
                      Corridor alignment, parcel schedule ({project.selectedParcelsCount || 0} parcels), and {(workflow.stages || []).length}-stage scrutiny parameters are configured. Approve to dispatch Stage 1 task to <strong>{workflow.stages[0]?.assignedOfficer?.name}</strong> ({workflow.stages[0]?.department}). BOSS involvement terminates upon approval.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setIsApproveModalOpen(true)}
                    className="btn-cta-blue"
                    style={{
                      fontSize: '14px',
                      padding: '12px 26px',
                      backgroundColor: '#15803d',
                      borderColor: '#15803d',
                      color: '#ffffff',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      whiteSpace: 'nowrap',
                      boxShadow: '0 2px 6px rgba(21, 128, 61, 0.3)',
                      cursor: 'pointer',
                    }}
                  >
                    <span>✓ Approve Project Forward</span>
                    <span style={{ fontSize: '16px' }}>&rarr;</span>
                  </button>
                </div>
              )}

              {/* Template Header Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '12px 16px', background: '#faf7f6', border: '1px solid rgba(0,0,0,0.1)' }}>
                <div>
                  <span style={{ fontFamily: 'var(--font-copernicus)', fontSize: '13px', fontWeight: 700, color: 'var(--color-carbon-ink)' }}>
                    Chosen Master Template:
                  </span>
                  <span style={{ fontFamily: 'var(--font-copernicus)', fontSize: '16px', fontWeight: 700, color: '#0058fe', marginLeft: '8px' }}>
                    {workflow.templateName}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontFamily: 'monospace', fontSize: '12.5px', fontWeight: 600 }}>
                  <span>{(workflow.stages || []).length} Scrutiny Stages</span>
                  <span>&bull;</span>
                  <span style={{ color: '#10b981' }}>{(workflow.stages || []).reduce((s, stg) => s + stg.slaDays, 0)} Days Total Binding SLA</span>
                </div>
              </div>

              {/* Workflow Pipeline Progress Strip */}
              {workflow.status === 'ACTIVATED' && progress && (
                <div style={{ marginBottom: '18px', padding: '14px 16px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'var(--font-copernicus)', fontSize: '13px', fontWeight: 700 }}>
                        Pipeline Progression:
                      </span>
                      <span style={{ fontFamily: 'monospace', fontSize: '12.5px', fontWeight: 700, color: progress.status === 'COMPLETED' ? '#15803d' : '#0058fe' }}>
                        {progress.completedStages} of {progress.totalStages} Stages Completed ({progress.percentage}%)
                      </span>
                    </div>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        background:
                          progress.status === 'COMPLETED'
                            ? '#dcfce7'
                            : progress.status === 'REJECTED'
                            ? '#fee2e2'
                            : '#eff6ff',
                        color:
                          progress.status === 'COMPLETED'
                            ? '#15803d'
                            : progress.status === 'REJECTED'
                            ? '#dc2626'
                            : '#0058fe',
                        border: `1px solid ${
                          progress.status === 'COMPLETED'
                            ? '#86efac'
                            : progress.status === 'REJECTED'
                            ? '#fca5a5'
                            : '#bfdbfe'
                        }`,
                      }}
                    >
                      {progress.status === 'COMPLETED'
                        ? '✓ SOVEREIGN PIPELINE COMPLETED'
                        : progress.status === 'REJECTED'
                        ? '✕ STATUTORY OBJECTION ACTIVE'
                        : `● CURRENT GATE: ${progress.currentStageName.toUpperCase()}`}
                    </span>
                  </div>
                  {/* Progress Bar Track */}
                  <div style={{ width: '100%', height: '7px', background: '#e2e8f0', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${progress.percentage}%`,
                        height: '100%',
                        background: progress.status === 'COMPLETED' ? '#10b981' : progress.status === 'REJECTED' ? '#ef4444' : '#0058fe',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Sequential Scrutiny Gates List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {workflow.stages?.map((stage, idx) => {
                  const isCurrentActive = stage.status === 'ACTIVE';
                  const isRejected = stage.status === 'REJECTED';
                  const isCompleted = stage.status === 'COMPLETED';

                  return (
                    <div
                      key={stage.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        background: isCurrentActive ? '#f8faff' : isRejected ? '#fff5f5' : '#ffffff',
                        border: isCurrentActive
                          ? '1.5px solid #0058fe'
                          : isRejected
                          ? '1.5px solid #ef4444'
                          : '1px solid rgba(0,0,0,0.12)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '26px',
                            height: '26px',
                            background: isCompleted ? '#10b981' : isCurrentActive ? '#0058fe' : isRejected ? '#ef4444' : '#000000',
                            color: '#ffffff',
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            fontWeight: 700,
                          }}
                        >
                          {isCompleted ? '✓' : idx + 1}
                        </span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontFamily: 'var(--font-copernicus)', fontWeight: 700, fontSize: '14.5px', color: '#000000' }}>
                              {stage.name}
                            </span>
                            {isCurrentActive && (
                              <span style={{ fontSize: '11px', color: '#0058fe', fontWeight: 600, fontFamily: 'monospace' }}>
                                (Current Actionable Gate)
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--color-fossil-gray)', marginTop: '2px' }}>
                            {stage.department} &bull; Officer: <strong>{stage.assignedOfficer?.name ?? 'Unassigned'}</strong> ({stage.assignedOfficer?.designation?.split('&')[0]?.trim() ?? 'Pending'})
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11.5px', background: '#eff6ff', color: '#0058fe', padding: '3px 8px', border: '1px solid #bfdbfe', fontWeight: 700 }}>
                          {stage.slaDays} Days SLA
                        </span>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '11px',
                            padding: '3px 8px',
                            fontWeight: 700,
                            background: isCompleted ? '#dcfce7' : isCurrentActive ? '#eff6ff' : isRejected ? '#fee2e2' : '#f1f5f9',
                            color: isCompleted ? '#15803d' : isCurrentActive ? '#0058fe' : isRejected ? '#dc2626' : '#64748b',
                            border: `1px solid ${isCompleted ? '#86efac' : isCurrentActive ? '#bfdbfe' : isRejected ? '#fca5a5' : '#e2e8f0'}`,
                          }}
                        >
                          {isCompleted ? '✓ COMPLETED' : isCurrentActive ? '● ACTIVE' : isRejected ? '✕ REJECTED' : 'PENDING'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Phase 6: Workflow Task Engine Execution Console */}
              {workflow.status === 'ACTIVATED' && activeTask && (
                <div style={{ marginTop: '20px', padding: '18px 20px', background: '#f8fafc', border: '2px solid #000000' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(0,0,0,0.1)', paddingBottom: '10px' }}>
                    <div>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px', color: '#0058fe', textTransform: 'uppercase' }}>
                        PHASE 6 TASK ENGINE &bull; STAGE {activeTask.stageOrder} SCRUTINY GATE
                      </span>
                      <h4 style={{ margin: '4px 0 0', fontFamily: 'var(--font-copernicus)', fontSize: '16px', color: '#000000' }}>
                        {activeTask.stageName}
                      </h4>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-fossil-gray)' }}>
                        Task ID: {activeTask.id.slice(0, 18)}...
                      </span>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          background:
                            activeTask.status === 'ACCEPTED'
                              ? '#dcfce7'
                              : activeTask.status === 'IN_PROGRESS'
                              ? '#fef3c7'
                              : activeTask.status === 'REJECTED'
                              ? '#fee2e2'
                              : '#eff6ff',
                          color:
                            activeTask.status === 'ACCEPTED'
                              ? '#15803d'
                              : activeTask.status === 'IN_PROGRESS'
                              ? '#92400e'
                              : activeTask.status === 'REJECTED'
                              ? '#dc2626'
                              : '#0058fe',
                        }}
                      >
                        STATUS: {activeTask.status}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--color-carbon-ink)' }}>
                      <div><strong>Responsible Officer:</strong> {activeTask.assignedOfficer?.name ?? 'Unassigned'} ({activeTask.assignedOfficer?.designation ?? 'Pending'})</div>
                      <div style={{ marginTop: '3px' }}><strong>Department:</strong> {activeTask.department}</div>
                      <div style={{ marginTop: '3px' }}><strong>Statutory SLA:</strong> {activeTask.slaDays} Days &bull; Target Due: {new Date(activeTask.dueDate).toLocaleDateString('en-IN')}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--color-fossil-gray)', textTransform: 'uppercase' }}>
                        Required Statutory Deliverables:
                      </span>
                      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '4px' }}>
                        {activeTask.requiredDocuments?.map((doc, dIdx) => (
                          <span key={dIdx} style={{ fontSize: '11px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.15)', padding: '2px 7px' }}>
                            {doc}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Rejection Alert Banner */}
                  {activeTask.status === 'REJECTED' && activeTask.rejectionReason && (
                    <div style={{ padding: '12px 14px', background: '#fee2e2', border: '1px solid #f87171', color: '#991b1b', fontSize: '13px', marginBottom: '16px' }}>
                      <strong>Statutory Objection Recorded:</strong> &ldquo;{activeTask.rejectionReason}&rdquo;
                      <div style={{ fontSize: '11.5px', marginTop: '4px', color: '#7f1d1d' }}>
                        Proponent Authority must upload corrected evidence and submit explanation to make stage actionable again.
                      </div>
                    </div>
                  )}

                  {/* Task Actions Control Bar */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-fossil-gray)', marginRight: 'auto', fontStyle: 'italic' }}>
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
                        className="btn-cta-blue"
                        style={{ fontSize: '13px', padding: '8px 18px', color: '#ffffff' }}
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
                          className="btn-cta-outline"
                          style={{ fontSize: '13px', padding: '8px 18px', color: '#dc2626', borderColor: '#dc2626' }}
                        >
                          ✕ Raise Statutory Objection / Reject...
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleAcceptTask(activeTask.id)}
                          className="btn-cta-blue"
                          style={{ fontSize: '13px', padding: '8px 20px', color: '#ffffff', backgroundColor: '#15803d', borderColor: '#15803d' }}
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
                        className="btn-cta-blue"
                        style={{ fontSize: '13px', padding: '8px 18px', color: '#ffffff' }}
                      >
                        ↺ Resubmit Corrections (Proponent Authority) &rarr;
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Statutory Audit Timeline & Transition Trail */}
              {(auditEvents || []).length > 0 && (
                <div style={{ marginTop: '20px', padding: '16px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.12)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontFamily: 'var(--font-copernicus)', fontSize: '14px', fontWeight: 700, color: '#000000' }}>
                      Statutory Audit Trail &bull; Task Transition History ({(auditEvents || []).length} Events)
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-fossil-gray)' }}>
                      RFCTLARR Section 11 Compliance Log
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                    {auditEvents?.map((evt) => (
                      <div
                        key={evt.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          padding: '8px 12px',
                          background: '#faf7f6',
                          borderLeft: `3px solid ${
                            evt.eventType === 'TASK_REJECTED'
                              ? '#ef4444'
                              : evt.eventType === 'TASK_ACCEPTED' || evt.eventType === 'WORKFLOW_COMPLETED'
                              ? '#10b981'
                              : '#0058fe'
                          }`,
                          fontSize: '12px',
                        }}
                      >
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-fossil-gray)', whiteSpace: 'nowrap', minWidth: '125px' }}>
                          {new Date(evt.timestamp).toLocaleString('en-IN')}
                        </span>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            background:
                              evt.eventType === 'TASK_REJECTED'
                                ? '#fee2e2'
                                : evt.eventType === 'TASK_ACCEPTED' || evt.eventType === 'WORKFLOW_COMPLETED'
                                ? '#dcfce7'
                                : '#eff6ff',
                            color:
                              evt.eventType === 'TASK_REJECTED'
                                ? '#dc2626'
                                : evt.eventType === 'TASK_ACCEPTED' || evt.eventType === 'WORKFLOW_COMPLETED'
                                ? '#15803d'
                                : '#0058fe',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {evt.eventType}
                        </span>
                        <div style={{ flex: 1, color: 'var(--color-carbon-ink)' }}>
                          <strong>{evt.performedBy}:</strong> {evt.details}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => navigate(`/boss/projects/${project.id}/workflow?select=true`)}
                  className="btn-cta-outline"
                  style={{ fontSize: '13px', padding: '8px 18px' }}
                >
                  Choose / Switch Template &rarr;
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/boss/projects/${project.id}/workflow`)}
                  className="btn-cta-outline"
                  style={{ fontSize: '13px', padding: '8px 18px' }}
                >
                  Edit Workflow Sequence &amp; Parameters &rarr;
                </button>
                {!isProjectApproved && (
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => setIsApproveModalOpen(true)}
                    className="btn-cta-blue"
                    style={{
                      fontSize: '13px',
                      padding: '8px 22px',
                      backgroundColor: '#15803d',
                      borderColor: '#15803d',
                      color: '#ffffff',
                      fontWeight: 700,
                    }}
                  >
                    ✓ Approve Project Forward &rarr;
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Card 5: Statutory Acquisition Workflow Pipeline (Pending Template Choice) */}
        {!workflow && (
          <div className="boss-card" style={{ gridColumn: 'span 2' }}>
            <div className="boss-card-header">
              <div>
                <h3 className="boss-card-title">5. Sovereign Statutory Acquisition Workflow Pipeline</h3>
                <span className="boss-card-subtitle">
                  Statutory Blueprint &bull; Pending Master Template Selection
                </span>
              </div>
              <span
                className="boss-card-badge"
                style={{
                  backgroundColor: '#fef3c7',
                  color: '#92400e',
                  borderColor: '#fde68a',
                }}
              >
                ACTION REQUIRED
              </span>
            </div>
            <div className="boss-card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <h4 style={{ margin: '0 0 6px', fontFamily: 'var(--font-copernicus)', fontSize: '16px', color: 'var(--color-carbon-ink)' }}>
                  Workflow Pipeline Ready for Configuration &amp; Approval
                </h4>
                <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-fossil-gray)' }}>
                  Choose an authorized statutory master template (Standard RFCTLARR, Linear Expressway Fast-Track, etc.) or fast-track approve with the default statutory pipeline.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => navigate(`/boss/projects/${project.id}/workflow?select=true`)}
                  className="btn-cta-outline"
                  style={{ fontSize: '14px', padding: '10px 20px', whiteSpace: 'nowrap' }}
                >
                  Choose Workflow Template &rarr;
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setIsApproveModalOpen(true)}
                  className="btn-cta-blue"
                  style={{
                    fontSize: '14px',
                    padding: '10px 24px',
                    color: '#ffffff',
                    backgroundColor: '#15803d',
                    borderColor: '#15803d',
                    whiteSpace: 'nowrap',
                    fontWeight: 700,
                  }}
                >
                  ✓ Approve Project Forward &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Modal */}
        {isRejectModalOpen && activeTask && (
          <div className="boss-modal-backdrop" onClick={() => setIsRejectModalOpen(false)}>
            <div className="boss-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', textAlign: 'left' }}>
              <h3 className="modal-title" style={{ fontSize: '20px', color: '#dc2626', marginBottom: '8px' }}>
                Raise Statutory Objection
              </h3>
              <p className="modal-prose" style={{ marginBottom: '14px', padding: 0 }}>
                Record formal grounds of statutory objection or document defect for Stage {activeTask.stageOrder} ({activeTask.stageName}).
              </p>
              <textarea
                rows={4}
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="e.g. 30-Year Non-Encumbrance Certificate missing revenue sub-registrar seal and certified stamp..."
                className="form-textarea-input"
                style={{ width: '100%', marginBottom: '16px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="btn-cta-outline"
                  style={{ fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!rejectionReasonInput.trim() || actionLoading}
                  onClick={handleConfirmReject}
                  className="btn-cta-blue"
                  style={{ fontSize: '13px', backgroundColor: '#dc2626', borderColor: '#dc2626', color: '#ffffff' }}
                >
                  {actionLoading ? 'Recording...' : 'Confirm Statutory Rejection \u2192'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resubmission Modal */}
        {isResubmitModalOpen && activeTask && (
          <div className="boss-modal-backdrop" onClick={() => setIsResubmitModalOpen(false)}>
            <div className="boss-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px', textAlign: 'left' }}>
              <h3 className="modal-title" style={{ fontSize: '20px', color: '#0058fe', marginBottom: '8px' }}>
                Resubmit Corrected Stage Deliverables
              </h3>
              <p className="modal-prose" style={{ marginBottom: '14px', padding: 0 }}>
                Provide explanation and submit corrected statutory deliverables for Stage {activeTask.stageOrder} ({activeTask.stageName}).
              </p>
              <textarea
                rows={4}
                value={resubmitExplanation}
                onChange={(e) => setResubmitExplanation(e.target.value)}
                placeholder="e.g. Attached certified Non-Encumbrance Certificate with Sub-Registrar seal and notarized heirship affidavit..."
                className="form-textarea-input"
                style={{ width: '100%', marginBottom: '16px', boxSizing: 'border-box' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsResubmitModalOpen(false)}
                  className="btn-cta-outline"
                  style={{ fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!resubmitExplanation.trim() || actionLoading}
                  onClick={handleConfirmResubmit}
                  className="btn-cta-blue"
                  style={{ fontSize: '13px', color: '#ffffff' }}
                >
                  {actionLoading ? 'Submitting...' : 'Submit Corrections \u2192'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Statutory Scrutiny Approval Modal */}
        {isApproveModalOpen && (
          <div className="boss-modal-backdrop" onClick={() => !actionLoading && setIsApproveModalOpen(false)}>
            <div
              className="boss-modal-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '640px', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000000', paddingBottom: '14px', marginBottom: '16px' }}>
                <div>
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: 800, color: '#15803d', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                    BUREAU OF STATUTORY SCRUTINY (BOSS) &bull; CENTRAL REQUISITION SANCTION
                  </span>
                  <h3 className="modal-title" style={{ fontSize: '22px', color: '#000000', margin: '4px 0 0' }}>
                    Approve Project Forward
                  </h3>
                </div>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setIsApproveModalOpen(false)}
                  style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#64748b' }}
                >
                  &times;
                </button>
              </div>

              <p className="modal-prose" style={{ marginBottom: '16px', padding: 0, fontSize: '13.5px', color: '#334155', lineHeight: '1.5' }}>
                You are granting central statutory sanction for <strong>{project.title}</strong> (Docket № <code>{project.code}</code>). Once approved, this project is transitioned out of BOSS active intake and handed over to the multi-departmental Workflow Task Engine under RFCTLARR Act 2013.
              </p>

              {/* Dossier Summary Box */}
              <div style={{ padding: '14px', background: '#faf7f6', border: '1px solid rgba(0,0,0,0.12)', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12.5px' }}>
                  <div>
                    <span style={{ color: 'var(--color-fossil-gray)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                      Requisitioning Authority
                    </span>
                    <strong style={{ color: '#000000' }}>{project.proponentAuthority}</strong> ({project.ministry})
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-fossil-gray)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                      Jurisdiction &amp; Section
                    </span>
                    <strong style={{ color: '#000000' }}>{project.state} ({project.district}) &bull; {project.rfctlarrSection}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-fossil-gray)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                      Requisition Scope
                    </span>
                    <strong style={{ color: '#0058fe' }}>{(project.requestedAreaAcres ?? 0).toLocaleString()} Acres</strong> &bull; {project.corridorKm} km RoW
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-fossil-gray)', display: 'block', fontSize: '11px', textTransform: 'uppercase', fontFamily: 'monospace' }}>
                      Confirmed Land Parcels
                    </span>
                    <strong style={{ color: '#15803d' }}>{project.selectedParcelsCount || 0} Cadastral Parcels Gazetted</strong>
                  </div>
                </div>
              </div>

              {/* Workflow Pipeline Selection / Summary */}
              <div style={{ marginBottom: '16px' }}>
                <label className="modal-input-label" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '13px' }}>
                  Target Statutory Workflow Pipeline:
                </label>
                {workflow ? (
                  <div style={{ padding: '12px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <strong style={{ color: '#0058fe', fontSize: '14px' }}>{workflow.templateName}</strong>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', background: '#ffffff', padding: '2px 6px', border: '1px solid #93c5fd', fontWeight: 700 }}>
                        {(workflow.stages || []).length} Stages &bull; {(workflow.stages || []).reduce((s, stg) => s + stg.slaDays, 0)} Days Total SLA
                      </span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#1e3a8a' }}>
                      &bull; Stage 1 (<strong>{workflow.stages[0]?.name}</strong>) will be instantiated immediately and assigned to <strong>{workflow.stages[0]?.assignedOfficer?.name ?? 'Unassigned'}</strong> ({workflow.stages[0]?.department}).
                    </div>
                  </div>
                ) : (
                  <div>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="modal-select-input"
                      style={{ width: '100%', padding: '9px 12px', fontSize: '13px', border: '1px solid #000000', borderRadius: '0px', fontFamily: 'inherit' }}
                    >
                      {availableTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({(t.defaultStages || []).length} Stages &bull; {t.category})
                        </option>
                      ))}
                    </select>
                    <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--color-fossil-gray)', marginTop: '4px' }}>
                      Master blueprint will be instantiated and dispatched to departmental field officers.
                    </span>
                  </div>
                )}
              </div>

              {/* Scrutiny Sanction Notes */}
              <div style={{ marginBottom: '16px' }}>
                <label className="modal-input-label" style={{ display: 'block', marginBottom: '6px', fontWeight: 700, fontSize: '13px' }}>
                  Statutory Clearance Sanction Note:
                </label>
                <textarea
                  rows={2}
                  value={approveNote}
                  onChange={(e) => setApproveNote(e.target.value)}
                  className="modal-textarea-input"
                  style={{ width: '100%', padding: '8px 12px', fontSize: '13px', border: '1px solid rgba(0,0,0,0.2)', borderRadius: '0px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  placeholder="Record formal statutory approval minute..."
                />
              </div>

              {/* Legal Declaration */}
              <div style={{ marginBottom: '20px', padding: '12px 14px', background: '#f8fafc', borderLeft: '3px solid #15803d' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: '#1e293b' }}>
                  <input
                    type="checkbox"
                    checked={certificationChecked}
                    onChange={(e) => setCertificationChecked(e.target.checked)}
                    style={{ marginTop: '2px', accentColor: '#15803d' }}
                  />
                  <span>
                    <strong>Statutory Scrutiny Declaration:</strong> I certify that pre-feasibility requirements have been verified. Pursuant to Phase 6 statutory protocol, active BOSS intake authority concludes upon this action and operational authority transfers to Departmental CALA officers.
                  </span>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={() => setIsApproveModalOpen(false)}
                  className="btn-cta-outline"
                  style={{ fontSize: '13.5px', padding: '9px 18px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading || !certificationChecked}
                  onClick={handleConfirmApproveProject}
                  className="btn-cta-blue"
                  style={{
                    fontSize: '13.5px',
                    padding: '9px 24px',
                    backgroundColor: '#15803d',
                    borderColor: '#15803d',
                    color: '#ffffff',
                    fontWeight: 700,
                  }}
                >
                  {actionLoading ? 'Sanctioning & Handing Over...' : '✓ Confirm Statutory Approval & Dispatch Project →'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default BossProjectReviewPage;
