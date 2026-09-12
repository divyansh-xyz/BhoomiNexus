import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dashboardV2Service } from '../../services/api/dashboardV2.service';
import { useAuth } from '../../hooks/useAuth';
import { useAuthorization } from '../../hooks/useAuthorization';
import type { StateDashboardData } from '../../types/dashboardV2.types';
import BhoomiLogo from '../../components/common/BhoomiLogo';

export const StateDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { canAccessState } = useAuthorization();

  const requestedStateId = searchParams.get('stateId') || user?.administrativeScope?.state || user?.state || 'MH';
  const hasAccess = canAccessState(requestedStateId);

  const [data, setData] = useState<StateDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
      <div style={{ maxWidth: '800px', margin: '60px auto', padding: '32px', textAlign: 'center', backgroundColor: '#ffffff', border: '1px solid #fee2e2', borderRadius: '12px' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#991b1b', margin: '0 0 8px 0' }}>
          Jurisdictional Access Boundary
        </h2>
        <p style={{ fontSize: '13.5px', color: '#475569', marginBottom: '20px' }}>
          Your authorized administrative scope is restricted to <strong>{user?.state || user?.administrativeScope?.state || 'your assigned State'}</strong>.
          You do not hold sovereign clearance to inspect jurisdiction <strong>{requestedStateId}</strong>.
        </p>
        <button
          type="button"
          onClick={() => navigate(`/dashboard/state?stateId=${user?.state || 'MH'}`)}
          style={{
            padding: '8px 16px',
            fontSize: '12.5px',
            fontWeight: 600,
            borderRadius: '6px',
            backgroundColor: '#2563eb',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Return to My Authorized State &rarr;
        </button>
      </div>
    );
  }

  const districts = (data?.districtBreakdown || []).filter((d) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || d.districtName.toLowerCase().includes(q) || d.districtId.toLowerCase().includes(q);
  });

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 32px' }}>
      {/* Header telemetry row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <BhoomiLogo size={20} strokeWidth={2.4} />
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#2563eb' }}>
              State Directorate of Land Records &amp; Revenue Reforms • {data?.stateName || requestedStateId}
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            {data?.stateName || 'State'} Cadastral Monitoring Center
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Inter-district acquisition oversight, statutory SLA tracking, and compensation clearance
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user?.role === 'NATIONAL_AUTHORITY' && (
            <button
              type="button"
              onClick={() => navigate('/dashboard/national')}
              style={{
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              &larr; Back to National Overview
            </button>
          )}
          <button
            type="button"
            onClick={() => loadData(requestedStateId)}
            disabled={loading}
            style={{
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
            <span>{loading ? 'Refreshing...' : '↻ Refresh Data'}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Revenue Districts</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>{data?.totalDistricts ?? 36}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>Under State Registry</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Active Projects</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#2563eb' }}>{data?.totalProjects ?? 184}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>State &amp; Central Corridors</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Total Parcels</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>{data?.totalParcels?.toLocaleString() ?? '14,200'}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>Cadastral Demarcations</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Land Acquired</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#059669' }}>{data?.totalLandAcquiredHa?.toLocaleString() ?? '2,450.8'} Ha</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>Award Gazetted</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Compensation Disbursed</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#d97706' }}>₹{data?.totalCompensationDisbursedCr?.toLocaleString() ?? '1,280.4'} Cr</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>Statutory Sec 26-30</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Possession Handover</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0d9488' }}>{data?.totalPossessionCompletedHa?.toLocaleString() ?? '1,980.2'} Ha</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>Vested in State Registry</div>
        </div>
      </div>

      {/* District Comparison Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              District Administration Breakdown
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              Comparative progress across Collectorates &amp; Special Land Acquisition Offices
            </p>
          </div>

          <div>
            <input
              type="text"
              placeholder="Filter district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                width: '180px',
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 18px', fontWeight: 600 }}>District Collectorate</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Active Projects</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Parcels Demarcated</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Compensation Disbursed</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Possession Taken</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>SLA Adherence</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {districts.map((d) => (
                <tr
                  key={d.districtId}
                  style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '14px 18px', fontWeight: 600, color: '#0f172a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '10px', padding: '2px 5px', borderRadius: '4px', backgroundColor: '#dbeafe', color: '#1e40af', fontFamily: 'monospace' }}>
                        DIST
                      </span>
                      <span>{d.districtName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 14px', color: '#2563eb', fontWeight: 600 }}>{d.activeProjects}</td>
                  <td style={{ padding: '14px 14px', color: '#334155' }}>
                    {d.parcelsDemarcated.toLocaleString()} / {d.totalParcels.toLocaleString()}
                  </td>
                  <td style={{ padding: '14px 14px', fontWeight: 600, color: '#0f172a' }}>
                    ₹{d.compensationDisbursedCr.toLocaleString()} Cr
                  </td>
                  <td style={{ padding: '14px 14px', color: '#059669', fontWeight: 500 }}>
                    {d.possessionTakenParcels.toLocaleString()} parcels
                  </td>
                  <td style={{ padding: '14px 14px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: d.slaAdherenceRate >= 95 ? '#059669' : '#2563eb' }}>
                      {d.slaAdherenceRate}%
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/district?districtId=${d.districtId}`)}
                      style={{
                        padding: '5px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        borderRadius: '5px',
                        border: '1px solid #cbd5e1',
                        backgroundColor: '#ffffff',
                        color: '#1e293b',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#2563eb';
                        e.currentTarget.style.color = '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.color = '#1e293b';
                      }}
                    >
                      Inspect District &rarr;
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

export default StateDashboardPage;
