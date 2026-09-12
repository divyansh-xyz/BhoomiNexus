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

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export const authService = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const res = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', payload);
    return res.data.data;
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
    const res = await apiClient.get<ApiResponse<{ user: User }>>('/auth/me');
    return res.data.data.user;
  },

  /**
   * Section 7.4: POST /api/v1/auth/refresh
   * Refreshes authentication credentials
   */
  async refresh(): Promise<LoginResponse> {
    const res = await apiClient.post<ApiResponse<LoginResponse>>('/auth/refresh');
    return res.data.data;
  },
};
