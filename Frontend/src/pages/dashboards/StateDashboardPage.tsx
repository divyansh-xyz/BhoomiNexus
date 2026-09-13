import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { dashboardV2Service } from '../../services/api/dashboardV2.service';
import { useAuth } from '../../hooks/useAuth';
import { useAuthorization } from '../../hooks/useAuthorization';
import type { StateDashboardData } from '../../types/dashboardV2.types';
import BhoomiLogo from '../../components/common/BhoomiLogo';
import DrilldownBreadcrumb from '../../components/common/DrilldownBreadcrumb';
import './dashboards-v2.css';

export const StateDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ stateId?: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { canAccessState } = useAuthorization();

  const requestedStateId = params.stateId || searchParams.get('stateId') || user?.administrativeScope?.state || user?.state || 'MH';
  const hasAccess = canAccessState(requestedStateId);

  const [data, setData] = useState<StateDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'sla' | 'projects' | 'compensation' | 'parcels'>('sla');

  useEffect(() => {
    if (hasAccess) {
      loadData(requestedStateId);
    }
  }, [requestedStateId, hasAccess]);

  const loadData = async (stateId: string) => {
    setLoading(true);
    try {
      const res = await dashboardV2Service.getStateDashboard(stateId);
      setData(res);
    } catch (err) {
      console.error('Failed to load state dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className="dash-canvas">
        <div className="dash-container" style={{ maxWidth: '640px', marginTop: '60px' }}>
          <div className="dash-card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔒</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#c5221f', margin: '0 0 8px 0' }}>
              Jurisdictional Access Boundary
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--dash-fog)', lineHeight: 1.5, marginBottom: '24px' }}>
              Your authorized administrative scope is restricted to <strong>{user?.state || user?.administrativeScope?.state || 'your assigned State'}</strong>.
              You do not hold sovereign clearance to inspect jurisdiction <strong>{requestedStateId}</strong>.
            </p>
            <div>
              <button
                type="button"
                className="dash-btn-secondary"
                onClick={() => navigate(`/state-dashboard/${user?.state || 'MH'}`)}
              >
                Return to My Authorized State &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const districts = (data?.districtBreakdown || []).filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || d.districtName.toLowerCase().includes(q) || d.districtId.toLowerCase().includes(q);
  }).sort((a, b) => {
    if (sortBy === 'sla') return b.slaAdherenceRate - a.slaAdherenceRate;
    if (sortBy === 'projects') return b.activeProjects - a.activeProjects;
    if (sortBy === 'compensation') return b.compensationDisbursedCr - a.compensationDisbursedCr;
    if (sortBy === 'parcels') return b.totalParcels - a.totalParcels;
    return 0;
  });

  return (
    <div className="dash-canvas">
      <div className="dash-container">
        {/* Federal Scope Breadcrumb */}
        <DrilldownBreadcrumb
          currentLevel="state"
          state={{ id: requestedStateId, name: data?.stateName }}
        />

        {/* Header Telemetry Row */}
        <div className="dash-header-bar">
          <div>
            <div className="dash-eyebrow">
              <BhoomiLogo size={18} strokeWidth={2.4} />
              <span>State Directorate of Land Records &amp; Revenue Reforms</span>
              <span className="dash-eyebrow-badge">{data?.stateName || requestedStateId} Jurisdiction</span>
            </div>
            <h1 className="dash-title">{data?.stateName || 'State'} Cadastral Command Center</h1>
            <p className="dash-subtitle">
              Inter-district acquisition oversight, statutory RFCTLARR SLA tracking, and direct benefit transfer surveillance.
            </p>
          </div>

          <div className="dash-action-row">
            {(user?.role === 'NATIONAL_AUTHORITY' || user?.role === 'ADMIN') && (
              <button
                type="button"
                className="dash-btn-secondary"
                onClick={() => navigate('/national-dashboard')}
              >
                <span>← Back to National</span>
              </button>
            )}
            <button
              type="button"
              className="dash-btn-secondary"
              onClick={() => navigate(`/state-dashboard/${requestedStateId}/gis`)}
            >
              <span>🗺 GIS Cadastral View</span>
            </button>
            <button
              type="button"
              className="dash-btn-secondary"
              onClick={() => loadData(requestedStateId)}
              disabled={loading}
            >
              <span>{loading ? 'Refreshing...' : '↻ Refresh State Data'}</span>
            </button>
          </div>
        </div>

        {/* State-Scoped KPIs: Scope & Land */}
        <div className="dash-kpi-section">
          <div className="dash-kpi-group-title">
            <span>State Jurisdictional Scope &amp; Land Extent</span>
          </div>
          <div className="dash-kpi-grid">
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Collectorates</span>
                <span className="dash-card-badge">State Scope</span>
              </div>
              <div className="dash-card-value">{data?.totalDistricts ?? 36}</div>
              <div className="dash-card-subtext">Revenue districts</div>
            </div>

            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Active Projects</span>
                <span className="dash-card-badge">Corridors</span>
              </div>
              <div className="dash-card-value" style={{ color: 'var(--dash-signal-blue)' }}>
                {data?.totalProjects ?? 184}
              </div>
              <div className="dash-card-subtext">State &amp; central alignments</div>
            </div>

            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Total Parcels</span>
                <span className="dash-card-badge">Cadastre</span>
              </div>
              <div className="dash-card-value">{data?.totalParcels?.toLocaleString() ?? '14,200'}</div>
              <div className="dash-card-subtext">Digitized survey plots</div>
            </div>

            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Land Acquired</span>
                <span className="dash-card-badge">Extent</span>
              </div>
              <div className="dash-card-value" style={{ color: '#0d7d56' }}>
                {data?.landAcquiredHa?.toLocaleString()} Ha
              </div>
              <div className="dash-card-subtext">
                of {data?.landRequiredHa?.toLocaleString()} Ha required ({data && data.landRequiredHa > 0 ? Math.round((data.landAcquiredHa / data.landRequiredHa) * 100) : 86}%)
              </div>
            </div>
          </div>
        </div>

        {/* State-Scoped KPIs: Compensation & Possession */}
        <div className="dash-kpi-section">
          <div className="dash-kpi-group-title">
            <span>Compensation Disbursal &amp; Possession Vesting</span>
          </div>
          <div className="dash-kpi-grid">
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Comp. Assessed</span>
                <span className="dash-card-badge">Section 26</span>
              </div>
              <div className="dash-card-value">₹{data?.compensationAssessedCr?.toLocaleString()} Cr</div>
              <div className="dash-card-subtext">Statutory baseline valuation</div>
            </div>

            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Comp. Disbursed</span>
                <span className="dash-card-badge">PFMS DBT</span>
              </div>
              <div className="dash-card-value" style={{ color: '#0d7d56' }}>
                ₹{data?.compensationPaidCr?.toLocaleString()} Cr
              </div>
              <div className="dash-card-subtext">Credited to beneficiary accounts</div>
            </div>

            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Comp. Pending</span>
                <span className="dash-card-badge">Escrow</span>
              </div>
              <div className="dash-card-value" style={{ color: '#b06000' }}>
                ₹{data?.compensationPendingCr?.toLocaleString()} Cr
              </div>
              <div className="dash-card-subtext">Verification in progress</div>
            </div>

            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Possession Completed</span>
                <span className="dash-card-badge">Sec 38</span>
              </div>
              <div className="dash-card-value" style={{ color: '#0d7d56' }}>
                {data?.possessionCompletedCount?.toLocaleString()} parcels
              </div>
              <div className="dash-card-subtext">
                {data?.possessionPendingCount?.toLocaleString()} parcels pending
              </div>
            </div>
          </div>
        </div>

        {/* District Comparison Section (Phase 17 Requirement) */}
        <div className="dash-elevated-table-card">
          <div className="dash-table-toolbar">
            <div>
              <h2 className="dash-table-title">District Collectorate Comparison Matrix</h2>
              <p className="dash-table-subtitle">
                Comparative monitoring across Special Land Acquisition Offices, SLA adherence, and physical clearance
              </p>
            </div>

            <div className="dash-toolbar-controls">
              <input
                type="text"
                className="dash-search-input"
                placeholder="Filter district by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <select
                className="dash-select-input"
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
              >
                <option value="sla">Sort: SLA Adherence</option>
                <option value="projects">Sort: Active Projects</option>
                <option value="compensation">Sort: Compensation Disbursed</option>
                <option value="parcels">Sort: Total Parcels</option>
              </select>
            </div>
          </div>

          <div className="dash-table-container">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>District Collectorate</th>
                  <th>Active Projects</th>
                  <th>Parcels (Demarcated / Total)</th>
                  <th>Land Extent (Acquired / Req)</th>
                  <th>Comp. Disbursed vs Pending</th>
                  <th>Possession Taken</th>
                  <th>SLA Adherence</th>
                  <th style={{ textAlign: 'right' }}>Command Drilldown</th>
                </tr>
              </thead>
              <tbody>
                {districts.map((d) => (
                  <tr key={d.districtId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="dash-code-tag">DIST</span>
                        <span className="dash-table-bold">{d.districtName}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--dash-signal-blue)', fontWeight: 600 }}>{d.activeProjects}</td>
                    <td>
                      <div>
                        <span>{d.parcelsDemarcated?.toLocaleString()} / {d.totalParcels?.toLocaleString()}</span>
                        <span style={{ fontSize: '11px', color: 'var(--dash-fog)', marginLeft: '4px' }}>
                          ({d.totalParcels > 0 ? Math.round((d.parcelsDemarcated / d.totalParcels) * 100) : 0}%)
                        </span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--dash-ink)' }}>{d.landAcquiredHa?.toLocaleString()} Ha</span>
                        <span style={{ fontSize: '11.5px', color: 'var(--dash-fog)', marginLeft: '4px' }}>
                          / {d.landRequiredHa?.toLocaleString()} Ha
                        </span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span style={{ fontWeight: 600, color: '#0d7d56' }}>₹{d.compensationDisbursedCr?.toLocaleString()} Cr</span>
                        <span style={{ fontSize: '11.5px', color: 'var(--dash-fog)', marginLeft: '6px' }}>
                          (₹{d.compensationPendingCr?.toLocaleString()} Cr pend)
                        </span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 500, color: '#0d7d56' }}>
                      {d.possessionTakenParcels?.toLocaleString()} parcels
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="dash-progress-track">
                          <div
                            className="dash-progress-fill"
                            style={{
                              width: `${Math.min(100, d.slaAdherenceRate)}%`,
                              backgroundColor: d.slaAdherenceRate >= 94 ? '#0d7d56' : d.slaAdherenceRate >= 90 ? 'var(--dash-signal-blue)' : '#b06000',
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: 600 }}>{d.slaAdherenceRate}%</span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        className="dash-link-action"
                        onClick={() => navigate(`/district-dashboard/${d.districtId}?stateId=${requestedStateId}`)}
                      >
                        <span>View District Command</span>
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

export default StateDashboardPage;
