import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BhoomiLogo from '../../components/common/BhoomiLogo';
import { bossService } from '../../services/api/boss.service';
import { NotificationService, type NotificationItem } from '../../services/api/notification.service';
import type { ProjectRequest } from '../../types/boss.types';
import type { ProponentDashboardStats } from '../../types/proponent.types';

export const ProponentProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectRequest[]>([]);
  const [stats, setStats] = useState<ProponentDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'dockets' | 'compact'>('dockets');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projList, statsData, notifData] = await Promise.all([
        bossService.getProjects(),
        bossService.getProponentStats(),
        NotificationService.getNotifications({ limit: 10 }).catch(() => ({ notifications: [], total: 0, unreadCount: 0 })),
      ]);
      setProjects(projList);
      setStats(statsData);
      setNotifications(notifData.notifications || []);
    } catch (err) {
      console.error('Failed to load proponent data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDismissNotification = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await NotificationService.markAsRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'NEW_REQUEST' && p.status === 'NEW_REQUEST') ||
      (statusFilter === 'UNDER_REVIEW' && p.status === 'UNDER_REVIEW') ||
      (statusFilter === 'CONFIRMED' &&
        (p.status === 'PARCELS_CONFIRMED' || p.status === 'WORKFLOW_CONFIGURED')) ||
      (statusFilter === 'ACTION_REQUIRED' && p.hasPendingAction);

    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      p.code.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.state.toLowerCase().includes(q) ||
      p.district.toLowerCase().includes(q) ||
      p.proponentAuthority.toLowerCase().includes(q);

    return matchesStatus && matchesQuery;
  });

  const actionRequiredCount = projects.filter(p => p.hasPendingAction).length;

  return (
    <div className="boss-page-container">
      {/* 1. Sovereign Gazette Extraordinary Masthead */}
      <header className="boss-executive-masthead">
        <div className="masthead-gazette-tagline">
          <span>THE GAZETTE OF INDIA EXTRAORDINARY &bull; STATUTORY PROPONENT INTAKE REGISTER</span>
          <span className="masthead-bulletin">INTAKE NODE #04 &bull; RFCTLARR ACT 2013</span>
        </div>

        <div className="masthead-main-row">
          <div className="masthead-brand-block">
            <div className="masthead-symbol-row">
              <BhoomiLogo size={30} strokeWidth={2.4} />
              <span className="masthead-org-title">National Infrastructure Pipeline &bull; Proponent Directorate</span>
            </div>
            <h1 className="masthead-headline">
              Statutory Project Requisitions
            </h1>
            <p className="masthead-thesis">
              Central Proponent Registry for Linear Corridors, Metro Rail, and National Infrastructure Land Acquisition under Section 2(1) RFCTLARR Act 2013.
            </p>
          </div>

          <div className="masthead-stamp-box">
            <div className="stamp-header">
              <span className="status-dot-pulse" />
              <span>Agency Intake Session: Active</span>
            </div>
            <div className="stamp-details">
              <div className="stamp-row">
                <span className="stamp-label">Authority:</span>
                <span className="stamp-val">National Highways Authority of India (NHAI)</span>
              </div>
              <div className="stamp-row">
                <span className="stamp-label">Supervising Officer:</span>
                <span className="stamp-val">Shri Rajesh K. Verma, CGM (LA)</span>
              </div>
              <div className="stamp-row">
                <span className="stamp-label">Statutory Rule:</span>
                <span className="stamp-val">14-Day Central Scrutiny Rule</span>
              </div>
              <div className="stamp-row">
                <span className="stamp-label">Spatial Datum:</span>
                <span className="stamp-val font-mono">WGS84 &bull; EPSG:4326</span>
              </div>
            </div>

            <Link
              to="/projects/new"
              className="btn-cta-blue"
              style={{
                width: '100%',
                marginTop: '12px',
                boxSizing: 'border-box',
                textAlign: 'center',
                color: '#ffffff',
                padding: '10px 18px',
              }}
            >
              + Initiate New Gazette Requisition &rarr;
            </Link>
          </div>
        </div>
      </header>

      <div className="hairline-fullwidth" />

      {/* 2. Broadsheet Requisition & Triage Bar */}
      <section className="boss-triage-summary-bar">
        <div className="triage-grid">
          <div className="triage-card triage-highlight">
            <span className="triage-label">Total Requisitions</span>
            <div className="triage-value">
              {stats?.totalRequisitions ?? projects.length}
            </div>
            <span className="triage-sub">Cumulative Corridors Initiated across Agencies</span>
          </div>

          <div className="triage-card">
            <span className="triage-label">Under Central BOSS Scrutiny</span>
            <div className="triage-value text-signal-blue">
              {stats?.underBossScrutiny ?? 0}
            </div>
            <span className="triage-sub">Intakes Awaiting PostGIS Cadastral Determination</span>
          </div>

          <div className="triage-card">
            <span className="triage-label">Parcels Confirmed (Stage 2)</span>
            <div className="triage-value text-emerald">
              {stats?.parcelsDetermined ?? 0}
            </div>
            <span className="triage-sub">Corridors with Confirmed Bhu-Aadhaar ULPINs</span>
          </div>

          <div className="triage-card">
            <span className="triage-label">Proponent Active Drafts</span>
            <div className="triage-value">
              {stats?.draftsCount ?? 0}
            </div>
            <span className="triage-sub">Alignment Coordinates &amp; DPR Drafts Awaiting Submission</span>
          </div>
        </div>
      </section>

      {/* 2.5. Statutory Protocol Notifications & Action Directives Bulletin */}
      {notifications.length > 0 && (
        <section className="boss-notifications-bulletin-section" style={{ marginBottom: '32px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  display: 'inline-block',
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  backgroundColor: '#dc2626',
                  animation: 'bell-pulse 2s infinite ease-in-out',
                }}
              />
              <span className="editorial-section-tag" style={{ margin: 0, letterSpacing: '0.08em' }}>
                STATUTORY PROTOCOL ALERTS &amp; NOTIFICATIONS ({notifications.filter((n) => !n.read).length} UNREAD)
              </span>
            </div>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
              Real-time Sovereign Directives from BOSS Scrutiny &amp; Field Officers
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
            {notifications.map((notif) => {
              const isRejected = notif.type === 'STAGE_REJECTED';
              const isApproved = notif.type === 'BOSS_APPROVED' || notif.type === 'PROCESS_COMPLETED';
              const isAccepted = notif.type === 'STAGE_ACCEPTED';

              const accentBorder = isRejected ? '#ef4444' : isApproved ? '#10b981' : isAccepted ? '#3b82f6' : '#64748b';
              const accentBg = isRejected ? '#fef2f2' : isApproved ? '#ecfdf5' : isAccepted ? '#eff6ff' : '#f8fafc';
              const badgeText = isRejected
                ? 'STAGE REMITTED / REJECTED'
                : notif.type === 'BOSS_APPROVED'
                ? 'BOSS SCRUTINY APPROVED'
                : notif.type === 'PROCESS_COMPLETED'
                ? 'PROCESS COMPLETED'
                : isAccepted
                ? 'STAGE CLEARED'
                : 'PROTOCOL NOTICE';

              return (
                <div
                  key={notif.id}
                  style={{
                    backgroundColor: notif.read ? '#ffffff' : '#fcfbf9',
                    border: `1.5px solid ${accentBorder}`,
                    borderLeft: `5px solid ${accentBorder}`,
                    borderRadius: '4px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                    position: 'relative',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '2px 7px',
                          backgroundColor: accentBg,
                          color: accentBorder,
                          borderRadius: '3px',
                          border: `1px solid ${accentBorder}`,
                          fontFamily: 'monospace',
                          letterSpacing: '0.04em',
                        }}
                      >
                        {badgeText}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                          {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDismissNotification(notif.id, e)}
                          title="Mark as read / dismiss"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            fontSize: '14px',
                            lineHeight: 1,
                            padding: '2px',
                          }}
                        >
                          &times;
                        </button>
                      </div>
                    </div>

                    <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 6px 0', color: '#0f172a' }}>
                      {notif.title}
                    </h4>

                    <p style={{ fontSize: '12.5px', color: '#334155', margin: '0 0 14px 0', lineHeight: 1.45 }}>
                      {notif.message}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748b' }}>
                      {notif.projectCode || notif.metadata?.projectCode || 'STATUTORY DOCKET'}
                    </span>
                    {notif.link && (
                      <Link
                        to={notif.link}
                        onClick={() => handleDismissNotification(notif.id)}
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: isRejected ? '#dc2626' : isApproved ? '#059669' : '#2563eb',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{isRejected ? 'Resubmit Corrective Evidence &rarr;' : 'Open Project Dossier &rarr;'}</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Requisition Controls & Filter Strip */}
      <section className="boss-ledger-section">
        <div className="ledger-header-toolbar">
          <div className="toolbar-left">
            <span className="editorial-section-tag">STATUTORY INFRASTRUCTURE DOCKETS</span>
            <h3 className="ledger-heading">
              Proponent Acquisition Requisition Worklist ({filteredProjects.length})
            </h3>
            <span className="ledger-subheading">
              Official Proponent Gazette Submissions Under Section 2(1) Infrastructure Corridors
            </span>
          </div>

          <div className="toolbar-right">
            <div className="ledger-view-toggle">
              <button
                type="button"
                onClick={() => setViewMode('dockets')}
                className={`view-toggle-btn ${viewMode === 'dockets' ? 'active' : ''}`}
                title="Gazette Docket Cards View"
              >
                Gazette Dockets
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`view-toggle-btn ${viewMode === 'compact' ? 'active' : ''}`}
                title="Compact Broadsheet Register View"
              >
                Compact Register
              </button>
            </div>
          </div>
        </div>

        {/* Filter and Search Strip */}
        <div className="boss-filter-search-strip">
          <div className="search-field-wrapper">
            <input
              type="text"
              placeholder="Search by Docket Code, Authority, Corridor Title, or State..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="gazette-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="clear-search-btn"
              >
                &times;
              </button>
            )}
          </div>

          <div className="filter-tabs-cluster">
            <button
              type="button"
              className={`filter-tab-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => setStatusFilter('ALL')}
            >
              All Dockets ({projects.length})
            </button>
            <button
              type="button"
              className={`filter-tab-pill ${statusFilter === 'NEW_REQUEST' ? 'active' : ''}`}
              onClick={() => setStatusFilter('NEW_REQUEST')}
            >
              Pending BOSS Scrutiny
            </button>
            <button
              type="button"
              className={`filter-tab-pill ${statusFilter === 'CONFIRMED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('CONFIRMED')}
            >
              Parcels Confirmed
            </button>
            <button
              type="button"
              className={`filter-tab-pill ${statusFilter === 'ACTION_REQUIRED' ? 'active' : ''} ${actionRequiredCount > 0 ? 'filter-tab-urgent' : ''}`}
              onClick={() => setStatusFilter('ACTION_REQUIRED')}
            >
              ⚠ Action Required {actionRequiredCount > 0 ? `(${actionRequiredCount})` : ''}
            </button>
          </div>
        </div>

        {/* Main Worklist Display */}
        {loading ? (
          <div className="boss-loading-ledger">
            <BhoomiLogo size={28} strokeWidth={2.4} />
            <span>Accessing Sovereign Proponent Register...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="boss-empty-ledger">
            <p>No project requisitions match the specified query.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="btn-cta-outline"
            >
              Clear Active Filters
            </button>
          </div>
        ) : viewMode === 'dockets' ? (
          /* View Mode A: Gazette Broadsheet Docket Cards */
          <div className="boss-dockets-stream">
            {filteredProjects.map((project) => {
              const isParcelsConfirmed =
                project.status === 'PARCELS_CONFIRMED' || project.status === 'WORKFLOW_CONFIGURED';

              return (
                <article
                  key={project.id}
                  className="gazette-docket-card"
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  {/* Docket Masthead Bar */}
                  <div className="docket-top-bar">
                    <div className="docket-id-group">
                      <span className="docket-number">DOCKET № 2026/PROP/{project.code}</span>
                      <span className="docket-authority-stamp">{project.proponentAuthority}</span>
                    </div>

                    <div className="docket-badges-group">
                      <span className="statutory-clause-chip">{project.rfctlarrSection}</span>
                      <span className={`status-pill pill-${project.status.toLowerCase()}`}>
                        {project.status === 'NEW_REQUEST'
                          ? 'PENDING BOSS SCRUTINY'
                          : project.status === 'PARCELS_CONFIRMED'
                          ? 'PARCELS CONFIRMED'
                          : project.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Main Headline & Narrative Scope */}
                  <div className="docket-body">
                    <div className="docket-title-row">
                      <h4 className="docket-headline">
                        <Link
                          to={`/projects/${project.id}`}
                          className="docket-title-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {project.title}
                        </Link>
                      </h4>
                    </div>

                    <p className="docket-scope-text">{project.scope}</p>

                    {/* Architectural Requisition Grid */}
                    <div className="docket-spec-grid">
                      <div className="spec-cell">
                        <span className="spec-label">Requisition Land Area:</span>
                        <div className="spec-val-primary">
                          {(project.requestedAreaAcres ?? 0).toLocaleString()}
                          <span className="spec-unit"> Acres</span>
                          <span className="spec-secondary">({project.requestedAreaHa} Ha)</span>
                        </div>
                      </div>

                      <div className="spec-cell">
                        <span className="spec-label">Corridor Alignment &amp; RoW:</span>
                        <div className="spec-val">
                          {project.corridorKm} km{' '}
                          <span className="spec-unit">&bull; {project.alignmentWidthMeters}m RoW</span>
                        </div>
                        <span className="spec-secondary">{project.state} ({project.district})</span>
                      </div>

                      <div className="spec-cell">
                        <span className="spec-label">Cadastral Determination:</span>
                        <div className="spec-val">
                          {isParcelsConfirmed
                            ? `${project.selectedParcelsCount || 0} Parcels Bound`
                            : 'Pending Scrutiny'}
                        </div>
                        <span className="spec-secondary">
                          {isParcelsConfirmed ? 'Confirmed Bhu-Aadhaar' : 'PostGIS Buffer Pending'}
                        </span>
                      </div>

                      <div className="spec-cell">
                        <span className="spec-label">Statutory Nodal Officer:</span>
                        <div className="spec-val text-truncate">{project.nodalOfficer?.name ?? 'Unassigned'}</div>
                        <span className="spec-secondary text-truncate">{project.nodalOfficer?.designation ?? 'Pending Assignment'}</span>
                      </div>
                    </div>

                    {/* Phase 11: Workflow Progress Indicator */}
                    {project.workflowProgress && project.workflowProgress.totalStages > 0 && (
                      <div className="docket-progress-strip">
                        <div className="docket-progress-label">
                          <span>Workflow: Stage {project.workflowProgress.completedStages}/{project.workflowProgress.totalStages}</span>
                          <span className="docket-progress-pct">{project.workflowProgress.percentage}%</span>
                        </div>
                        <div className="docket-progress-track">
                          <div
                            className="docket-progress-fill"
                            style={{ width: `${project.workflowProgress.percentage}%` }}
                          />
                        </div>
                        {project.currentStage && (
                          <span className="docket-current-stage">Current: {project.currentStage}</span>
                        )}
                      </div>
                    )}

                    {/* Phase 11: Pending Action Alert */}
                    {project.hasPendingAction && project.pendingAction && (
                      <div className="docket-action-alert">
                        <span className="action-alert-icon">⚠</span>
                        <div className="action-alert-body">
                          <span className="action-alert-title">Action Required — {project.pendingAction.stageName} Rejected</span>
                          <span className="action-alert-desc">{project.pendingAction.reason}</span>
                        </div>
                        <Link
                          to={`/projects/${project.id}`}
                          className="btn-cta-danger-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Resolve →
                        </Link>
                      </div>
                    )}

                    {/* Action Bar */}
                    <div className="docket-action-bar">
                      <div className="docket-timestamp-meta">
                        <span>Submitted: {project.submissionDate}</span>
                        <span>&bull;</span>
                        <span>Statutory SLA: {project.slaDeadline}</span>
                        {project.updatedAt && (
                          <>
                            <span>&bull;</span>
                            <span>Updated: {new Date(project.updatedAt).toLocaleDateString('en-IN')}</span>
                          </>
                        )}
                      </div>

                      <div className="docket-buttons">
                        <Link
                          to={`/projects/${project.id}`}
                          className="btn-cta-blue"
                          style={{ fontSize: '13px', padding: '8px 20px', color: '#ffffff' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Track Statutory Lifecycle &rarr;
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* View Mode B: Phase 11 Compact Gazette Tabular Register with Tracking Columns */
          <div className="boss-table-container">
            <table className="boss-broadsheet-table">
              <thead>
                <tr>
                  <th style={{ width: '14%' }}>Docket Reference</th>
                  <th style={{ width: '22%' }}>Corridor Title</th>
                  <th style={{ width: '12%' }}>Current Stage</th>
                  <th style={{ width: '14%' }}>Workflow Progress</th>
                  <th style={{ width: '10%' }}>Parcels</th>
                  <th style={{ width: '10%' }}>Status</th>
                  <th style={{ width: '12%' }}>Pending Action</th>
                  <th style={{ width: '6%', textAlign: 'right' }}>Track</th>
                </tr>
              </thead>
              <tbody>
                {filteredProjects.map((project) => (
                  <tr
                    key={project.id}
                    className={`boss-table-row ${project.hasPendingAction ? 'row-action-required' : ''}`}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <td>
                      <div className="table-code-cell">
                        <span className="table-code">{project.code}</span>
                        <span className="table-agency">{project.proponentAuthority}</span>
                      </div>
                    </td>
                    <td>
                      <div className="table-title-cell">
                        <span className="table-title">{project.title}</span>
                        <span className="table-scope">{project.district}, {project.state}</span>
                      </div>
                    </td>
                    <td>
                      <span className="table-stage-name">
                        {project.currentStage || '—'}
                      </span>
                    </td>
                    <td>
                      {project.workflowProgress && project.workflowProgress.totalStages > 0 ? (
                        <div className="table-progress-cell">
                          <div className="table-progress-track">
                            <div
                              className="table-progress-fill"
                              style={{ width: `${project.workflowProgress.percentage}%` }}
                            />
                          </div>
                          <span className="table-progress-text">
                            {project.workflowProgress.completedStages}/{project.workflowProgress.totalStages}
                          </span>
                        </div>
                      ) : (
                        <span className="table-stage-name">—</span>
                      )}
                    </td>
                    <td>
                      <div className="table-area-cell">
                        <span className="table-area">
                          {project.parcelProgress
                            ? `${project.parcelProgress.confirmedCount}/${project.parcelProgress.candidateCount}`
                            : `${project.selectedParcelsCount || 0}/${project.candidateParcelsCount || 0}`}
                        </span>
                        <span className="table-corridor">{(project.requestedAreaAcres || 0).toFixed(0)} Ac</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill pill-${project.status.toLowerCase()}`}>
                        {project.status === 'NEW_REQUEST'
                          ? 'PENDING BOSS'
                          : project.status === 'PARCELS_CONFIRMED'
                          ? 'PARCELS OK'
                          : project.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td>
                      {project.hasPendingAction && project.pendingAction ? (
                        <span className="status-pill pill-rejected" title={project.pendingAction.reason}>
                          ⚠ {project.pendingAction.stageName}
                        </span>
                      ) : (
                        <span className="table-stage-name" style={{ color: '#66bb6a' }}>✓ None</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/projects/${project.id}`}
                        className="btn-cta-outline"
                        style={{ padding: '6px 12px', fontSize: '11.5px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Track →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default ProponentProjectsPage;
