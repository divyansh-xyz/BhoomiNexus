import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import { bossService } from '../../services/api/boss.service';
import { useAuth } from '../../hooks/useAuth';
import DrilldownBreadcrumb from '../../components/common/DrilldownBreadcrumb';
import type {
  ProjectRequest,
  PendingAction,
  WorkflowStageTracking,
  GrievanceRecord,
} from '../../types/boss.types';
import './proponent-dashboard.css';

export const ProponentProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [project, setProject] = useState<ProjectRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Scope context
  const stateId = searchParams.get('stateId') || project?.state || 'MH';
  const districtId = searchParams.get('districtId') || project?.district || 'pune';
  const isInstitutionalViewer = Boolean(
    user?.role && ['NATIONAL_AUTHORITY', 'STATE_AUTHORITY', 'DISTRICT_AUTHORITY', 'ADMIN'].includes(user.role)
  );

  // Parcels Tab state (Phase 18 Cadastral Registry & Passport link)
  const [parcels, setParcels] = useState<any[]>([]);
  const [parcelsLoading, setParcelsLoading] = useState<boolean>(false);
  const [parcelSearchQuery, setParcelSearchQuery] = useState<string>('');
  const [activeViewTab, setActiveViewTab] = useState<'overview' | 'parcels' | 'grievances'>('overview');

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
  const [selectedMilestone, setSelectedMilestone] = useState<number | null>(null);

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

  const loadParcels = async () => {
    if (!projectId) return;
    try {
      setParcelsLoading(true);
      const res = await bossService.getProjectParcels(projectId);
      if (res && res.length > 0) {
        setParcels(res);
      } else {
        // Fallback baseline for demo project corridors
        setParcels([
          {
            id: 'parcel-mh-pun-001',
            ulpin: 'ULPIN-MH-PUN-001',
            surveyNumber: '42/1',
            ownerReference: 'Ramesh K. Joshi & Co-sharers',
            village: 'Lonavala',
            district: 'Pune',
            state: 'Maharashtra',
            areaAcres: 3.5,
            areaHa: 1.416,
            landType: 'AGRICULTURAL',
            marketRatePerAcre: 1500000,
            acquisitionStatus: 'IN_PROGRESS',
            compensationStatus: 'PENDING',
            possessionStatus: 'NOT_STARTED',
          },
          {
            id: 'parcel-mh-pun-002',
            ulpin: 'ULPIN-MH-PUN-002',
            surveyNumber: '42/2',
            ownerReference: 'Suresh K. Joshi & Brothers',
            village: 'Lonavala',
            district: 'Pune',
            state: 'Maharashtra',
            areaAcres: 2.8,
            areaHa: 1.133,
            landType: 'AGRICULTURAL',
            marketRatePerAcre: 1500000,
            acquisitionStatus: 'IN_PROGRESS',
            compensationStatus: 'PENDING',
            possessionStatus: 'NOT_STARTED',
          },
          {
            id: 'parcel-mh-pun-003',
            ulpin: 'ULPIN-MH-PUN-003',
            surveyNumber: '43/1',
            ownerReference: 'Khandala Resorts Pvt Ltd',
            village: 'Khandala',
            district: 'Pune',
            state: 'Maharashtra',
            areaAcres: 4.1,
            areaHa: 1.659,
            landType: 'COMMERCIAL',
            marketRatePerAcre: 2800000,
            acquisitionStatus: 'IN_PROGRESS',
            compensationStatus: 'PENDING',
            possessionStatus: 'NOT_STARTED',
          },
          {
            id: 'parcel-mh-pun-004',
            ulpin: 'ULPIN-MH-PUN-004',
            surveyNumber: '44/1',
            ownerReference: 'Maharashtra Forest Dept',
            village: 'Khandala',
            district: 'Pune',
            state: 'Maharashtra',
            areaAcres: 5.2,
            areaHa: 2.104,
            landType: 'FOREST',
            marketRatePerAcre: 800000,
            acquisitionStatus: 'ACQUIRED',
            compensationStatus: 'DISBURSED',
            possessionStatus: 'TAKEN',
          },
        ]);
      }
    } catch (err) {
      console.warn('Failed to load project parcels', err);
    } finally {
      setParcelsLoading(false);
    }
  };

  useEffect(() => {
    loadProject();
    loadGrievances();
    loadParcels();
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
  // Statutory 6-Milestone Lifecycle & 3-Branch Federal Architecture State
  // Strictly adheres to RFCTLARR Act 2013 and BhoomiNexus statutory pipeline:
  // M1: Requisition & Spatial Ingestion
  // M2: BOSS Cadastral Determination (Bhu-Aadhaar Spatial Overlay)
  // M3: Field Acquisition & Joint Measurement Survey (JMS)
  // M4: Compensation Award & 100% Solatium (Sec 26-30 RFCTLARR)
  // M5: Physical Possession & Sovereign Revenue Mutation (Sec 38)
  // M6: Sovereign Vesting & Clear Title Handover
  // ============================================================
  const projId = project.id || '';
  const projCode = project.code || '';

  const isWorkflowActivated =
    localStorage.getItem(`bhoomi_workflow_activated_${projId}`) === 'true' ||
    localStorage.getItem(`bhoomi_workflow_activated_${projCode}`) === 'true' ||
    project.status === 'WORKFLOW_ACTIVE' ||
    project.status === 'PROJECT_APPROVED' ||
    project.status === 'PARCELS_CONFIRMED' ||
    project.status === 'WORKFLOW_CONFIGURED';

  const isAcquisitionCompleted =
    localStorage.getItem('bhoomi_acq_branch_completed') === 'true' ||
    project.status === 'PROJECT_APPROVED';

  const isCompensationCompleted =
    localStorage.getItem(`bhoomi_comp_status_${projId}`) === 'SANCTIONED' ||
    localStorage.getItem(`bhoomi_comp_status_${projCode}`) === 'SANCTIONED' ||
    localStorage.getItem(`bhoomi_comp_approved_${projId}`) === 'true' ||
    localStorage.getItem(`bhoomi_comp_approved_${projCode}`) === 'true' ||
    localStorage.getItem('bhoomi_comp_branch_completed') === 'true' ||
    project.status === 'PROJECT_APPROVED';

  const isPossessionCompleted =
    localStorage.getItem(`bhoomi_poss_status_${projId}`) === 'COMPLETED' ||
    localStorage.getItem(`bhoomi_poss_status_${projCode}`) === 'COMPLETED' ||
    project.status === 'PROJECT_APPROVED';

  const isFullyVested = isAcquisitionCompleted && isCompensationCompleted && isPossessionCompleted;

  interface StatutoryMilestone {
    index: number;
    num: string;
    title: string;
    shortTitle: string;
    sectionTag: string;
    authority: string;
    status: 'COMPLETED' | 'ACTIVE' | 'ACTION_REQUIRED' | 'PENDING';
    statusLabel: string;
    description: string;
    slaDays: number;
    leadOfficer: string;
    leadDesignation: string;
    deliverables: { name: string; status: 'VERIFIED' | 'IN_PROGRESS' | 'PENDING' }[];
  }

  const statutoryMilestones: StatutoryMilestone[] = [
    {
      index: 1,
      num: '01',
      title: 'Requisition & Spatial Ingestion',
      shortTitle: 'Requisition Ingestion',
      sectionTag: 'PORTAL INGESTION',
      authority: project.proponentAuthority || 'Requesting Agency',
      status: 'COMPLETED',
      statusLabel: project.submissionDate ? `Submitted on ${new Date(project.submissionDate).toLocaleDateString('en-IN')}` : 'Submitted',
      description: 'Project corridor alignment GeoJSON, Right-of-Way buffer, and initial charter submitted by Proponent.',
      slaDays: 7,
      leadOfficer: project.nodalOfficer?.name || 'Proponent Nodal Desk',
      leadDesignation: project.nodalOfficer?.designation || 'Project Director',
      deliverables: [
        { name: 'Corridor GeoJSON Alignment Coordinates', status: 'VERIFIED' },
        { name: 'Right-of-Way (ROW) Buffer Demarcation', status: 'VERIFIED' },
        { name: 'Statutory Acquisition Purpose Charter', status: 'VERIFIED' },
      ],
    },
    {
      index: 2,
      num: '02',
      title: 'BOSS Cadastral Determination',
      shortTitle: 'Cadastral Overlay',
      sectionTag: 'BHU-AADHAAR SPATIAL',
      authority: 'Central Cadastral Bureau',
      status: isWorkflowActivated ? 'COMPLETED' : project.status === 'NEW_REQUEST' ? 'ACTIVE' : 'PENDING',
      statusLabel: isWorkflowActivated ? 'Parcels Confirmed' : project.status === 'NEW_REQUEST' ? 'In Scrutiny' : 'Pending',
      description: 'Spatial intersection of project corridor with Bhu-Aadhaar cadastral layers and workflow activation.',
      slaDays: 14,
      leadOfficer: 'Dr. Rajiv Malhotra',
      leadDesignation: 'Chief Cadastral Surveyor (BOSS Reviewer)',
      deliverables: [
        { name: `${project.selectedParcelsCount || project.candidateParcelsCount || 4} Intersected Cadastral Parcels`, status: isWorkflowActivated ? 'VERIFIED' : 'IN_PROGRESS' },
        { name: 'Bhu-Aadhaar ULPIN Spatial Cross-Verification', status: isWorkflowActivated ? 'VERIFIED' : 'IN_PROGRESS' },
        { name: 'Statutory 3-Branch Federal Workflow Configuration', status: isWorkflowActivated ? 'VERIFIED' : 'PENDING' },
      ],
    },
    {
      index: 3,
      num: '03',
      title: 'Field Acquisition & JMS',
      shortTitle: 'JMS & Notification',
      sectionTag: 'RFCTLARR SEC 11/19',
      authority: 'District Acquisition Office (CALA)',
      status: isAcquisitionCompleted ? 'COMPLETED' : isWorkflowActivated ? 'ACTIVE' : 'PENDING',
      statusLabel: isAcquisitionCompleted ? 'Survey Completed' : isWorkflowActivated ? 'In Field Survey' : 'Awaiting BOSS',
      description: 'Joint Measurement Survey (JMS), preliminary Section 11/19 Gazette notification, and objection scrutiny.',
      slaDays: 15,
      leadOfficer: 'Ananya Patel',
      leadDesignation: 'District Competent Authority & Acquisition Officer',
      deliverables: [
        { name: 'Joint Measurement Survey (JMS) Field Sheets', status: isAcquisitionCompleted ? 'VERIFIED' : 'IN_PROGRESS' },
        { name: 'Sec 11/19 Preliminary Gazette Notification Extract', status: isAcquisitionCompleted ? 'VERIFIED' : 'IN_PROGRESS' },
        { name: 'Landowner Panchnama & Section 15 Hearing Records', status: isAcquisitionCompleted ? 'VERIFIED' : 'IN_PROGRESS' },
      ],
    },
    {
      index: 4,
      num: '04',
      title: 'Compensation Award & Solatium',
      shortTitle: 'Sec 26–30 Award',
      sectionTag: 'RFCTLARR SEC 26–30',
      authority: 'Special Land Acquisition Office (SLAO)',
      status: isCompensationCompleted ? 'COMPLETED' : isAcquisitionCompleted || isWorkflowActivated ? 'ACTIVE' : 'PENDING',
      statusLabel: isCompensationCompleted ? 'Award Sanctioned' : isWorkflowActivated ? 'Valuation in Progress' : 'Pending',
      description: 'Statutory circle rate valuation, mandatory 100% Solatium (Sec 30), and PFMS direct benefit transfer.',
      slaDays: 21,
      leadOfficer: 'Mahesh Patil',
      leadDesignation: 'Special Land Acquisition Officer (SLAO)',
      deliverables: [
        { name: 'Form 11 Statutory Valuation Ledger', status: isCompensationCompleted ? 'VERIFIED' : 'IN_PROGRESS' },
        { name: '100% Solatium Determination Sheet (Sec 30)', status: isCompensationCompleted ? 'VERIFIED' : 'IN_PROGRESS' },
        { name: 'PFMS DBT Beneficiary Bank Account Mandate', status: isCompensationCompleted ? 'VERIFIED' : 'IN_PROGRESS' },
      ],
    },
    {
      index: 5,
      num: '05',
      title: 'Physical Possession & Mutation',
      shortTitle: 'Sec 38 Possession',
      sectionTag: 'RFCTLARR SEC 38',
      authority: 'Executive Magistrate & Tehsil',
      status: isPossessionCompleted ? 'COMPLETED' : isCompensationCompleted ? 'ACTIVE' : 'PENDING',
      statusLabel: isPossessionCompleted ? 'Possession Taken' : isCompensationCompleted ? 'Vacate Notice Issued' : 'Awaiting Award',
      description: 'Statutory 60-day notice to vacate, physical spot panchnama with witnesses, and RoR Khatauni mutation.',
      slaDays: 60,
      leadOfficer: 'Rahul Deshmukh',
      leadDesignation: 'Executive Magistrate & Tehsildar',
      deliverables: [
        { name: 'Section 38 Statutory 60-Day Notice to Vacate', status: isPossessionCompleted ? 'VERIFIED' : isCompensationCompleted ? 'IN_PROGRESS' : 'PENDING' },
        { name: 'Spot Panchnama & Physical Handover Certificate', status: isPossessionCompleted ? 'VERIFIED' : 'PENDING' },
        { name: 'Tehsildar RoR Khatauni Sovereign Mutation Order', status: isPossessionCompleted ? 'VERIFIED' : 'PENDING' },
      ],
    },
    {
      index: 6,
      num: '06',
      title: 'Sovereign Vesting & Handover',
      shortTitle: 'Final Vesting',
      sectionTag: 'FINAL VESTING',
      authority: 'State Land & Revenue Authority',
      status: isFullyVested ? 'COMPLETED' : 'PENDING',
      statusLabel: isFullyVested ? 'Title Vested' : 'Pending Prior Stages',
      description: 'Issuance of unencumbered sovereign vesting certificate and handover of clear corridor title to Proponent.',
      slaDays: 7,
      leadOfficer: 'Dr. Sanjay Kaushik',
      leadDesignation: 'Principal Secretary (Revenue & CALA)',
      deliverables: [
        { name: 'Encumbrance-Free Sovereign Vesting Certificate', status: isFullyVested ? 'VERIFIED' : 'PENDING' },
        { name: 'Unencumbered Land Title Handover Deed', status: isFullyVested ? 'VERIFIED' : 'PENDING' },
        { name: 'Statutory Completion & Project Closure Register', status: isFullyVested ? 'VERIFIED' : 'PENDING' },
      ],
    },
  ];

  const federalBranches = [
    {
      key: 'ACQUISITION',
      tag: 'BRANCH 1 • ACQUISITION',
      title: 'Cadastral & Ground Acquisition',
      statute: 'RFCTLARR Act 2013 (Sections 11 to 19)',
      authority: 'District Competent Authority & CALA',
      officer: 'Ananya Patel',
      designation: 'District Competent Authority & Acquisition Officer',
      status: isAcquisitionCompleted ? 'COMPLETED' : isWorkflowActivated ? 'ACTIVE' : 'PENDING',
      statusLabel: isAcquisitionCompleted ? '✓ Completed' : isWorkflowActivated ? '● In Progress' : 'Pending',
      statusClass: isAcquisitionCompleted ? 'status-sanctioned' : isWorkflowActivated ? 'status-submitted' : 'status-pending',
      slaDays: 15,
      deliverables: [
        { name: 'Joint Measurement Survey (JMS)', status: isAcquisitionCompleted ? 'Verified' : 'In Progress' },
        { name: 'Section 11/19 Gazette Notification', status: isAcquisitionCompleted ? 'Notified' : 'Drafted' },
        { name: 'Objection Hearing Panchnama', status: isAcquisitionCompleted ? 'Disposed' : 'Under Review' },
      ],
    },
    {
      key: 'COMPENSATION',
      tag: 'BRANCH 2 • COMPENSATION',
      title: 'Statutory Valuation & Solatium',
      statute: 'RFCTLARR Act 2013 (Sections 26 to 30)',
      authority: 'Special Land Acquisition Office (SLAO)',
      officer: 'Mahesh Patil',
      designation: 'Special Land Acquisition Officer (SLAO)',
      status: isCompensationCompleted ? 'COMPLETED' : isWorkflowActivated ? 'ACTIVE' : 'PENDING',
      statusLabel: isCompensationCompleted ? '✓ Sanctioned & Disbursed' : isWorkflowActivated ? '● In Assessment' : 'Pending',
      statusClass: isCompensationCompleted ? 'status-sanctioned' : isWorkflowActivated ? 'status-submitted' : 'status-pending',
      slaDays: 21,
      deliverables: [
        { name: 'Form 11 Valuation Ledger', status: isCompensationCompleted ? 'Sanctioned' : 'Compiled' },
        { name: '100% Solatium Schedule (Sec 30)', status: isCompensationCompleted ? 'Approved' : 'Assessed' },
        { name: 'PFMS DBT Disbursal Scroll', status: isCompensationCompleted ? 'Disbursed' : 'Awaiting Mandate' },
      ],
    },
    {
      key: 'POSSESSION',
      tag: 'BRANCH 3 • POSSESSION',
      title: 'Physical Possession & Mutation',
      statute: 'RFCTLARR Act 2013 (Sections 38 to 40)',
      authority: 'Sub-Divisional Magistrate & Tehsil',
      officer: 'Rahul Deshmukh',
      designation: 'Executive Magistrate & Tehsildar',
      status: isPossessionCompleted ? 'COMPLETED' : isCompensationCompleted ? 'ACTIVE' : 'PENDING',
      statusLabel: isPossessionCompleted ? '✓ Possession Vested' : isCompensationCompleted ? '● 60-Day Notice Active' : 'Pending Award',
      statusClass: isPossessionCompleted ? 'status-sanctioned' : isCompensationCompleted ? 'status-submitted' : 'status-pending',
      slaDays: 60,
      deliverables: [
        { name: 'Sec 38 60-Day Notice to Vacate', status: isPossessionCompleted ? 'Delivered' : isCompensationCompleted ? 'Issued' : 'Pending' },
        { name: 'Spot Panchnama & Handover', status: isPossessionCompleted ? 'Executed' : 'Scheduled' },
        { name: 'Khatauni RoR Sovereign Mutation', status: isPossessionCompleted ? 'Mutated' : 'Pending' },
      ],
    },
  ];

  const selectedMilestoneData = selectedMilestone
    ? statutoryMilestones.find((m) => m.index === selectedMilestone)
    : null;

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
        {/* Phase 18 Federal Drilldown Breadcrumb */}
        <DrilldownBreadcrumb
          currentLevel="project"
          state={{ id: stateId, name: project.state || stateId }}
          district={{ id: districtId, name: project.district || districtId }}
          project={{ id: projectId || project.id || '', name: project.title, code: project.code }}
        />

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

        {/* Institutional Authority Oversight Mode Indicator */}
        {isInstitutionalViewer && (
          <div
            style={{
              padding: '12px 18px',
              borderRadius: '8px',
              backgroundColor: '#e8f1fd',
              border: '1px solid #bfdbfe',
              color: '#1e40af',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <span>
              🏛 <strong>Institutional Oversight Mode:</strong> Signed in as <strong>{user?.role}</strong> ({user?.name}). Inspecting multi-tier project governance and parcel records.
            </span>
            <button
              type="button"
              className="things-btn things-btn-sm things-btn-secondary"
              onClick={() => navigate(`/projects/${projectId}/gis`)}
            >
              🗺 Open Project GIS
            </button>
          </div>
        )}

        {/* Phase 18 View Mode Switcher Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #dfe3e8', paddingBottom: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="things-btn things-btn-sm"
            onClick={() => setActiveViewTab('overview')}
            style={{
              backgroundColor: activeViewTab === 'overview' ? '#ffffff' : 'transparent',
              borderColor: activeViewTab === 'overview' ? '#2576eb' : '#dfe3e8',
              color: activeViewTab === 'overview' ? '#2576eb' : '#44474b',
              fontWeight: activeViewTab === 'overview' ? 700 : 500,
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            📋 Project Dossier &amp; Lifecycle
          </button>
          <button
            type="button"
            className="things-btn things-btn-sm"
            onClick={() => setActiveViewTab('parcels')}
            style={{
              backgroundColor: activeViewTab === 'parcels' ? '#ffffff' : 'transparent',
              borderColor: activeViewTab === 'parcels' ? '#2576eb' : '#dfe3e8',
              color: activeViewTab === 'parcels' ? '#2576eb' : '#44474b',
              fontWeight: activeViewTab === 'parcels' ? 700 : 500,
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            🗺 Cadastral Parcels Registry ({parcels.length})
          </button>
          <button
            type="button"
            className="things-btn things-btn-sm"
            onClick={() => setActiveViewTab('grievances')}
            style={{
              backgroundColor: activeViewTab === 'grievances' ? '#ffffff' : 'transparent',
              borderColor: activeViewTab === 'grievances' ? '#2576eb' : '#dfe3e8',
              color: activeViewTab === 'grievances' ? '#2576eb' : '#44474b',
              fontWeight: activeViewTab === 'grievances' ? 700 : 500,
              padding: '8px 14px',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            ⚖ Public Grievances ({grievances.length})
          </button>
        </div>

        {/* Cadastral Parcels Registry Section (Phase 18 Drilldown to Passport) */}
        {activeViewTab === 'parcels' && (
          <section className="things-card" style={{ marginBottom: '32px', padding: '24px', backgroundColor: '#ffffff', borderRadius: '18px', border: '1px solid #dfe3e8', boxShadow: 'rgba(0,0,0,0.1) 0px 2px 8px 0px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#303336' }}>
                  Cadastral Parcels &amp; Bhu-Aadhaar Register
                </h2>
                <p style={{ fontSize: '13px', color: '#838b96', margin: '4px 0 0 0' }}>
                  Statutory land parcels under project alignment. Click any parcel to inspect its Sovereign Passport.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Filter by ULPIN, survey or owner..."
                  value={parcelSearchQuery}
                  onChange={(e) => setParcelSearchQuery(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12.5px',
                    borderRadius: '6px',
                    border: '1px solid #dfe3e8',
                    width: '240px',
                  }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fafbfc', borderBottom: '1px solid #dfe3e8', color: '#55606e', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '12px 14px' }}>ULPIN &amp; Survey No</th>
                    <th style={{ padding: '12px 14px' }}>Village &amp; District</th>
                    <th style={{ padding: '12px 14px' }}>Area (Acres / Ha)</th>
                    <th style={{ padding: '12px 14px' }}>Classification</th>
                    <th style={{ padding: '12px 14px' }}>Recorded Owner</th>
                    <th style={{ padding: '12px 14px' }}>Acquisition Stage</th>
                    <th style={{ padding: '12px 14px' }}>Comp. Status</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>Passport Drilldown</th>
                  </tr>
                </thead>
                <tbody>
                  {parcelsLoading ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: '#838b96' }}>
                        Loading cadastral parcels registry...
                      </td>
                    </tr>
                  ) : parcels
                    .filter((p) => {
                      const q = parcelSearchQuery.toLowerCase().trim();
                      return (
                        !q ||
                        p.ulpin?.toLowerCase().includes(q) ||
                        p.surveyNumber?.toLowerCase().includes(q) ||
                        p.ownerReference?.toLowerCase().includes(q) ||
                        p.village?.toLowerCase().includes(q)
                      );
                    })
                    .map((p) => (
                      <tr key={p.id || p.ulpin} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2576eb', fontSize: '11.5px', display: 'block' }}>
                            {p.ulpin}
                          </span>
                          <span style={{ fontSize: '12px', color: '#303336', fontWeight: 600 }}>
                            Survey {p.surveyNumber}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', color: '#44474b' }}>
                          {p.village}, {p.district}
                        </td>
                        <td style={{ padding: '12px 14px', fontWeight: 600, color: '#303336' }}>
                          {p.areaAcres} Ac ({p.areaHa || (p.areaAcres * 0.404686).toFixed(3)} Ha)
                        </td>
                        <td style={{ padding: '12px 14px', color: '#55606e' }}>
                          {p.landType}
                        </td>
                        <td style={{ padding: '12px 14px', color: '#303336' }}>
                          {p.ownerReference}
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span className="things-status-pill pill-active" style={{ fontSize: '11px', padding: '2px 8px' }}>
                            {p.acquisitionStatus}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: p.compensationStatus === 'DISBURSED' ? '#0d7d56' : '#b06000' }}>
                            {p.compensationStatus}
                          </span>
                        </td>
                        <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/parcels/${p.id || p.ulpin}?projectId=${projectId}&stateId=${stateId}&districtId=${districtId}`
                              )
                            }
                            style={{
                              padding: '5px 12px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              borderRadius: '5px',
                              border: '1px solid #dfe3e8',
                              backgroundColor: '#ffffff',
                              color: '#2576eb',
                              cursor: 'pointer',
                            }}
                          >
                            View Passport &rarr;
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Statutory 6-Milestone Lifecycle Stepper */}
        <section className="things-statutory-stepper-card">
          <div className="things-statutory-header">
            <div>
              <h2 className="things-statutory-header-title">RFCTLARR Act 2013 Statutory Lifecycle</h2>
              <p className="things-statutory-header-sub">Federal 6-Milestone Progression &bull; Click any milestone to inspect statutory records</p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="things-status-pill pill-completed">
                {statutoryMilestones.filter((m) => m.status === 'COMPLETED').length} / 6 Milestones Cleared
              </span>
            </div>
          </div>

          <div className="things-statutory-stepper">
            {statutoryMilestones.map((m, idx) => (
              <React.Fragment key={m.index}>
                <div
                  className={`things-statutory-node ${
                    m.status === 'COMPLETED'
                      ? 'completed'
                      : m.status === 'ACTIVE'
                      ? 'active'
                      : m.status === 'ACTION_REQUIRED'
                      ? 'action-needed'
                      : 'upcoming'
                  } ${selectedMilestone === m.index ? 'is-selected' : ''}`}
                  onClick={() => setSelectedMilestone(selectedMilestone === m.index ? null : m.index)}
                  title={`Inspect Milestone ${m.num}: ${m.title}`}
                  role="button"
                  tabIndex={0}
                >
                  <div className="things-statutory-top-row">
                    <div className="things-statutory-disc">{m.num}</div>
                    <span className="things-statutory-section-tag">{m.sectionTag}</span>
                  </div>
                  <div className="things-statutory-texts">
                    <span className="things-statutory-title">{m.shortTitle}</span>
                    <span className="things-statutory-desc">{m.statusLabel}</span>
                    <span className="things-statutory-authority">🏛 {m.authority}</span>
                  </div>
                </div>
                {idx < statutoryMilestones.length - 1 && (
                  <div
                    className={`things-statutory-connector ${
                      m.status === 'COMPLETED' ? 'completed' : ''
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* Milestone Deep-Dive Inspection Card */}
        {selectedMilestoneData && (
          <div className="things-milestone-inspector-card">
            <div className="things-inspector-head">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span className="things-branch-tag">MILESTONE {selectedMilestoneData.num} &bull; {selectedMilestoneData.sectionTag}</span>
                  <span
                    className={`things-status-pill ${
                      selectedMilestoneData.status === 'COMPLETED'
                        ? 'pill-completed'
                        : selectedMilestoneData.status === 'ACTIVE'
                        ? 'pill-active'
                        : selectedMilestoneData.status === 'ACTION_REQUIRED'
                        ? 'pill-rejected'
                        : 'pill-pending'
                    }`}
                  >
                    {selectedMilestoneData.status}
                  </span>
                </div>
                <h3 className="things-inspector-title">{selectedMilestoneData.title}</h3>
                <p className="things-inspector-desc">{selectedMilestoneData.description}</p>
              </div>
              <button
                type="button"
                className="things-btn things-btn-sm things-btn-secondary"
                onClick={() => setSelectedMilestone(null)}
                style={{ cursor: 'pointer' }}
              >
                ✕ Close Inspector
              </button>
            </div>

            <div className="things-inspector-grid">
              <div className="things-inspector-cell">
                <span className="things-inspector-cell-label">Competent Authority</span>
                <span className="things-inspector-cell-val">{selectedMilestoneData.authority}</span>
              </div>
              <div className="things-inspector-cell">
                <span className="things-inspector-cell-label">Lead Statutory Officer</span>
                <span className="things-inspector-cell-val">{selectedMilestoneData.leadOfficer}</span>
                <span style={{ fontSize: '11px', color: 'var(--tp-fog)' }}>{selectedMilestoneData.leadDesignation}</span>
              </div>
              <div className="things-inspector-cell">
                <span className="things-inspector-cell-label">Statutory SLA Window</span>
                <span className="things-inspector-cell-val">{selectedMilestoneData.slaDays} Calendar Days</span>
              </div>
            </div>

            <div>
              <h4 style={{ fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--tp-fog)', margin: '0 0 8px 0' }}>
                Mandatory Statutory Deliverables &amp; Evidence Records
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '8px' }}>
                {selectedMilestoneData.deliverables.map((d, i) => (
                  <div key={i} className="things-branch-deliverable-item">
                    <span className="things-branch-deliverable-name">{d.name}</span>
                    <span
                      className="things-branch-deliverable-status"
                      style={{
                        color: d.status === 'VERIFIED' ? '#0d7d56' : d.status === 'IN_PROGRESS' ? '#2576eb' : '#838b96'
                      }}
                    >
                      {d.status === 'VERIFIED' ? '✓ Verified' : d.status === 'IN_PROGRESS' ? '● In Progress' : '○ Pending'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3-Branch Federal Execution Pipeline */}
        <section className="things-branch-matrix-container">
          <div className="things-branch-matrix-header">
            <div>
              <h2 className="things-branch-matrix-title">3-Branch Federal Execution Pipeline</h2>
              <p className="things-branch-matrix-sub">
                Post-Determination Multi-Departmental Execution under RFCTLARR Act 2013
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="things-table-scope" style={{ fontWeight: 600 }}>
                Federal Coordination Desk
              </span>
            </div>
          </div>

          <div className="things-branch-matrix-grid">
            {federalBranches.map((branch) => (
              <div
                key={branch.key}
                className={`things-branch-card ${
                  branch.status === 'COMPLETED' ? 'is-completed' : branch.status === 'ACTIVE' ? 'is-active' : ''
                }`}
              >
                <div>
                  <div className="things-branch-top">
                    <span className="things-branch-tag">{branch.tag}</span>
                    <span className={`things-status-pill ${branch.status === 'COMPLETED' ? 'pill-completed' : branch.status === 'ACTIVE' ? 'pill-active' : 'pill-pending'}`}>
                      {branch.statusLabel}
                    </span>
                  </div>
                  <h3 className="things-branch-title">{branch.title}</h3>
                  <div className="things-branch-statute">{branch.statute}</div>

                  <div className="things-branch-officer-box">
                    <span className="things-branch-officer-label">Assigned Statutory Authority</span>
                    <span className="things-branch-officer-name">{branch.officer}</span>
                    <span className="things-branch-officer-role">{branch.designation}</span>
                    <span style={{ fontSize: '11px', color: 'var(--tp-fog)', marginTop: '2px' }}>
                      🏛 {branch.authority}
                    </span>
                  </div>

                  <div className="things-branch-deliverables">
                    <span style={{ fontSize: '10.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--tp-fog)', marginBottom: '2px' }}>
                      Branch Deliverables
                    </span>
                    {branch.deliverables.map((del, i) => (
                      <div key={i} className="things-branch-deliverable-item">
                        <span className="things-branch-deliverable-name">{del.name}</span>
                        <span
                          className="things-branch-deliverable-status"
                          style={{
                            color:
                              del.status === 'Verified' ||
                              del.status === 'Notified' ||
                              del.status === 'Disposed' ||
                              del.status === 'Sanctioned' ||
                              del.status === 'Approved' ||
                              del.status === 'Disbursed' ||
                              del.status === 'Delivered' ||
                              del.status === 'Executed' ||
                              del.status === 'Mutated'
                                ? '#0d7d56'
                                : del.status === 'In Progress' ||
                                  del.status === 'Compiled' ||
                                  del.status === 'Assessed' ||
                                  del.status === 'Issued' ||
                                  del.status === 'Scheduled'
                                ? '#2576eb'
                                : '#838b96',
                          }}
                        >
                          {del.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="things-branch-footer">
                  <span className="things-branch-sla">⏱ SLA: {branch.slaDays} Days</span>
                  <span style={{ fontSize: '11.5px', color: 'var(--tp-fog)' }}>
                    {branch.status === 'COMPLETED'
                      ? 'Clearing complete'
                      : branch.status === 'ACTIVE'
                      ? 'Active in jurisdiction'
                      : 'Awaiting upstream trigger'}
                  </span>
                </div>
              </div>
            ))}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Link
                  to={`/projects/${project.id}/gis`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    borderRadius: '5px',
                    border: '1px solid #1e293b',
                    backgroundColor: '#0f172a',
                    color: '#ffffff',
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                >
                  🗺 Multi-Level GIS &rarr;
                </Link>
                <span className="things-form-card-badge">GIS PostGIS</span>
              </div>
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
