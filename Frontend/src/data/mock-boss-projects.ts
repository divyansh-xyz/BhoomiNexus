import type { ProjectRequest, LandParcel, BossDashboardStats } from '../types/boss.types';

/**
 * Default zero-value schema for BOSS dashboard statistics.
 * No hardcoded dummy data; populated dynamically via API / backend.
 */
export const INITIAL_BOSS_STATS: BossDashboardStats = {
  newRequestsCount: 0,
  pendingConfigCount: 0,
  configuredTodayCount: 0,
  totalAreaHa: 0,
  activeAuthoritiesCount: 0,
};

/**
 * Initial project requests registry starts empty.
 * Populated by backend API (GET /api/v1/projects) or user-submitted requisitions.
 */
export const INITIAL_PROJECT_REQUESTS: ProjectRequest[] = [];

/**
 * Candidate parcels map starts empty.
 * Populated by backend API (POST /api/v1/boss/projects/:id/land-records/fetch).
 */
export const MOCK_CANDIDATE_PARCELS: Record<string, LandParcel[]> = {};

/**
 * Generates candidate parcels - returns empty array by default.
 * Spatial intersection is executed on the backend via PostGIS ST_Intersects.
 */
export function generateCandidateParcels(_project: ProjectRequest): LandParcel[] {
  return [];
}
