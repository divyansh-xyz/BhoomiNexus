import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardV2Service } from '../../services/api/dashboardV2.service';
import type { NationalDashboardData } from '../../types/dashboardV2.types';
import BhoomiLogo from '../../components/common/BhoomiLogo';

export const NationalDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<NationalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'compliance' | 'projects' | 'compensation'>('compliance');

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
    return 0;
  });

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 32px' }}>
      {/* Header telemetry row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <BhoomiLogo size={20} strokeWidth={2.4} />
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6366f1' }}>
              Central Cadastre & Federal Land Acquisition Command • MoRD / DoLR
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            National Land Governance Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Consolidated cross-state surveillance under RFCTLARR Act 2013 across all 36 States &amp; Union Territories
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
              backgroundColor: '#ffffff',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <span>{loading ? 'Refreshing...' : '↻ Refresh Metrics'}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Federation Jurisdictions</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>{data?.totalStates ?? 28} States</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>Across {data?.totalDistricts ?? 785} Districts</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Infrastructure Projects</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#2563eb' }}>{data?.totalProjects?.toLocaleString() ?? '1,420'}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>Major Corridors &amp; Expressways</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Demarcated Parcels</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>{data?.totalParcels?.toLocaleString() ?? '84,250'}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>Digitized Cadastral Polygons</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Land Acquired</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#059669' }}>{data?.totalLandAcquiredHa?.toLocaleString() ?? '12,450.7'} Ha</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>Section 19 Published</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Disbursed Compensation</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#d97706' }}>₹{data?.totalCompensationDisbursedCr?.toLocaleString() ?? '4,820.5'} Cr</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>PFMS Direct Benefit Transfer</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Possession Handover</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0d9488' }}>{data?.totalPossessionCompletedHa?.toLocaleString() ?? '9,840.2'} Ha</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>Vested in Government (Sec 38)</div>
        </div>
      </div>

      {/* State Federation Table Section */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {/* Table Toolbar */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              State &amp; UT Jurisdictional Performance
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              Statutory SLA adherence, parcel clearance velocity, and financial disbursals
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="text"
              placeholder="Filter state by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                width: '200px',
              }}
            />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              style={{
                padding: '6px 10px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
              }}
            >
              <option value="compliance">Sort: Compliance Rate</option>
              <option value="projects">Sort: Active Projects</option>
              <option value="compensation">Sort: Compensation Disbursed</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 18px', fontWeight: 600 }}>State / UT</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Districts</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Active Projects</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Parcels (Acquired/Total)</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Compensation Disbursed</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Possession Handover</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>RFCTLARR Compliance</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {states.map((st) => (
                <tr
                  key={st.stateId}
                  style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '14px 18px', fontWeight: 600, color: '#0f172a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', padding: '2px 5px', borderRadius: '4px', backgroundColor: '#e0e7ff', color: '#3730a3', fontFamily: 'monospace' }}>
                        {st.stateId}
                      </span>
                      <span>{st.stateName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 14px', color: '#334155' }}>{st.districtsCount}</td>
                  <td style={{ padding: '14px 14px', color: '#2563eb', fontWeight: 600 }}>{st.activeProjects}</td>
                  <td style={{ padding: '14px 14px', color: '#334155' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{st.acquiredParcels.toLocaleString()} / {st.totalParcels.toLocaleString()}</span>
                      <span style={{ fontSize: '11px', color: '#64748b' }}>
                        ({Math.round((st.acquiredParcels / st.totalParcels) * 100)}%)
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 14px', fontWeight: 600, color: '#0f172a' }}>
                    ₹{st.disbursedCompensationCr.toLocaleString()} Cr
                  </td>
                  <td style={{ padding: '14px 14px', color: '#059669', fontWeight: 500 }}>
                    {st.possessionCompletedHa.toLocaleString()} Ha
                  </td>
                  <td style={{ padding: '14px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '60px', height: '6px', borderRadius: '3px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${st.complianceRate}%`,
                            height: '100%',
                            backgroundColor: st.complianceRate >= 95 ? '#059669' : st.complianceRate >= 90 ? '#2563eb' : '#d97706',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155' }}>
                        {st.complianceRate}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/state?stateId=${st.stateId}`)}
                      style={{
                        padding: '5px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#6366f1';
                        e.currentTarget.style.color = '#6366f1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.color = '#1e293b';
                      }}
                    >
                      Inspect State &rarr;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default NationalDashboardPage;
