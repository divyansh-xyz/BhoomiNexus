import { describe, it, expect } from 'vitest';
import {
  V2_ROLES,
  V2_DEMO_USERS,
  V2_PRIMARY_PROJECT,
  V2_PARCELS,
  isValidClosedPolygon,
  validateSeedHierarchy,
} from '../v2/seedData';

describe('Phase 3 — Minimal Seed Geography and Demo Dataset', () => {
  describe('Seed Hierarchy (State -> District -> Project -> Parcel)', () => {
    it('primary project spans designated State and Districts', () => {
      expect(V2_PRIMARY_PROJECT.state).toBe('Maharashtra');
      expect(V2_PRIMARY_PROJECT.districts).toContain('Pune');
      expect(V2_PRIMARY_PROJECT.districts).toContain('Raigad');
    });

    it('every parcel satisfies strict hierarchical membership under project', () => {
      expect(V2_PARCELS.length).toBe(8);
      for (const parcel of V2_PARCELS) {
        expect(validateSeedHierarchy(parcel, V2_PRIMARY_PROJECT)).toBe(true);
        expect(parcel.state).toBe('Maharashtra');
        expect(['Pune', 'Raigad']).toContain(parcel.district);
      }
    });

    it('enforces conceptual distribution: 5 parcels in District North (Pune), 3 in District South (Raigad)', () => {
      const puneParcels = V2_PARCELS.filter(p => p.district === 'Pune');
      const raigadParcels = V2_PARCELS.filter(p => p.district === 'Raigad');

      expect(puneParcels.length).toBe(5);
      expect(raigadParcels.length).toBe(3);
    });
  });

  describe('Cadastral & Spatial Polygon Geometry', () => {
    it('every parcel has a valid closed polygon geometry', () => {
      for (const parcel of V2_PARCELS) {
        expect(isValidClosedPolygon(parcel.polygon)).toBe(true);
        // Closed coordinate check: start equals end
        const first = parcel.polygon[0];
        const last = parcel.polygon[parcel.polygon.length - 1];
        expect(first[0]).toBe(last[0]);
        expect(first[1]).toBe(last[1]);
      }
    });

    it('every parcel has required cadastral metadata attributes', () => {
      for (const parcel of V2_PARCELS) {
        expect(parcel.ulpin).toMatch(/^ULPIN-MH-(PUN|RAI)-\d{3}$/);
        expect(parcel.surveyNumber).toBeTruthy();
        expect(parcel.village).toBeTruthy();
        expect(parcel.areaAcres).toBeGreaterThan(0);
        expect(parcel.marketRate).toBeGreaterThan(0);
        expect(['AGRICULTURAL', 'COMMERCIAL', 'INDUSTRIAL', 'RESIDENTIAL']).toContain(parcel.landType);
      }
    });
  });

  describe('Demo Acquisition Cohorts', () => {
    it('parcels are partitioned into 2-3 coherent acquisition cohorts', () => {
      const cohorts = new Set(V2_PARCELS.map(p => p.cohort));
      expect(cohorts.size).toBe(3);
      expect(cohorts).toContain('Cohort 1 - Priority Agricultural');
      expect(cohorts).toContain('Cohort 2 - Commercial & Industrial');
      expect(cohorts).toContain('Cohort 3 - Raigad Southern Segment');
    });

    it('compensation values are mathematically consistent', () => {
      for (const parcel of V2_PARCELS) {
        if (parcel.assessedComp > 0) {
          expect(parcel.approvedComp).toBeLessThanOrEqual(parcel.assessedComp);
          expect(parcel.paidComp).toBeLessThanOrEqual(parcel.approvedComp);
          const pending = parcel.approvedComp - parcel.paidComp;
          expect(pending).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('V2 Demo Roles & Authority Accounts', () => {
    it('includes all V2 authority roles', () => {
      const roleIds = V2_ROLES.map(r => r.id);
      expect(roleIds).toContain('NATIONAL_AUTHORITY');
      expect(roleIds).toContain('STATE_AUTHORITY');
      expect(roleIds).toContain('DISTRICT_AUTHORITY');
      expect(roleIds).toContain('COMPENSATION_OFFICER');
      expect(roleIds).toContain('POSSESSION_OFFICER');
    });

    it('configures demo officers with proper geographic scope bindings', () => {
      const nationalUser = V2_DEMO_USERS.find(u => u.role === 'NATIONAL_AUTHORITY');
      expect(nationalUser?.email).toBe('national@bhoomi.gov.in');
      expect(nationalUser?.state).toBeNull();

      const stateUser = V2_DEMO_USERS.find(u => u.role === 'STATE_AUTHORITY');
      expect(stateUser?.email).toBe('state.mh@bhoomi.gov.in');
      expect(stateUser?.state).toBe('Maharashtra');

      const districtUser = V2_DEMO_USERS.find(u => u.role === 'DISTRICT_AUTHORITY' && u.district === 'Pune');
      expect(districtUser?.email).toBe('district.pune@bhoomi.gov.in');
      expect(districtUser?.state).toBe('Maharashtra');
      expect(districtUser?.district).toBe('Pune');

      const compOfficer = V2_DEMO_USERS.find(u => u.role === 'COMPENSATION_OFFICER');
      expect(compOfficer?.email).toBe('comp.officer@bhoomi.gov.in');
      expect(compOfficer?.district).toBe('Pune');

      const possOfficer = V2_DEMO_USERS.find(u => u.role === 'POSSESSION_OFFICER');
      expect(possOfficer?.email).toBe('possession.officer@bhoomi.gov.in');
      expect(possOfficer?.district).toBe('Pune');
    });
  });
});
