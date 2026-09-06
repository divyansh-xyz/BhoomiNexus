/**
 * ============================================================
 * BOSS (Bhoomi Oversight & Sovereign Scrutiny) Types
 * Defined in Phase 4: BOSS Request Review and Land Parcel Determination
 * ============================================================
 */

export type ProjectRequestStatus =
  | 'DRAFT'
  | 'NEW_REQUEST'
  | 'UNDER_REVIEW'
  | 'PARCELS_PENDING'
  | 'PARCELS_CONFIRMED'
  | 'WORKFLOW_CONFIGURED'
  | 'PROJECT_APPROVED'
  | 'WORKFLOW_ACTIVE';

export type LandClassification =
  | 'Agricultural'
  | 'Wet Paddy'
  | 'Commercial'
  | 'Residential'
  | 'Forest'
  | 'Barren';

export interface ProjectDocument {
  id: string;
  title: string;
  type: 'GAZETTE_DRAFT' | 'DPR_EXTRACT' | 'SIA_CLEARANCE' | 'ALIGNMENT_GEOJSON' | 'SCHEDULE_OF_LAND';
  fileSize: string;
  uploadedAt: string;
  verified: boolean;
  hash: string;
}

export interface NodalOfficerProfile {
  name: string;
  designation: string;
  department: string;
  email: string;
  phone: string;
  officeAddress: string;
}

// ============================================================
// Phase 11: Tracking Types for Requesting Authority Dashboard
// ============================================================

export interface WorkflowStageTracking {
  id: string;
  name: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'REJECTED' | 'SKIPPED';
  stageOrder: number;
  department: string;
  slaDays: number;
  officerName?: string;
  officerDesignation?: string;
}

export interface WorkflowProgressSummary {
  totalStages: number;
  completedStages: number;
  percentage: number;
  currentStageName?: string | null;
  currentStageStatus?: string | null;
}

export interface ParcelProgressSummary {
  candidateCount: number;
  confirmedCount: number;
  confirmedAreaAcres?: number;
}

export interface PendingAction {
  id: string;
  type: 'STAGE_REJECTED';
  stageId: string;
  stageName: string;
  title?: string;
  description?: string;
  department?: string;
  reason: string;
  rejectedAt?: string;
  rejectedBy?: { name: string; designation: string } | null;
  slaDays?: number;
  isUrgent: boolean;
}

export interface AuditTimelineEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userRole?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface ProjectRequest {
  id: string;
  code: string;
  title: string;
  scope: string;
  statutoryPurpose: string;
  rfctlarrSection: string;
  ministry: string;
  proponentAuthority: string;
  nodalOfficer: NodalOfficerProfile;
  state: string;
  district: string;
  corridorKm: number;
  alignmentWidthMeters: number;
  requestedAreaAcres: number;
  requestedAreaHa: number;
  estimatedBudgetCr: number;
  status: ProjectRequestStatus;
  submissionDate: string;
  slaDeadline: string;
  initialDocuments: ProjectDocument[];
  corridorCoordinates: [number, number][];
  bounds: [[number, number], [number, number]];
  candidateParcelsCount?: number;
  selectedParcelsCount?: number;
  confirmedAreaAcres?: number;
  // Phase 11 tracking fields (present on project detail)
  workflowStages?: WorkflowStageTracking[];
  workflowProgress?: WorkflowProgressSummary;
  parcelProgress?: ParcelProgressSummary;
  pendingActions?: PendingAction[];
  auditTimeline?: AuditTimelineEntry[];
  // Phase 11 list-level fields (present on getProjects list)
  currentStage?: string | null;
  pendingAction?: { type: string; stageName: string; reason: string } | null;
  hasPendingAction?: boolean;
  updatedAt?: string;
  createdAt?: string;
  targetCompletionDate?: string;
}

export interface GrievanceRecord {
  id: string;
  referenceNumber: string;
  projectId: string;
  parcelId?: string | null;
  citizenName: string;
  citizenReference?: string;
  surveyNumber?: string;
  grievanceType: 'COMPENSATION_VALUATION' | 'BOUNDARY_DISPUTE' | 'REHABILITATION_RESETTLEMENT' | 'TITLE_OWNERSHIP' | 'ENVIRONMENTAL_CONCERN' | 'OTHER' | string;
  subject: string;
  description: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'CLOSED';
  resolutionNotes?: string | null;
  source?: 'WHATSAPP' | 'PORTAL' | 'IN_PERSON' | string;
  citizenPhone?: string | null;
  slaDays: number;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string | null;
}

export interface GrievanceSummary {
  total: number;
  open: number;
  underReview: number;
  resolved: number;
}

export interface LandParcel {
  id: string;
  ulpin: string; // 14-digit Bhu-Aadhaar ULPIN standard
  surveyNumber: string; // Khasra / Survey Number
  ownerReference: string; // Khatauni record / Landowner name
  village: string;
  district: string;
  state: string;
  areaAcres: number;
  areaHa: number;
  landType: LandClassification;
  status: 'CANDIDATE' | 'SELECTED' | 'EXCLUDED' | 'CONFIRMED';
  coordinates: [number, number][]; // Polygon coordinates
  marketRatePerAcre: number;
  intersectPercent?: number;
}

export interface BossDashboardStats {
  newRequestsCount: number;
  pendingConfigCount: number;
  configuredTodayCount: number;
  totalAreaHa: number;
  activeAuthoritiesCount: number;
}

export interface ParcelConfirmationPayload {
  parcelIds: string[];
}

export interface ParcelConfirmationResponse {
  projectId: string;
  confirmedParcelCount: number;
  confirmedAreaAcres: number;
  status: 'PARCELS_CONFIRMED';
  auditTimestamp: string;
  nextStepUrl: string;
}

