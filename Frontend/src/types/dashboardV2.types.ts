/**
 * ============================================================
 * V2 Institutional Dashboard Domain Types
 * Strictly adheres to: Phase Implementation.md (Phase 17) & DESIGN.md
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
  landRequiredHa: number;
  landAcquiredHa: number;
  disbursedCompensationCr: number;
  pendingCompensationCr: number;
  possessionCompletedCount: number;
  complianceRate: number;
}

export interface NationalDashboardData {
  totalStates: number;
  totalDistricts: number;
  totalProjects: number;
  totalParcels: number;
  landRequiredHa: number;
  landAcquiredHa: number;
  compensationAssessedCr: number;
  compensationApprovedCr: number;
  compensationPaidCr: number;
  compensationPendingCr: number;
  possessionReadyCount: number;
  possessionPendingCount: number;
  possessionCompletedCount: number;
  totalCompensationDisbursedCr?: number;
  totalPossessionCompletedHa?: number;
  totalLandAcquiredHa?: number;
  pendingGrievancesCount?: number;
  stateBreakdown: StateAggregate[];
}

export interface DistrictAggregate {
  districtId: string;
  districtName: string;
  activeProjects: number;
  totalParcels: number;
  parcelsDemarcated: number;
  landRequiredHa: number;
  landAcquiredHa: number;
  compensationAssessedCr: number;
  compensationDisbursedCr: number;
  compensationPendingCr: number;
  possessionTakenParcels: number;
  possessionPendingParcels: number;
  slaAdherenceRate: number;
}

export interface StateDashboardData {
  stateId: string;
  stateName: string;
  totalDistricts: number;
  totalProjects: number;
  totalParcels: number;
  landRequiredHa: number;
  landAcquiredHa: number;
  compensationAssessedCr: number;
  compensationApprovedCr: number;
  compensationPaidCr: number;
  compensationPendingCr: number;
  possessionReadyCount: number;
  possessionPendingCount: number;
  possessionCompletedCount: number;
  totalCompensationDisbursedCr?: number;
  totalPossessionCompletedHa?: number;
  totalLandAcquiredHa?: number;
  districtBreakdown: DistrictAggregate[];
}

export interface ProjectAggregate {
  projectId: string;
  projectName: string;
  projectCode: string;
  authorityName: string;
  totalParcels: number;
  stage: string;
  status: 'DRAFT' | 'SUBMITTED' | 'ACTIVE' | 'COMPLETED' | string;
  compensationProgressPercent: number;
  possessionProgressPercent: number;
  disputedCount: number;
}

export interface BranchAggregate {
  branchKey: string;
  branchName: string;
  department: string;
  officerInCharge: string;
  officerDesignation: string;
  activeParcelsCount: number;
  slaAdherencePercent: number;
  pendingTasksCount: number;
}

export interface PendingOfficerWorkItem {
  taskId: string;
  taskTitle: string;
  parcelId: string;
  ulpin: string;
  surveyNumber: string;
  village: string;
  assignedOfficer: string;
  branchType: string;
  slaDaysRemaining: number;
  status: string;
  dueDate: string;
}

export interface ParcelCohortItem {
  cohortId: string;
  cohortName: string;
  branchName: string;
  unitName: string;
  parcelCount: number;
  activeStage: string;
  progressPercent: number;
}

export interface DistrictDashboardData {
  districtId: string;
  districtName: string;
  stateName: string;
  totalProjects: number;
  totalParcels: number;
  landRequiredHa: number;
  landAcquiredHa: number;
  totalLandAreaHa?: number;
  stageBreakdown?: {
    stage: string;
    parcelsCount: number;
    slaAdherencePercent: number;
  }[];
  compensationSummary: {
    assessedCr: number;
    approvedCr: number;
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
  branchBreakdown: BranchAggregate[];
  pendingOfficerWork: PendingOfficerWorkItem[];
  parcelCohortVisibility: ParcelCohortItem[];
}
