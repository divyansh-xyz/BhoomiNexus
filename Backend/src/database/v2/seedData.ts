/**
 * Phase 3 — Minimal Seed Geography and Demo Dataset Definitions
 * 
 * Implements strict hierarchy: State -> District -> Project -> Parcel
 * Provides V2 demo authorities, 8 cadastral parcels across 2 districts,
 * valid spatial polygons, and 3 acquisition cohorts.
 */

export interface V2RoleDefinition {
  id: string;
  name: string;
  description: string;
}

export interface V2UserDefinition {
  name: string;
  email: string;
  role: string;
  dept: string;
  designation: string;
  cadre: string;
  phone: string;
  office: string;
  state: string | null;
  district: string | null;
}

export interface V2ParcelDefinition {
  ulpin: string;
  surveyNumber: string;
  owner: string;
  village: string;
  district: string;
  state: string;
  areaAcres: number;
  landType: 'AGRICULTURAL' | 'COMMERCIAL' | 'INDUSTRIAL' | 'RESIDENTIAL';
  marketRate: number;
  acquisitionStatus: 'PROPOSED' | 'IN_PROGRESS' | 'ACQUIRED' | 'COMPLETED';
  compensationStatus: 'NOT_STARTED' | 'PENDING' | 'DISBURSED';
  possessionStatus: 'NOT_STARTED' | 'PENDING' | 'TAKEN';
  intersectPercent: number;
  polygon: [number, number][]; // [lon, lat] closed coordinates
  assessedComp: number;
  approvedComp: number;
  paidComp: number;
  cohort: string;
}

export const V2_ROLES: V2RoleDefinition[] = [
  { id: "REQUESTING_AUTHORITY", name: "Requesting Authority", description: "Initiates projects" },
  { id: "BOSS", name: "BOSS / Higher Officer", description: "Initializes workflows" },
  { id: "PROCESSING_OFFICER", name: "Processing Officer", description: "Executes stages" },
  { id: "ADMIN", name: "Administrator", description: "System Admin" },
  { id: "NATIONAL_AUTHORITY", name: "National Authority", description: "National Land Acquisition Authority" },
  { id: "STATE_AUTHORITY", name: "State Authority", description: "State Land Revenue Authority" },
  { id: "DISTRICT_AUTHORITY", name: "District Authority", description: "District Collector / Land Acquisition Authority" },
  { id: "COMPENSATION_OFFICER", name: "Compensation Officer", description: "Assesses and disburses statutory land compensation" },
  { id: "POSSESSION_OFFICER", name: "Possession Officer", description: "Enforces physical possession and clearance of acquired land" },
];

export const V2_DEMO_USERS: V2UserDefinition[] = [
  { name: "Alok Shekhar", email: "national@bhoomi.gov.in", role: "NATIONAL_AUTHORITY",
    dept: "National Land Acquisition Authority", designation: "Director General (Land)",
    cadre: "IAS", phone: "+91-11-23019876", office: "NITI Aayog, New Delhi", state: null, district: null },
  { name: "Sunil Deshmukh", email: "state.mh@bhoomi.gov.in", role: "STATE_AUTHORITY",
    dept: "Revenue & Forest Department, Govt of Maharashtra", designation: "Principal Secretary (Revenue)",
    cadre: "IAS", phone: "+91-22-22025111", office: "Mantralaya, Mumbai", state: "Maharashtra", district: null },
  { name: "Dr. Suhas Diwase", email: "district.pune@bhoomi.gov.in", role: "DISTRICT_AUTHORITY",
    dept: "District Collectorate, Pune", designation: "Collector & District Magistrate",
    cadre: "IAS", phone: "+91-20-26123345", office: "Collector Office, Pune", state: "Maharashtra", district: "Pune" },
  { name: "Kishan Jawale", email: "district.raigad@bhoomi.gov.in", role: "DISTRICT_AUTHORITY",
    dept: "District Collectorate, Raigad", designation: "Collector & District Magistrate",
    cadre: "IAS", phone: "+91-2141-222001", office: "Collector Office, Alibag, Raigad", state: "Maharashtra", district: "Raigad" },
  { name: "Mahesh Patil", email: "comp.officer@bhoomi.gov.in", role: "COMPENSATION_OFFICER",
    dept: "Special Land Acquisition Office No. 15", designation: "Competent Authority for Land Acquisition (CALA)",
    cadre: "State Revenue", phone: "+91-20-26124455", office: "CALA Cell, Pune", state: "Maharashtra", district: "Pune" },
  { name: "Vinayak Kulkarni", email: "possession.officer@bhoomi.gov.in", role: "POSSESSION_OFFICER",
    dept: "Revenue & Land Survey Branch", designation: "Special Tehsildar (Possession & Encroachment)",
    cadre: "State Revenue", phone: "+91-20-26125566", office: "Tehsil Office, Haveli, Pune", state: "Maharashtra", district: "Pune" },
];

