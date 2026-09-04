/**
 * ============================================================
 * BOSS (Bhoomi Oversight & Sovereign Scrutiny) Types
 * Defined in Phase 4: BOSS Request Review and Land Parcel Determination
 * ============================================================
 */

export type ProjectRequestStatus =
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
  status: 'CANDIDATE' | 'SELECTED' | 'EXCLUDED';
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
