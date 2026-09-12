/**
 * ============================================================
 * V2 Authentication & Authorization Types (Phase 2 Roles & Scope)
 * Strictly adheres to:
 * 1. Phase Implementation.md (Section 5: Phase 2 — V2 Roles and Authorization)
 * 2. V2 API Endpoints and Behaviour.md (Authentication & Global Behaviour Rules)
 * ============================================================
 */

/**
 * 9 Institutional V2 Roles + Citizen
 */
export type UserRole =
  | 'NATIONAL_AUTHORITY'
  | 'STATE_AUTHORITY'
  | 'DISTRICT_AUTHORITY'
  | 'REQUESTING_AUTHORITY'
  | 'BOSS'
  | 'PROCESSING_OFFICER'
  | 'COMPENSATION_OFFICER'
  | 'POSSESSION_OFFICER'
  | 'ADMIN'
  | 'CITIZEN';

/**
 * Administrative Scope Levels
 */
export type ScopeLevel = 'NATIONAL' | 'STATE' | 'DISTRICT' | 'PROJECT' | 'TASK';

/**
 * Jurisdictional Scope Envelope returned by GET /api/v1/auth/me
 */
export interface AdministrativeScope {
  level: ScopeLevel;
  state?: string;
  stateId?: string;
  district?: string;
  districtId?: string;
  authority?: string;
  department?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  designation?: string;
  cadre?: string;
  authority?: string;
  state?: string;
  stateId?: string;
  district?: string;
  districtId?: string;
  phone?: string;
  officeLocation?: string;
  avatarUrl?: string;
  permissions?: string[];
  administrativeScope?: AdministrativeScope;
}

export interface AuthSession {
  user: User;
  token: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string, role?: UserRole) => Promise<void>;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
}
