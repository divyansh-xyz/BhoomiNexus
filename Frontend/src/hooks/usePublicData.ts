import { useQuery, useMutation } from '@tanstack/react-query';
import publicService, {
  type PublicInquiryPayload,
  type NationalOverviewAPIResponse,
  type StateOverviewAPIResponse,
  type PublicProjectAPIResponse,
} from '../services/api/public.service';

/**
 * Hook for Section 6.1: GET /api/v1/public/overview
 * National KPI overview metrics.
 */
export const useNationalOverview = () => {
  return useQuery<NationalOverviewAPIResponse>({
    queryKey: ['public', 'overview'],
    queryFn: () => publicService.getNationalOverview(),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook for Section 6.2: GET /api/v1/public/states
 * All states summary.
 */
export const usePublicStates = () => {
  return useQuery({
    queryKey: ['public', 'states'],
    queryFn: () => publicService.getPublicStates(),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook for Section 6.3: GET /api/v1/public/states/:stateId
 * Aggregate metrics for state inspector panel.
 */
export const usePublicStateOverview = (
  stateId: string | null | undefined,
  stateNameHint?: string
) => {
  return useQuery<StateOverviewAPIResponse | null>({
    queryKey: ['public', 'state', stateId],
    queryFn: () =>
      stateId ? publicService.getStateOverview(stateId, stateNameHint) : null,
    enabled: Boolean(stateId),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook for Section 6.4: GET /api/v1/public/states/:stateId/projects
 * Public-safe infrastructure projects for state inspector.
 */
export const usePublicStateProjects = (
  stateId: string | null | undefined,
  stateNameHint?: string
) => {
  return useQuery<PublicProjectAPIResponse[]>({
    queryKey: ['public', 'state', stateId, 'projects'],
    queryFn: () =>
      stateId ? publicService.getStateProjects(stateId, stateNameHint) : [],
    enabled: Boolean(stateId),
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook for Section 26 / Inquiries: POST /api/v1/public/inquiries
 * Submit statutory inquiry or grievance.
 */
export const useSubmitInquiry = () => {
  return useMutation({
    mutationFn: (payload: PublicInquiryPayload) =>
      publicService.submitInquiry(payload),
  });
};
