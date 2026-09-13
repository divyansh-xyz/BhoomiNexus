/**
 * ============================================================
 * V2 Advanced GIS API Client
 * Phase 16 — Multi-Level Monitoring GIS
 *
 * Endpoints:
 * - GET /api/v1/gis/parcels?scope=...&filters=...
 * - GET /api/v1/gis/boundaries?scope=...&filters=...
 * - GET /api/v1/gis/kpis?scope=...&filters=...
 * - GET /api/v1/gis/filters/options?scope=...
 *
 * Falls back to rich institutional mock data.
 * ============================================================
 */

import { apiClient } from './client';
import type {
  GISScope,
  GISParcelFeature,
  GISProjectBoundary,
  GISFilterState,
  GISKpiSummary,
  GISFilterOption,
  GISParcelStatus,
  GISLifecycleStage,
} from '../../types/gisV2.types';

/* ───── Realistic Mock Parcel Coordinates (Pune/Maharashtra region) ───── */

function generateParcelPolygon(
  centerLat: number,
  centerLng: number,
  sizeFactor: number = 0.003
): [number, number][] {
  const halfSize = sizeFactor / 2;
  const jitter = () => (Math.random() - 0.5) * 0.001;
  return [
    [centerLng - halfSize + jitter(), centerLat - halfSize + jitter()],
    [centerLng + halfSize + jitter(), centerLat - halfSize + jitter()],
    [centerLng + halfSize + jitter(), centerLat + halfSize + jitter()],
    [centerLng - halfSize + jitter(), centerLat + halfSize + jitter()],
    [centerLng - halfSize + jitter(), centerLat - halfSize + jitter()], // close polygon
  ];
}

const MOCK_STATUSES: GISParcelStatus[] = [
  'PROPOSED', 'NOTIFIED', 'ACQUIRED', 'COMPENSATION_PENDING',
  'COMPENSATION_PAID', 'POSSESSION_PENDING', 'POSSESSION_COMPLETED', 'DISPUTED',
];

const MOCK_STAGES: GISLifecycleStage[] = [
  'SECTION_4_PRELIMINARY', 'SECTION_6_DECLARATION', 'SECTION_11_SURVEY',
  'SECTION_19_VALUATION', 'SECTION_26_AWARD', 'SECTION_38_POSSESSION',
];

const MOCK_VILLAGES = [
  'Rampur Khas', 'Wagholi', 'Chakan', 'Talegaon', 'Hinjewadi',
  'Kothrud', 'Bavdhan', 'Pirangut', 'Mulshi', 'Mawal',
  'Shirgaon', 'Vadgaon Budruk', 'Baner', 'Pashan', 'Sus',
];

const MOCK_BRANCH_UNITS = [
  'Revenue Circle – Haveli', 'Revenue Circle – Mawal', 'Revenue Circle – Mulshi',
  'Tehsil Junnar', 'Tehsil Ambegaon', 'Sub-Division Pune City',
];

const MOCK_PROJECTS = [
  { id: 'p-nhai-ringroad-2026', name: 'Pune Ring Road Eastern Bypass (Phase II)', code: 'NHAI-MH-PUN-042', authority: 'National Highways Authority of India (NHAI)' },
  { id: 'p-mahametro-line3-ext', name: 'Pune Metro Rail Line 3 Hinjewadi Extension', code: 'PMRDA-METRO-018', authority: 'Pune Metropolitan Region Development Authority' },
  { id: 'p-midc-chakan-phase5', name: 'MIDC Chakan Industrial Corridor Phase V', code: 'MIDC-IND-092', authority: 'Maharashtra Industrial Development Corporation' },
  { id: 'p-dmrc-rithala-ext', name: 'Rithala-Narela Metro Corridor Expansion', code: 'DMRC-DL-RIT-001', authority: 'Delhi Metro Rail Corporation (DMRC)' },
];

