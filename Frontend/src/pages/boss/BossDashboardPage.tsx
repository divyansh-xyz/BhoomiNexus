import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { bossService } from '../../services/api/boss.service';
import type { ProjectRequest, BossDashboardStats } from '../../types/boss.types';
import BhoomiLogo from '../../components/common/BhoomiLogo';
import './boss-dashboard.css';

export const BossDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<BossDashboardStats | null>(null);
  const [projects, setProjects] = useState<ProjectRequest[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'dockets' | 'compact'>('dockets');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const corridorLayersRef = useRef<{ [key: string]: { line: L.Polyline; marker: L.CircleMarker } }>({});

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsData, projectsData] = await Promise.all([
        bossService.getDashboardStats(),
        bossService.getProjects(),
      ]);
      setStats(statsData);
      setProjects(projectsData);
      if (projectsData.length > 0) {
        setSelectedProjectId(projectsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load BOSS dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    const isWorkflowReady = p.status === 'WORKFLOW_CONFIGURED' || (p.status === 'PARCELS_CONFIRMED' && (p.workflowProgress?.totalStages ?? 0) > 0);
    const isJustParcelsConfirmed = p.status === 'PARCELS_CONFIRMED' && !(p.workflowProgress && p.workflowProgress.totalStages > 0);

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'NEW_REQUEST' && (p.status === 'NEW_REQUEST' || p.status === 'DRAFT' || p.status === 'PARCELS_PENDING')) ||
      (statusFilter === 'PARCELS_CONFIRMED' && isJustParcelsConfirmed) ||
      (statusFilter === 'WORKFLOW_CONFIGURED' && isWorkflowReady) ||
      (statusFilter === 'WORKFLOW_ACTIVE' && (p.status === 'WORKFLOW_ACTIVE' || p.status === 'PROJECT_APPROVED'));

    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      p.code.toLowerCase().includes(q) ||
      p.title.toLowerCase().includes(q) ||
      p.proponentAuthority.toLowerCase().includes(q) ||
      p.state.toLowerCase().includes(q) ||
      p.district.toLowerCase().includes(q);

    return matchesStatus && matchesQuery;
  });

  // Initialize interactive National Corridor Spatial Radar map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || projects.length === 0) return;

    const map = L.map(mapContainerRef.current, {
      center: [22.5, 82.0],
      zoom: 5,
      zoomControl: true,
      attributionControl: false,
      minZoom: 4,
      maxZoom: 12,
    });

    // Esri World Dark Gray Canvas base layer — 100% free, no API key, zero watermarks
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        attribution: '&copy; Esri',
      }
    ).addTo(map);

    // Esri World Dark Gray Reference layer (crisp administrative labels)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
      }
    ).addTo(map);

    const overallBounds = L.latLngBounds([]);

    projects.forEach((proj) => {
      if (proj.corridorCoordinates && proj.corridorCoordinates.length > 0) {
        const isSelected = proj.id === selectedProjectId;

        const line = L.polyline(proj.corridorCoordinates, {
          color: isSelected ? '#0058fe' : '#64748b',
          weight: isSelected ? 5 : 3,
          opacity: isSelected ? 1 : 0.7,
        }).addTo(map);

        const startCoord = proj.corridorCoordinates[0];
        const marker = L.circleMarker(startCoord, {
          radius: isSelected ? 8 : 5,
          fillColor: isSelected ? '#0058fe' : '#64748b',
          color: isSelected ? '#ffffff' : '#94a3b8',
          weight: 2,
          fillOpacity: 1,
        }).addTo(map);

        marker.bindTooltip(
          `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11.5px; padding: 3px 6px; background: #0f172a; color: #f8fafc; border: 1px solid #334155; border-radius: 4px;">
             <strong style="color: #60a5fa;">${proj.code}</strong><br/>
             ${proj.title}<br/>
             <span style="color: #38bdf8; font-weight: 600;">${proj.requestedAreaAcres} Acres</span> &bull; ${proj.state}
           </div>`,
          { direction: 'top', sticky: true }
        );

        line.on('click', () => {
          setSelectedProjectId(proj.id);
        });
        marker.on('click', () => {
          setSelectedProjectId(proj.id);
        });

        corridorLayersRef.current[proj.id] = { line, marker };
        proj.corridorCoordinates.forEach((c) => overallBounds.extend(c));
      }
    });

    if (overallBounds.isValid()) {
      map.fitBounds(overallBounds.pad(0.25));
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      corridorLayersRef.current = {};
    };
  }, [projects]);

  // Update styles when selectedProjectId changes
  useEffect(() => {
    if (!mapRef.current) return;
    Object.entries(corridorLayersRef.current).forEach(([id, layers]) => {
      const isSelected = id === selectedProjectId;
      layers.line.setStyle({
        color: isSelected ? '#0058fe' : '#64748b',
        weight: isSelected ? 5 : 3,
        opacity: isSelected ? 1 : 0.7,
      });
      layers.marker.setStyle({
        radius: isSelected ? 8 : 5,
        fillColor: isSelected ? '#0058fe' : '#64748b',
        color: isSelected ? '#ffffff' : '#94a3b8',
      });
    });

    const activeProject = projects.find((p) => p.id === selectedProjectId);
    if (activeProject && activeProject.corridorCoordinates?.length > 0) {
      const bounds = L.latLngBounds(activeProject.corridorCoordinates);
      mapRef.current.flyToBounds(bounds.pad(0.4), { duration: 0.8 });
    }
  }, [selectedProjectId, projects]);

  const fitAllCorridors = () => {
    if (!mapRef.current || projects.length === 0) return;
    const allBounds = L.latLngBounds([]);
    projects.forEach((p) => {
      p.corridorCoordinates?.forEach((c) => allBounds.extend(c));
    });
    if (allBounds.isValid()) {
      mapRef.current.flyToBounds(allBounds.pad(0.25), { duration: 0.8 });
    }
  };

  return (
    <div className="things-boss-dashboard">
      <div className="things-boss-inner">
        {/* 1. Sovereign Gazette Extraordinary Masthead */}
        <header className="things-boss-masthead">
          <div className="things-boss-gazette-tagline">
            <span>THE GAZETTE OF INDIA EXTRAORDINARY &bull; PART II &mdash; SECTION 3 &bull; STATUTORY ACQUISITION REGISTER</span>
            <span className="things-boss-bulletin-tag">BULLETIN NO. MoRD/BOSS/2026/04</span>
          </div>

          <div className="things-boss-hero-row">
            <div className="things-boss-brand-block">
              <div className="things-boss-symbol-row">
                <BhoomiLogo size={28} strokeWidth={2.4} />
                <span>Department of Land Resources &bull; MoRD</span>
              </div>
              <h1 className="things-boss-headline">
                Bureau of Sovereign Scrutiny (BOSS)
              </h1>
              <p className="things-boss-thesis">
                Central executive clearinghouse for linear infrastructure project intake, pre-feasibility corridor verification, and statutory parcel determination pursuant to RFCTLARR Act 2013.
              </p>
            </div>

            <div className="things-boss-session-card">
              <div className="things-boss-session-header">
                <span className="things-boss-dot-pulse" />
                <span>Sovereign Ledger Status: Active</span>
              </div>
              <div className="things-boss-session-details">
                <div className="things-boss-session-row">
                  <span className="things-boss-session-label">Authority:</span>
                  <span className="things-boss-session-val">Central Nodal Oversight Directorate</span>
                </div>
                <div className="things-boss-session-row">
                  <span className="things-boss-session-label">Supervising Nodal:</span>
                  <span className="things-boss-session-val">Dr. Vikramaditya Sen, IAS</span>
                </div>
                <div className="things-boss-session-row">
                  <span className="things-boss-session-label">Jurisdiction:</span>
                  <span className="things-boss-session-val">36 States &amp; UTs</span>
                </div>
                <div className="things-boss-session-row">
                  <span className="things-boss-session-label">Sync Block:</span>
                  <span className="things-boss-session-val font-mono">#41209 &bull; WGS84 Spatial Datum</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 2. Signature Spatial Radar & Telemetry Section */}
        <section className="things-boss-radar-section">
          <div className="things-boss-radar-header">
            <div>
              <span className="things-section-eyebrow">NATIONAL GEOSPATIAL INTELLIGENCE RADAR</span>
              <h2 className="things-boss-radar-title">
                Active Megaproject Alignment Corridors Under Scrutiny
              </h2>
            </div>
            <div>
              <button
                type="button"
                onClick={fitAllCorridors}
                className="things-btn-outline"
                style={{ fontSize: '12px', padding: '6px 14px' }}
              >
                Fit National Corridors &bull; All India
              </button>
            </div>
          </div>

          <div className="things-boss-radar-card">
            <div ref={mapContainerRef} className="things-boss-map-container" />
            
            <div className="things-boss-radar-chips-bar">
              <span className="things-boss-chips-label">Corridor Quick-Focus:</span>
              {projects.length === 0 ? (
                <span style={{ fontSize: '12px', color: 'var(--tb-fog)', padding: '4px 8px' }}>
                  No active project alignment corridors loaded from API.
                </span>
              ) : (
                projects.map((p) => {
                  const isSelected = p.id === selectedProjectId;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedProjectId(p.id)}
                      className={`things-boss-corridor-chip ${isSelected ? 'active' : ''}`}
                    >
                      <span className="things-boss-chip-dot" />
                      <span style={{ fontWeight: 700 }}>{p.code}</span>
                      <span style={{ opacity: 0.8 }}>({p.state.split('&')[0].trim()})</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* 3. Requisition & Triage Bar */}
        <section className="things-boss-triage-grid">
          <div className="things-kpi-card">
            <span className="things-kpi-label">National Intake Pipeline</span>
            <div className="things-kpi-value">
              {(stats?.totalAreaHa ?? 0).toLocaleString()}<span style={{ fontSize: '16px', fontWeight: 500 }}> Ha</span>
            </div>
            <span className="things-kpi-sub">Total Requisition Under Statutory Process</span>
          </div>

          <div className="things-kpi-card">
            <span className="things-kpi-label">Determination Backlog</span>
            <div className="things-kpi-value text-signal-blue">
              {stats?.pendingConfigCount ?? 0}
            </div>
            <span className="things-kpi-sub">Projects Awaiting Spatial Parcel Confirmation</span>
          </div>

          <div className="things-kpi-card">
            <span className="things-kpi-label">New Intake Requests</span>
            <div className="things-kpi-value">
              {stats?.newRequestsCount ?? 0}
            </div>
            <span className="things-kpi-sub">Pre-Feasibility &amp; Section 4(1) Drafts</span>
          </div>

          <div className="things-kpi-card">
            <span className="things-kpi-label">Determined Today</span>
            <div className="things-kpi-value text-emerald">
              {stats?.configuredTodayCount ?? 0}
            </div>
            <span className="things-kpi-sub">Parcels Locked &amp; Pushed to CALA Workflow</span>
          </div>
        </section>

        {/* 4. Statutory Intake Scrutiny Ledger */}
        <section className="things-boss-worklist-section">
          <div className="things-toolbar-header">
            <div className="things-toolbar-left">
              <span className="things-section-eyebrow">STATUTORY PROJECT INTAKE DOCKET</span>
              <h3 className="things-worklist-heading">
                Statutory Project Intake Docket ({filteredProjects.length})
              </h3>
              <span className="things-worklist-subheading">
                Official Central Docket Register of Infrastructure Corridors Under Pre-Acquisition Scrutiny
              </span>
            </div>

            <div className="things-toolbar-right">
              {/* View Mode Toggle */}
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
                placeholder="Search by Docket Code, Proponent Agency, Corridor, or Jurisdiction..."
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
                New Requests ({projects.filter((p) => p.status === 'NEW_REQUEST' || p.status === 'DRAFT' || p.status === 'PARCELS_PENDING').length})
              </button>
              <button
                type="button"
                className={`things-filter-pill ${statusFilter === 'PARCELS_CONFIRMED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('PARCELS_CONFIRMED')}
              >
                Parcels Confirmed ({projects.filter((p) => p.status === 'PARCELS_CONFIRMED' && !(p.workflowProgress && p.workflowProgress.totalStages > 0)).length})
              </button>
              <button
                type="button"
                className={`things-filter-pill ${statusFilter === 'WORKFLOW_CONFIGURED' ? 'active' : ''}`}
                onClick={() => setStatusFilter('WORKFLOW_CONFIGURED')}
              >
                Pipeline Configured ({projects.filter((p) => p.status === 'WORKFLOW_CONFIGURED' || (p.status === 'PARCELS_CONFIRMED' && (p.workflowProgress?.totalStages ?? 0) > 0)).length})
              </button>
              <button
                type="button"
                className={`things-filter-pill ${statusFilter === 'WORKFLOW_ACTIVE' ? 'active' : ''}`}
                onClick={() => setStatusFilter('WORKFLOW_ACTIVE')}
              >
                Sanction Granted ({projects.filter((p) => p.status === 'WORKFLOW_ACTIVE' || p.status === 'PROJECT_APPROVED').length})
              </button>
            </div>
          </div>

          {/* Main Worklist Display */}
          {loading ? (
            <div className="things-loading-state">
              <BhoomiLogo size={32} strokeWidth={2.4} />
              <span>Accessing Central Sovereign Intake Register...</span>
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="things-empty-state">
              <p>No project requests match the specified query.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('ALL');
                }}
                className="things-btn-outline"
              >
                Clear Filters
              </button>
            </div>
          ) : viewMode === 'dockets' ? (
            /* View Mode A: Gazette Docket Cards */
            <div className="things-dockets-stream">
              {filteredProjects.map((project) => {
                const isSelectedOnMap = project.id === selectedProjectId;
                const isPendingParcels = project.status === 'PARCELS_PENDING' || project.status === 'NEW_REQUEST';

                return (
                  <article
                    key={project.id}
                    className={`things-docket-card ${isSelectedOnMap ? 'docket-focused' : ''}`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    {/* Docket Masthead Bar */}
                    <div className="things-docket-topbar">
                      <div className="things-docket-id-group">
                        <span className="things-docket-number">DOCKET &#x2116; 2026/MoRD/{project.code}</span>
                        <span className="things-docket-authority-stamp">{project.proponentAuthority}</span>
                      </div>

                      <div className="things-docket-badges-group">
                        <span className="things-clause-chip">{project.rfctlarrSection}</span>
                        <span className={`things-status-pill pill-${project.status.toLowerCase()}`}>
                          {project.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Main Headline & Narrative Scope */}
                    <div className="things-docket-body">
                      <div>
                        <h4 className="things-docket-headline">
                          <Link
                            to={`/boss/projects/${project.id}`}
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
                            {(project.requestedAreaAcres ?? 0).toLocaleString()}<span className="things-spec-unit"> Acres</span>{' '}
                            <span className="things-spec-secondary">({project.requestedAreaHa} Ha)</span>
                          </div>
                        </div>

                        <div className="things-spec-cell">
                          <span className="things-spec-label">Corridor Geometry &amp; RoW:</span>
                          <div className="things-spec-val">
                            {project.corridorKm} km <span className="things-spec-unit">&bull; {project.alignmentWidthMeters}m RoW</span>
                          </div>
                          <span className="things-spec-secondary">{project.state} ({project.district})</span>
                        </div>

                        <div className="things-spec-cell">
                          <span className="things-spec-label">Candidate Parcels:</span>
                          <div className="things-spec-val">
                            {project.candidateParcelsCount ?? 0} <span className="things-spec-unit">Parcels</span>
                          </div>
                          <span className="things-spec-secondary">PostGIS ST_Intersects Buffer</span>
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

                      {/* Proponent Statutory Callout */}
                      {isPendingParcels && (
                        <div className="things-boss-statutory-notice">
                          <span className="things-boss-notice-icon">&#9873;</span>
                          <span>
                            <strong>Statutory Action Required:</strong> Alignment corridor geometry verified. {project.candidateParcelsCount || 0} candidate land parcels have been intersected. Bureau parcel determination and confirmation must be completed to initiate CALA field workflow.
                          </span>
                        </div>
                      )}

                      {/* Docket Action Strip */}
                      <div className="things-docket-footer">
                        <div className="things-docket-timestamps">
                          <span>Submitted: {new Date(project.submissionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span>&bull;</span>
                          <span>Target SLA: {new Date(project.slaDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {project.status === 'PROJECT_APPROVED' || project.status === 'WORKFLOW_ACTIVE' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  fontSize: '11px',
                                  fontFamily: 'monospace',
                                  fontWeight: 700,
                                  color: 'var(--tb-emerald)',
                                  backgroundColor: 'var(--tb-emerald-soft)',
                                  padding: '5px 12px',
                                  border: '1px solid rgba(16, 185, 129, 0.3)',
                                  borderRadius: 'var(--tb-radius-buttons)',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                &#x2713; STATUTORY SANCTION GRANTED &bull; BOSS EXITED
                              </span>
                              <span
                                style={{
                                  fontSize: '12px',
                                  color: 'var(--tb-fog)',
                                  fontStyle: 'italic',
                                }}
                              >
                                Active under Processing Officers
                              </span>
                            </div>
                          ) : (
                            <>
                              <Link
                                to={`/boss/projects/${project.id}`}
                                className="things-btn-outline"
                                style={{ fontSize: '13px', padding: '7px 16px' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                Inspect Dossier &rarr;
                              </Link>

                              {isPendingParcels ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/boss/projects/${project.id}/parcels`);
                                  }}
                                  className="things-btn-requisition"
                                  style={{ margin: 0, fontSize: '13px', padding: '7px 18px' }}
                                >
                                  Determine Land Parcels &rarr;
                                </button>
                              ) : project.status === 'WORKFLOW_CONFIGURED' || (project.status === 'PARCELS_CONFIRMED' && (project.workflowProgress?.totalStages ?? 0) > 0) ? (
                                <>
                                  <Link
                                    to={`/boss/projects/${project.id}/parcels`}
                                    className="things-btn-outline"
                                    style={{ fontSize: '12.5px', padding: '6px 12px' }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Parcels ({project.selectedParcelsCount ?? 0}) &rarr;
                                  </Link>
                                  <Link
                                    to={`/boss/projects/${project.id}/workflow`}
                                    className="things-btn-outline"
                                    style={{ fontSize: '12.5px', padding: '6px 12px' }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Pipeline ({project.workflowProgress?.totalStages ?? 0} Stages) &rarr;
                                  </Link>
                                  <Link
                                    to={`/boss/projects/${project.id}`}
                                    className="things-btn-primary"
                                    style={{ fontSize: '12.5px', padding: '6px 14px', backgroundColor: '#10b981', borderColor: '#10b981' }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    ✓ Approve Forward &rarr;
                                  </Link>
                                </>
                              ) : project.status === 'PARCELS_CONFIRMED' ? (
                                <>
                                  <Link
                                    to={`/boss/projects/${project.id}/parcels`}
                                    className="things-btn-outline"
                                    style={{ fontSize: '12.5px', padding: '6px 12px' }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Parcels ({project.selectedParcelsCount ?? 0}) &rarr;
                                  </Link>
                                  <Link
                                    to={`/boss/projects/${project.id}/workflow?select=true`}
                                    className="things-btn-requisition"
                                    style={{ margin: 0, fontSize: '12.5px', padding: '6px 14px' }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Choose Workflow &rarr;
                                  </Link>
                                </>
                              ) : null}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* View Mode B: Compact Gazette Tabular Register */
            <div className="things-table-wrapper">
              <table className="things-register-table">
                <thead>
                  <tr>
                    <th style={{ width: '18%' }}>Docket Reference &amp; Agency</th>
                    <th style={{ width: '32%' }}>Corridor Title &amp; Statutory Scope</th>
                    <th style={{ width: '14%' }}>Jurisdiction</th>
                    <th style={{ width: '14%' }}>Requisition Area</th>
                    <th style={{ width: '12%' }}>Status</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map((project) => (
                    <tr
                      key={project.id}
                      className={project.id === selectedProjectId ? 'row-focused' : ''}
                      onClick={() => setSelectedProjectId(project.id)}
                    >
                      <td>
                        <div className="things-table-docket-cell">
                          <span className="things-table-code">{project.code}</span>
                          <span className="things-table-agency">{project.proponentAuthority}</span>
                        </div>
                      </td>
                      <td>
                        <div className="things-table-title-cell">
                          <Link
                            to={`/boss/projects/${project.id}`}
                            style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {project.title}
                          </Link>
                          <span className="things-table-scope">{project.rfctlarrSection}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>{project.state}</span>
                          <span style={{ fontSize: '11.5px', color: 'var(--tb-fog)' }}>{project.district}</span>
                        </div>
                      </td>
                      <td>
                        <div className="things-table-area-cell">
                          <span className="things-table-area">{(project.requestedAreaAcres ?? 0).toLocaleString()} Acres</span>
                          <span className="things-table-corridor">({project.requestedAreaHa} Ha)</span>
                        </div>
                      </td>
                      <td>
                        <span className={`things-status-pill pill-${project.status.toLowerCase()}`}>
                          {project.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {project.status === 'PROJECT_APPROVED' || project.status === 'WORKFLOW_ACTIVE' ? (
                          <span style={{ fontSize: '11px', color: 'var(--tb-emerald)', fontWeight: 600, fontFamily: 'monospace' }}>
                            &#x2713; BOSS EXITED
                          </span>
                        ) : (
                          <Link
                            to={project.status === 'PARCELS_PENDING' ? `/boss/projects/${project.id}/parcels` : `/boss/projects/${project.id}`}
                            className="things-btn-table-track"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {project.status === 'PARCELS_PENDING' ? 'Parcels \u2192' : 'Dossier \u2192'}
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Gazette Colophon Footer */}
          <div className="things-boss-colophon">
            <span>Central Land Records Nodal Clearinghouse &bull; DoLR &bull; RFCTLARR Compliance Engine</span>
            <span>Showing {filteredProjects.length} of {projects.length} Registered Infrastructure Corridors</span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default BossDashboardPage;
