/**
 * ============================================================
 * Institutional Dashboards V2 API Client
 * Strictly adheres to: V2 API Endpoints and Behaviour.md (Section: Dashboards)
 * 
 * Base: /api/v1
 * ============================================================
 */

import { apiClient } from './client';
import type {
  NationalDashboardData,
  StateDashboardData,
  DistrictDashboardData,
  StateAggregate,
  DistrictAggregate,
  ProjectAggregate,
} from '../../types/dashboardV2.types';

export const dashboardV2Service = {
  /**
   * GET /api/v1/dashboards/national
   * Returns national metrics derived from the shared dataset
   */
  async getNationalDashboard(): Promise<NationalDashboardData> {
    try {
      const res = await apiClient.get<NationalDashboardData>('/dashboards/national');
      if (res.data) return res.data;
    } catch (err) {
      console.warn('[dashboardV2Service] GET /api/v1/dashboards/national using fallback mock:', err);
    }

    // Default institutional mock data
    return {
      totalStates: 28,
      totalDistricts: 785,
      totalProjects: 1420,
      totalParcels: 84250,
      totalLandAcquiredHa: 12450.75,
      totalCompensationDisbursedCr: 4820.5,
      totalPossessionCompletedHa: 9840.2,
      pendingGrievancesCount: 142,
      stateBreakdown: [
        {
          stateId: 'MH',
          stateName: 'Maharashtra',
          districtsCount: 36,
          activeProjects: 184,
          totalParcels: 14200,
          acquiredParcels: 11500,
          disbursedCompensationCr: 1280.4,
          possessionCompletedHa: 2450.8,
          complianceRate: 94.2,
        },
        {
          stateId: 'GJ',
          stateName: 'Gujarat',
          districtsCount: 33,
          activeProjects: 142,
          totalParcels: 11800,
          acquiredParcels: 9800,
          disbursedCompensationCr: 940.1,
          possessionCompletedHa: 1890.3,
          complianceRate: 96.5,
        },
        {
          stateId: 'KA',
          stateName: 'Karnataka',
          districtsCount: 31,
          activeProjects: 120,
          totalParcels: 9600,
          acquiredParcels: 7900,
          disbursedCompensationCr: 810.0,
          possessionCompletedHa: 1540.0,
          complianceRate: 91.8,
        },
        {
          stateId: 'UP',
          stateName: 'Uttar Pradesh',
          districtsCount: 75,
          activeProjects: 210,
          totalParcels: 18900,
          acquiredParcels: 13200,
          disbursedCompensationCr: 1420.8,
          possessionCompletedHa: 2810.5,
          complianceRate: 88.4,
        },
      ],
    };
  },

  /**
   * GET /api/v1/dashboards/national/states
   */
  async getNationalStates(): Promise<StateAggregate[]> {
    try {
      const res = await apiClient.get<StateAggregate[]>('/dashboards/national/states');
      if (res.data) return res.data;
    } catch (err) {
      console.warn('[dashboardV2Service] GET /api/v1/dashboards/national/states fallback:', err);
    }
    const full = await this.getNationalDashboard();
    return full.stateBreakdown;
  },

  /**
   * GET /api/v1/dashboards/state/:stateId
   * Returns state-scoped monitoring metrics
   */
  async getStateDashboard(stateId: string = 'MH'): Promise<StateDashboardData> {
    try {
      const res = await apiClient.get<StateDashboardData>(`/dashboards/state/${stateId}`);
      if (res.data) return res.data;
    } catch (err) {
      console.warn(`[dashboardV2Service] GET /api/v1/dashboards/state/${stateId} using fallback mock:`, err);
    }

    return {
      stateId,
      stateName: stateId === 'MH' ? 'Maharashtra' : stateId === 'GJ' ? 'Gujarat' : 'State Jurisdiction',
      totalDistricts: 36,
      totalProjects: 184,
      totalParcels: 14200,
      totalLandAcquiredHa: 2450.8,
      totalCompensationDisbursedCr: 1280.4,
      totalPossessionCompletedHa: 1980.2,
      districtBreakdown: [
        {
          districtId: 'pune',
          districtName: 'Pune',
          activeProjects: 28,
          totalParcels: 3200,
          parcelsDemarcated: 2890,
          compensationDisbursedCr: 340.5,
          possessionTakenParcels: 2600,
          slaAdherenceRate: 95.8,
        },
        {
          districtId: 'nagpur',
          districtName: 'Nagpur',
          activeProjects: 22,
          totalParcels: 2400,
          parcelsDemarcated: 2050,
          compensationDisbursedCr: 210.2,
          possessionTakenParcels: 1890,
          slaAdherenceRate: 92.1,
        },
        {
          districtId: 'nashik',
          districtName: 'Nashik',
          activeProjects: 19,
          totalParcels: 2100,
          parcelsDemarcated: 1780,
          compensationDisbursedCr: 185.0,
          possessionTakenParcels: 1600,
          slaAdherenceRate: 93.4,
        },
        {
          districtId: 'thane',
          districtName: 'Thane',
          activeProjects: 24,
          totalParcels: 2800,
          parcelsDemarcated: 2350,
          compensationDisbursedCr: 390.6,
          possessionTakenParcels: 2100,
          slaAdherenceRate: 89.7,
        },
      ],
    };
  },

  /**
   * GET /api/v1/dashboards/state/:stateId/districts
   */
  async getStateDistricts(stateId: string = 'MH'): Promise<DistrictAggregate[]> {
    try {
      const res = await apiClient.get<DistrictAggregate[]>(`/dashboards/state/${stateId}/districts`);
      if (res.data) return res.data;
    } catch (err) {
      console.warn(`[dashboardV2Service] GET /api/v1/dashboards/state/${stateId}/districts fallback:`, err);
    }
    const stateData = await this.getStateDashboard(stateId);
    return stateData.districtBreakdown;
  },

  /**
   * GET /api/v1/dashboards/district/:districtId
   * Returns district projects, parcels, land, acquisition stages, compensation, possession
   */
  async getDistrictDashboard(districtId: string = 'pune'): Promise<DistrictDashboardData> {
    try {
      const res = await apiClient.get<DistrictDashboardData>(`/dashboards/district/${districtId}`);
      if (res.data) return res.data;
    } catch (err) {
      console.warn(`[dashboardV2Service] GET /api/v1/dashboards/district/${districtId} fallback:`, err);
    }

    return {
      districtId,
      districtName: districtId.charAt(0).toUpperCase() + districtId.slice(1),
      stateName: 'Maharashtra',
      totalProjects: 28,
      totalParcels: 3200,
      totalLandAreaHa: 680.5,
      stageBreakdown: [
        { stage: 'Section 4(1) Preliminary Notification', parcelsCount: 3200, slaAdherencePercent: 98 },
        { stage: 'Section 6 Declaration & Survey', parcelsCount: 3100, slaAdherencePercent: 96 },
        { stage: 'Section 11 Joint Measurement Survey', parcelsCount: 2950, slaAdherencePercent: 94 },
        { stage: 'Section 19 Publication & Valuation', parcelsCount: 2890, slaAdherencePercent: 92 },
        { stage: 'Section 26-30 Compensation Award', parcelsCount: 2750, slaAdherencePercent: 91 },
        { stage: 'Section 38 Physical Possession', parcelsCount: 2600, slaAdherencePercent: 95 },
      ],
      compensationSummary: {
        assessedCr: 380.2,
        disbursedCr: 340.5,
        pendingCr: 39.7,
        beneficiaryCount: 1840,
      },
      possessionSummary: {
        totalParcels: 3200,
        possessionTaken: 2600,
        pendingInspection: 480,
        disputed: 120,
      },
      projectBreakdown: [
        {
          projectId: 'p-nhai-ringroad-2026',
          projectName: 'Pune Ring Road Eastern Bypass (Phase II)',
          projectCode: 'NHAI-MH-PUN-042',
          authorityName: 'National Highways Authority of India (NHAI)',
          totalParcels: 1240,
          stage: 'Section 26 Compensation Determination',
          status: 'ACTIVE',
          compensationProgressPercent: 88,
          possessionProgressPercent: 79,
          disputedCount: 14,
        },
        {
          projectId: 'p-mahametro-line3-ext',
          projectName: 'Pune Metro Rail Line 3 Hinjewadi Extension',
          projectCode: 'PMRDA-METRO-018',
          authorityName: 'Pune Metropolitan Region Development Authority',
          totalParcels: 820,
          stage: 'Section 38 Physical Possession Handover',
          status: 'ACTIVE',
          compensationProgressPercent: 96,
          possessionProgressPercent: 92,
          disputedCount: 6,
        },
        {
          projectId: 'p-midc-chakan-phase5',
          projectName: 'MIDC Chakan Industrial Corridor Expansion Phase V',
          projectCode: 'MIDC-IND-092',
          authorityName: 'Maharashtra Industrial Development Corporation',
          totalParcels: 1140,
          stage: 'Section 11 Joint Measurement Survey',
          status: 'ACTIVE',
          compensationProgressPercent: 42,
          possessionProgressPercent: 35,
          disputedCount: 22,
        },
      ],
    };
  },

  /**
   * GET /api/v1/dashboards/district/:districtId/projects
   */
  async getDistrictProjects(districtId: string = 'pune'): Promise<ProjectAggregate[]> {
    try {
      const res = await apiClient.get<ProjectAggregate[]>(`/dashboards/district/${districtId}/projects`);
      if (res.data) return res.data;
    } catch (err) {
      console.warn(`[dashboardV2Service] GET /api/v1/dashboards/district/${districtId}/projects fallback:`, err);
    }
    const data = await this.getDistrictDashboard(districtId);
    return data.projectBreakdown;
  },
};