function generateMockParcels(count: number = 48): GISParcelFeature[] {
  const baseLat = 18.55;
  const baseLng = 73.85;
  const parcels: GISParcelFeature[] = [];

  for (let i = 0; i < count; i++) {
    const project = MOCK_PROJECTS[i % MOCK_PROJECTS.length];
    const isRithala = project.id === 'p-dmrc-rithala-ext';
    const lat = isRithala ? 28.7208 + (Math.random() - 0.5) * 0.05 : baseLat + (Math.random() - 0.5) * 0.12;
    const lng = isRithala ? 77.1071 + (Math.random() - 0.5) * 0.05 : baseLng + (Math.random() - 0.5) * 0.18;
    const status = MOCK_STATUSES[i % MOCK_STATUSES.length];
    const stage = MOCK_STAGES[i % MOCK_STAGES.length];
    const acres = +(1 + Math.random() * 8).toFixed(2);

    parcels.push({
      parcelId: `PRC-${String(i + 1).padStart(4, '0')}`,
      ulpin: isRithala ? `07-104-5829-${1000 + i}` : `27-${100 + (i % 10)}-${5000 + i}-${1000 + i}`,
      surveyNumber: `SV-${100 + i}/${String.fromCharCode(65 + (i % 4))}`,
      ownerName: [
        'Ramesh Patil', 'Suresh Kumar', 'Anita Sharma', 'Priya Deshmukh',
        'Vishnu Jadhav', 'Lakshmi Iyer', 'Ganesh Kulkarni', 'Meena Pawar',
        'Rajendra Singh', 'Savita Bhosale', 'Anil Gaikwad', 'Sunita More',
      ][i % 12],
      village: isRithala ? 'Rithala Urban' : MOCK_VILLAGES[i % MOCK_VILLAGES.length],
      district: isRithala ? 'Rithala' : 'Pune',
      state: isRithala ? 'Delhi' : 'Maharashtra',
      projectId: project.id,
      projectName: project.name,
      branchUnit: MOCK_BRANCH_UNITS[i % MOCK_BRANCH_UNITS.length],
      areaAcres: acres,
      areaHa: +(acres * 0.404686).toFixed(4),
      status,
      lifecycleStage: stage,
      marketRatePerAcre: +(800000 + Math.random() * 1200000).toFixed(0),
      coordinates: generateParcelPolygon(lat, lng),
      centroid: [lat, lng],
    });
  }

  return parcels;
}

function generateMockBoundaries(): GISProjectBoundary[] {
  return MOCK_PROJECTS.map((p, idx) => {
    const baseLat = 18.55 + (idx - 1) * 0.035;
    const baseLng = 73.85 + (idx - 1) * 0.04;
    const size = 0.06;
    return {
      projectId: p.id,
      projectName: p.name,
      projectCode: p.code,
      authorityName: p.authority,
      state: 'Maharashtra',
      district: 'Pune',
      totalParcels: 400 + idx * 200,
      coordinates: [
        [baseLng - size, baseLat - size],
        [baseLng + size, baseLat - size],
        [baseLng + size, baseLat + size],
        [baseLng - size, baseLat + size],
        [baseLng - size, baseLat - size],
      ],
      centroid: [baseLat, baseLng],
    };
  });
}

let _cachedParcels: GISParcelFeature[] | null = null;
let _cachedBoundaries: GISProjectBoundary[] | null = null;

function getMockParcels(): GISParcelFeature[] {
  if (!_cachedParcels) _cachedParcels = generateMockParcels(48);
  return _cachedParcels;
}

function getMockBoundaries(): GISProjectBoundary[] {
  if (!_cachedBoundaries) _cachedBoundaries = generateMockBoundaries();
  return _cachedBoundaries;
}

function applyFilters(parcels: GISParcelFeature[], filters: GISFilterState): GISParcelFeature[] {
  return parcels.filter((p) => {
    if (filters.stateId && p.state.toLowerCase() !== filters.stateId.toLowerCase()) return false;
    if (filters.districtId && p.district.toLowerCase() !== filters.districtId.toLowerCase()) return false;
    if (filters.projectId && p.projectId !== filters.projectId) return false;
    if (filters.lifecycle && p.lifecycleStage !== filters.lifecycle) return false;
    if (filters.parcelStatus && p.status !== filters.parcelStatus) return false;
    if (filters.branchUnit && p.branchUnit !== filters.branchUnit) return false;
    return true;
  });
}

function computeKpis(parcels: GISParcelFeature[], boundaries: GISProjectBoundary[]): GISKpiSummary {
  const count = (s: GISParcelStatus) => parcels.filter((p) => p.status === s).length;
  return {
    totalParcels: parcels.length,
    proposedCount: count('PROPOSED'),
    notifiedCount: count('NOTIFIED'),
    acquiredCount: count('ACQUIRED'),
    compensationPendingCount: count('COMPENSATION_PENDING'),
    compensationPaidCount: count('COMPENSATION_PAID'),
    possessionPendingCount: count('POSSESSION_PENDING'),
    possessionCompletedCount: count('POSSESSION_COMPLETED'),
    disputedCount: count('DISPUTED'),
    totalAreaHa: +parcels.reduce((sum, p) => sum + p.areaHa, 0).toFixed(2),
    projectCount: boundaries.length,
  };
}