export const V2_PRIMARY_PROJECT = {
  code: "PRJ-MH-4421",
  title: "Mumbai-Pune Expressway Expansion - Phase 3",
  type: "HIGHWAY_CORRIDOR",
  state: "Maharashtra",
  districts: ["Pune", "Raigad"],
  areaAcres: 500,
  budgetCr: 12500,
  corridorKm: 45.2,
  widthMeters: 60,
  status: "WORKFLOW_ACTIVE",
  ministry: "Ministry of Road Transport & Highways",
  authority: "NHAI",
  purpose: "Public Purpose - Highway Infrastructure",
};

export const V2_PARCELS: V2ParcelDefinition[] = [
  // District North (Pune) — 5 Parcels
  {
    ulpin: "ULPIN-MH-PUN-001",
    surveyNumber: "42/1",
    owner: "Ramesh K. Joshi",
    village: "Lonavala",
    district: "Pune",
    state: "Maharashtra",
    areaAcres: 3.50,
    landType: "AGRICULTURAL",
    marketRate: 1500000,
    acquisitionStatus: "IN_PROGRESS",
    compensationStatus: "PENDING",
    possessionStatus: "NOT_STARTED",
    intersectPercent: 92,
    polygon: [
      [73.4070, 18.7540],
      [73.4095, 18.7540],
      [73.4095, 18.7565],
      [73.4070, 18.7565],
      [73.4070, 18.7540]
    ],
    assessedComp: 5250000,
    approvedComp: 5250000,
    paidComp: 0,
    cohort: "Cohort 1 - Priority Agricultural"
  },
  {
    ulpin: "ULPIN-MH-PUN-002",
    surveyNumber: "42/2",
    owner: "Suresh K. Joshi & Brothers",
    village: "Lonavala",
    district: "Pune",
    state: "Maharashtra",
    areaAcres: 2.80,
    landType: "AGRICULTURAL",
    marketRate: 1500000,
    acquisitionStatus: "IN_PROGRESS",
    compensationStatus: "PENDING",
    possessionStatus: "NOT_STARTED",
    intersectPercent: 88,
    polygon: [
      [73.4110, 18.7570],
      [73.4132, 18.7570],
      [73.4132, 18.7592],
      [73.4110, 18.7592],
      [73.4110, 18.7570]
    ],
    assessedComp: 4200000,
    approvedComp: 4200000,
    paidComp: 0,
    cohort: "Cohort 1 - Priority Agricultural"
  },
  {
    ulpin: "ULPIN-MH-PUN-003",
    surveyNumber: "43/1",
    owner: "Khandala Resorts Pvt Ltd",
    village: "Khandala",
    district: "Pune",
    state: "Maharashtra",
    areaAcres: 4.10,
    landType: "COMMERCIAL",
    marketRate: 2800000,
    acquisitionStatus: "IN_PROGRESS",
    compensationStatus: "PENDING",
    possessionStatus: "NOT_STARTED",
    intersectPercent: 75,
    polygon: [
      [73.4140, 18.7600],
      [73.4170, 18.7600],
      [73.4170, 18.7630],
      [73.4140, 18.7630],
      [73.4140, 18.7600]
    ],
    assessedComp: 11480000,
    approvedComp: 11480000,
    paidComp: 0,
    cohort: "Cohort 2 - Commercial & Industrial"
  },
  {
    ulpin: "ULPIN-MH-PUN-004",
    surveyNumber: "44/1",
    owner: "Babanrao Patil",
    village: "Khandala",
    district: "Pune",
    state: "Maharashtra",
    areaAcres: 1.90,
    landType: "AGRICULTURAL",
    marketRate: 1600000,
    acquisitionStatus: "PROPOSED",
    compensationStatus: "NOT_STARTED",
    possessionStatus: "NOT_STARTED",
    intersectPercent: 82,
    polygon: [
      [73.4175, 18.7640],
      [73.4195, 18.7640],
      [73.4195, 18.7660],
      [73.4175, 18.7660],
      [73.4175, 18.7640]
    ],
    assessedComp: 3040000,
    approvedComp: 0,
    paidComp: 0,
    cohort: "Cohort 1 - Priority Agricultural"
  },
  {
    ulpin: "ULPIN-MH-PUN-005",
    surveyNumber: "45/1",
    owner: "Western Express Logistics Hub",
    village: "Khandala",
    district: "Pune",
    state: "Maharashtra",
    areaAcres: 5.20,
    landType: "INDUSTRIAL",
    marketRate: 2400000,
    acquisitionStatus: "PROPOSED",
    compensationStatus: "NOT_STARTED",
    possessionStatus: "NOT_STARTED",
    intersectPercent: 95,
    polygon: [
      [73.4210, 18.7675],
      [73.4245, 18.7675],
      [73.4245, 18.7710],
      [73.4210, 18.7710],
      [73.4210, 18.7675]
    ],
    assessedComp: 12480000,
    approvedComp: 0,
    paidComp: 0,
    cohort: "Cohort 2 - Commercial & Industrial"
  },
  // District South (Raigad) — 3 Parcels
  {
    ulpin: "ULPIN-MH-RAI-001",
    surveyNumber: "88/1",
    owner: "Dattatray G. Mhatre",
    village: "Khalapur",
    district: "Raigad",
    state: "Maharashtra",
    areaAcres: 6.00,
    landType: "AGRICULTURAL",
    marketRate: 1400000,
    acquisitionStatus: "IN_PROGRESS",
    compensationStatus: "PENDING",
    possessionStatus: "NOT_STARTED",
    intersectPercent: 90,
    polygon: [
      [73.2785, 18.8235],
      [73.2825, 18.8235],
      [73.2825, 18.8270],
      [73.2785, 18.8270],
      [73.2785, 18.8235]
    ],
    assessedComp: 8400000,
    approvedComp: 8400000,
    paidComp: 0,
    cohort: "Cohort 3 - Raigad Southern Segment"
  },
  {
    ulpin: "ULPIN-MH-RAI-002",
    surveyNumber: "88/2",
    owner: "Anant N. Gaikwad",
    village: "Khalapur",
    district: "Raigad",
    state: "Maharashtra",
    areaAcres: 3.40,
    landType: "AGRICULTURAL",
    marketRate: 1400000,
    acquisitionStatus: "PROPOSED",
    compensationStatus: "NOT_STARTED",
    possessionStatus: "NOT_STARTED",
    intersectPercent: 85,
    polygon: [
      [73.2825, 18.8270],
      [73.2855, 18.8270],
      [73.2855, 18.8305],
      [73.2825, 18.8305],
      [73.2825, 18.8270]
    ],
    assessedComp: 4760000,
    approvedComp: 0,
    paidComp: 0,
    cohort: "Cohort 3 - Raigad Southern Segment"
  },
  {
    ulpin: "ULPIN-MH-RAI-003",
    surveyNumber: "89/1",
    owner: "Khalapur Agro-Commercial Traders",
    village: "Khalapur",
    district: "Raigad",
    state: "Maharashtra",
    areaAcres: 2.50,
    landType: "COMMERCIAL",
    marketRate: 2600000,
    acquisitionStatus: "PROPOSED",
    compensationStatus: "NOT_STARTED",
    possessionStatus: "NOT_STARTED",
    intersectPercent: 78,
    polygon: [
      [73.2870, 18.8305],
      [73.2905, 18.8305],
      [73.2905, 18.8338],
      [73.2870, 18.8338],
      [73.2870, 18.8305]
    ],
    assessedComp: 6500000,
    approvedComp: 0,
    paidComp: 0,
    cohort: "Cohort 3 - Raigad Southern Segment"
  },
];

