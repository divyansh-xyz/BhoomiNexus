import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardV2Service } from '../../services/api/dashboardV2.service';
import type { NationalDashboardData } from '../../types/dashboardV2.types';
import BhoomiLogo from '../../components/common/BhoomiLogo';
import DrilldownBreadcrumb from '../../components/common/DrilldownBreadcrumb';
import './dashboards-v2.css';

export const NationalDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<NationalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'compliance' | 'projects' | 'compensation' | 'parcels'>('compliance');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await dashboardV2Service.getNationalDashboard();
      setData(res);
    } catch (err) {
      console.error('Failed to load national dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  const states = (data?.stateBreakdown || []).filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || s.stateName.toLowerCase().includes(q) || s.stateId.toLowerCase().includes(q);
  }).sort((a, b) => {
    if (sortBy === 'compliance') return b.complianceRate - a.complianceRate;
    if (sortBy === 'projects') return b.activeProjects - a.activeProjects;
    if (sortBy === 'compensation') return b.disbursedCompensationCr - a.disbursedCompensationCr;
    if (sortBy === 'parcels') return b.totalParcels - a.totalParcels;
    return 0;
  });

  return (
    <div className="dash-canvas">
      <div className="dash-container">
        {/* Federal Scope Breadcrumb */}
        <DrilldownBreadcrumb currentLevel="national" />

        {/* Header telemetry row */}
        <div className="dash-header-bar">
          <div>
            <div className="dash-eyebrow">
              <BhoomiLogo size={18} strokeWidth={2.4} />
              <span>Ministry of Rural Development • Department of Land Resources</span>
              <span className="dash-eyebrow-badge">DoLR Federal Command</span>
            </div>
            <h1 className="dash-title">National Land Governance Dashboard</h1>
            <p className="dash-subtitle">
              Sovereign monitoring across 36 States &amp; Union Territories under RFCTLARR Act 2013 with live compensation and possession telemetry.
            </p>
          </div>

          <div className="dash-action-row">
            <button
              type="button"
              className="dash-btn-secondary"
              onClick={() => navigate('/national-dashboard/gis')}
            >
              <span>🗺 GIS Cadastral View</span>
            </button>
            <button
              type="button"
              className="dash-btn-secondary"
              onClick={loadData}
              disabled={loading}
            >
              <span>{loading ? 'Refreshing...' : '↻ Refresh Telemetry'}</span>
            </button>
          </div>
        </div>

        {/* 13 Statutory KPIs — Group 1: Federal Jurisdiction & Scope */}
        <div className="dash-kpi-section">
          <div className="dash-kpi-group-title">
            <span>Jurisdiction &amp; Cadastral Demarcation</span>
          </div>
          <div className="dash-kpi-grid">
            {/* KPI 1: States */}
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">States / UTs</span>
                <span className="dash-card-badge">KPI 1</span>
              </div>
              <div className="dash-card-value">{data?.totalStates ?? 28}</div>
              <div className="dash-card-subtext">Active state directorates</div>
            </div>

            {/* KPI 2: Districts */}
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Revenue Districts</span>
                <span className="dash-card-badge">KPI 2</span>
              </div>
              <div className="dash-card-value">{data?.totalDistricts ?? 785}</div>
              <div className="dash-card-subtext">Collectorates onboarded</div>
            </div>

            {/* KPI 3: Projects */}
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">National Projects</span>
                <span className="dash-card-badge">KPI 3</span>
              </div>
              <div className="dash-card-value" style={{ color: 'var(--dash-signal-blue)' }}>
                {data?.totalProjects?.toLocaleString() ?? '1,420'}
              </div>
              <div className="dash-card-subtext">Corridors &amp; public works</div>
            </div>

            {/* KPI 4: Parcels */}
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Demarcated Parcels</span>
                <span className="dash-card-badge">KPI 4</span>
              </div>
              <div className="dash-card-value">{data?.totalParcels?.toLocaleString() ?? '84,250'}</div>
              <div className="dash-card-subtext">Digitized survey plots</div>
            </div>
          </div>
        </div>

        {/* 13 Statutory KPIs — Group 2: Land Required & Acquired */}
        <div className="dash-kpi-section">
          <div className="dash-kpi-group-title">
            <span>Land Extent Surveillance (Hectares)</span>
          </div>
          <div className="dash-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
            {/* KPI 5: Land Required */}
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Total Land Required</span>
                <span className="dash-card-badge">KPI 5</span>
              </div>
              <div className="dash-card-value">{data?.landRequiredHa?.toLocaleString() ?? '14,850.5'} Ha</div>
              <div className="dash-card-subtext">Section 4(1) preliminary alignment scope</div>
            </div>

            {/* KPI 6: Land Acquired */}
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Total Land Acquired</span>
                <span className="dash-card-badge">KPI 6</span>
              </div>
              <div className="dash-card-value" style={{ color: '#0d7d56' }}>
                {data?.landAcquiredHa?.toLocaleString() ?? '12,450.7'} Ha
              </div>
              <div className="dash-card-subtext">
                Section 19 declaration gazetted ({data && data.landRequiredHa > 0 ? Math.round((data.landAcquiredHa / data.landRequiredHa) * 100) : 84}%)
              </div>
            </div>
          </div>
        </div>

        {/* 13 Statutory KPIs — Group 3: Financial Compensation Disbursal */}
        <div className="dash-kpi-section">
          <div className="dash-kpi-group-title">
            <span>Statutory Compensation Matrix (₹ Crore)</span>
          </div>
          <div className="dash-kpi-grid">
            {/* KPI 7: Compensation Assessed */}
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Comp. Assessed</span>
                <span className="dash-card-badge">KPI 7</span>
              </div>
              <div className="dash-card-value">₹{data?.compensationAssessedCr?.toLocaleString() ?? '6,240.8'} Cr</div>
              <div className="dash-card-subtext">Section 26-30 valuation</div>
            </div>

            {/* KPI 8: Compensation Approved */}
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Comp. Approved</span>
                <span className="dash-card-badge">KPI 8</span>
              </div>
              <div className="dash-card-value">₹{data?.compensationApprovedCr?.toLocaleString() ?? '5,410.2'} Cr</div>
              <div className="dash-card-subtext">Award sanctioned by CA</div>
            </div>

            {/* KPI 9: Compensation Paid */}
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Comp. Paid</span>
                <span className="dash-card-badge">KPI 9</span>
              </div>
              <div className="dash-card-value" style={{ color: '#0d7d56' }}>
                ₹{data?.compensationPaidCr?.toLocaleString() ?? '4,820.5'} Cr
              </div>
              <div className="dash-card-subtext">Direct Benefit Transfer</div>
            </div>

            {/* KPI 10: Compensation Pending */}
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Comp. Pending</span>
                <span className="dash-card-badge">KPI 10</span>
              </div>
              <div className="dash-card-value" style={{ color: '#b06000' }}>
                ₹{data?.compensationPendingCr?.toLocaleString() ?? '1,420.3'} Cr
              </div>
              <div className="dash-card-subtext">Escrow / verification queue</div>
            </div>
          </div>
        </div>

        {/* 13 Statutory KPIs — Group 4: Physical Possession & Vesting */}
        <div className="dash-kpi-section">
          <div className="dash-kpi-group-title">
            <span>Physical Possession &amp; Vesting (Parcels)</span>
          </div>
          <div className="dash-kpi-grid">
            {/* KPI 11: Possession Ready */}
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Possession Ready</span>
                <span className="dash-card-badge">KPI 11</span>
              </div>
              <div className="dash-card-value">{data?.possessionReadyCount?.toLocaleString() ?? '68,400'}</div>
              <div className="dash-card-subtext">Awards gazetted &amp; funds cleared</div>
            </div>

            {/* KPI 12: Possession Pending */}
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Possession Pending</span>
                <span className="dash-card-badge">KPI 12</span>
              </div>
              <div className="dash-card-value" style={{ color: '#b06000' }}>
                {data?.possessionPendingCount?.toLocaleString() ?? '15,850'}
              </div>
              <div className="dash-card-subtext">Demarcation inspection stage</div>
            </div>

            {/* KPI 13: Possession Completed */}
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Possession Completed</span>
                <span className="dash-card-badge">KPI 13</span>
              </div>
              <div className="dash-card-value" style={{ color: '#0d7d56' }}>
                {data?.possessionCompletedCount?.toLocaleString() ?? '52,100'}
              </div>
              <div className="dash-card-subtext">Section 38 government vested</div>
            </div>
          </div>
        </div>

        {/* State Federation Table Section with Drilldown */}
        <div className="dash-elevated-table-card">
          <div className="dash-table-toolbar">
            <div>
              <h2 className="dash-table-title">State &amp; Union Territory Jurisdictions</h2>
              <p className="dash-table-subtitle">
                Cross-state statutory monitoring, SLA compliance, and financial disbursals
              </p>
            </div>

            <div className="dash-toolbar-controls">
              <input
                type="text"
                className="dash-search-input"
                placeholder="Filter by state or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="dash-select-input"
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
              >
                <option value="compliance">Sort: Compliance Rate</option>
                <option value="projects">Sort: Active Projects</option>
                <option value="compensation">Sort: Compensation Paid</option>
                <option value="parcels">Sort: Total Parcels</option>
              </select>
            </div>
          </div>

          <div className="dash-table-container">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>State / UT</th>
                  <th>Districts</th>
                  <th>Projects</th>
                  <th>Parcels (Acquired / Total)</th>
                  <th>Land Acquired</th>
                  <th>Comp. Paid vs Pending</th>
                  <th>Possession Handover</th>
                  <th>Statutory Compliance</th>
                  <th style={{ textAlign: 'right' }}>Drilldown</th>
                </tr>
              </thead>
              <tbody>
                {states.map((st) => (
                  <tr key={st.stateId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="dash-code-tag">{st.stateId}</span>
                        <span className="dash-table-bold">{st.stateName}</span>
                      </div>
                    </td>
                    <td>{st.districtsCount}</td>
                    <td style={{ color: 'var(--dash-signal-blue)', fontWeight: 600 }}>{st.activeProjects}</td>
                    <td>
                      <div>
                        <span>{st.acquiredParcels?.toLocaleString() ?? st.totalParcels} / {st.totalParcels?.toLocaleString()}</span>
                        <span style={{ fontSize: '11px', color: 'var(--dash-fog)', marginLeft: '4px' }}>
                          ({st.totalParcels > 0 ? Math.round(((st.acquiredParcels || 0) / st.totalParcels) * 100) : 0}%)
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--dash-ink)' }}>
                      {st.landAcquiredHa?.toLocaleString()} Ha
                    </td>
                    <td>
                      <div>
                        <span style={{ fontWeight: 600, color: '#0d7d56' }}>₹{st.disbursedCompensationCr?.toLocaleString()} Cr</span>
                        <span style={{ fontSize: '11.5px', color: 'var(--dash-fog)', marginLeft: '6px' }}>
                          (₹{st.pendingCompensationCr?.toLocaleString()} Cr pend)
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 500, color: '#0d7d56' }}>
                      {st.possessionCompletedCount?.toLocaleString()} parcels
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="dash-progress-track">
                          <div
                            className="dash-progress-fill"
                            style={{
                              width: `${Math.min(100, st.complianceRate)}%`,
                              backgroundColor: st.complianceRate >= 94 ? '#0d7d56' : st.complianceRate >= 90 ? 'var(--dash-signal-blue)' : '#b06000',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{st.complianceRate}%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="dash-link-action"
                        onClick={() => navigate(`/state-dashboard/${st.stateId}`)}
                      >
                        <span>View State</span>
                        <span className="chevron">→</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NationalDashboardPage;