export const gisV2Service = {
  /**
   * GET /api/v1/gis/parcels
   * Fetches GeoJSON parcel features scoped and filtered
   */
  async getParcels(
    _scope: GISScope,
    filters: GISFilterState
  ): Promise<GISParcelFeature[]> {
    try {
      const params = new URLSearchParams();
      params.set('scope', _scope);
      if (filters.stateId) params.set('stateId', filters.stateId);
      if (filters.districtId) params.set('districtId', filters.districtId);
      if (filters.projectId) params.set('projectId', filters.projectId);
      if (filters.lifecycle) params.set('lifecycle', filters.lifecycle);
      if (filters.parcelStatus) params.set('parcelStatus', filters.parcelStatus);
      if (filters.branchUnit) params.set('branchUnit', filters.branchUnit);

      const res = await apiClient.get<GISParcelFeature[]>(`/gis/parcels?${params.toString()}`);
      if (res.data) return res.data;
    } catch (err) {
      console.warn('[gisV2Service] GET /api/v1/gis/parcels fallback:', err);
    }

    return applyFilters(getMockParcels(), filters);
  },

  /**
   * GET /api/v1/gis/boundaries
   * Fetches project boundary polygons
   */
  async getBoundaries(
    _scope: GISScope,
    filters: GISFilterState
  ): Promise<GISProjectBoundary[]> {
    try {
      const params = new URLSearchParams();
      params.set('scope', _scope);
      if (filters.projectId) params.set('projectId', filters.projectId);

      const res = await apiClient.get<GISProjectBoundary[]>(`/gis/boundaries?${params.toString()}`);
      if (res.data) return res.data;
    } catch (err) {
      console.warn('[gisV2Service] GET /api/v1/gis/boundaries fallback:', err);
    }

    const boundaries = getMockBoundaries();
    if (filters.projectId) {
      return boundaries.filter((b) => b.projectId === filters.projectId);
    }
    return boundaries;
  },

  /**
   * GET /api/v1/gis/kpis
   * Returns KPI summary for the current scope & filters
   */
  async getKpis(
    scope: GISScope,
    filters: GISFilterState
  ): Promise<GISKpiSummary> {
    try {
      const params = new URLSearchParams();
      params.set('scope', scope);

      const res = await apiClient.get<GISKpiSummary>(`/gis/kpis?${params.toString()}`);
      if (res.data) return res.data;
    } catch (err) {
      console.warn('[gisV2Service] GET /api/v1/gis/kpis fallback:', err);
    }

    const parcels = applyFilters(getMockParcels(), filters);
    const boundaries = getMockBoundaries();
    return computeKpis(parcels, boundaries);
  },

  /**
   * GET /api/v1/gis/filters/options
   * Returns available filter options for the current scope
   */
  async getFilterOptions(
    _scope: GISScope
  ): Promise<{
    states: GISFilterOption[];
    districts: GISFilterOption[];
    projects: GISFilterOption[];
    lifecycles: GISFilterOption[];
    statuses: GISFilterOption[];
    branchUnits: GISFilterOption[];
  }> {
    try {
      const res = await apiClient.get(`/gis/filters/options?scope=${_scope}`);
      if (res.data) return res.data as any;
    } catch (err) {
      console.warn('[gisV2Service] GET /api/v1/gis/filters/options fallback:', err);
    }

    return {
      states: [
        { value: 'Maharashtra', label: 'Maharashtra' },
        { value: 'Delhi', label: 'Delhi' },
        { value: 'Gujarat', label: 'Gujarat' },
        { value: 'Karnataka', label: 'Karnataka' },
        { value: 'Uttar Pradesh', label: 'Uttar Pradesh' },
      ],
      districts: [
        { value: 'Pune', label: 'Pune' },
        { value: 'Rithala', label: 'Rithala' },
        { value: 'Nagpur', label: 'Nagpur' },
        { value: 'Nashik', label: 'Nashik' },
        { value: 'Thane', label: 'Thane' },
      ],
      projects: MOCK_PROJECTS.map((p) => ({ value: p.id, label: p.name })),
      lifecycles: MOCK_STAGES.map((s) => ({
        value: s,
        label: s.replace(/_/g, ' ').replace(/SECTION /i, 'Sec '),
      })),
      statuses: MOCK_STATUSES.map((s) => ({
        value: s,
        label: s.replace(/_/g, ' ').charAt(0) + s.replace(/_/g, ' ').slice(1).toLowerCase(),
      })),
      branchUnits: MOCK_BRANCH_UNITS.map((b) => ({ value: b, label: b })),
    };
  },
};
