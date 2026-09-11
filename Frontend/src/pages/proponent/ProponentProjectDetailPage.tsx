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
import './proponent-dashboard.css';

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

  // Grievances Record State
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
      <div className="things-proponent-dashboard">
        <div className="things-dashboard-inner">
          <div className="things-loading-state">
            <span>Retrieving Statutory Requisition Dossier...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="things-proponent-dashboard">
        <div className="things-dashboard-inner">
          <div className="things-empty-state">
            <h2 style={{ color: 'var(--tp-ink)', margin: 0 }}>Requisition Record Not Found</h2>
            <p style={{ color: 'var(--tp-fog)', margin: '4px 0 16px' }}>The requested project tracking code does not exist in the proponent registry.</p>
            <Link to="/projects" className="things-btn-requisition" style={{ margin: 0 }}>
              &larr; Return to Project Register
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const stages = project.workflowStages || [];
  const progress = project.workflowProgress;
  const parcelProg = project.parcelProgress;
  const pendingActions = project.pendingActions || [];

  // ============================================================
  // Lifecycle Workflow Stepper State Logic
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
    <div className="things-proponent-dashboard">
      <div className="things-dashboard-inner">
        {/* Breadcrumb */}
        <div className="things-breadcrumb-bar">
          <Link to="/projects" className="things-breadcrumb-link">
            &larr; Proponent Project Register
          </Link>
          <span className="things-breadcrumb-sep">/</span>
          <span className="things-breadcrumb-current">{project.code}</span>
          <span className="things-breadcrumb-sep">/</span>
          <span className="things-breadcrumb-label">Statutory Lifecycle Tracker</span>
        </div>

        {/* Main Masthead */}
        <section className="things-dossier-masthead">
          <div className="things-dossier-tags">
            <span className="things-docket-authority-stamp">{project.proponentAuthority}</span>
            <span className="things-docket-number">{project.code}</span>
            <span className={`things-status-pill pill-${project.status.toLowerCase()}`}>
              {project.status === 'NEW_REQUEST'
                ? 'PENDING BOSS SCRUTINY'
                : project.status === 'PARCELS_CONFIRMED'
                ? 'PARCELS CONFIRMED'
                : project.status.replace(/_/g, ' ')}
            </span>
          </div>
          <h1 className="things-dossier-headline">{project.title}</h1>
          <p className="things-dossier-subhead">
            Statutory Proponent Intake &bull; {project.rfctlarrSection} &bull; {project.state} ({project.district})
          </p>
        </section>

        {/* 4-Stage Statutory Workflow Lifecycle Stepper */}
        <section className="things-stepper-container">
          {/* Step 01: Requisition Submitted */}
          <div className="things-stepper-node completed">
            <div className="things-step-badge">01</div>
            <div className="things-step-texts">
              <span className="things-step-title">Requisition Submitted</span>
              <span className="things-step-date">
                {project.submissionDate ? new Date(project.submissionDate).toLocaleDateString('en-IN') : 'Submitted'}
              </span>
            </div>
          </div>
          <div className={`things-step-connector ${isBossApproved || step2Active ? 'completed' : ''}`} />

          {/* Step 02: BOSS Scrutiny */}
          <div className={`things-stepper-node ${step2Completed ? 'completed' : step2Active ? 'active' : 'upcoming'}`}>
            <div className="things-step-badge">02</div>
            <div className="things-step-texts">
              <span className="things-step-title">BOSS Scrutiny</span>
              <span className="things-step-date">
                {step2Completed ? 'Approved' : step2Active ? 'In Review' : 'Pending'}
              </span>
            </div>
          </div>
          <div className={`things-step-connector ${step3Completed ? 'completed' : ''}`} />

          {/* Step 03: Officer Confirmation */}
          <div
            className={`things-stepper-node ${
              step3Completed
                ? 'completed'
                : hasOfficerRejections
                ? 'rejected'
                : step3Active
                ? 'active'
                : 'upcoming'
            }`}
          >
            <div className="things-step-badge">03</div>
            <div className="things-step-texts">
              <span className="things-step-title">Officer Confirmation</span>
              <span className="things-step-date">
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
          <div className={`things-step-connector ${step4Completed ? 'completed' : ''}`} />

          {/* Step 04: Process Complete */}
          <div className={`things-stepper-node ${step4Completed ? 'completed' : 'upcoming'}`}>
            <div className="things-step-badge">04</div>
            <div className="things-step-texts">
              <span className="things-step-title">Process Complete</span>
              <span className="things-step-date">
                {step4Completed ? 'Statutory Process Complete' : 'Pending Officer Approvals'}
              </span>
            </div>
          </div>
        </section>

        {/* Detailed Departmental Officer Breakdown */}
        {stages.length > 0 && (
          <section className="things-pipeline-card">
            <div className="things-form-card-header">
              <h3 className="things-form-card-title">Departmental Officer Approvals Breakdown</h3>
              <span className="things-form-card-badge">
                {progress ? `${progress.completedStages}/${progress.totalStages} Confirmed` : `${stages.length} Departmental Stages`}
              </span>
            </div>

            {/* Overall progress bar */}
            {progress && progress.totalStages > 0 && (
              <div className="things-pipeline-track-container">
                <div className="things-pipeline-track">
                  <div
                    className="things-pipeline-fill"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--tp-signal-blue)', fontFamily: 'monospace' }}>
                  {progress.percentage}% Complete
                </span>
              </div>
            )}

            {/* Stage pipeline */}
            <div className="things-pipeline-stages-row">
              {stages.map((stage: WorkflowStageTracking) => {
                const stageStatusClass =
                  stage.status === 'COMPLETED'
                    ? 'stage-completed'
                    : stage.status === 'ACTIVE'
                    ? 'stage-active'
                    : stage.status === 'REJECTED'
                    ? 'stage-rejected'
                    : 'stage-pending';

                return (
                  <div key={stage.id} className={`things-stage-node-box ${stageStatusClass}`}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--tp-fog)' }}>
                        STAGE {String(stage.stageOrder).padStart(2, '0')}
                      </span>
                      <span className={`things-status-pill pill-${stage.status.toLowerCase()}`} style={{ fontSize: '9.5px', padding: '2px 6px' }}>
                        {stage.status}
                      </span>
                    </div>
                    <span className="things-stage-name">{stage.name}</span>
                    <span className="things-stage-dept">{stage.department}</span>
                    {stage.officerName && (
                      <span className="things-stage-officer">{stage.officerName}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Pending Actions / Rejection Alert Banner */}
        {pendingActions.length > 0 && (
          <section className="things-pending-action-banner">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--tp-rose)', margin: 0 }}>
                &#x26A0; Pending Corrective Actions ({pendingActions.length})
              </h3>
              <span className="things-status-pill" style={{ backgroundColor: 'var(--tp-rose-soft)', color: 'var(--tp-rose)' }}>
                Urgent Attention
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingActions.map((action: PendingAction) => (
                <div key={action.id} className="things-action-card">
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#991b1b', margin: '0 0 4px 0' }}>
                      Stage Rejected: {action.stageName}
                    </h4>
                    <p style={{ fontSize: '12.5px', color: '#b91c1c', margin: '0 0 6px 0' }}>{action.reason}</p>
                    <div style={{ fontSize: '11px', color: 'var(--tp-fog)' }}>
                      {action.department && <span>Dept: {action.department} &bull; </span>}
                      {action.rejectedAt && (
                        <span>Rejected: {new Date(action.rejectedAt).toLocaleDateString('en-IN')}</span>
                      )}
                    </div>
                  </div>
                  <button
                    className="things-btn-resolve"
                    style={{ border: 'none', cursor: 'pointer' }}
                    onClick={() => {
                      setResubmitModal({ open: true, action });
                      setResubmitExplanation('');
                    }}
                  >
                    Correct &amp; Resubmit &rarr;
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* KPI Telemetry Bar */}
        <section className="things-triage-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          <div className="things-kpi-card">
            <span className="things-kpi-label">Requested Land Area</span>
            <div className="things-kpi-value text-signal-blue">
              {(project.requestedAreaAcres || 0).toFixed(1)} <span style={{ fontSize: '16px', fontWeight: 500 }}>Ac</span>
            </div>
            <span className="things-kpi-sub">({project.requestedAreaHa} Ha metric)</span>
          </div>

          <div className="things-kpi-card">
            <span className="things-kpi-label">Corridor Alignment</span>
            <div className="things-kpi-value">
              {project.corridorKm} <span style={{ fontSize: '16px', fontWeight: 500 }}>km</span>
            </div>
            <span className="things-kpi-sub">Right-of-Way: {project.alignmentWidthMeters}m</span>
          </div>

          <div className="things-kpi-card">
            <span className="things-kpi-label">Parcel Progress</span>
            <div className="things-kpi-value text-emerald">
              {parcelProg ? parcelProg.confirmedCount : project.selectedParcelsCount || 0}/
              {parcelProg ? parcelProg.candidateCount : project.candidateParcelsCount || 0}
            </div>
            <span className="things-kpi-sub">
              {parcelProg && parcelProg.confirmedAreaAcres
                ? `${parcelProg.confirmedAreaAcres.toFixed(1)} Acres Confirmed`
                : 'Cadastral Determination'}
            </span>
          </div>

          <div className="things-kpi-card">
            <span className="things-kpi-label">Grievance Record</span>
            <div className="things-kpi-value" style={{ color: openGrievancesCount > 0 ? '#ea580c' : '#059669' }}>
              {grievances.length} <span style={{ fontSize: '16px', fontWeight: 500 }}>Filed</span>
            </div>
            <span className="things-kpi-sub">
              {openGrievancesCount} Open &bull; {resolvedGrievancesCount} Resolved
            </span>
          </div>

          <div className="things-kpi-card">
            <span className="things-kpi-label">Statutory SLA Deadline</span>
            <div className="things-kpi-value" style={{ fontSize: '20px' }}>
              {project.slaDeadline}
            </div>
            <span className="things-kpi-sub">14-Day Central Gazette Rule</span>
          </div>
        </section>

        {/* Dossier Grid */}
        <section className="things-dossier-grid">
          {/* Card 1: Statutory Purpose */}
          <div className="things-form-card">
            <div className="things-form-card-header">
              <h3 className="things-form-card-title">1. Public Purpose &amp; Legal Mandate</h3>
              <span className="things-form-card-badge">Section 2(1)</span>
            </div>
            <div className="things-form-card-body">
              <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--tp-ash)', margin: '0 0 12px 0' }}>
                {project.statutoryPurpose}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--tp-hairline)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--tp-fog)' }}>Proponent Entity:</span>
                  <span style={{ fontWeight: 600, color: 'var(--tp-ink)' }}>{project.proponentAuthority}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--tp-fog)' }}>Administrative Ministry:</span>
                  <span style={{ fontWeight: 600, color: 'var(--tp-ink)' }}>{project.ministry}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--tp-fog)' }}>Target Jurisdiction:</span>
                  <span style={{ fontWeight: 600, color: 'var(--tp-ink)' }}>{project.district}, {project.state}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ color: 'var(--tp-fog)' }}>Estimated Outlay:</span>
                  <span style={{ fontWeight: 600, color: 'var(--tp-ink)' }}>₹{project.estimatedBudgetCr} Cr</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Spatial Corridor Map Preview */}
          <div className="things-gis-card">
            <div className="things-gis-header">
              <div>
                <h4 className="things-gis-title">2. Plotted Alignment Vector</h4>
                <p className="things-gis-sub">PostGIS Spatial Buffer &bull; WGS84 EPSG:4326</p>
              </div>
              <span className="things-form-card-badge">GIS PostGIS</span>
            </div>
            <div>
              <div ref={mapContainerRef} style={{ height: '240px', width: '100%', backgroundColor: '#1e293b' }} />
              <div style={{ display: 'flex', gap: '14px', padding: '12px 18px', backgroundColor: '#fafbfc', borderTop: '1px solid var(--tp-hairline)', fontSize: '11.5px', color: 'var(--tp-ash)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '6px', backgroundColor: '#0058fe', opacity: 0.5, borderRadius: '2px' }} />
                  <span>{project.alignmentWidthMeters}m RoW Swath</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '12px', height: '2px', backgroundColor: '#38bdf8' }} />
                  <span>Centerline ({project.corridorKm} km)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Gazette Documents */}
          <div className="things-form-card grid-span-2">
            <div className="things-form-card-header">
              <h3 className="things-form-card-title">3. Attached Statutory Gazette Documents &amp; Feasibility</h3>
              <span className="things-form-card-badge">Cryptographically Verified</span>
            </div>
            <div className="things-form-card-body">
              {project.initialDocuments?.map((doc) => (
                <div key={doc.id} className="things-doc-item">
                  <div className="things-doc-info">
                    <span>📄</span>
                    <div>
                      <span className="things-doc-name">{doc.title}</span>
                      <div className="things-doc-meta">
                        <span>{doc.fileSize}</span> &bull;{' '}
                        <span>Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</span> &bull;{' '}
                        <span style={{ fontFamily: 'monospace' }}>{doc.hash}</span>
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--tp-emerald)', fontFamily: 'monospace' }}>
                    &#10003; SHA-256 OK
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 4: Grievances & Citizen Objections Record */}
          <div className="things-grievances-card grid-span-2">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 className="things-form-card-title">4. Statutory Grievances &amp; Citizen Objections Record</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--tp-fog)' }}>
                    RFCTLARR Chapter IV Statutory Objections &bull; 15-Day Mandatory Hearing Window
                  </span>
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      padding: '2px 8px',
                      backgroundColor: 'var(--tp-emerald-soft)',
                      color: 'var(--tp-emerald)',
                      borderRadius: 'var(--tp-radius-pills)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--tp-emerald)' }} />
                    WhatsApp Cloud Pipeline Connected
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="things-form-card-badge">
                  {filteredGrievances.length} Records
                </span>
                <button
                  type="button"
                  className="things-btn-requisition"
                  style={{ margin: 0, padding: '7px 14px', fontSize: '12.5px' }}
                  onClick={() => setNewGrievanceModal(true)}
                >
                  + Record Statutory Objection
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="things-filter-tabs">
              <button
                type="button"
                className={`things-filter-pill ${grievanceFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setGrievanceFilter('ALL')}
              >
                All Objections ({grievances.length})
              </button>
              <button
                type="button"
                className={`things-filter-pill ${grievanceFilter === 'WHATSAPP' ? 'active' : ''}`}
                onClick={() => setGrievanceFilter('WHATSAPP')}
                style={{ color: grievanceFilter === 'WHATSAPP' ? '#ffffff' : 'var(--tp-emerald)' }}
              >
                💬 WhatsApp Ingestion ({whatsappGrievancesCount})
              </button>
              <button
                type="button"
                className={`things-filter-pill ${grievanceFilter === 'OPEN' ? 'active' : ''}`}
                onClick={() => setGrievanceFilter('OPEN')}
              >
                Open / Pending ({openGrievancesCount})
              </button>
              <button
                type="button"
                className={`things-filter-pill ${grievanceFilter === 'UNDER_REVIEW' ? 'active' : ''}`}
                onClick={() => setGrievanceFilter('UNDER_REVIEW')}
              >
                Under Review ({underReviewGrievancesCount})
              </button>
              <button
                type="button"
                className={`things-filter-pill ${grievanceFilter === 'RESOLVED' ? 'active' : ''}`}
                onClick={() => setGrievanceFilter('RESOLVED')}
              >
                Resolved ({resolvedGrievancesCount})
              </button>
            </div>

            {/* Grievances List */}
            {grievancesLoading ? (
              <p style={{ color: 'var(--tp-fog)', fontSize: '13.5px' }}>Retrieving statutory objections dossier...</p>
            ) : filteredGrievances.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', backgroundColor: '#fafbfc', border: '1px dashed var(--tp-hairline)', borderRadius: '12px' }}>
                <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--tp-fog)' }}>
                  No statutory objections or citizen grievances recorded under this category.
                </p>
                <button
                  type="button"
                  onClick={() => setNewGrievanceModal(true)}
                  style={{
                    marginTop: '12px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: 'var(--tp-signal-blue)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Click here to record a new citizen representation &rarr;
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {filteredGrievances.map((g) => (
                  <div key={g.id} className="things-grievance-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--tp-signal-blue)' }}>
                          {g.referenceNumber}
                        </span>
                        {g.source === 'WHATSAPP' ? (
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              padding: '2px 8px',
                              backgroundColor: 'var(--tp-emerald-soft)',
                              color: 'var(--tp-emerald)',
                              borderRadius: 'var(--tp-radius-pills)',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                            }}
                          >
                            💬 WhatsApp Intake {g.citizenPhone ? `(+${g.citizenPhone})` : ''}
                          </span>
                        ) : (
                          <span className="things-form-card-badge">
                            🏛️ Portal Intake
                          </span>
                        )}
                        <span className="things-form-card-badge">
                          {formatGrievanceType(g.grievanceType)}
                        </span>
                      </div>
                      <span className={`things-status-pill ${g.status === 'RESOLVED' ? 'pill-parcels_confirmed' : g.status === 'UNDER_REVIEW' ? 'pill-under_review' : 'pill-new_request'}`}>
                        {g.status === 'OPEN' ? '● PENDING REVIEW' : g.status === 'UNDER_REVIEW' ? '● INQUIRY ACTIVE' : '✓ RESOLVED'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--tp-ink)', margin: 0 }}>
                      {g.subject}
                    </h4>

                    <div className="things-grievance-citizen-row">
                      <span>👤 Landowner: <strong>{g.citizenName}</strong></span>
                      {g.citizenReference && <span>📍 <strong>{g.citizenReference}</strong></span>}
                      {g.surveyNumber && <span>📐 Survey/Plot: <strong>{g.surveyNumber}</strong></span>}
                    </div>

                    <p style={{ fontSize: '13.5px', lineHeight: 1.55, color: 'var(--tp-ash)', margin: 0 }}>
                      {g.description}
                    </p>

                    {g.resolutionNotes && (
                      <div className="things-grievance-callout">
                        <strong>✓ Official Hearing Findings / Redressal Determination:</strong>
                        <span>{g.resolutionNotes}</span>
                        {g.resolvedAt && (
                          <span style={{ fontSize: '11px', color: 'var(--tp-emerald)', marginTop: '2px' }}>
                            Determined on {new Date(g.resolvedAt).toLocaleDateString('en-IN')} by Competent Land Acquisition Authority
                          </span>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--tp-hairline)', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--tp-fog)' }}>
                        Lodged on {new Date(g.createdAt).toLocaleDateString('en-IN')} &bull; {g.slaDays}-Day Statutory SLA Rule
                      </span>
                      <button
                        type="button"
                        className="things-btn-table-track"
                        onClick={() => {
                          setResolutionModal({ open: true, grievance: g });
                          setResolutionNotes(g.resolutionNotes || '');
                          setResolvingStatus(g.status === 'RESOLVED' ? 'RESOLVED' : 'UNDER_REVIEW');
                        }}
                      >
                        {g.status === 'RESOLVED' ? 'Update Hearing Finding \u2192' : 'Record Official Determination \u2192'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Modal: Record New Statutory Grievance */}
        {newGrievanceModal && (
          <div className="things-modal-overlay" onClick={() => setNewGrievanceModal(false)}>
            <div className="things-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="things-modal-header">
                <div>
                  <h3 className="things-modal-title">Record Statutory Citizen Objection / Grievance</h3>
                  <span style={{ fontSize: '11.5px', color: 'var(--tp-fog)' }}>
                    Statutory Intake per RFCTLARR Section 15 &bull; Project {project.code}
                  </span>
                </div>
                <button className="things-modal-close" onClick={() => setNewGrievanceModal(false)}>
                  &times;
                </button>
              </div>

              <form onSubmit={handleCreateGrievance}>
                <div className="things-modal-body">
                  <div className="things-field-grid-2">
                    <div className="things-field-group">
                      <label className="things-form-label">Landowner / Aggrieved Citizen Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Kisan Ramchandra Patil"
                        value={newGrievanceForm.citizenName}
                        onChange={(e) => setNewGrievanceForm({ ...newGrievanceForm, citizenName: e.target.value })}
                        className="things-form-input"
                      />
                    </div>
                    <div className="things-field-group">
                      <label className="things-form-label">Village / Revenue Locality *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Village Khalapur, Ward 3"
                        value={newGrievanceForm.citizenReference}
                        onChange={(e) => setNewGrievanceForm({ ...newGrievanceForm, citizenReference: e.target.value })}
                        className="things-form-input"
                      />
                    </div>
                  </div>

                  <div className="things-field-grid-2">
                    <div className="things-field-group">
                      <label className="things-form-label">Affected Survey No. / ULPIN</label>
                      <input
                        type="text"
                        placeholder="e.g. SV-117 or ULPIN-44021"
                        value={newGrievanceForm.surveyNumber}
                        onChange={(e) => setNewGrievanceForm({ ...newGrievanceForm, surveyNumber: e.target.value })}
                        className="things-form-input"
                      />
                    </div>
                    <div className="things-field-group">
                      <label className="things-form-label">Objection Category *</label>
                      <select
                        value={newGrievanceForm.grievanceType}
                        onChange={(e) => setNewGrievanceForm({ ...newGrievanceForm, grievanceType: e.target.value })}
                        className="things-form-select"
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

                  <div className="things-field-group">
                    <label className="things-form-label">Representation Subject / Head *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dispute over perennial irrigation valuation multiplier"
                      value={newGrievanceForm.subject}
                      onChange={(e) => setNewGrievanceForm({ ...newGrievanceForm, subject: e.target.value })}
                      className="things-form-input"
                    />
                  </div>

                  <div className="things-field-group">
                    <label className="things-form-label">Detailed Particulars of Objection / Representation *</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Enter the complete factual grounds, claims, document references or relief requested by the landowner..."
                      value={newGrievanceForm.description}
                      onChange={(e) => setNewGrievanceForm({ ...newGrievanceForm, description: e.target.value })}
                      className="things-form-textarea"
                    />
                  </div>
                </div>

                <div className="things-modal-footer">
                  <button
                    type="button"
                    className="things-btn-outline"
                    onClick={() => setNewGrievanceModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="things-btn-requisition"
                    style={{ margin: 0 }}
                    disabled={submittingGrievance}
                  >
                    {submittingGrievance ? 'Recording into Registry...' : 'Lodge Statutory Objection \u2192'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Grievance Resolution */}
        {resolutionModal.open && resolutionModal.grievance && (
          <div className="things-modal-overlay" onClick={() => setResolutionModal({ open: false, grievance: null })}>
            <div className="things-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="things-modal-header">
                <div>
                  <h3 className="things-modal-title">Record Official Determination</h3>
                  <span style={{ fontSize: '11.5px', color: 'var(--tp-fog)' }}>
                    Ref: {resolutionModal.grievance.referenceNumber} &bull; {resolutionModal.grievance.citizenName}
                  </span>
                </div>
                <button
                  className="things-modal-close"
                  onClick={() => setResolutionModal({ open: false, grievance: null })}
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleResolveGrievance}>
                <div className="things-modal-body">
                  <div style={{ backgroundColor: 'var(--tp-mist)', border: '1px solid var(--tp-hairline)', borderRadius: '8px', padding: '12px 14px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--tp-fog)', marginBottom: '4px' }}>Subject:</div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--tp-ink)' }}>{resolutionModal.grievance.subject}</div>
                    <div style={{ fontSize: '12px', color: 'var(--tp-ash)', marginTop: '6px' }}>{resolutionModal.grievance.description}</div>
                  </div>

                  <div className="things-field-group">
                    <label className="things-form-label">Determination Status *</label>
                    <select
                      value={resolvingStatus}
                      onChange={(e) => setResolvingStatus(e.target.value as any)}
                      className="things-form-select"
                    >
                      <option value="UNDER_REVIEW">Under Revenue Inquiry (Keep In Review)</option>
                      <option value="RESOLVED">Resolved (Competent Authority Determination Approved)</option>
                      <option value="CLOSED">Closed (Hearing Concluded &amp; Communicated)</option>
                    </select>
                  </div>

                  <div className="things-field-group">
                    <label className="things-form-label">Official Hearing Findings &amp; Redressal Orders *</label>
                    <textarea
                      required
                      rows={5}
                      placeholder="Enter the official inquiry findings, field survey team verification report, and final relief or compensation determination..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="things-form-textarea"
                    />
                  </div>
                </div>

                <div className="things-modal-footer">
                  <button
                    type="button"
                    className="things-btn-outline"
                    onClick={() => setResolutionModal({ open: false, grievance: null })}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="things-btn-requisition"
                    style={{ margin: 0 }}
                    disabled={resolving || !resolutionNotes.trim()}
                  >
                    {resolving ? 'Recording...' : 'Save Official Determination \u2192'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Resubmit Stage */}
        {resubmitModal.open && resubmitModal.action && (
          <div className="things-modal-overlay" onClick={() => setResubmitModal({ open: false, action: null })}>
            <div className="things-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="things-modal-header">
                <h3 className="things-modal-title">Correct &amp; Resubmit Stage</h3>
                <button
                  className="things-modal-close"
                  onClick={() => setResubmitModal({ open: false, action: null })}
                >
                  &times;
                </button>
              </div>

              <div className="things-modal-body">
                <div style={{ backgroundColor: 'var(--tp-rose-soft)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#991b1b' }}>
                    Rejected Stage: {resubmitModal.action.stageName}
                  </div>
                  <div style={{ fontSize: '12.5px', color: '#b91c1c', marginTop: '4px' }}>
                    Reason: {resubmitModal.action.reason}
                  </div>
                  {resubmitModal.action.department && (
                    <div style={{ fontSize: '11.5px', color: 'var(--tp-fog)', marginTop: '4px' }}>
                      Department: {resubmitModal.action.department}
                    </div>
                  )}
                </div>

                <div className="things-field-group">
                  <label htmlFor="resubmit-explanation" className="things-form-label">Corrective Explanation</label>
                  <textarea
                    id="resubmit-explanation"
                    value={resubmitExplanation}
                    onChange={(e) => setResubmitExplanation(e.target.value)}
                    placeholder="Describe the corrections made to address the rejection..."
                    rows={5}
                    className="things-form-textarea"
                  />
                </div>
              </div>

              <div className="things-modal-footer">
                <button
                  className="things-btn-outline"
                  onClick={() => setResubmitModal({ open: false, action: null })}
                >
                  Cancel
                </button>
                <button
                  className="things-btn-requisition"
                  style={{ margin: 0 }}
                  onClick={handleResubmit}
                  disabled={resubmitting || !resubmitExplanation.trim()}
                >
                  {resubmitting ? 'Resubmitting...' : 'Resubmit Stage \u2192'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
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