/**
 * Validates GeoJSON Polygon coordinates:
 * - Must have at least 4 coordinate pairs (first and last must be identical)
 * - Valid geographic coordinates (lon between -180 and 180, lat between -90 and 90)
 */
export const isValidClosedPolygon = (coords: [number, number][]): boolean => {
  if (!Array.isArray(coords) || coords.length < 4) return false;
  const first = coords[0];
  const last = coords[coords.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) return false;

  for (const pt of coords) {
    if (typeof pt[0] !== 'number' || typeof pt[1] !== 'number') return false;
    if (pt[0] < -180 || pt[0] > 180) return false;
    if (pt[1] < -90 || pt[1] > 90) return false;
  }

  return true;
};

/**
 * Validates hierarchical integrity:
 * State -> District -> Project -> Parcel
 */
export const validateSeedHierarchy = (
  parcel: V2ParcelDefinition,
  project: typeof V2_PRIMARY_PROJECT
): boolean => {
  // 1. Parcel state must match project state
  if (parcel.state !== project.state) return false;

  // 2. Parcel district must be one of project's districts
  if (!project.districts.includes(parcel.district)) return false;

  // 3. Must have valid ULPIN and survey number
  if (!parcel.ulpin || !parcel.surveyNumber) return false;

  // 4. Must have positive area
  if (parcel.areaAcres <= 0) return false;

  // 5. Must have closed polygon
  return isValidClosedPolygon(parcel.polygon);
};
