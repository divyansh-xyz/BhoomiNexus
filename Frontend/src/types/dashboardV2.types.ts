/**
 * ============================================================
 * V2 Institutional Dashboard Domain Types
 * Strictly adheres to: V2 API Endpoints and Behaviour.md (Section: Dashboards)
 * 
 * Endpoints represented:
 * - GET /api/v1/dashboards/national
 * - GET /api/v1/dashboards/national/states
 * - GET /api/v1/dashboards/state/:stateId
 * - GET /api/v1/dashboards/state/:stateId/districts
 * - GET /api/v1/dashboards/district/:districtId
 * - GET /api/v1/dashboards/district/:districtId/projects
 * ============================================================
 */

export interface StateAggregate {
  stateId: string;
  stateName: string;
  districtsCount: number;
  activeProjects: number;
  totalParcels: number;
  acquiredParcels: number;
  disbursedCompensationCr: number;
  possessionCompletedHa: number;
  complianceRate: number;
}

export interface NationalDashboardData {
  totalStates: number;
  totalDistricts: number;
  totalProjects: number;
  totalParcels: number;
  totalLandAcquiredHa: number;
  totalCompensationDisbursedCr: number;
  totalPossessionCompletedHa: number;
  pendingGrievancesCount: number;
  stateBreakdown: StateAggregate[];
}

export interface DistrictAggregate {
  districtId: string;
  districtName: string;
  activeProjects: number;
  totalParcels: number;
  parcelsDemarcated: number;
  compensationDisbursedCr: number;
  possessionTakenParcels: number;
  slaAdherenceRate: number;
}

export interface StateDashboardData {
  stateId: string;
  stateName: string;
  totalDistricts: number;
  totalProjects: number;
  totalParcels: number;
  totalLandAcquiredHa: number;
  totalCompensationDisbursedCr: number;
  totalPossessionCompletedHa: number;
  districtBreakdown: DistrictAggregate[];
}

export interface ProjectAggregate {
  projectId: string;
  projectName: string;
  projectCode: string;
  authorityName: string;
  totalParcels: number;
  stage: string;
  status: 'DRAFT' | 'SUBMITTED' | 'ACTIVE' | 'COMPLETED';
  compensationProgressPercent: number;
  possessionProgressPercent: number;
  disputedCount: number;
}

export interface DistrictDashboardData {
  districtId: string;
  districtName: string;
  stateName: string;
  totalProjects: number;
  totalParcels: number;
  totalLandAreaHa: number;
  stageBreakdown: {
    stage: string;
    parcelsCount: number;
    slaAdherencePercent: number;
  }[];
  compensationSummary: {
    assessedCr: number;
    disbursedCr: number;
    pendingCr: number;
    beneficiaryCount: number;
  };
  possessionSummary: {
    totalParcels: number;
    possessionTaken: number;
    pendingInspection: number;
    disputed: number;
  };
  projectBreakdown: ProjectAggregate[];
}
