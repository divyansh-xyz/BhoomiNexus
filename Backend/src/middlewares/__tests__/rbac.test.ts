import { describe, it, expect, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import {
  authorize,
  authorizeScope,
  validateJurisdiction,
  canAccessParcel,
} from '../rbac.middleware';
import { ApiError } from '../../utils/apiError';

describe('Phase 2 RBAC & Scope Authorization Policies', () => {
  const mockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res;
  };

  describe('authorizeScope Middleware', () => {
    it('allows NATIONAL authority to access STATE level route', () => {
      const req = {
        user: { id: 'u1', role: 'NATIONAL_AUTHORITY', scope: 'NATIONAL' },
        params: {},
        query: {},
      } as unknown as Request;
      const res = mockResponse();
      const next = vi.fn() as NextFunction;

      const middleware = authorizeScope('STATE');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('rejects DISTRICT authority accessing STATE level route', () => {
      const req = {
        user: { id: 'u2', role: 'DISTRICT_AUTHORITY', scope: 'DISTRICT', district: 'Pune', state: 'Maharashtra' },
        params: {},
        query: {},
      } as unknown as Request;
      const res = mockResponse();
      const next = vi.fn() as NextFunction;

      const middleware = authorizeScope('STATE');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      const err = (next as any).mock.calls[0][0] as ApiError;
      expect(err.statusCode).toBe(403);
    });

    it('allows STATE authority to access their own state records', () => {
      const req = {
        user: { id: 'u3', role: 'STATE_AUTHORITY', scope: 'STATE', state: 'Maharashtra' },
        params: { state: 'Maharashtra' },
        query: {},
      } as unknown as Request;
      const res = mockResponse();
      const next = vi.fn() as NextFunction;

      const middleware = authorizeScope('STATE');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('prevents STATE authority from retrieving another state records', () => {
      const req = {
        user: { id: 'u3', role: 'STATE_AUTHORITY', scope: 'STATE', state: 'Maharashtra' },
        params: { state: 'Gujarat' },
        query: {},
      } as unknown as Request;
      const res = mockResponse();
      const next = vi.fn() as NextFunction;

      const middleware = authorizeScope('STATE');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      const err = (next as any).mock.calls[0][0] as ApiError;
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain("Cannot access records outside state 'Maharashtra'");
    });

    it('prevents DISTRICT authority from retrieving another district records', () => {
      const req = {
        user: { id: 'u4', role: 'DISTRICT_AUTHORITY', scope: 'DISTRICT', state: 'Maharashtra', district: 'Pune' },
        params: { state: 'Maharashtra', district: 'Nagpur' },
        query: {},
      } as unknown as Request;
      const res = mockResponse();
      const next = vi.fn() as NextFunction;

      const middleware = authorizeScope('DISTRICT');
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
      const err = (next as any).mock.calls[0][0] as ApiError;
      expect(err.statusCode).toBe(403);
      expect(err.message).toContain("Cannot access records outside district 'Pune'");
    });
  });

  describe('validateJurisdiction helper', () => {
    it('returns true for Admin everywhere', () => {
      expect(validateJurisdiction({ role: 'ADMIN' }, { state: 'Any', district: 'Any' })).toBe(true);
    });

    it('returns true for National authority everywhere', () => {
      expect(validateJurisdiction({ role: 'NATIONAL_AUTHORITY', scope: 'NATIONAL' }, { state: 'Karnataka' })).toBe(true);
    });

    it('restricts State authority strictly to their state', () => {
      const user = { role: 'STATE_AUTHORITY', scope: 'STATE' as const, state: 'Maharashtra' };
      expect(validateJurisdiction(user, { state: 'Maharashtra' })).toBe(true);
      expect(validateJurisdiction(user, { state: 'Gujarat' })).toBe(false);
    });

    it('restricts District authority strictly to their district and state', () => {
      const user = { role: 'DISTRICT_AUTHORITY', scope: 'DISTRICT' as const, state: 'Maharashtra', district: 'Pune' };
      expect(validateJurisdiction(user, { state: 'Maharashtra', district: 'Pune' })).toBe(true);
      expect(validateJurisdiction(user, { state: 'Maharashtra', district: 'Thane' })).toBe(false);
      expect(validateJurisdiction(user, { state: 'Karnataka', district: 'Pune' })).toBe(false);
    });
  });

  describe('Operational Officer Parcel Access (canAccessParcel)', () => {
    it('allows compensation officer to access assigned parcel', () => {
      const officer = {
        id: 'officer-comp-1',
        role: 'COMPENSATION_OFFICER',
        scope: 'TASK' as const,
        state: 'Maharashtra',
        district: 'Pune',
      };
      const parcel = {
        state: 'Maharashtra',
        district: 'Pune',
        assignedOfficerId: 'officer-comp-1',
      };
      expect(canAccessParcel(officer, parcel)).toBe(true);
    });

    it('prevents operational officers from browsing unrelated/unassigned parcels', () => {
      const officer = {
        id: 'officer-comp-1',
        role: 'COMPENSATION_OFFICER',
        scope: 'TASK' as const,
        state: 'Maharashtra',
        district: 'Pune',
      };
      const unassignedParcel = {
        state: 'Maharashtra',
        district: 'Pune',
        assignedOfficerId: 'other-officer-99',
      };
      expect(canAccessParcel(officer, unassignedParcel)).toBe(false);
    });

    it('allows district authority to view all parcels within their district', () => {
      const districtAdmin = {
        id: 'da-1',
        role: 'DISTRICT_AUTHORITY',
        scope: 'DISTRICT' as const,
        state: 'Maharashtra',
        district: 'Pune',
      };
      const parcel = {
        state: 'Maharashtra',
        district: 'Pune',
        assignedOfficerId: 'other-officer-99',
      };
      expect(canAccessParcel(districtAdmin, parcel)).toBe(true);
    });
  });
});
