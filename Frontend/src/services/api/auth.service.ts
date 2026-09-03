import apiClient from './client';
import type { User, UserRole } from '../../types/auth.types';

export interface LoginRequest {
  email: string;
  password?: string;
  role?: UserRole;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn: number;
}

export const authService = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    try {
      const res = await apiClient.post<LoginResponse>('/auth/login', payload);
      return res.data;
    } catch (error) {
      // In early Phase 0 / development when backend is not yet started,
      // fallback to mock response if in development mode
      if (import.meta.env.DEV) {
        console.warn('[authService] Backend offline or unavailable, generating Phase 0 mock auth response:', error);
        return authService.getMockLogin(payload.email, payload.role);
      }
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.warn('[authService] Logout API request failed:', e);
    } finally {
      localStorage.removeItem('bhoomi_auth_token');
      localStorage.removeItem('bhoomi_user');
    }
  },

  async getMe(): Promise<User> {
    const res = await apiClient.get<User>('/auth/me');
    return res.data;
  },

  getMockLogin(email: string, requestedRole?: UserRole): LoginResponse {
    let role: UserRole = requestedRole || 'REQUESTING_AUTHORITY';
    let name = 'Rajesh Sharma';
    let department = 'Ministry of Road Transport & Highways';
    let designation = 'Executive Engineer / Requesting Authority';

    if (email.includes('boss') || requestedRole === 'BOSS') {
      role = 'BOSS';
      name = 'Dr. Vikramaditya Sen';
      department = 'National Land Acquisition Authority';
      designation = 'Bureau Officer & Section Supervisor (BOSS)';
    } else if (email.includes('officer') || requestedRole === 'PROCESSING_OFFICER') {
      role = 'PROCESSING_OFFICER';
      name = 'Ananya Patel';
      department = 'Revenue & Land Records Branch';
      designation = 'Processing & Field Officer';
    } else if (email.includes('admin') || requestedRole === 'ADMIN') {
      role = 'ADMIN';
      name = 'S. K. Verma';
      department = 'NIC / BhoomiNexus System Administration';
      designation = 'System Administrator';
    } else if (requestedRole === 'CITIZEN') {
      role = 'CITIZEN';
      name = 'Ramesh Kumar';
      department = 'Citizen / Land Owner';
      designation = 'Citizen Portal User';
    }

    const mockUser: User = {
      id: `usr_${Math.random().toString(36).substring(2, 9)}`,
      name,
      email,
      role,
      department,
      designation,
    };

    return {
      user: mockUser,
      token: `mock_jwt_token_${Date.now()}`,
      expiresIn: 3600,
    };
  },
};
