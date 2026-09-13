import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { dashboardV2Service } from '../../services/api/dashboardV2.service';
import { useAuth } from '../../hooks/useAuth';
import { useAuthorization } from '../../hooks/useAuthorization';
import type { DistrictDashboardData } from '../../types/dashboardV2.types';
import BhoomiLogo from '../../components/common/BhoomiLogo';
import DrilldownBreadcrumb from '../../components/common/DrilldownBreadcrumb';
import './dashboards-v2.css';

export const DistrictDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const params = useParams<{ districtId?: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { canAccessDistrict } = useAuthorization();

  const requestedDistrictId = params.districtId || searchParams.get('districtId') || user?.administrativeScope?.district || user?.district || 'pune';
  const requestedStateId = searchParams.get('stateId') || user?.administrativeScope?.state || user?.state || 'MH';
  const hasAccess = canAccessDistrict(requestedDistrictId);

  const [data, setData] = useState<DistrictDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'projects' | 'branches' | 'tasks' | 'cohorts'>('projects');

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
      <div className="dash-canvas">
        <div className="dash-container" style={{ maxWidth: '640px', marginTop: '60px' }}>
          <div className="dash-card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔒</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#c5221f', margin: '0 0 8px 0' }}>
              District Jurisdictional Boundary
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--dash-fog)', lineHeight: 1.5, marginBottom: '24px' }}>
              Your authorized administrative scope is restricted to <strong>{user?.district || user?.administrativeScope?.district || 'your assigned District'}</strong>.
              You do not hold sovereign authority over jurisdiction <strong>{requestedDistrictId}</strong>.
            </p>
            <div>
              <button
                type="button"
                className="dash-btn-secondary"
                onClick={() => navigate(`/district-dashboard/${user?.district || 'pune'}`)}
              >
                Return to My Authorized District &rarr;
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const projects = (data?.projectBreakdown || []).filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    return !q || p.projectName.toLowerCase().includes(q) || p.projectCode.toLowerCase().includes(q) || p.authorityName.toLowerCase().includes(q);
  });

  return (
    <div className="dash-canvas">
      <div className="dash-container">
        {/* Federal Scope Breadcrumb */}
        <DrilldownBreadcrumb
          currentLevel="district"
          state={{ id: requestedStateId, name: data?.stateName }}
          district={{ id: requestedDistrictId, name: data?.districtName }}
        />

        {/* Header Telemetry Row */}
        <div className="dash-header-bar">
          <div>
            <div className="dash-eyebrow">
              <BhoomiLogo size={18} strokeWidth={2.4} />
              <span>Office of the District Collector &amp; Magistrate</span>
              <span className="dash-eyebrow-badge">{data?.districtName || requestedDistrictId}, {data?.stateName || 'State'}</span>
            </div>
            <h1 className="dash-title">District Land Acquisition Command</h1>
            <p className="dash-subtitle">
              Competent Authority oversight across revenue tehsils, Special Land Acquisition Offices (SLAO), and corridor alignments.
            </p>
          </div>

          <div className="dash-action-row">
            {(user?.role === 'STATE_AUTHORITY' || user?.role === 'NATIONAL_AUTHORITY' || user?.role === 'ADMIN') && (
              <button
                type="button"
                className="dash-btn-secondary"
                onClick={() => navigate('/dashboard/state')}
              >
                <span>← Back to State</span>
              </button>
            )}
            <button
              type="button"
              className="dash-btn-secondary"
              onClick={() => navigate(`/district-dashboard/${requestedDistrictId}/gis`)}
            >
              <span>🗺 GIS Cadastral View</span>
            </button>
            <button
              type="button"
              className="dash-btn-secondary"
              onClick={() => loadData(requestedDistrictId)}
              disabled={loading}
            >
              <span>{loading ? 'Refreshing...' : '↻ Refresh District Data'}</span>
            </button>
          </div>
        </div>

        {/* Primary District Metric Cards */}
        <div className="dash-kpi-section">
          <div className="dash-kpi-grid">
            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Sanctioned Projects</span>
                <span className="dash-card-badge">Corridors</span>
              </div>
              <div className="dash-card-value" style={{ color: 'var(--dash-signal-blue)' }}>
                {data?.totalProjects ?? 28}
              </div>
              <div className="dash-card-subtext">Active infrastructure corridors</div>
            </div>

            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Land Parcels</span>
                <span className="dash-card-badge">Cadastre</span>
              </div>
              <div className="dash-card-value">{data?.totalParcels?.toLocaleString() ?? '3,200'}</div>
              <div className="dash-card-subtext">Covering {data?.landAcquiredHa ?? 680.5} Ha acquired</div>
            </div>

            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Comp. Disbursed</span>
                <span className="dash-card-badge">PFMS DBT</span>
              </div>
              <div className="dash-card-value" style={{ color: '#0d7d56' }}>
                ₹{data?.compensationSummary?.disbursedCr?.toLocaleString() ?? '340.5'} Cr
              </div>
              <div className="dash-card-subtext">
                ₹{data?.compensationSummary?.pendingCr ?? '39.7'} Cr pending verification
              </div>
            </div>

            <div className="dash-card">
              <div className="dash-card-header">
                <span className="dash-card-label">Possession Taken</span>
                <span className="dash-card-badge">Section 38</span>
              </div>
              <div className="dash-card-value" style={{ color: '#0d7d56' }}>
                {data?.possessionSummary?.possessionTaken?.toLocaleString() ?? '2,600'}
              </div>
              <div className="dash-card-subtext">
                {data?.possessionSummary?.pendingInspection ?? 480} pending inspection
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs for District Sections */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--dash-hairline)', paddingBottom: '12px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className="dash-btn-secondary"
            style={{
              backgroundColor: activeTab === 'projects' ? 'var(--dash-paper)' : 'transparent',
              borderColor: activeTab === 'projects' ? 'var(--dash-signal-blue)' : 'transparent',
              color: activeTab === 'projects' ? 'var(--dash-signal-blue)' : 'var(--dash-smoke)',
              fontWeight: activeTab === 'projects' ? 700 : 500,
            }}
          >
            📋 Project Alignments ({data?.projectBreakdown?.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('branches')}
            className="dash-btn-secondary"
            style={{
              backgroundColor: activeTab === 'branches' ? 'var(--dash-paper)' : 'transparent',
              borderColor: activeTab === 'branches' ? 'var(--dash-signal-blue)' : 'transparent',
              color: activeTab === 'branches' ? 'var(--dash-signal-blue)' : 'var(--dash-smoke)',
              fontWeight: activeTab === 'branches' ? 700 : 500,
            }}
          >
            🏛 7 Branches &amp; Units ({data?.branchBreakdown?.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tasks')}
            className="dash-btn-secondary"
            style={{
              backgroundColor: activeTab === 'tasks' ? 'var(--dash-paper)' : 'transparent',
              borderColor: activeTab === 'tasks' ? 'var(--dash-signal-blue)' : 'transparent',
              color: activeTab === 'tasks' ? 'var(--dash-signal-blue)' : 'var(--dash-smoke)',
              fontWeight: activeTab === 'tasks' ? 700 : 500,
            }}
          >
            ⏳ Pending Officer Work Queue ({data?.pendingOfficerWork?.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cohorts')}
            className="dash-btn-secondary"
            style={{
              backgroundColor: activeTab === 'cohorts' ? 'var(--dash-paper)' : 'transparent',
              borderColor: activeTab === 'cohorts' ? 'var(--dash-signal-blue)' : 'transparent',
              color: activeTab === 'cohorts' ? 'var(--dash-signal-blue)' : 'var(--dash-smoke)',
              fontWeight: activeTab === 'cohorts' ? 700 : 500,
            }}
          >
            📊 Parcel Cohort Visibility ({data?.parcelCohortVisibility?.length ?? 0})
          </button>
        </div>

        {/* Section 1: Project Table (Phase 17 Requirement) */}
        {activeTab === 'projects' && (
          <div className="dash-elevated-table-card">
            <div className="dash-table-toolbar">
              <div>
                <h2 className="dash-table-title">District Acquisition Projects</h2>
                <p className="dash-table-subtitle">
                  Corridor alignments undergoing joint measurement, compensation award, or possession handover
                </p>
              </div>

              <div className="dash-toolbar-controls">
                <input
                  type="text"
                  className="dash-search-input"
                  placeholder="Search project or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="dash-table-container">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Project Code &amp; Title</th>
                    <th>Proponent Authority</th>
                    <th>Parcels</th>
                    <th>Statutory Stage</th>
                    <th>Compensation</th>
                    <th>Possession</th>
                    <th>Disputes</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.projectId}>
                      <td>
                        <div>
                          <span className="dash-code-tag" style={{ marginBottom: '4px' }}>{p.projectCode}</span>
                          <div className="dash-table-bold">{p.projectName}</div>
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--dash-ash)' }}>{p.authorityName}</td>
                      <td style={{ fontWeight: 600, color: 'var(--dash-ink)' }}>{p.totalParcels}</td>
                      <td>
                        <span className="dash-status-pill active" style={{ backgroundColor: '#f1f5f9', color: 'var(--dash-ink)' }}>
                          {p.stage}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div className="dash-progress-track" style={{ width: '50px' }}>
                            <div className="dash-progress-fill" style={{ width: `${p.compensationProgressPercent}%`, backgroundColor: '#0d7d56' }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: '#0d7d56' }}>{p.compensationProgressPercent}%</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div className="dash-progress-track" style={{ width: '50px' }}>
                            <div className="dash-progress-fill" style={{ width: `${p.possessionProgressPercent}%`, backgroundColor: 'var(--dash-signal-blue)' }} />
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--dash-signal-blue)' }}>{p.possessionProgressPercent}%</span>
                        </div>
                      </td>
                      <td>
                        {p.disputedCount > 0 ? (
                          <span className="dash-status-pill disputed">{p.disputedCount} disputed</span>
                        ) : (
                          <span style={{ fontSize: '11.5px', color: 'var(--dash-fog)' }}>0</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="dash-link-action"
                          onClick={() => navigate(`/projects/${p.projectId}?stateId=${requestedStateId}&districtId=${requestedDistrictId}`)}
                        >
                          <span>View Project</span>
                          <span className="chevron">→</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 2: Branch / Unit Breakdown (Phase 17 Requirement) */}
        {activeTab === 'branches' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h2 className="dash-table-title">7-Branch Administrative Breakdown</h2>
              <p className="dash-table-subtitle">
                Operational status across Collectorate branches: Land Acquisition, Survey, Valuation, Legal, Finance, Grievance &amp; Admin
              </p>
            </div>
            <div className="dash-branch-grid">
              {(data?.branchBreakdown || []).map((b) => (
                <div key={b.branchKey} className="dash-branch-card">
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <h3 className="dash-branch-title">{b.branchName}</h3>
                      <span className="dash-code-tag">{b.branchKey.replace('BRANCH_', '')}</span>
                    </div>
                    <div className="dash-branch-dept">{b.department}</div>

                    <div className="dash-branch-officer-box">
                      <div className="dash-branch-officer-name">{b.officerInCharge}</div>
                      <div className="dash-branch-officer-desig">{b.officerDesignation}</div>
                    </div>
                  </div>

                  <div>
                    <div className="dash-branch-stats" style={{ marginBottom: '8px' }}>
                      <span>Active Parcels</span>
                      <strong>{b.activeParcelsCount}</strong>
                    </div>
                    <div className="dash-branch-stats" style={{ marginBottom: '8px' }}>
                      <span>SLA Adherence</span>
                      <strong style={{ color: b.slaAdherencePercent >= 94 ? '#0d7d56' : 'var(--dash-signal-blue)' }}>
                        {b.slaAdherencePercent}%
                      </strong>
                    </div>
                    <div className="dash-branch-stats">
                      <span>Pending Tasks</span>
                      <span className="dash-status-pill pending">{b.pendingTasksCount} tasks</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 3: Pending Officer Work Queue (Phase 17 Requirement) */}
        {activeTab === 'tasks' && (
          <div className="dash-elevated-table-card">
            <div className="dash-table-toolbar">
              <div>
                <h2 className="dash-table-title">Pending Officer Work Queue</h2>
                <p className="dash-table-subtitle">
                  Assigned statutory tasks pending review, verification, or approval by district branch officers
                </p>
              </div>
            </div>

            <div className="dash-table-container">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Task &amp; Reference</th>
                    <th>Parcel / ULPIN</th>
                    <th>Village &amp; Survey No</th>
                    <th>Branch / Unit</th>
                    <th>Assigned Officer</th>
                    <th>SLA Days Left</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.pendingOfficerWork || []).map((t) => (
                    <tr key={t.taskId}>
                      <td>
                        <div className="dash-table-bold">{t.taskTitle}</div>
                        <span style={{ fontSize: '11px', color: 'var(--dash-fog)' }}>{t.taskId}</span>
                      </td>
                      <td>
                        <span className="dash-code-tag">{t.ulpin}</span>
                      </td>
                      <td>
                        <div>{t.village}</div>
                        <span style={{ fontSize: '11px', color: 'var(--dash-ash)' }}>{t.surveyNumber}</span>
                      </td>
                      <td>{t.branchType}</td>
                      <td style={{ fontSize: '12px', color: 'var(--dash-ink)', fontWeight: 500 }}>{t.assignedOfficer}</td>
                      <td>
                        <span
                          className="dash-status-pill"
                          style={{
                            backgroundColor: t.slaDaysRemaining <= 1 ? '#fce8e6' : t.slaDaysRemaining <= 3 ? '#fef7e0' : '#e6f4ea',
                            color: t.slaDaysRemaining <= 1 ? '#c5221f' : t.slaDaysRemaining <= 3 ? '#b06000' : '#137333',
                          }}
                        >
                          {t.slaDaysRemaining} days remaining
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--dash-ash)' }}>{t.dueDate}</td>
                      <td>
                        <span className="dash-status-pill pending">{t.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 4: Parcel Cohort Visibility (Phase 17 Requirement) */}
        {activeTab === 'cohorts' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h2 className="dash-table-title">Parcel Cohort Surveillance</h2>
              <p className="dash-table-subtitle">
                Cadastral cohorts segmented by statutory acquisition lifecycle, active unit, and milestone velocity
              </p>
            </div>
            <div className="dash-cohort-grid">
              {(data?.parcelCohortVisibility || []).map((c) => (
                <div key={c.cohortId} className="dash-cohort-card">
                  <div className="dash-cohort-name">{c.cohortName}</div>
                  <div className="dash-cohort-unit">{c.branchName} • {c.unitName}</div>
                  <div className="dash-cohort-count">{c.parcelCount} <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--dash-fog)' }}>parcels</span></div>
                  <div className="dash-cohort-stage">Milestone: {c.activeStage}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="dash-progress-track" style={{ flex: 1 }}>
                      <div
                        className="dash-progress-fill"
                        style={{
                          width: `${c.progressPercent}%`,
                          backgroundColor: c.progressPercent === 100 ? '#0d7d56' : 'var(--dash-signal-blue)',
                        }}
                      />
                    </div>
                    <span style={{ fontSize: '11.5px', fontWeight: 600 }}>{c.progressPercent}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DistrictDashboardPage;
