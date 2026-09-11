import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import BhoomiLogo from '../../components/common/BhoomiLogo';
import { bossService } from '../../services/api/boss.service';
import { NotificationService, type NotificationItem } from '../../services/api/notification.service';
import type { ProjectRequest } from '../../types/boss.types';
import type { ProponentDashboardStats } from '../../types/proponent.types';
import './proponent-dashboard.css';

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
    <div className="things-proponent-dashboard">
      <div className="things-dashboard-inner">
        {/* 1. Sovereign Gazette Extraordinary Masthead */}
        <header className="things-masthead-hero">
          <div className="things-gazette-tagline">
            <span>THE GAZETTE OF INDIA EXTRAORDINARY &bull; STATUTORY PROPONENT INTAKE REGISTER</span>
            <span className="things-bulletin-tag">INTAKE NODE #04 &bull; RFCTLARR ACT 2013</span>
          </div>

          <div className="things-hero-main-row">
            <div className="things-hero-brand-block">
              <div className="things-symbol-row">
                <BhoomiLogo size={26} strokeWidth={2.4} />
                <span>National Infrastructure Pipeline &bull; Proponent Directorate</span>
              </div>
              <h1 className="things-hero-headline">
                Statutory Project Requisitions
              </h1>
              <p className="things-hero-thesis">
                Central Proponent Registry for Linear Corridors, Metro Rail, and National Infrastructure Land Acquisition under Section 2(1) RFCTLARR Act 2013.
              </p>
            </div>

            <div className="things-intake-card">
              <div className="things-intake-header">
                <span className="things-status-dot-pulse" />
                <span>Agency Intake Session: Active</span>
              </div>
              <div className="things-intake-details">
                <div className="things-intake-row">
                  <span className="things-intake-label">Authority:</span>
                  <span className="things-intake-val">National Highways Authority of India (NHAI)</span>
                </div>
                <div className="things-intake-row">
                  <span className="things-intake-label">Supervising Officer:</span>
                  <span className="things-intake-val">Shri Rajesh K. Verma, CGM (LA)</span>
                </div>
                <div className="things-intake-row">
                  <span className="things-intake-label">Statutory Rule:</span>
                  <span className="things-intake-val">14-Day Central Scrutiny Rule</span>
                </div>
                <div className="things-intake-row">
                  <span className="things-intake-label">Spatial Datum:</span>
                  <span className="things-intake-val font-mono">WGS84 &bull; EPSG:4326</span>
                </div>
              </div>

              <Link
                to="/projects/new"
                className="things-btn-requisition"
              >
                + Initiate New Gazette Requisition &rarr;
              </Link>
            </div>
          </div>
        </header>

        {/* 2. Requisition & Triage Summary Metrics */}
        <section className="things-triage-grid">
          <div className="things-kpi-card">
            <span className="things-kpi-label">Total Requisitions</span>
            <div className="things-kpi-value">
              {stats?.totalRequisitions ?? projects.length}
            </div>
            <span className="things-kpi-sub">Cumulative Corridors Initiated across Agencies</span>
          </div>

          <div className="things-kpi-card">
            <span className="things-kpi-label">Under Central Scrutiny</span>
            <div className="things-kpi-value text-signal-blue">
              {stats?.underBossScrutiny ?? 0}
            </div>
            <span className="things-kpi-sub">Intakes Awaiting PostGIS Cadastral Determination</span>
          </div>

          <div className="things-kpi-card">
            <span className="things-kpi-label">Parcels Confirmed</span>
            <div className="things-kpi-value text-emerald">
              {stats?.parcelsDetermined ?? 0}
            </div>
            <span className="things-kpi-sub">Corridors with Confirmed Bhu-Aadhaar ULPINs</span>
          </div>

          <div className="things-kpi-card">
            <span className="things-kpi-label">Active Drafts</span>
            <div className="things-kpi-value">
              {stats?.draftsCount ?? 0}
            </div>
            <span className="things-kpi-sub">Alignment Coordinates &amp; DPR Drafts Awaiting Submission</span>
          </div>
        </section>

        {/* 2.5. Statutory Protocol Notifications & Action Directives Bulletin */}
        {notifications.length > 0 && (
          <section className="things-notifications-section">
            <div className="things-notifications-header">
              <div className="things-notif-title-group">
                <span className="things-notif-pulse" />
                <span className="things-notif-section-tag">
                  STATUTORY PROTOCOL ALERTS &amp; NOTIFICATIONS ({notifications.filter((n) => !n.read).length} UNREAD)
                </span>
              </div>
              <span className="things-notif-subtitle">
                Real-time Sovereign Directives from BOSS Scrutiny &amp; Field Officers
              </span>
            </div>

            <div className="things-notifications-grid">
              {notifications.map((notif) => {
                const isRejected = notif.type === 'STAGE_REJECTED';
                const isApproved = notif.type === 'BOSS_APPROVED' || notif.type === 'PROCESS_COMPLETED';
                const isAccepted = notif.type === 'STAGE_ACCEPTED';

                const badgeClass = isRejected
                  ? 'badge-rejected'
                  : isApproved
                  ? 'badge-approved'
                  : isAccepted
                  ? 'badge-accepted'
                  : 'badge-default';

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
                    className={`things-notification-card ${notif.read ? 'notif-read' : 'notif-unread'}`}
                  >
                    <div>
                      <div className="things-notif-top">
                        <span className={`things-notif-badge ${badgeClass}`}>
                          {badgeText}
                        </span>
                        <div className="things-notif-meta-right">
                          <span className="things-notif-time">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDismissNotification(notif.id, e)}
                            title="Mark as read / dismiss"
                            className="things-notif-dismiss-btn"
                          >
                            &times;
                          </button>
                        </div>
                      </div>

                      <h4 className="things-notif-heading">
                        {notif.title}
                      </h4>

                      <p className="things-notif-message">
                        {notif.message}
                      </p>
                    </div>

                    <div className="things-notif-footer">
                      <span className="things-notif-docket-code">
                        {notif.projectCode || notif.metadata?.projectCode || 'STATUTORY DOCKET'}
                      </span>
                      {notif.link && (
                        <Link
                          to={notif.link}
                          onClick={() => handleDismissNotification(notif.id)}
                          className={`things-notif-action-link ${
                            isRejected ? 'link-danger' : isApproved ? 'link-success' : ''
                          }`}
                        >
                          <span>{isRejected ? 'Resubmit Corrective Evidence \u2192' : 'Open Project Dossier \u2192'}</span>
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
        <section className="things-worklist-section">
          <div className="things-toolbar-header">
            <div className="things-toolbar-left">
              <span className="things-section-eyebrow">STATUTORY INFRASTRUCTURE DOCKETS</span>
              <h3 className="things-worklist-heading">
                Proponent Acquisition Requisition Worklist ({filteredProjects.length})
              </h3>
              <span className="things-worklist-subheading">
                Official Proponent Gazette Submissions Under Section 2(1) Infrastructure Corridors
              </span>
            </div>

            <div className="things-toolbar-right">
              <div className="things-view-toggle">
                <button
                  type="button"
                  onClick={() => setViewMode('dockets')}
                  className={`things-view-btn ${viewMode === 'dockets' ? 'active' : ''}`}
                  title="Gazette Docket Cards View"
                >
                  Gazette Dockets
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('compact')}
                  className={`things-view-btn ${viewMode === 'compact' ? 'active' : ''}`}
                  title="Compact Broadsheet Register View"
                >
                  Compact Register
                </button>
              </div>
            </div>
          </div>

          {/* Filter and Search Strip */}
          <div className="things-controls-bar">
            <div className="things-search-wrapper">
              <input
                type="text"
                placeholder="Search by Docket Code, Authority, Corridor Title, or State..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="things-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="things-clear-search-btn"
                >
                  &times;
                </button>
              )}
            </div>

            <div className="things-filter-tabs">
              <button
                type="button"
                className={`things-filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setStatusFilter('ALL')}
              >
                All Dockets ({projects.length})
              </button>
              <button
                type="button"
                className={`things-filter-pill ${statusFilter === 'NEW_REQUEST' ? 'active' : ''}`}
                onClick={() => setStatusFilter('NEW_REQUEST')}
              >
                Pending BOSS Scrutiny
              </button>
              <button
                type="button"
                className={`things-filter-pill ${statusFilter === 'CONFIRMED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('CONFIRMED')}
              >
                Parcels Confirmed
              </button>
              <button
                type="button"
                className={`things-filter-pill ${statusFilter === 'ACTION_REQUIRED' ? 'active' : ''} ${actionRequiredCount > 0 ? 'pill-urgent' : ''}`}
                onClick={() => setStatusFilter('ACTION_REQUIRED')}
              >
                &#x26A0; Action Required {actionRequiredCount > 0 ? `(${actionRequiredCount})` : ''}
              </button>
            </div>
          </div>

          {/* Main Worklist Display */}
          {loading ? (
            <div className="things-loading-state">
              <BhoomiLogo size={32} strokeWidth={2.4} />
              <span>Accessing Sovereign Proponent Register...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="things-empty-state">
              <p>No project requisitions match the specified query.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="things-btn-outline"
              >
                Clear Active Filters
              </button>
            </div>
          ) : viewMode === 'dockets' ? (
            /* View Mode A: Gazette Broadsheet Docket Cards */
            <div className="things-dockets-stream">
              {filteredProjects.map((project) => {
                const isParcelsConfirmed =
                  project.status === 'PARCELS_CONFIRMED' || project.status === 'WORKFLOW_CONFIGURED';

                return (
                  <article
                    key={project.id}
                    className="things-docket-card"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    {/* Docket Masthead Bar */}
                    <div className="things-docket-topbar">
                      <div className="things-docket-id-group">
                        <span className="things-docket-number">DOCKET &#x2116; 2026/PROP/{project.code}</span>
                        <span className="things-docket-authority-stamp">{project.proponentAuthority}</span>
                      </div>

                      <div className="things-docket-badges-group">
                        <span className="things-clause-chip">{project.rfctlarrSection}</span>
                        <span className={`things-status-pill pill-${project.status.toLowerCase()}`}>
                          {project.status === 'NEW_REQUEST'
                            ? 'PENDING BOSS SCRUTINY'
                            : project.status === 'PARCELS_CONFIRMED'
                            ? 'PARCELS CONFIRMED'
                            : project.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Main Headline & Narrative Scope */}
                    <div className="things-docket-body">
                      <div>
                        <h4 className="things-docket-headline">
                          <Link
                            to={`/projects/${project.id}`}
                            className="things-docket-title-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {project.title}
                          </Link>
                        </h4>
                      </div>

                      <p className="things-docket-scope">{project.scope}</p>

                      {/* Architectural Requisition Grid */}
                      <div className="things-spec-grid">
                        <div className="things-spec-cell">
                          <span className="things-spec-label">Requisition Land Area:</span>
                          <div className="things-spec-val-primary">
                            {(project.requestedAreaAcres ?? 0).toLocaleString()}
                            <span className="things-spec-unit"> Acres</span>{' '}
                            <span className="things-spec-secondary">({project.requestedAreaHa} Ha)</span>
                          </div>
                        </div>

                        <div className="things-spec-cell">
                          <span className="things-spec-label">Corridor Alignment &amp; RoW:</span>
                          <div className="things-spec-val">
                            {project.corridorKm} km{' '}
                            <span className="things-spec-unit">&bull; {project.alignmentWidthMeters}m RoW</span>
                          </div>
                          <span className="things-spec-secondary">{project.state} ({project.district})</span>
                        </div>

                        <div className="things-spec-cell">
                          <span className="things-spec-label">Cadastral Determination:</span>
                          <div className="things-spec-val">
                            {isParcelsConfirmed
                              ? `${project.selectedParcelsCount || 0} Parcels Bound`
                              : 'Pending Scrutiny'}
                          </div>
                          <span className="things-spec-secondary">
                            {isParcelsConfirmed ? 'Confirmed Bhu-Aadhaar' : 'PostGIS Buffer Pending'}
                          </span>
                        </div>

                        <div className="things-spec-cell">
                          <span className="things-spec-label">Statutory Nodal Officer:</span>
                          <div className="things-spec-val" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {project.nodalOfficer?.name ?? 'Unassigned'}
                          </div>
                          <span className="things-spec-secondary" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {project.nodalOfficer?.designation ?? 'Pending Assignment'}
                          </span>
                        </div>
                      </div>

                      {/* Phase 11: Workflow Progress Indicator */}
                      {project.workflowProgress && project.workflowProgress.totalStages > 0 && (
                        <div className="things-progress-strip">
                          <div className="things-progress-label-row">
                            <span>Workflow: Stage {project.workflowProgress.completedStages}/{project.workflowProgress.totalStages}</span>
                            <span className="things-progress-pct">{project.workflowProgress.percentage}%</span>
                          </div>
                          <div className="things-progress-track">
                            <div
                              className="things-progress-fill"
                              style={{ width: `${project.workflowProgress.percentage}%` }}
                            />
                          </div>
                          {project.currentStage && (
                            <span className="things-current-stage-text">Current: {project.currentStage}</span>
                          )}
                        </div>
                      )}

                      {/* Phase 11: Pending Action Alert */}
                      {project.hasPendingAction && project.pendingAction && (
                        <div className="things-action-alert-box">
                          <div className="things-alert-content">
                            <span className="things-alert-icon">&#x26A0;</span>
                            <div className="things-alert-texts">
                              <span className="things-alert-title">Action Required — {project.pendingAction.stageName} Rejected</span>
                              <span className="things-alert-desc">{project.pendingAction.reason}</span>
                            </div>
                          </div>
                          <Link
                            to={`/projects/${project.id}`}
                            className="things-btn-resolve"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Resolve &rarr;
                          </Link>
                        </div>
                      )}

                      {/* Action Bar */}
                      <div className="things-docket-footer">
                        <div className="things-docket-timestamps">
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

                        <div>
                          <Link
                            to={`/projects/${project.id}`}
                            className="things-btn-track-lifecycle"
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
            /* View Mode B: Compact Broadsheet Tabular Register with Tracking Columns */
            <div className="things-table-wrapper">
              <table className="things-register-table">
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
                      className={project.hasPendingAction ? 'row-action-needed' : ''}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <td>
                        <div className="things-table-docket-cell">
                          <span className="things-table-code">{project.code}</span>
                          <span className="things-table-agency">{project.proponentAuthority}</span>
                        </div>
                      </td>
                      <td>
                        <div className="things-table-title-cell">
                          <span className="things-table-title">{project.title}</span>
                          <span className="things-table-scope">{project.district}, {project.state}</span>
                        </div>
                      </td>
                      <td>
                        <span className="things-table-stage-name">
                          {project.currentStage || '—'}
                        </span>
                      </td>
                      <td>
                        {project.workflowProgress && project.workflowProgress.totalStages > 0 ? (
                          <div className="things-table-progress-cell">
                            <div className="things-table-progress-track">
                              <div
                                className="things-table-progress-fill"
                                style={{ width: `${project.workflowProgress.percentage}%` }}
                              />
                            </div>
                            <span className="things-table-progress-text">
                              {project.workflowProgress.completedStages}/{project.workflowProgress.totalStages}
                            </span>
                          </div>
                        ) : (
                          <span className="things-table-stage-name">—</span>
                        )}
                      </td>
                      <td>
                        <div className="things-table-area-cell">
                          <span className="things-table-area">
                            {project.parcelProgress
                              ? `${project.parcelProgress.confirmedCount}/${project.parcelProgress.candidateCount}`
                              : `${project.selectedParcelsCount || 0}/${project.candidateParcelsCount || 0}`}
                          </span>
                          <span className="things-table-corridor">{(project.requestedAreaAcres || 0).toFixed(0)} Ac</span>
                        </div>
                      </td>
                      <td>
                        <span className={`things-status-pill pill-${project.status.toLowerCase()}`}>
                          {project.status === 'NEW_REQUEST'
                            ? 'PENDING BOSS'
                            : project.status === 'PARCELS_CONFIRMED'
                            ? 'PARCELS OK'
                            : project.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td>
                        {project.hasPendingAction && project.pendingAction ? (
                          <span className="things-status-pill" style={{ backgroundColor: 'var(--tp-rose-soft)', color: 'var(--tp-rose)', border: '1px solid rgba(239,68,68,0.3)' }} title={project.pendingAction.reason}>
                            &#x26A0; {project.pendingAction.stageName}
                          </span>
                        ) : (
                          <span className="things-table-stage-name" style={{ color: 'var(--tp-emerald)', fontWeight: 600 }}>&#x2713; None</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link
                          to={`/projects/${project.id}`}
                          className="things-btn-table-track"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Track &rarr;
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
    </div>
  );
};

export default ProponentProjectsPage;
