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

  // Development role switcher (Implementation Plan.md Section 79)
  const switchRole = useCallback((newRole: UserRole) => {
    setUser((prevUser) => {
      if (!prevUser) return null;
      const updatedUser: User = {
        ...prevUser,
        role: newRole,
        department:
          newRole === 'BOSS'
            ? 'National Land Acquisition Authority'
            : newRole === 'REQUESTING_AUTHORITY'
            ? 'Ministry of Road Transport & Highways'
            : newRole === 'PROCESSING_OFFICER'
            ? 'Revenue & Land Records Branch'
            : 'NIC System Administration',
        designation:
          newRole === 'BOSS'
            ? 'Bureau Officer & Section Supervisor'
            : newRole === 'REQUESTING_AUTHORITY'
            ? 'Executive Engineer / Project Proponent'
            : newRole === 'PROCESSING_OFFICER'
            ? 'Processing & Field Officer'
            : 'System Administrator',
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
