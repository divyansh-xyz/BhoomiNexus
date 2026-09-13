import { describe, it, expect } from 'vitest';
import {
  V2_ROLES,
  V2_DEMO_USERS,
  V2_MINIMUM_USERS,
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

describe('Phase 24 — V2 Demo Seed Finalization', () => {
  describe('Minimum Users (Exactly 8 Statutory Roles)', () => {
    it('provides all 8 required demo roles without manual creation', () => {
      const requiredRoles = [
        'REQUESTING_AUTHORITY',
        'BOSS',
        'PROCESSING_OFFICER',
        'COMPENSATION_OFFICER',
        'POSSESSION_OFFICER',
        'NATIONAL_AUTHORITY',
        'STATE_AUTHORITY',
        'DISTRICT_AUTHORITY',
      ];

      expect(V2_MINIMUM_USERS.length).toBe(8);

      for (const role of requiredRoles) {
        const user = V2_MINIMUM_USERS.find(u => u.role === role);
        expect(user).toBeDefined();
        expect(user?.email).toContain('@bhoomi.gov.in');
        expect(user?.designation).toBeTruthy();
        expect(user?.dept).toBeTruthy();
      }
    });

    it('verifies regional scoping is properly assigned', () => {
      const national = V2_MINIMUM_USERS.find(u => u.role === 'NATIONAL_AUTHORITY')!;
      expect(national.state).toBeNull();
      expect(national.district).toBeNull();

      const state = V2_MINIMUM_USERS.find(u => u.role === 'STATE_AUTHORITY')!;
      expect(state.state).toBe('Maharashtra');
      expect(state.district).toBeNull();

      const district = V2_MINIMUM_USERS.find(u => u.role === 'DISTRICT_AUTHORITY')!;
      expect(district.state).toBe('Maharashtra');
      expect(district.district).toBe('Pune');
    });
  });

  describe('Minimum Primary Project', () => {
    it('provides exactly 1 primary demonstration corridor', () => {
      expect(V2_PRIMARY_PROJECT.code).toBe('PRJ-MH-4421');
      expect(V2_PRIMARY_PROJECT.status).toBe('WORKFLOW_ACTIVE');
      expect(V2_PRIMARY_PROJECT.districts).toEqual(['Pune', 'Raigad']);
      expect(V2_PRIMARY_PROJECT.corridorKm).toBe(45.2);
    });
  });

  describe('Small Parcel Set Demonstrating All Statutory Conditions', () => {
    it('uses a compact footprint of exactly 8 parcels without national bloat', () => {
      expect(V2_PARCELS.length).toBe(8);
    });

    it('demonstrates 2–3 Acquisition cohorts', () => {
      const cohorts = Array.from(new Set(V2_PARCELS.map(p => p.cohort)));
      expect(cohorts.length).toBe(3);
      expect(cohorts).toContain('Cohort 1 - Priority Agricultural');
      expect(cohorts).toContain('Cohort 2 - Commercial & Industrial');
      expect(cohorts).toContain('Cohort 3 - Raigad Southern Segment');
    });

    it('demonstrates Compensation Pending', () => {
      const compPendingParcel = V2_PARCELS.find(
        p => p.compensationStatus === 'PENDING' && p.paidComp === 0 && p.approvedComp > 0
      );
      expect(compPendingParcel).toBeDefined();
      expect(compPendingParcel?.ulpin).toBe('ULPIN-MH-PUN-001');
      expect(compPendingParcel?.approvedComp).toBe(5250000);
      expect(compPendingParcel?.paidComp).toBe(0);
    });

    it('demonstrates Compensation Paid', () => {
      const compPaidParcel = V2_PARCELS.find(
        p => p.compensationStatus === 'DISBURSED' && p.paidComp > 0 && p.paidComp === p.approvedComp
      );
      expect(compPaidParcel).toBeDefined();
      expect(compPaidParcel?.ulpin).toBe('ULPIN-MH-PUN-002');
      expect(compPaidParcel?.paidComp).toBe(4200000);
      expect(compPaidParcel?.approvedComp).toBe(4200000);
    });

    it('demonstrates Possession Pending', () => {
      const possPendingParcel = V2_PARCELS.find(p => p.possessionStatus === 'PENDING');
      expect(possPendingParcel).toBeDefined();
      expect(possPendingParcel?.ulpin).toBe('ULPIN-MH-PUN-001');
    });

    it('demonstrates Possession Completed', () => {
      const possTakenParcel = V2_PARCELS.find(
        p => p.possessionStatus === 'TAKEN' && p.acquisitionStatus === 'ACQUIRED'
      );
      expect(possTakenParcel).toBeDefined();
      expect(possTakenParcel?.ulpin).toBe('ULPIN-MH-PUN-002');
    });

    it('demonstrates Disputed parcel with court reference', () => {
      const disputedParcel = V2_PARCELS.find(p => p.disputed === true);
      expect(disputedParcel).toBeDefined();
      expect(disputedParcel?.ulpin).toBe('ULPIN-MH-PUN-003');
      expect(disputedParcel?.disputeReason).toContain('Special Civil Suit');
    });

    it('Acceptance Rule: Demo can be completed quickly without manual database editing', () => {
      // Invariant checks across all 8 parcels
      for (const p of V2_PARCELS) {
        expect(p.areaAcres).toBeGreaterThan(0);
        expect(p.marketRate).toBeGreaterThan(0);
        expect(p.polygon.length).toBeGreaterThanOrEqual(4);

        const pendingComp = Math.max(0, p.approvedComp - p.paidComp);
        expect(p.paidComp + pendingComp).toBe(p.approvedComp);

        // Disputed parcels must have reason
        if (p.disputed) {
          expect(p.disputeReason).toBeTruthy();
        }
      }
    });
  });
});

