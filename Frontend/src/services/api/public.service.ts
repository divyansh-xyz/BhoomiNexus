import { apiClient } from './client';


/**
 * ============================================================
 * PUBLIC API CONTRACT INTERFACES
 * Strictly derived from API Contract & Ownership Document.md (Section 6)
 * ============================================================
 */

/**
 * Section 6.1: GET /api/v1/public/overview
 */
export interface NationalOverviewAPIResponse {
  totalProjects: number;
  projectsInProgress: number;
  projectsCompleted: number;
  landProposed: number;       // in Hectares
  landAcquired: number;       // in Hectares
  compensationPaid: number;   // in INR
  totalStatesActive?: number;
  areaUnderAcquisitionHa?: number;
  totalPipelineValueCr?: number;
}

/**
 * Section 6.2: GET /api/v1/public/states
 */
export interface PublicStateSummaryAPIResponse {
  stateId: string;
  stateName: string;
  geometry?: any;
  projectCount: number;
}

/**
 * Section 6.3: GET /api/v1/public/states/:stateId
 */
export interface StateOverviewAPIResponse {
  state: string;
  stateCode?: string;
  projectCount: number;
  completedProjects: number;
  activeProjects: number;
  landProposed: number;
  landAcquired: number;
  compensationPaid: number;
  districtsCovered?: number;
  totalParcels?: number;
  highRiskProjects?: number;
}

/**
 * Section 6.4: GET /api/v1/public/states/:stateId/projects
 */
export interface PublicProjectAPIResponse {
  id: string;
  name: string;
  status: 'active' | 'survey' | 'surveying' | 'notification' | 'approved' | 'completed' | string;
  corridorKm?: number;
  parcelsInvolved?: number;
}

/**
 * Section 26 / Public Inquiries: POST /api/v1/public/inquiries
 */
export interface PublicInquiryPayload {
  userType: 'officer' | 'citizen';
  emailOrId: string;
  projectOrKhata: string;
  stateOrDistrict: string;
  inquiryType: string;
}

export interface PublicInquiryAPIResponse {
  success: boolean;
  referenceId: string;
  timestamp: string;
  message: string;
}

/**
 * ============================================================
 * PUBLIC SERVICE IMPLEMENTATION
 * Calls REST APIs defined in API Contract & Ownership Document.md
 * Gracefully provides contractual fallback data when backend is not yet deployed.
 * ============================================================
 */
export const publicService = {
  /**
   * Section 6.1: GET /api/v1/public/overview
   * Returns national aggregate information for the public landing page.
   */
  async getNationalOverview(): Promise<NationalOverviewAPIResponse> {
    const response = await apiClient.get<NationalOverviewAPIResponse>('/public/overview');
    if (
      !response.data ||
      typeof response.data !== 'object' ||
      typeof (response.data as any).projectsInProgress !== 'number'
    ) {
      throw new Error('Invalid overview response from backend');
    }
    return response.data;
  },

  /**
   * Section 6.2: GET /api/v1/public/states
   * Returns all states available on the public map.
   */
  async getPublicStates(): Promise<PublicStateSummaryAPIResponse[]> {
    const response = await apiClient.get<PublicStateSummaryAPIResponse[]>('/public/states');
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid states response from backend');
    }
    return response.data;
  },

  /**
   * Section 6.3: GET /api/v1/public/states/:stateId
   * Returns aggregate data for one state for the public map & state side panel.
   */
  async getStateOverview(stateId: string, _stateNameHint?: string): Promise<StateOverviewAPIResponse> {
    const response = await apiClient.get<StateOverviewAPIResponse>(`/public/states/${stateId}`);
    if (!response.data || typeof response.data !== 'object' || typeof (response.data as any).activeProjects !== 'number') {
      throw new Error('Invalid state overview response from backend');
    }
    return response.data;
  },

  /**
   * Section 6.4: GET /api/v1/public/states/:stateId/projects
   * Returns public-safe project-level information for public state exploration.
   */
  async getStateProjects(stateId: string, _stateNameHint?: string): Promise<PublicProjectAPIResponse[]> {
    const response = await apiClient.get<PublicProjectAPIResponse[]>(`/public/states/${stateId}/projects`);
    if (!Array.isArray(response.data)) {
      throw new Error('Invalid projects response from backend');
    }
    return response.data;
  },

  /**
   * Section 26 / Public Inquiries: POST /api/v1/public/inquiries
   * Submits a public inquiry or grievance into the sovereign audit pipeline.
   */
  async submitInquiry(payload: PublicInquiryPayload): Promise<PublicInquiryAPIResponse> {
    const response = await apiClient.post<PublicInquiryAPIResponse>('/public/inquiries', payload);
    if (!response.data || typeof response.data !== 'object' || !(response.data as any).referenceId) {
      throw new Error('Invalid inquiry response from backend');
    }
    return response.data;
  },
};

export default publicService;
