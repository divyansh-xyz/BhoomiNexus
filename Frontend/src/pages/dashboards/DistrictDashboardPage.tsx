import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { dashboardV2Service } from '../../services/api/dashboardV2.service';
import { useAuth } from '../../hooks/useAuth';
import { useAuthorization } from '../../hooks/useAuthorization';
import type { DistrictDashboardData } from '../../types/dashboardV2.types';
import BhoomiLogo from '../../components/common/BhoomiLogo';

export const DistrictDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { canAccessDistrict } = useAuthorization();

  const requestedDistrictId = searchParams.get('districtId') || user?.administrativeScope?.district || user?.district || 'pune';
  const hasAccess = canAccessDistrict(requestedDistrictId);

  const [data, setData] = useState<DistrictDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (hasAccess) {
      loadData(requestedDistrictId);
    }
  }, [requestedDistrictId, hasAccess]);

  const loadData = async (districtId: string) => {
    setLoading(true);
    try {
      const res = await dashboardV2Service.getDistrictDashboard(districtId);
      setData(res);
    } catch (err) {
      console.error('Failed to load district dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  if (!hasAccess) {
    return (
      <div style={{ maxWidth: '800px', margin: '60px auto', padding: '32px', textAlign: 'center', backgroundColor: '#ffffff', border: '1px solid #fee2e2', borderRadius: '12px' }}>
        <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#991b1b', margin: '0 0 8px 0' }}>
          District Jurisdictional Boundary
        </h2>
        <p style={{ fontSize: '13.5px', color: '#475569', marginBottom: '20px' }}>
          Your authorized administrative scope is restricted to <strong>{user?.district || user?.administrativeScope?.district || 'your assigned District'}</strong>.
          You do not hold sovereign authority over jurisdiction <strong>{requestedDistrictId}</strong>.
        </p>
        <button
          type="button"
          onClick={() => navigate(`/dashboard/district?districtId=${user?.district || 'pune'}`)}
          style={{
            padding: '8px 16px',
            fontSize: '12.5px',
            fontWeight: 600,
            borderRadius: '6px',
            backgroundColor: '#059669',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Return to My Authorized District &rarr;
        </button>
      </div>
    );
  }

  const projects = (data?.projectBreakdown || []).filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || p.projectName.toLowerCase().includes(q) || p.projectCode.toLowerCase().includes(q) || p.authorityName.toLowerCase().includes(q);
  });

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 32px' }}>
      {/* Header telemetry row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <BhoomiLogo size={20} strokeWidth={2.4} />
            <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#059669' }}>
              Office of the District Collector &amp; Magistrate • {data?.districtName || requestedDistrictId}, {data?.stateName || 'State'}
            </span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            District Land Acquisition Command
          </h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Statutory Competent Authority oversight across all revenue tehsils, special units &amp; corridor alignments
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {(user?.role === 'STATE_AUTHORITY' || user?.role === 'NATIONAL_AUTHORITY') && (
            <button
              type="button"
              onClick={() => navigate('/dashboard/state')}
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
              &larr; Back to State Directorate
            </button>
          )}
          <button
            type="button"
            onClick={() => loadData(requestedDistrictId)}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Sanctioned Projects</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>{data?.totalProjects ?? 28}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>Under District Jurisdiction</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Total Land Parcels</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#2563eb' }}>{data?.totalParcels?.toLocaleString() ?? '3,200'}</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>Covering {data?.totalLandAreaHa ?? 680.5} Hectares</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Compensation Disbursed</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#059669' }}>₹{data?.compensationSummary?.disbursedCr ?? '340.5'} Cr</div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>
            ₹{data?.compensationSummary?.pendingCr ?? '39.7'} Cr pending
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '18px 20px' }}>
          <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, marginBottom: '6px' }}>Possession Taken</div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#0d9488' }}>
            {data?.possessionSummary?.possessionTaken?.toLocaleString() ?? '2,600'}
          </div>
          <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>
            {data?.possessionSummary?.pendingInspection ?? 480} pending inspection
          </div>
        </div>
      </div>

      {/* Two Column Section: Statutory Stages & Operations Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        {/* RFCTLARR Statutory Stage Progress */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
            Statutory Stage Funnel &amp; SLA Adherence
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(data?.stageBreakdown || []).map((st, idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>{st.stage}</span>
                  <span style={{ color: '#64748b', fontSize: '11.5px' }}>
                    {st.parcelsCount} parcels &bull; <strong style={{ color: '#059669' }}>{st.slaAdherencePercent}% SLA</strong>
                  </span>
                </div>
                <div style={{ width: '100%', height: '6px', borderRadius: '3px', backgroundColor: '#f1f5f9', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${(st.parcelsCount / (data?.totalParcels || 3200)) * 100}%`,
                      height: '100%',
                      backgroundColor: idx >= 4 ? '#059669' : '#3b82f6',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Operational Highlights */}
        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', margin: '0 0 16px 0' }}>
            Officer Division Telemetry
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#fef3c7', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>
                Compensation Cell (SLAO)
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#78350f', marginTop: '6px' }}>
                {data?.compensationSummary?.beneficiaryCount?.toLocaleString() ?? '1,840'}
              </div>
              <div style={{ fontSize: '11px', color: '#92400e', marginTop: '2px' }}>Verified Beneficiaries</div>
              <button
                type="button"
                onClick={() => navigate('/compensation/dashboard')}
                style={{
                  marginTop: '10px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #fcd34d',
                  color: '#92400e',
                  cursor: 'pointer',
                }}
              >
                Inspect SLAO &rarr;
              </button>
            </div>

            <div style={{ padding: '14px', borderRadius: '8px', backgroundColor: '#ccfbf1', border: '1px solid #99f6e4' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#115e59', textTransform: 'uppercase' }}>
                Possession Cell (Tehsils)
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: '#134e4a', marginTop: '6px' }}>
                {data?.possessionSummary?.disputed ?? 120}
              </div>
              <div style={{ fontSize: '11px', color: '#115e59', marginTop: '2px' }}>Parcels under Dispute Review</div>
              <button
                type="button"
                onClick={() => navigate('/possession/dashboard')}
                style={{
                  marginTop: '10px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '4px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #5eead4',
                  color: '#115e59',
                  cursor: 'pointer',
                }}
              >
                Inspect Possession &rarr;
              </button>
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '12px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px', color: '#475569' }}>
            <strong>Collectorate Mandate:</strong> RFCTLARR 2013 Section 23 inquiry declarations, joint demarcation validation, and Section 38 statutory possession certificates.
          </div>
        </div>
      </div>

      {/* Projects in District Table */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Active Acquisition Projects in District
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
              Corridor projects undergoing survey, compensation disbursal, or physical handover
            </p>
          </div>

          <div>
            <input
              type="text"
              placeholder="Search project..."
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
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 18px', fontWeight: 600 }}>Project Code &amp; Name</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Proponent Authority</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Parcels</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Statutory Stage</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Compensation</th>
                <th style={{ padding: '12px 14px', fontWeight: 600 }}>Possession</th>
                <th style={{ padding: '12px 18px', fontWeight: 600, textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr
                  key={p.projectId}
                  style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '14px 18px', fontWeight: 600, color: '#0f172a' }}>
                    <div>
                      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b', display: 'block' }}>
                        {p.projectCode}
                      </span>
                      <span>{p.projectName}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 14px', color: '#334155', fontSize: '12px' }}>{p.authorityName}</td>
                  <td style={{ padding: '14px 14px', color: '#0f172a', fontWeight: 600 }}>{p.totalParcels}</td>
                  <td style={{ padding: '14px 14px' }}>
                    <span style={{ fontSize: '11.5px', padding: '3px 8px', borderRadius: '4px', backgroundColor: '#f1f5f9', color: '#334155', fontWeight: 500 }}>
                      {p.stage}
                    </span>
                  </td>
                  <td style={{ padding: '14px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '50px', height: '6px', borderRadius: '3px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                        <div style={{ width: `${p.compensationProgressPercent}%`, height: '100%', backgroundColor: '#059669' }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#059669' }}>{p.compensationProgressPercent}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '50px', height: '6px', borderRadius: '3px', backgroundColor: '#e2e8f0', overflow: 'hidden' }}>
                        <div style={{ width: `${p.possessionProgressPercent}%`, height: '100%', backgroundColor: '#0d9488' }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#0d9488' }}>{p.possessionProgressPercent}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/projects/${p.projectId}`)}
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
                        e.currentTarget.style.borderColor = '#059669';
                        e.currentTarget.style.color = '#059669';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#cbd5e1';
                        e.currentTarget.style.color = '#1e293b';
                      }}
                    >
                      View Project &rarr;
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

export default DistrictDashboardPage;
