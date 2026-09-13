/**
 * ============================================================
 * V2 Advanced GIS Domain Types
 * Phase 16 — Multi-Level Monitoring GIS
 *
 * Supports 4 scope levels: national, state, district, project
 * Parcel Passport integration is provisioned via callback hooks.
 * ============================================================
 */

/** GIS scope determines the viewing level and data granularity */
export type GISScope = 'national' | 'state' | 'district' | 'project';

/** Parcel acquisition/lifecycle status used for layer categorisation */
export type GISParcelStatus =
  | 'PROPOSED'
  | 'NOTIFIED'
  | 'ACQUIRED'
  | 'COMPENSATION_PENDING'
  | 'COMPENSATION_PAID'
  | 'POSSESSION_PENDING'
  | 'POSSESSION_COMPLETED'
  | 'DISPUTED';

/** Lifecycle stage aligned with RFCTLARR Act 2013 sections */
export type GISLifecycleStage =
  | 'SECTION_4_PRELIMINARY'
  | 'SECTION_6_DECLARATION'
  | 'SECTION_11_SURVEY'
  | 'SECTION_19_VALUATION'
  | 'SECTION_26_AWARD'
  | 'SECTION_38_POSSESSION';

/** A single parcel feature rendered on the GIS map */
export interface GISParcelFeature {
  parcelId: string;
  ulpin: string;
  surveyNumber: string;
  ownerName: string;
  village: string;
  district: string;
  state: string;
  projectId: string;
  projectName: string;
  branchUnit: string;
  areaAcres: number;
  areaHa: number;
  status: GISParcelStatus;
  lifecycleStage: GISLifecycleStage;
  marketRatePerAcre: number;
  /** GeoJSON polygon coordinates [lng, lat][] */
  coordinates: [number, number][];
  /** Centre point for marker/popup [lat, lng] */
  centroid: [number, number];
}

/** Project boundary polygon rendered on the GIS map */
export interface GISProjectBoundary {
  projectId: string;
  projectName: string;
  projectCode: string;
  authorityName: string;
  state: string;
  district: string;
  totalParcels: number;
  /** GeoJSON polygon coordinates [lng, lat][] */
  coordinates: [number, number][];
  /** Centre point for label [lat, lng] */
  centroid: [number, number];
}

/** Toggleable GIS layer definition */
export interface GISLayerConfig {
  id: string;
  label: string;
  type: 'PROJECT_BOUNDARY' | 'PARCEL_STATUS';
  /** For PARCEL_STATUS layers, which status this layer represents */
  statusFilter?: GISParcelStatus;
  color: string;
  fillColor: string;
  fillOpacity: number;
  visible: boolean;
}

/** Active filter state for the GIS view */
export interface GISFilterState {
  stateId: string;
  districtId: string;
  projectId: string;
  lifecycle: GISLifecycleStage | '';
  parcelStatus: GISParcelStatus | '';
  branchUnit: string;
}

/** Compact parcel data for the click popup */
export interface ParcelPopupData {
  parcelId: string;
  ulpin: string;
  surveyNumber: string;
  ownerName: string;
  village: string;
  district: string;
  state: string;
  projectName: string;
  status: GISParcelStatus;
  areaAcres: number;
  areaHa: number;
  marketRatePerAcre: number;
}

/** GIS KPI summary shown in the header bar */
export interface GISKpiSummary {
  totalParcels: number;
  proposedCount: number;
  notifiedCount: number;
  acquiredCount: number;
  compensationPendingCount: number;
  compensationPaidCount: number;
  possessionPendingCount: number;
  possessionCompletedCount: number;
  disputedCount: number;
  totalAreaHa: number;
  projectCount: number;
}

/** Filter option for select dropdowns */
export interface GISFilterOption {
  value: string;
  label: string;
}

/** Default layer configuration for the Advanced GIS */
export const DEFAULT_GIS_LAYERS: GISLayerConfig[] = [
  {
    id: 'project-boundary',
    label: 'Project Boundary',
    type: 'PROJECT_BOUNDARY',
    color: '#6366f1',
    fillColor: '#6366f1',
    fillOpacity: 0.08,
    visible: true,
  },
  {
    id: 'parcel-proposed',
    label: 'Proposed',
    type: 'PARCEL_STATUS',
    statusFilter: 'PROPOSED',
    color: '#94a3b8',
    fillColor: '#94a3b8',
    fillOpacity: 0.45,
    visible: true,
  },
  {
    id: 'parcel-notified',
    label: 'Notified',
    type: 'PARCEL_STATUS',
    statusFilter: 'NOTIFIED',
    color: '#3b82f6',
    fillColor: '#3b82f6',
    fillOpacity: 0.45,
    visible: true,
  },
  {
    id: 'parcel-acquired',
    label: 'Acquired',
    type: 'PARCEL_STATUS',
    statusFilter: 'ACQUIRED',
    color: '#10b981',
    fillColor: '#10b981',
    fillOpacity: 0.45,
    visible: true,
  },
  {
    id: 'parcel-comp-pending',
    label: 'Compensation Pending',
    type: 'PARCEL_STATUS',
    statusFilter: 'COMPENSATION_PENDING',
    color: '#f59e0b',
    fillColor: '#f59e0b',
    fillOpacity: 0.45,
    visible: true,
  },
  {
    id: 'parcel-comp-paid',
    label: 'Compensation Paid',
    type: 'PARCEL_STATUS',
    statusFilter: 'COMPENSATION_PAID',
    color: '#22c55e',
    fillColor: '#22c55e',
    fillOpacity: 0.45,
    visible: true,
  },
  {
    id: 'parcel-poss-pending',
    label: 'Possession Pending',
    type: 'PARCEL_STATUS',
    statusFilter: 'POSSESSION_PENDING',
    color: '#a855f7',
    fillColor: '#a855f7',
    fillOpacity: 0.45,
    visible: true,
  },
  {
    id: 'parcel-poss-completed',
    label: 'Possession Completed',
    type: 'PARCEL_STATUS',
    statusFilter: 'POSSESSION_COMPLETED',
    color: '#06b6d4',
    fillColor: '#06b6d4',
    fillOpacity: 0.45,
    visible: true,
  },
  {
    id: 'parcel-disputed',
    label: 'Disputed',
    type: 'PARCEL_STATUS',
    statusFilter: 'DISPUTED',
    color: '#ef4444',
    fillColor: '#ef4444',
    fillOpacity: 0.55,
    visible: true,
  },
];
