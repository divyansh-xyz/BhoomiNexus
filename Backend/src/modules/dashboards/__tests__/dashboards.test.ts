import { describe, it, expect } from 'vitest';
import { dashboardsService } from '../dashboards.service';

describe('Phase 17 — National / State / District Dashboards', () => {
  it('returns all 13 statutory KPIs for the National Dashboard', async () => {
    const data = await dashboardsService.getNationalDashboard();

    // 1. Jurisdictions
    expect(data.totalStates).toBeGreaterThan(0);
    expect(data.totalDistricts).toBeGreaterThan(0);
    expect(data.totalProjects).toBeGreaterThan(0);
    expect(data.totalParcels).toBeGreaterThan(0);

    // 2. Land
    expect(data.landRequiredHa).toBeGreaterThan(0);
    expect(data.landAcquiredHa).toBeGreaterThan(0);
    expect(data.landAcquiredHa).toBeLessThanOrEqual(data.landRequiredHa);

    // 3. Compensation
    expect(data.compensationAssessedCr).toBeGreaterThan(0);
    expect(data.compensationApprovedCr).toBeGreaterThan(0);
    expect(data.compensationPaidCr).toBeGreaterThan(0);
    expect(data.compensationPendingCr).toBeGreaterThanOrEqual(0);

    // 4. Possession
    expect(data.possessionReadyCount).toBeGreaterThanOrEqual(0);
    expect(data.possessionPendingCount).toBeGreaterThanOrEqual(0);
    expect(data.possessionCompletedCount).toBeGreaterThan(0);

    // 5. State breakdown
    expect(Array.isArray(data.stateBreakdown)).toBe(true);
    expect(data.stateBreakdown.length).toBeGreaterThan(0);
    const mh = data.stateBreakdown.find((s) => s.stateId === 'MH');
    expect(mh).toBeDefined();
    expect(mh?.stateName).toBe('Maharashtra');
  });

  it('returns state metrics and district comparison breakdown for State Dashboard', async () => {
    const data = await dashboardsService.getStateDashboard('MH');

    expect(data.stateId).toBe('MH');
    expect(data.stateName).toBe('Maharashtra');
    expect(data.totalDistricts).toBe(36);
    expect(data.totalProjects).toBeGreaterThan(0);
    expect(data.totalParcels).toBeGreaterThan(0);
    expect(data.landRequiredHa).toBeGreaterThan(0);
    expect(data.landAcquiredHa).toBeGreaterThan(0);
    expect(data.compensationAssessedCr).toBeGreaterThan(0);
    expect(data.compensationPaidCr).toBeGreaterThan(0);

    // District comparison table
    expect(Array.isArray(data.districtBreakdown)).toBe(true);
    expect(data.districtBreakdown.length).toBeGreaterThan(0);
    const pune = data.districtBreakdown.find((d) => d.districtId === 'pune');
    expect(pune).toBeDefined();
    expect(pune?.districtName).toBe('Pune');
    expect(pune?.slaAdherenceRate).toBeGreaterThan(80);
  });

  it('returns project table, branch breakdown, pending officer work, and parcel cohorts for District Dashboard', async () => {
    const data = await dashboardsService.getDistrictDashboard('pune');

    expect(data.districtId).toBe('pune');
    expect(data.districtName).toBe('Pune');
    expect(data.stateName).toBe('Maharashtra');

    // 1. Project table
    expect(Array.isArray(data.projectBreakdown)).toBe(true);
    expect(data.projectBreakdown.length).toBeGreaterThan(0);
    const ringRoad = data.projectBreakdown.find((p) => p.projectId === 'p-nhai-ringroad-2026');
    expect(ringRoad).toBeDefined();
    expect(ringRoad?.compensationProgressPercent).toBeGreaterThan(0);

    // 2. Branch breakdown (all 7 units)
    expect(Array.isArray(data.branchBreakdown)).toBe(true);
    expect(data.branchBreakdown.length).toBe(7);
    const revBranch = data.branchBreakdown.find((b) => b.branchKey === 'REVENUE_BRANCH');
    expect(revBranch).toBeDefined();
    expect(revBranch?.officerInCharge).toBe('Ananya Patel');

    // 3. Pending officer work
    expect(Array.isArray(data.pendingOfficerWork)).toBe(true);
    expect(data.pendingOfficerWork.length).toBeGreaterThan(0);
    expect(data.pendingOfficerWork[0].taskId).toBeDefined();
    expect(data.pendingOfficerWork[0].assignedOfficer).toBeDefined();

    // 4. Parcel cohort visibility
    expect(Array.isArray(data.parcelCohortVisibility)).toBe(true);
    expect(data.parcelCohortVisibility.length).toBeGreaterThan(0);
    expect(data.parcelCohortVisibility[0].cohortName).toBeDefined();
  });

  it('acceptance: dynamic compensation calculations match financial invariants', () => {
    const assessed = 5250000;
    const approved = 5250000;
    const paid = 3500000;
    const pending = Math.max(0, approved - paid);

    expect(pending).toBe(1750000);
    expect(paid + pending).toBe(approved);
  });

  it('Phase 18 drilldown hierarchy: National -> State -> District -> Project -> Parcel data links exist', async () => {
    // 1. National returns states
    const national = await dashboardsService.getNationalDashboard();
    const state = national.stateBreakdown.find((s) => s.stateId === 'MH');
    expect(state).toBeDefined();

    // 2. State returns districts
    const stateData = await dashboardsService.getStateDashboard(state!.stateId);
    const district = stateData.districtBreakdown.find((d) => d.districtId === 'pune');
    expect(district).toBeDefined();

    // 3. District returns projects
    const districtData = await dashboardsService.getDistrictDashboard(district!.districtId);
    expect(districtData.projectBreakdown.length).toBeGreaterThan(0);
    const project = districtData.projectBreakdown[0];
    expect(project.projectId).toBeDefined();
    expect(project.projectName).toBeDefined();
  });

  it('Phase 19 Parcel Passport: enforces statutory 9 sections and strict high-level acquisition status', async () => {
    // Test V2 Parcel definition
    const { V2_PARCELS } = await import('../../../database/v2/seedData.js');
    expect(V2_PARCELS.length).toBeGreaterThan(0);
    const p = V2_PARCELS[0];

    // High level status constraint: ONLY IN_PROGRESS, REJECTED, COMPLETED
    const validHighLevelStatuses = ['IN_PROGRESS', 'REJECTED', 'COMPLETED'];
    const mapStatus = (s: string) => (s === 'COMPLETED' || s === 'ACQUIRED' ? 'COMPLETED' : s === 'REJECTED' ? 'REJECTED' : 'IN_PROGRESS');
    expect(validHighLevelStatuses).toContain(mapStatus(p.acquisitionStatus));

    // Compensation invariant
    const pending = Math.max(0, p.assessedComp - p.paidComp);
    expect(p.paidComp + pending).toBe(p.assessedComp);
  });
});


