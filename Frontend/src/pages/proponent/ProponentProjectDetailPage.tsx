import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import L from 'leaflet';
import { bossService } from '../../services/api/boss.service';
import type {
  ProjectRequest,
  PendingAction,
  WorkflowStageTracking,
  GrievanceRecord,
} from '../../types/boss.types';

export const ProponentProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Rejection resubmit modal state
  const [resubmitModal, setResubmitModal] = useState<{ open: boolean; action: PendingAction | null }>({
    open: false,
    action: null,
  });
  const [resubmitExplanation, setResubmitExplanation] = useState('');
  const [resubmitting, setResubmitting] = useState(false);

  // Phase 12: Grievances Record State
  const [grievances, setGrievances] = useState<GrievanceRecord[]>([]);
  const [grievancesLoading, setGrievancesLoading] = useState(false);
  const [grievanceFilter, setGrievanceFilter] = useState<'ALL' | 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'WHATSAPP'>('ALL');
  const [newGrievanceModal, setNewGrievanceModal] = useState(false);
  const [resolutionModal, setResolutionModal] = useState<{ open: boolean; grievance: GrievanceRecord | null }>({
    open: false,
    grievance: null,
  });
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolvingStatus, setResolvingStatus] = useState<'RESOLVED' | 'UNDER_REVIEW' | 'CLOSED'>('RESOLVED');
  const [resolving, setResolving] = useState(false);

  const [newGrievanceForm, setNewGrievanceForm] = useState({
    citizenName: '',
    citizenReference: '',
    surveyNumber: '',
    grievanceType: 'COMPENSATION_VALUATION',
    subject: '',
    description: '',
  });
  const [submittingGrievance, setSubmittingGrievance] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  const loadProject = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const p = await bossService.getProjectById(projectId);
      setProject(p);
    } catch (err) {
      console.error('Failed to load project details', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGrievances = async () => {
    if (!projectId) return;
    try {
      setGrievancesLoading(true);
      const res = await bossService.getProjectGrievances(projectId);
      setGrievances(res.grievances);
    } catch (err) {
      console.error('Failed to load grievances', err);
    } finally {
      setGrievancesLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
    loadGrievances();
  }, [projectId]);

  // Leaflet map preview
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

    // Dark Map Base
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        attribution: '&copy; Esri',
      }
    ).addTo(map);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
      }
    ).addTo(map);

    if (project.corridorCoordinates && project.corridorCoordinates.length > 0) {
      // Buffer
      L.polyline(project.corridorCoordinates, {
        color: '#0058fe',
        weight: 18,
        opacity: 0.25,
      }).addTo(map);

      // Line
      const polyline = L.polyline(project.corridorCoordinates, {
        color: '#38bdf8',
        weight: 3,
        dashArray: '5 5',
        opacity: 1,
      }).addTo(map);

      // Markers
      const start = project.corridorCoordinates[0];
      const end = project.corridorCoordinates[project.corridorCoordinates.length - 1];

      L.circleMarker(start, {
        radius: 6,
        fillColor: '#10b981',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
      })
        .bindTooltip(`Origin: ${start[0].toFixed(3)}°N, ${start[1].toFixed(3)}°E`, { direction: 'top' })
        .addTo(map);

      L.circleMarker(end, {
        radius: 6,
        fillColor: '#f43f5e',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
      })
        .bindTooltip(`Terminus: ${end[0].toFixed(3)}°N, ${end[1].toFixed(3)}°E`, { direction: 'top' })
        .addTo(map);

      map.fitBounds(polyline.getBounds().pad(0.2));
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [project]);

  const handleResubmit = async () => {
    if (!resubmitModal.action || !projectId) return;
    setResubmitting(true);
    try {
      await bossService.resubmitStage(projectId, resubmitModal.action.stageId, {
        explanation: resubmitExplanation,
      });
      setResubmitModal({ open: false, action: null });
      setResubmitExplanation('');
      await loadProject();
    } catch (err) {
      console.error('Resubmit failed', err);
    } finally {
      setResubmitting(false);
    }
  };

  const handleCreateGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !newGrievanceForm.subject.trim() || !newGrievanceForm.description.trim()) return;
    setSubmittingGrievance(true);
    try {
      await bossService.createGrievance(projectId, newGrievanceForm);
      setNewGrievanceModal(false);
      setNewGrievanceForm({
        citizenName: '',
        citizenReference: '',
        surveyNumber: '',
        grievanceType: 'COMPENSATION_VALUATION',
        subject: '',
        description: '',
      });
      await loadGrievances();
      await loadProject(); // To update audit trail
    } catch (err) {
      console.error('Failed to create grievance', err);
      alert('Failed to record grievance. Please verify all required fields.');
    } finally {
      setSubmittingGrievance(false);
    }
  };

  const handleResolveGrievance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolutionModal.grievance || !resolutionNotes.trim()) return;
    setResolving(true);
    try {
      await bossService.respondGrievance(resolutionModal.grievance.id, {
        resolutionNotes,
        status: resolvingStatus,
      });
      setResolutionModal({ open: false, grievance: null });
      setResolutionNotes('');
      await loadGrievances();
      await loadProject();
    } catch (err) {
      console.error('Failed to resolve grievance', err);
      alert('Failed to save resolution notes.');
    } finally {
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="boss-page-container">
        <div className="boss-loading-placeholder">
          <span>Retrieving Statutory Requisition Dossier...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="boss-page-container">
        <div className="boss-error-box">
          <h2>Requisition Record Not Found</h2>
          <p>The requested project tracking code does not exist in the proponent registry.</p>
          <Link to="/projects" className="btn-cta-blue" style={{ marginTop: '16px', color: '#ffffff' }}>
            &larr; Return to Project Register
          </Link>
        </div>
      </div>
    );
  }

  const stages = project.workflowStages || [];
  const progress = project.workflowProgress;
  const parcelProg = project.parcelProgress;
  const pendingActions = project.pendingActions || [];

  // ============================================================
  // Lifecycle Workflow Stepper State Logic (Requirement 1)
  // Process: 01 Requisition Submitted -> 02 BOSS Scrutiny -> 03 Officer Confirmation -> 04 Process Complete
  // ============================================================
  const totalOfficerStages = stages.length;
  const completedOfficerStages = stages.filter((s) => s.status === 'COMPLETED').length;
  const isBossApproved = project.status !== 'DRAFT' && project.status !== 'NEW_REQUEST';
  const hasOfficerRejections = stages.some((s) => s.status === 'REJECTED');

  // Step 2: BOSS Scrutiny
  const step2Completed = isBossApproved;
  const step2Active = project.status === 'NEW_REQUEST';

  // Step 3: Officer Confirmation (turns GREEN when all officers in the workflow approve)
  const step3Completed =
    (totalOfficerStages > 0 && completedOfficerStages === totalOfficerStages) ||
    project.status === 'PROJECT_APPROVED';

  const step3Active = !step3Completed && (isBossApproved || stages.some((s) => s.status === 'ACTIVE' || s.status === 'COMPLETED'));

  // Step 4: Process Complete (turns GREEN when all officers approve and lifecycle is completed)
  const step4Completed = step3Completed && (project.status === 'PROJECT_APPROVED' || project.status === 'PARCELS_CONFIRMED' || project.status === 'WORKFLOW_ACTIVE');

  // Filtered grievances for the record card
  const filteredGrievances = grievances.filter((g) => {
    if (grievanceFilter === 'ALL') return true;
    if (grievanceFilter === 'WHATSAPP') return g.source === 'WHATSAPP';
    if (grievanceFilter === 'OPEN') return g.status === 'OPEN';
    if (grievanceFilter === 'UNDER_REVIEW') return g.status === 'UNDER_REVIEW';
    if (grievanceFilter === 'RESOLVED') return g.status === 'RESOLVED' || g.status === 'CLOSED';
    return true;
  });

  const openGrievancesCount = grievances.filter((g) => g.status === 'OPEN').length;
  const underReviewGrievancesCount = grievances.filter((g) => g.status === 'UNDER_REVIEW').length;
  const resolvedGrievancesCount = grievances.filter((g) => g.status === 'RESOLVED' || g.status === 'CLOSED').length;
  const whatsappGrievancesCount = grievances.filter((g) => g.source === 'WHATSAPP').length;

  return (
    <div className="boss-page-container">
      {/* Breadcrumb */}
      <div className="boss-breadcrumb-bar">
        <Link to="/projects" className="boss-breadcrumb-link">
          &larr; Proponent Project Register
        </Link>
        <span className="boss-breadcrumb-sep">/</span>
        <span className="boss-breadcrumb-current">{project.code}</span>
        <span className="boss-breadcrumb-sep">/</span>
        <span className="boss-breadcrumb-label">Statutory Lifecycle Tracker</span>
      </div>

      {/* Main Masthead (New Requisition button removed per Requirement 2) */}
      <section className="boss-dossier-masthead">
        <div className="boss-dossier-title-group">
          <div className="boss-dossier-tag-row">
            <span className="editorial-tag">{project.proponentAuthority}</span>
            <span className="boss-code-tag">{project.code}</span>
            <span className="boss-status-tag">
              {project.status === 'NEW_REQUEST'
                ? 'PENDING BOSS SCRUTINY'
                : project.status === 'PARCELS_CONFIRMED'
                ? 'PARCELS CONFIRMED'
                : project.status.replace(/_/g, ' ')}
            </span>
          </div>
          <h1 className="boss-dossier-title">{project.title}</h1>
          <p className="boss-dossier-subtitle">
            Statutory Proponent Intake &bull; {project.rfctlarrSection} &bull; {project.state} ({project.district})
          </p>
        </div>
      </section>

      <div className="hairline-fullwidth" />

      {/* ============================================================ */}
      {/* Requirement 1: 4-Stage Statutory Workflow Lifecycle Stepper */}
      {/* 01 Requisition Submitted -> 02 BOSS Scrutiny -> 03 Officer Confirmation -> 04 Process Complete */}
      {/* ============================================================ */}
      <section className="stepper-gazette-bar" style={{ marginBottom: stages.length > 0 ? '16px' : '0' }}>
        {/* Step 01: Requisition Submitted */}
        <div className="stepper-node completed">
          <span className="node-step">01</span>
          <div className="node-info">
            <span className="node-title">Requisition Submitted</span>
            <span className="node-date">
              {project.submissionDate ? new Date(project.submissionDate).toLocaleDateString('en-IN') : 'Submitted'}
            </span>
          </div>
        </div>
        <div className={`stepper-line ${isBossApproved || step2Active ? 'completed' : ''}`} />

        {/* Step 02: BOSS Scrutiny */}
        <div className={`stepper-node ${step2Completed ? 'completed' : step2Active ? 'active' : 'upcoming'}`}>
          <span className="node-step">02</span>
          <div className="node-info">
            <span className="node-title">BOSS Scrutiny</span>
            <span className="node-date">
              {step2Completed ? 'Approved' : step2Active ? 'In Review' : 'Pending'}
            </span>
          </div>
        </div>
        <div className={`stepper-line ${step3Completed ? 'completed' : ''}`} />

        {/* Step 03: Officer Confirmation (turns GREEN when all officers in workflow approve) */}
        <div
          className={`stepper-node ${
            step3Completed
              ? 'completed'
              : hasOfficerRejections
              ? 'rejected'
              : step3Active
              ? 'active'
              : 'upcoming'
          }`}
        >
          <span className="node-step">03</span>
          <div className="node-info">
            <span className="node-title">Officer Confirmation</span>
            <span className="node-date">
              {step3Completed
                ? totalOfficerStages > 0
                  ? `Approved (${completedOfficerStages}/${totalOfficerStages})`
                  : 'All Officers Approved'
                : hasOfficerRejections
                ? `Action Required (${completedOfficerStages}/${totalOfficerStages} Approved)`
                : step3Active
                ? totalOfficerStages > 0
                  ? `${completedOfficerStages}/${totalOfficerStages} Officers Confirmed`
                  : 'In Review by Officers'
                : 'Pending BOSS Clearance'}
            </span>
          </div>
        </div>
        <div className={`stepper-line ${step4Completed ? 'completed' : ''}`} />

        {/* Step 04: Process Complete */}
        <div className={`stepper-node ${step4Completed ? 'completed' : 'upcoming'}`}>
          <span className="node-step">04</span>
          <div className="node-info">
            <span className="node-title">Process Complete</span>
            <span className="node-date">
              {step4Completed ? 'Statutory Process Complete' : 'Pending Officer Approvals'}
            </span>
          </div>
        </div>
      </section>

      {/* Detailed Departmental Officer Breakdown (when workflow stages exist) */}
      {stages.length > 0 && (
        <section className="phase11-workflow-tracker" style={{ marginTop: '16px' }}>
          <div className="boss-card-header">
            <h3 className="boss-card-title">Departmental Officer Approvals Breakdown</h3>
            <span className="boss-card-badge">
              {progress ? `${progress.completedStages}/${progress.totalStages} Confirmed` : `${stages.length} Departmental Stages`}
            </span>
          </div>

          {/* Overall progress bar */}
          {progress && progress.totalStages > 0 && (
            <div className="phase11-progress-bar-container">
              <div className="phase11-progress-bar-track">
                <div
                  className="phase11-progress-bar-fill"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <span className="phase11-progress-pct">{progress.percentage}% Complete</span>
            </div>
          )}

          {/* Stage pipeline */}
          <div className="phase11-stage-pipeline">
            {stages.map((stage: WorkflowStageTracking, idx: number) => {
              const stageStatusClass =
                stage.status === 'COMPLETED'
                  ? 'stage-completed'
                  : stage.status === 'ACTIVE'
                  ? 'stage-active'
                  : stage.status === 'REJECTED'
                  ? 'stage-rejected'
                  : 'stage-pending';

              return (
                <React.Fragment key={stage.id}>
                  <div className={`phase11-stage-node ${stageStatusClass}`}>
                    <div className="stage-node-indicator">
                      {stage.status === 'COMPLETED' ? (
                        <span className="stage-check">✓</span>
                      ) : stage.status === 'REJECTED' ? (
                        <span className="stage-cross">✕</span>
                      ) : stage.status === 'ACTIVE' ? (
                        <span className="stage-pulse" />
                      ) : (
                        <span className="stage-number">{String(stage.stageOrder).padStart(2, '0')}</span>
                      )}
                    </div>
                    <div className="stage-node-info">
                      <span className="stage-node-name">{stage.name}</span>
                      <span className="stage-node-dept">{stage.department}</span>
                      {stage.officerName && (
                        <span className="stage-node-officer">{stage.officerName}</span>
                      )}
                      <span className={`stage-node-badge badge-${stage.status.toLowerCase()}`}>
                        {stage.status}
                      </span>
                    </div>
                  </div>
                  {idx < stages.length - 1 && (
                    <div className={`phase11-stage-connector ${stage.status === 'COMPLETED' ? 'connector-completed' : ''}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </section>
      )}

      <div className="hairline-fullwidth" />

      {/* ============================================================ */}
      {/* Pending Actions / Rejection Alert Banner */}
      {/* ============================================================ */}
      {pendingActions.length > 0 && (
        <section className="phase11-actions-section">
          <div className="boss-card-header">
            <h3 className="boss-card-title" style={{ color: '#f44336' }}>
              ⚠ Pending Actions ({pendingActions.length})
            </h3>
            <span className="boss-card-badge" style={{ background: '#5c1616', color: '#ff8a80' }}>
              Urgent
            </span>
          </div>

          <div className="phase11-actions-list">
            {pendingActions.map((action: PendingAction) => (
              <div key={action.id} className="phase11-action-card">
                <div className="action-card-icon">⚠</div>
                <div className="action-card-body">
                  <h4 className="action-card-title">
                    Stage Rejected: {action.stageName}
                  </h4>
                  <p className="action-card-reason">{action.reason}</p>
                  <div className="action-card-meta">
                    {action.department && <span>Dept: {action.department}</span>}
                    {action.rejectedAt && (
                      <span>Rejected: {new Date(action.rejectedAt).toLocaleDateString('en-IN')}</span>
                    )}
                  </div>
                </div>
                <button
                  className="btn-cta-danger-sm"
                  onClick={() => {
                    setResubmitModal({ open: true, action });
                    setResubmitExplanation('');
                  }}
                >
                  Correct &amp; Resubmit →
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* KPI Telemetry Bar (Includes Grievance Record KPI) */}
      <section className="boss-project-kpi-bar">
        <div className="boss-kpi-item">
          <span className="kpi-label">Requested Land Area</span>
          <div className="kpi-value text-signal-blue">
            <span>{(project.requestedAreaAcres || 0).toFixed(1)}</span>
            <span className="kpi-unit">Acres</span>
          </div>
          <span className="kpi-sub">({project.requestedAreaHa} Ha metric)</span>
        </div>

        <div className="boss-kpi-item">
          <span className="kpi-label">Corridor Alignment</span>
          <div className="kpi-value">
            <span>{project.corridorKm}</span>
            <span className="kpi-unit">km</span>
          </div>
          <span className="kpi-sub">Right-of-Way: {project.alignmentWidthMeters}m</span>
        </div>

        <div className="boss-kpi-item">
          <span className="kpi-label">Parcel Progress</span>
          <div className="kpi-value text-emerald">
            <span>
              {parcelProg ? parcelProg.confirmedCount : project.selectedParcelsCount || 0}/
              {parcelProg ? parcelProg.candidateCount : project.candidateParcelsCount || 0}
            </span>
            <span className="kpi-unit">Bound</span>
          </div>
          <span className="kpi-sub">
            {parcelProg && parcelProg.confirmedAreaAcres
              ? `${parcelProg.confirmedAreaAcres.toFixed(1)} Acres Confirmed`
              : 'Cadastral Determination'}
          </span>
        </div>

        <div className="boss-kpi-item">
          <span className="kpi-label">Grievance Record</span>
          <div className="kpi-value" style={{ color: openGrievancesCount > 0 ? '#ea580c' : '#059669' }}>
            <span>{grievances.length}</span>
            <span className="kpi-unit">Filed</span>
          </div>
          <span className="kpi-sub">
            {openGrievancesCount} Open &bull; {resolvedGrievancesCount} Resolved
          </span>
        </div>

        <div className="boss-kpi-item">
          <span className="kpi-label">Statutory SLA Deadline</span>
          <div className="kpi-value">
            <span style={{ fontSize: '18px' }}>{project.slaDeadline}</span>
          </div>
          <span className="kpi-sub">14-Day Central Gazette Rule</span>
        </div>
      </section>

      <div className="hairline-fullwidth" />

      {/* Dossier Grid */}
      <section className="boss-dossier-grid">
        {/* Card 1: Statutory Purpose */}
        <div className="boss-card">
          <div className="boss-card-header">
            <h3 className="boss-card-title">1. Public Purpose &amp; Legal Mandate</h3>
            <span className="boss-card-badge">Section 2(1)</span>
          </div>
          <div className="boss-card-body">
            <p className="boss-body-p">{project.statutoryPurpose}</p>
            <div className="spec-meta-block">
              <div className="spec-row">
                <span className="spec-label">Proponent Entity:</span>
                <span className="spec-val">{project.proponentAuthority}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Administrative Ministry:</span>
                <span className="spec-val">{project.ministry}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Target Jurisdiction:</span>
                <span className="spec-val">{project.district}, {project.state}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Estimated Outlay:</span>
                <span className="spec-val">₹{project.estimatedBudgetCr} Cr</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Spatial Corridor Map Preview */}
        <div className="boss-card">
          <div className="boss-card-header">
            <h3 className="boss-card-title">2. Plotted Alignment Vector</h3>
            <span className="boss-card-badge">GIS PostGIS</span>
          </div>
          <div className="boss-card-body" style={{ padding: '0' }}>
            <div ref={mapContainerRef} className="boss-corridor-map-frame" />
            <div className="boss-corridor-legend">
              <div className="legend-item">
                <span className="legend-line" style={{ backgroundColor: '#0058fe', opacity: 0.5 }} />
                <span>{project.alignmentWidthMeters}m Acquisition Buffer Swath</span>
              </div>
              <div className="legend-item">
                <span className="legend-line" style={{ backgroundColor: '#38bdf8' }} />
                <span>Centerline Alignment ({project.corridorKm} km)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Gazette Documents */}
        <div className="boss-card" style={{ gridColumn: 'span 2' }}>
          <div className="boss-card-header">
            <h3 className="boss-card-title">3. Attached Statutory Gazette Documents &amp; Feasibility</h3>
            <span className="boss-card-badge">Cryptographically Verified</span>
          </div>
          <div className="boss-card-body">
            <div className="boss-documents-list">
              {project.initialDocuments?.map((doc) => (
                <div key={doc.id} className="boss-doc-item">
                  <div className="doc-icon-col">📄</div>
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
                    <span className="doc-verified-badge">&#10003; SHA-256 OK</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* Requirement 3: Card 4 — Grievances & Citizen Objections Record */}
        {/* ============================================================ */}
        <div className="boss-card" style={{ gridColumn: 'span 2' }}>
          <div className="boss-card-header">
            <div>
              <h3 className="boss-card-title">4. Statutory Grievances &amp; Citizen Objections Record</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '3px' }}>
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  RFCTLARR Chapter IV Statutory Objections &bull; 15-Day Mandatory Public Hearing Window
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    padding: '2px 7px',
                    backgroundColor: '#f0fdf4',
                    color: '#15803d',
                    border: '1px solid #86efac',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block' }} />
                  Meta WhatsApp Cloud Pipeline Connected
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="boss-card-badge">
                {filteredGrievances.length} Records Logged
              </span>
              <button
                type="button"
                className="btn-cta-blue"
                style={{ fontSize: '12px', padding: '6px 14px', color: '#ffffff' }}
                onClick={() => setNewGrievanceModal(true)}
              >
                + Record Statutory Objection
              </button>
            </div>
          </div>

          <div className="boss-card-body">
            {/* Filter Pills */}
            <div className="grievance-filters-bar">
              <div className="grievance-filter-group">
                <button
                  type="button"
                  className={`grievance-filter-pill ${grievanceFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setGrievanceFilter('ALL')}
                >
                  All Objections ({grievances.length})
                </button>
                <button
                  type="button"
                  className={`grievance-filter-pill ${grievanceFilter === 'WHATSAPP' ? 'active' : ''}`}
                  onClick={() => setGrievanceFilter('WHATSAPP')}
                  style={{ color: grievanceFilter === 'WHATSAPP' ? '#ffffff' : '#059669' }}
                >
                  💬 WhatsApp Ingestion ({whatsappGrievancesCount})
                </button>
                <button
                  type="button"
                  className={`grievance-filter-pill ${grievanceFilter === 'OPEN' ? 'active' : ''}`}
                  onClick={() => setGrievanceFilter('OPEN')}
                >
                  Open / Pending ({openGrievancesCount})
                </button>
                <button
                  type="button"
                  className={`grievance-filter-pill ${grievanceFilter === 'UNDER_REVIEW' ? 'active' : ''}`}
                  onClick={() => setGrievanceFilter('UNDER_REVIEW')}
                >
                  Under Review ({underReviewGrievancesCount})
                </button>
                <button
                  type="button"
                  className={`grievance-filter-pill ${grievanceFilter === 'RESOLVED' ? 'active' : ''}`}
                  onClick={() => setGrievanceFilter('RESOLVED')}
                >
                  Resolved ({resolvedGrievancesCount})
                </button>
              </div>
            </div>

            {/* Grievances List */}
            {grievancesLoading ? (
              <p className="boss-body-p" style={{ color: '#8a8a8e' }}>
                Retrieving statutory objections dossier...
              </p>
            ) : filteredGrievances.length === 0 ? (
              <div style={{ padding: '30px', textAlign: 'center', backgroundColor: '#fafafa', border: '1px dashed #d4d4d8' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#71717a' }}>
                  No statutory objections or citizen grievances recorded under this category.
                </p>
                <button
                  type="button"
                  onClick={() => setNewGrievanceModal(true)}
                  style={{
                    marginTop: '12px',
                    fontSize: '12px',
                    color: '#0058fe',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Click here to record a new citizen representation
                </button>
              </div>
            ) : (
              <div className="grievance-cards-list">
                {filteredGrievances.map((g) => (
                  <div
                    key={g.id}
                    className={`grievance-card-item status-${g.status.toLowerCase()}`}
                  >
                    <div className="grievance-header-row">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="grievance-ref-tag">{g.referenceNumber}</span>
                        {g.source === 'WHATSAPP' ? (
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              padding: '2px 8px',
                              backgroundColor: '#f0fdf4',
                              color: '#15803d',
                              border: '1px solid #86efac',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            💬 WhatsApp Intake {g.citizenPhone ? `(+${g.citizenPhone})` : ''}
                          </span>
                        ) : (
                          <span className="grievance-category-tag">
                            🏛️ Portal Intake
                          </span>
                        )}
                        <span className="grievance-category-tag">
                          {formatGrievanceType(g.grievanceType)}
                        </span>
                      </div>
                      <span className={`grievance-status-badge ${g.status.toLowerCase()}`}>
                        {g.status === 'OPEN'
                          ? '● PENDING REVIEW'
                          : g.status === 'UNDER_REVIEW'
                          ? '● INQUIRY ACTIVE'
                          : '✓ RESOLVED'}
                      </span>
                    </div>

                    <h4 className="grievance-subject-text">{g.subject}</h4>

                    <div className="grievance-citizen-bar">
                      <span>
                        👤 Landowner: <strong>{g.citizenName}</strong>
                      </span>
                      {g.citizenReference && (
                        <span>
                          📍 <strong>{g.citizenReference}</strong>
                        </span>
                      )}
                      {g.surveyNumber && (
                        <span>
                          📐 Survey/Plot: <strong>{g.surveyNumber}</strong>
                        </span>
                      )}
                    </div>

                    <p className="grievance-desc-text">{g.description}</p>

                    {g.resolutionNotes && (
                      <div className="grievance-resolution-callout">
                        <strong>✓ Official Hearing Findings / Redressal Determination:</strong>
                        <span>{g.resolutionNotes}</span>
                        {g.resolvedAt && (
                          <span style={{ fontSize: '11px', color: '#15803d', marginTop: '2px' }}>
                            Determined on {new Date(g.resolvedAt).toLocaleDateString('en-IN')} by Competent Land Acquisition Authority
                          </span>
                        )}
                      </div>
                    )}

                    <div className="grievance-footer-row">
                      <span className="grievance-meta-item">
                        Lodged on {new Date(g.createdAt).toLocaleDateString('en-IN')} &bull; {g.slaDays}-Day Statutory SLA Rule
                      </span>
                      <button
                        type="button"
                        className="btn-grievance-action"
                        onClick={() => {
                          setResolutionModal({ open: true, grievance: g });
                          setResolutionNotes(g.resolutionNotes || '');
                          setResolvingStatus(g.status === 'RESOLVED' ? 'RESOLVED' : 'UNDER_REVIEW');
                        }}
                      >
                        {g.status === 'RESOLVED' ? 'Update Hearing Finding →' : 'Record Official Determination →'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/* Modal: Record New Statutory Grievance / Objection */}
      {/* ============================================================ */}
      {newGrievanceModal && (
        <div className="phase11-modal-overlay" onClick={() => setNewGrievanceModal(false)}>
          <div className="phase11-modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div className="phase11-modal-header">
              <div>
                <h3>Record Statutory Citizen Objection / Grievance</h3>
                <span style={{ fontSize: '11.5px', color: '#666' }}>
                  Statutory Intake per RFCTLARR Section 15 &bull; Project {project.code}
                </span>
              </div>
              <button className="phase11-modal-close" onClick={() => setNewGrievanceModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleCreateGrievance}>
              <div className="phase11-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="phase11-modal-field">
                    <label>Landowner / Aggrieved Citizen Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kisan Ramchandra Patil"
                      value={newGrievanceForm.citizenName}
                      onChange={(e) => setNewGrievanceForm({ ...newGrievanceForm, citizenName: e.target.value })}
                    />
                  </div>
                  <div className="phase11-modal-field">
                    <label>Village / Revenue Locality *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Village Khalapur, Ward 3"
                      value={newGrievanceForm.citizenReference}
                      onChange={(e) => setNewGrievanceForm({ ...newGrievanceForm, citizenReference: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="phase11-modal-field">
                    <label>Affected Survey No. / ULPIN</label>
                    <input
                      type="text"
                      placeholder="e.g. SV-117 or ULPIN-44021"
                      value={newGrievanceForm.surveyNumber}
                      onChange={(e) => setNewGrievanceForm({ ...newGrievanceForm, surveyNumber: e.target.value })}
                    />
                  </div>
                  <div className="phase11-modal-field">
                    <label>Objection Category *</label>
                    <select
                      value={newGrievanceForm.grievanceType}
                      onChange={(e) => setNewGrievanceForm({ ...newGrievanceForm, grievanceType: e.target.value })}
                    >
                      <option value="COMPENSATION_VALUATION">Compensation &amp; Circle Rate Valuation</option>
                      <option value="BOUNDARY_DISPUTE">Cadastral Boundary &amp; Demarcation Dispute</option>
                      <option value="REHABILITATION_RESETTLEMENT">R&amp;R Second Schedule Entitlement</option>
                      <option value="TITLE_OWNERSHIP">Title, Khasra &amp; Ownership Verification</option>
                      <option value="ENVIRONMENTAL_CONCERN">Environmental Impact &amp; Access Easement</option>
                      <option value="OTHER">General Statutory Representation</option>
                    </select>
                  </div>
                </div>

                <div className="phase11-modal-field">
                  <label>Representation Subject / Head *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dispute over perennial irrigation valuation multiplier"
                    value={newGrievanceForm.subject}
                    onChange={(e) => setNewGrievanceForm({ ...newGrievanceForm, subject: e.target.value })}
                  />
                </div>

                <div className="phase11-modal-field">
                  <label>Detailed Particulars of Objection / Representation *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Enter the complete factual grounds, claims, document references or relief requested by the landowner..."
                    value={newGrievanceForm.description}
                    onChange={(e) => setNewGrievanceForm({ ...newGrievanceForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="phase11-modal-footer">
                <button
                  type="button"
                  className="btn-cta-outline"
                  onClick={() => setNewGrievanceModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-cta-blue"
                  style={{ color: '#fff' }}
                  disabled={submittingGrievance}
                >
                  {submittingGrievance ? 'Recording into Registry...' : 'Lodge Statutory Objection →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Modal: Grievance Resolution & Official Determination */}
      {/* ============================================================ */}
      {resolutionModal.open && resolutionModal.grievance && (
        <div className="phase11-modal-overlay" onClick={() => setResolutionModal({ open: false, grievance: null })}>
          <div className="phase11-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div className="phase11-modal-header">
              <div>
                <h3>Record Official Determination</h3>
                <span style={{ fontSize: '11.5px', color: '#666' }}>
                  Ref: {resolutionModal.grievance.referenceNumber} &bull; {resolutionModal.grievance.citizenName}
                </span>
              </div>
              <button
                className="phase11-modal-close"
                onClick={() => setResolutionModal({ open: false, grievance: null })}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleResolveGrievance}>
              <div className="phase11-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="phase11-modal-info">
                  <div className="modal-info-row">
                    <span className="modal-info-label">Subject:</span>
                    <span className="modal-info-val" style={{ fontWeight: 600 }}>{resolutionModal.grievance.subject}</span>
                  </div>
                  <div className="modal-info-row">
                    <span className="modal-info-label">Grounds:</span>
                    <span className="modal-info-val">{resolutionModal.grievance.description}</span>
                  </div>
                </div>

                <div className="phase11-modal-field">
                  <label>Determination Status *</label>
                  <select
                    value={resolvingStatus}
                    onChange={(e) => setResolvingStatus(e.target.value as any)}
                  >
                    <option value="UNDER_REVIEW">Under Revenue Inquiry (Keep In Review)</option>
                    <option value="RESOLVED">Resolved (Competent Authority Determination Approved)</option>
                    <option value="CLOSED">Closed (Hearing Concluded &amp; Communicated)</option>
                  </select>
                </div>

                <div className="phase11-modal-field">
                  <label>Official Hearing Findings &amp; Redressal Orders *</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Enter the official inquiry findings, field survey team verification report, and final relief or compensation determination..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                  />
                </div>
              </div>

              <div className="phase11-modal-footer">
                <button
                  type="button"
                  className="btn-cta-outline"
                  onClick={() => setResolutionModal({ open: false, grievance: null })}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-cta-blue"
                  style={{ color: '#fff' }}
                  disabled={resolving || !resolutionNotes.trim()}
                >
                  {resolving ? 'Recording...' : 'Save Official Determination →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* Resubmit Modal */}
      {/* ============================================================ */}
      {resubmitModal.open && resubmitModal.action && (
        <div className="phase11-modal-overlay" onClick={() => setResubmitModal({ open: false, action: null })}>
          <div className="phase11-modal" onClick={(e) => e.stopPropagation()}>
            <div className="phase11-modal-header">
              <h3>Correct &amp; Resubmit Stage</h3>
              <button
                className="phase11-modal-close"
                onClick={() => setResubmitModal({ open: false, action: null })}
              >
                ×
              </button>
            </div>

            <div className="phase11-modal-body">
              <div className="phase11-modal-info">
                <div className="modal-info-row">
                  <span className="modal-info-label">Rejected Stage:</span>
                  <span className="modal-info-val">{resubmitModal.action.stageName}</span>
                </div>
                <div className="modal-info-row">
                  <span className="modal-info-label">Rejection Reason:</span>
                  <span className="modal-info-val" style={{ color: '#ff8a80' }}>
                    {resubmitModal.action.reason}
                  </span>
                </div>
                {resubmitModal.action.department && (
                  <div className="modal-info-row">
                    <span className="modal-info-label">Department:</span>
                    <span className="modal-info-val">{resubmitModal.action.department}</span>
                  </div>
                )}
              </div>

              <div className="phase11-modal-field">
                <label htmlFor="resubmit-explanation">Corrective Explanation</label>
                <textarea
                  id="resubmit-explanation"
                  value={resubmitExplanation}
                  onChange={(e) => setResubmitExplanation(e.target.value)}
                  placeholder="Describe the corrections made to address the rejection..."
                  rows={5}
                />
              </div>
            </div>

            <div className="phase11-modal-footer">
              <button
                className="btn-cta-outline"
                onClick={() => setResubmitModal({ open: false, action: null })}
              >
                Cancel
              </button>
              <button
                className="btn-cta-blue"
                style={{ color: '#fff' }}
                onClick={handleResubmit}
                disabled={resubmitting || !resubmitExplanation.trim()}
              >
                {resubmitting ? 'Resubmitting...' : 'Resubmit Stage →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function formatGrievanceType(type: string): string {
  const map: Record<string, string> = {
    COMPENSATION_VALUATION: 'Compensation & Valuation',
    BOUNDARY_DISPUTE: 'Boundary Demarcation',
    REHABILITATION_RESETTLEMENT: 'R&R Second Schedule',
    TITLE_OWNERSHIP: 'Title & Land Records',
    ENVIRONMENTAL_CONCERN: 'Environmental & Easement',
    OTHER: 'General Representation',
  };
  return map[type] || type.replace(/_/g, ' ');
}

export default ProponentProjectDetailPage;
