import React, { useState, useEffect, useCallback } from 'react';
import type { User, UserRole, AuthContextType } from '../../types/auth.types';
import { authService } from '../../services/api/auth.service';
import { AuthContext } from './AuthContext';

// Removed DEFAULT_PROTOTYPE_USER mock for Phase 2 integration

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      // If user explicitly signed out in this session, respect it
      if (sessionStorage.getItem('bhoomi_explicit_logout') === 'true') {
        return null;
      }

      const token = localStorage.getItem('bhoomi_auth_token');
      const stored = localStorage.getItem('bhoomi_user');
      if (token && stored) {
        return JSON.parse(stored);
      }

      return null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // Listen for unauthorized 401 events from the API client
    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener('bhoomi:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('bhoomi:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = useCallback(async (email: string, password?: string, role?: UserRole) => {
    setIsLoading(true);
    sessionStorage.removeItem('bhoomi_explicit_logout');
    try {
      const response = await authService.login({ email, password, role });
      localStorage.setItem('bhoomi_auth_token', response.token);
      localStorage.setItem('bhoomi_user', JSON.stringify(response.user));
      setUser(response.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    sessionStorage.setItem('bhoomi_explicit_logout', 'true');
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('bhoomi_auth_token');
      localStorage.removeItem('bhoomi_user');
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  // Development role switcher (Phase 2 & Implementation Plan V2)
  const switchRole = useCallback((newRole: UserRole) => {
    setUser((prevUser) => {
      if (!prevUser) return null;

      let department = 'Ministry of Rural Development';
      let designation = 'Government Officer';
      let state = prevUser.state || 'Uttar Pradesh';
      let district = prevUser.district || 'Agra';
      let authority = prevUser.authority || 'BhoomiNexus Authority';
      let level: 'NATIONAL' | 'STATE' | 'DISTRICT' | 'PROJECT' | 'TASK' = 'TASK';

      switch (newRole) {
        case 'NATIONAL_AUTHORITY':
          department = 'Department of Land Resources (DoLR)';
          designation = 'Joint Secretary & National Director';
          authority = 'National Land Acquisition Authority';
          level = 'NATIONAL';
          state = 'National';
          district = 'All Districts';
          break;
        case 'STATE_AUTHORITY':
          department = 'Revenue & Land Reforms Department';
          designation = 'Principal Secretary (Revenue)';
          authority = 'State Land Acquisition Directorate';
          level = 'STATE';
          state = 'Uttar Pradesh';
          district = 'All UP Districts';
          break;
        case 'DISTRICT_AUTHORITY':
          department = 'District Collectorate';
          designation = 'District Magistrate / Collector';
          authority = 'District Land Acquisition Office';
          level = 'DISTRICT';
          state = 'Uttar Pradesh';
          district = 'Agra';
          break;
        case 'COMPENSATION_OFFICER':
          department = 'Special Land Acquisition Office (SLAO)';
          designation = 'Special Land Acquisition Officer (Valuation & Awards)';
          authority = 'District Administration';
          level = 'TASK';
          state = 'Uttar Pradesh';
          district = 'Agra';
          break;
        case 'POSSESSION_OFFICER':
          department = 'Tehsil Land Records & Demarcation Branch';
          designation = 'Tehsildar & Possession Magistrate';
          authority = 'Sub-Divisional Administration';
          level = 'TASK';
          state = 'Uttar Pradesh';
          district = 'Agra';
          break;
        case 'BOSS':
          department = 'National Land Acquisition Authority';
          designation = 'Bureau Officer & Section Supervisor';
          authority = 'Bureau of Statutory Scrutiny (BOSS)';
          level = 'PROJECT';
          break;
        case 'REQUESTING_AUTHORITY':
          department = 'Ministry of Road Transport & Highways (MoRTH)';
          designation = 'Chief Project Director / Proponent';
          authority = 'National Highways Authority of India (NHAI)';
          level = 'PROJECT';
          break;
        case 'PROCESSING_OFFICER':
          department = 'Revenue & Land Records Branch';
          designation = 'Processing & Field Officer';
          authority = 'District Administration';
          level = 'TASK';
          state = 'Uttar Pradesh';
          district = 'Agra';
          break;
        case 'ADMIN':
          department = 'National Informatics Centre (NIC)';
          designation = 'System Administrator';
          authority = 'MoRD System Directorate';
          level = 'NATIONAL';
          break;
      }

      const updatedUser: User = {
        ...prevUser,
        role: newRole,
        department,
        designation,
        authority,
        state,
        district,
        administrativeScope: {
          level,
          state,
          district,
          authority,
          department,
        },
      };
      localStorage.setItem('bhoomi_user', JSON.stringify(updatedUser));
      return updatedUser;
    });
  }, []);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    switchRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
