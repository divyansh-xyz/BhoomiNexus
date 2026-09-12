/**
 * ============================================================
 * Proponent / Requesting Authority Types
 * Defined in Phase 3: Requesting Authority Project Request
 * ============================================================
 */



export type InfrastructureType =
  | 'HIGHWAY_CORRIDOR'
  | 'FREIGHT_CORRIDOR'
  | 'METRO_RAIL'
  | 'RENEWABLE_PARK'
  | 'INDUSTRIAL_CORRIDOR'
  | 'PORT_CONNECTIVITY';

export interface CreateProjectRequestDTO {
  title: string;
  projectType: InfrastructureType;
  proponentAuthority: string;
  ministry: string;
  statutoryPurpose: string;
  rfctlarrSection: string;
  state: string;
  district: string;
  corridorKm: number;
  alignmentWidthMeters: number;
  requestedAreaAcres: number;
  targetCompletionDate: string;
  description: string;
  estimatedBudgetCr: number;
  corridorCoordinates: [number, number][];
  documentIds?: string[];
}

export interface CorridorPreset {
  id: string;
  name: string;
  agency: string;
  type: InfrastructureType;
  state: string;
  district: string;
  rfctlarrSection: string;
  estimatedKm: number;
  suggestedWidthM: number;
  suggestedAcres: number;
  coordinates: [number, number][];
  description: string;
}

export interface ProponentDashboardStats {
  totalRequisitions: number;
  underBossScrutiny: number;
  parcelsDetermined: number;
  draftsCount: number;
}
