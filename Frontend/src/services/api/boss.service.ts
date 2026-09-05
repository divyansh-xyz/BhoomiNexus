/**
 * ============================================================
 * BOSS (Bhoomi Oversight & Sovereign Scrutiny) Service
 * Strictly adheres to API Contract & Ownership Document.md
 * (Sections 11, 12, 13, 14)
 * 100% REST API Driven - No local mock/sample data
 * ============================================================
 */

import { apiClient } from './client';
import type {
  ProjectRequest,
  LandParcel,
  BossDashboardStats,
  ParcelConfirmationResponse,
} from '../../types/boss.types';
import type { CreateProjectRequestDTO, ProponentDashboardStats } from '../../types/proponent.types';

export const bossService = {
  /**
   * Section 11.1: GET /api/v1/projects
   * Returns list of projects matching query filters (status, search, mine)
   */
  async getProjects(filters?: { status?: string; search?: string; mine?: boolean }): Promise<ProjectRequest[]> {
    try {
      const res = await apiClient.get<ProjectRequest[]>('/projects', { params: filters });
      if (res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (e) {
      console.warn('[bossService] GET /api/v1/projects pending backend deployment:', e);
    }
    return [];
  },

  /**
   * Section 11.3: GET /api/v1/projects/:projectId
   * Returns detailed dossier for a specific project
   */
  async getProjectById(projectId: string): Promise<ProjectRequest | null> {
    try {
      const res = await apiClient.get<ProjectRequest>(`/projects/${projectId}`);
      if (res.data) return res.data;
    } catch (e) {
      console.warn(`[bossService] GET /api/v1/projects/${projectId} pending backend deployment:`, e);
    }
    return null;
  },

  /**
   * Section 11.4: PATCH /api/v1/projects/:projectId
   * Update draft project requisition
   */
  async updateProject(projectId: string, updates: Partial<ProjectRequest>): Promise<ProjectRequest | null> {
    try {
      const res = await apiClient.patch<ProjectRequest>(`/projects/${projectId}`, updates);
      if (res.data) return res.data;
    } catch (e) {
      console.warn(`[bossService] PATCH /api/v1/projects/${projectId} failed:`, e);
    }
    return null;
  },

  /**
   * Section 11.5: POST /api/v1/projects/:projectId/submit
   * Transitions project: DRAFT -> SUBMITTED -> BOSS_REVIEW
   */
  async submitProject(projectId: string): Promise<ProjectRequest | null> {
    try {
      const res = await apiClient.post<ProjectRequest>(`/projects/${projectId}/submit`);
      if (res.data) return res.data;
    } catch (e) {
      console.warn(`[bossService] POST /api/v1/projects/${projectId}/submit failed:`, e);
    }
    return null;
  },

  /**
   * Section 11.6: GET /api/v1/projects/:projectId/actions
   * Returns actions requiring authority's attention
   */
  async getProjectActions(projectId: string): Promise<any[]> {
    try {
      const res = await apiClient.get(`/projects/${projectId}/actions`);
      if (res.data && Array.isArray(res.data)) return res.data;
    } catch (e) {
      console.warn(`[bossService] GET /api/v1/projects/${projectId}/actions pending:`, e);
    }
    return [];
  },

  /**
   * Section 12.1: POST /api/v1/projects/:projectId/geometry
   * Save project corridor or boundary GeoJSON geometry
   */
  async saveProjectGeometry(projectId: string, geometry: any): Promise<void> {
    await apiClient.post(`/projects/${projectId}/geometry`, { geometry });
  },

  /**
   * Section 12.2: GET /api/v1/projects/:projectId/geometry
   * Retrieve project spatial geometry
   */
  async getProjectGeometry(projectId: string): Promise<any | null> {
    try {
      const res = await apiClient.get(`/projects/${projectId}/geometry`);
      if (res.data) return res.data;
    } catch (e) {
      console.warn(`[bossService] GET /api/v1/projects/${projectId}/geometry pending:`, e);
    }
    return null;
  },

  /**
   * Section 14.1 & 13.1: Candidate Land Record Integration
   * POST /api/v1/boss/projects/:projectId/land-records/fetch
   * GET  /api/v1/projects/:projectId/parcels
   */
  async fetchCandidateLandRecords(projectId: string): Promise<LandParcel[]> {
    try {
      await apiClient.post(`/boss/projects/${projectId}/land-records/fetch`);
      const res = await apiClient.get<LandParcel[]>(`/projects/${projectId}/parcels`);
      if (res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (e) {
      console.warn(`[bossService] fetchCandidateLandRecords for ${projectId} pending:`, e);
    }
    return [];
  },

  /**
   * Section 13.1: GET /api/v1/projects/:projectId/parcels
   * Returns confirmed or candidate parcels for a project
   */
  async getProjectParcels(projectId: string): Promise<LandParcel[]> {
    try {
      const res = await apiClient.get<LandParcel[]>(`/projects/${projectId}/parcels`);
      if (res.data && Array.isArray(res.data)) {
        return res.data;
      }
    } catch (e) {
      console.warn(`[bossService] GET /api/v1/projects/${projectId}/parcels pending:`, e);
    }
    return [];
  },

  /**
   * Section 13.5: POST /api/v1/boss/projects/:projectId/parcels/confirm
   * Body: { parcelIds: string[] }
   * Effect: Creates project_parcels, marks PARCELS_CONFIRMED, logs audit event
   */
  async confirmProjectParcels(
    projectId: string,
    selectedParcelIds: string[]
  ): Promise<ParcelConfirmationResponse> {
    const res = await apiClient.post<ParcelConfirmationResponse>(
      `/boss/projects/${projectId}/parcels/confirm`,
      { parcelIds: selectedParcelIds }
    );
    return res.data;
  },

  /**
   * Section 11.2: POST /api/v1/projects
   * Creates new project requisition from Requesting Authority
   */
  async createProjectRequest(dto: CreateProjectRequestDTO): Promise<ProjectRequest> {
    const res = await apiClient.post<ProjectRequest>('/projects', dto);
    return res.data;
  },

  /**
   * Section 11.8 / Section 23: Dashboard Aggregate Stats
   * Fetches summary from GET /api/v1/projects/summary or calculates purely from GET /api/v1/projects
   */
  async getDashboardStats(): Promise<BossDashboardStats> {
    try {
      const res = await apiClient.get<BossDashboardStats>('/projects/summary');
      if (res.data && typeof res.data === 'object' && typeof (res.data as any).newRequestsCount === 'number') {
        return res.data;
      }
    } catch {
      // Fallback: calculate dynamically from active API projects
    }

    const projects = await this.getProjects();
    const newRequests = projects.filter((p) => p.status === 'NEW_REQUEST').length;
    const pending = projects.filter((p) => p.status === 'PARCELS_PENDING' || p.status === 'UNDER_REVIEW').length;
    const configuredToday = projects.filter(
      (p) =>
        p.status === 'PARCELS_CONFIRMED' ||
        p.status === 'WORKFLOW_CONFIGURED' ||
        p.status === 'PROJECT_APPROVED'
    ).length;
    const totalAreaHa = projects.reduce((sum, p) => sum + (p.requestedAreaHa || 0), 0);
    const authorities = new Set(projects.map((p) => p.proponentAuthority)).size;

    return {
      newRequestsCount: newRequests,
      pendingConfigCount: pending,
      configuredTodayCount: configuredToday,
      totalAreaHa: Math.round(totalAreaHa),
      activeAuthoritiesCount: authorities,
    };
  },

  /**
   * Proponent Authority Dashboard Aggregates
   */
  async getProponentStats(authority?: string): Promise<ProponentDashboardStats> {
    let projects = await this.getProjects();
    if (authority && authority !== 'ALL') {
      projects = projects.filter((p) =>
        p.proponentAuthority.toUpperCase().includes(authority.toUpperCase())
      );
    }
    const underBossScrutiny = projects.filter(
      (p) => p.status === 'NEW_REQUEST' || p.status === 'UNDER_REVIEW' || p.status === 'PARCELS_PENDING'
    ).length;
    const parcelsDetermined = projects.filter(
      (p) =>
        p.status === 'PARCELS_CONFIRMED' ||
        p.status === 'WORKFLOW_CONFIGURED' ||
        p.status === 'PROJECT_APPROVED'
    ).length;

    return {
      totalRequisitions: projects.length,
      underBossScrutiny,
      parcelsDetermined,
      draftsCount: 0,
    };
  },
};
