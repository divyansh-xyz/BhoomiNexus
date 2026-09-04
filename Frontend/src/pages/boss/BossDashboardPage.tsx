import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { bossService } from '../../services/api/boss.service';
import type { ProjectRequest, BossDashboardStats } from '../../types/boss.types';
import BhoomiLogo from '../../components/common/BhoomiLogo';

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
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PARCELS_PENDING' && p.status === 'PARCELS_PENDING') ||
      (statusFilter === 'NEW_REQUEST' && p.status === 'NEW_REQUEST') ||
      (statusFilter === 'UNDER_REVIEW' && p.status === 'UNDER_REVIEW') ||
      (statusFilter === 'CONFIRMED' && (p.status === 'PARCELS_CONFIRMED' || p.status === 'WORKFLOW_CONFIGURED'));

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
          `<div style="font-family: 'Lora', serif; font-size: 11.5px; padding: 3px 6px; background: #0f172a; color: #f8fafc; border: 1px solid #334155;">
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
    if (activeProject && activeProject.corridorCoordinates.length > 0) {
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
    <div className="boss-page-container">
      {/* 1. Sovereign Gazette Extraordinary Masthead */}
      <header className="boss-executive-masthead">
        <div className="masthead-gazette-tagline">
          <span>THE GAZETTE OF INDIA EXTRAORDINARY &bull; PART II &mdash; SECTION 3 &bull; STATUTORY ACQUISITION REGISTER</span>
          <span className="masthead-bulletin">BULLETIN NO. MoRD/BOSS/2026/04</span>
        </div>

        <div className="masthead-main-row">
          <div className="masthead-brand-block">
            <div className="masthead-symbol-row">
              <BhoomiLogo size={32} strokeWidth={2.4} />
              <span className="masthead-org-title">Department of Land Resources &bull; MoRD</span>
            </div>
            <h1 className="masthead-headline">
              Bureau of Sovereign Scrutiny (BOSS)
            </h1>
            <p className="masthead-thesis">
              Central executive clearinghouse for linear infrastructure project intake, pre-feasibility corridor verification, and statutory parcel determination pursuant to RFCTLARR Act 2013.
            </p>
          </div>

          <div className="masthead-stamp-box">
            <div className="stamp-header">
              <span className="status-dot-pulse" />
              <span>Sovereign Ledger Status: Active</span>
            </div>
            <div className="stamp-details">
              <div className="stamp-row">
                <span className="stamp-label">Authority:</span>
                <span className="stamp-val">Central Nodal Oversight Directorate</span>
              </div>
              <div className="stamp-row">
                <span className="stamp-label">Supervising Nodal:</span>
                <span className="stamp-val">Dr. Vikramaditya Sen, IAS</span>
              </div>
              <div className="stamp-row">
                <span className="stamp-label">Jurisdiction:</span>
                <span className="stamp-val">36 States &amp; Union Territories</span>
              </div>
              <div className="stamp-row">
                <span className="stamp-label">Sync Block:</span>
                <span className="stamp-val font-mono">#41209 &bull; WGS84 Spatial Datum</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="hairline-fullwidth" />

      {/* 2. Signature Spatial Radar & Telemetry Section */}
      <section className="boss-spatial-radar-section">
        <div className="radar-header-row">
          <div>
            <span className="editorial-section-tag">NATIONAL GEOSPATIAL INTELLIGENCE RADAR</span>
            <h2 className="radar-section-title">
              Active Megaproject Alignment Corridors Under Scrutiny
            </h2>
          </div>
          <div className="radar-action-controls">
            <button
              type="button"
              onClick={fitAllCorridors}
              className="btn-cta-outline"
              style={{ fontSize: '12px', padding: '6px 14px' }}
            >
              Fit National Corridors &bull; All India
            </button>
          </div>
        </div>

        <div className="boss-radar-canvas-card">
          <div ref={mapContainerRef} className="boss-radar-map" />
          
          <div className="boss-radar-corridor-chips">
            <span className="chips-label">Corridor Quick-Focus:</span>
            {projects.length === 0 ? (
              <span style={{ fontSize: '12px', color: 'var(--color-fossil-gray)', padding: '4px 8px' }}>
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
                    className={`radar-corridor-chip ${isSelected ? 'active' : ''}`}
                  >
                    <span className="chip-indicator" style={{ backgroundColor: isSelected ? '#0058fe' : '#000000' }} />
                    <span className="chip-code">{p.code}</span>
                    <span className="chip-state">({p.state.split('&')[0].trim()})</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </section>

      <div className="hairline-fullwidth" />

      {/* 3. Broadsheet Requisition & Triage Bar */}
      <section className="boss-triage-summary-bar">
        <div className="triage-grid">
          <div className="triage-card">
            <span className="triage-label">National Intake Pipeline</span>
            <div className="triage-value">
              {(stats?.totalAreaHa ?? 0).toLocaleString()}<span className="triage-unit"> Ha</span>
            </div>
            <span className="triage-sub">Total Requisition Under Statutory Process</span>
          </div>

          <div className="triage-card triage-highlight">
            <span className="triage-label">Determination Backlog</span>
            <div className="triage-value text-signal-blue">
              {stats?.pendingConfigCount ?? 0}
            </div>
            <span className="triage-sub">Projects Awaiting Spatial Parcel Confirmation</span>
          </div>

          <div className="triage-card">
            <span className="triage-label">New Intake Requests</span>
            <div className="triage-value">
              {stats?.newRequestsCount ?? 0}
            </div>
            <span className="triage-sub">Pre-Feasibility &amp; Section 4(1) Drafts</span>
          </div>

          <div className="triage-card">
            <span className="triage-label">Determined Today</span>
            <div className="triage-value">
              {stats?.configuredTodayCount ?? 0}
            </div>
            <span className="triage-sub">Parcels Locked &amp; Pushed to CALA Workflow</span>
          </div>
        </div>
      </section>

      <div className="hairline-fullwidth" />

      {/* 4. Statutory Intake Scrutiny Ledger */}
      <section className="boss-ledger-section">
        <div className="ledger-header-toolbar">
          <div className="toolbar-left">
            <h3 className="ledger-heading">Statutory Project Intake Docket</h3>
            <span className="ledger-subheading">
              Official Central Docket Register of Infrastructure Corridors Under Pre-Acquisition Scrutiny
            </span>
          </div>

          <div className="toolbar-right">
            {/* View Mode Toggle */}
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
              placeholder="Search by Docket Code, Proponent Agency, Corridor, or Jurisdiction..."
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
              className={`filter-tab-pill ${statusFilter === 'PARCELS_PENDING' ? 'active' : ''}`}
              onClick={() => setStatusFilter('PARCELS_PENDING')}
            >
              Parcels Pending Scrutiny
            </button>
            <button
              type="button"
              className={`filter-tab-pill ${statusFilter === 'NEW_REQUEST' ? 'active' : ''}`}
              onClick={() => setStatusFilter('NEW_REQUEST')}
            >
              New Requests
            </button>
            <button
              type="button"
              className={`filter-tab-pill ${statusFilter === 'UNDER_REVIEW' ? 'active' : ''}`}
              onClick={() => setStatusFilter('UNDER_REVIEW')}
            >
              Under Scrutiny
            </button>
            <button
              type="button"
              className={`filter-tab-pill ${statusFilter === 'CONFIRMED' ? 'active' : ''}`}
              onClick={() => setStatusFilter('CONFIRMED')}
            >
              Parcels Confirmed
            </button>
          </div>
        </div>

        {/* Main Worklist Display */}
        {loading ? (
          <div className="boss-loading-ledger">
            <BhoomiLogo size={28} strokeWidth={2.4} />
            <span>Accessing Central Sovereign Intake Register...</span>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="boss-empty-ledger">
            <p>No project requests match the specified query.</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="btn-cta-outline"
              style={{ marginTop: '12px' }}
            >
              Clear Filters
            </button>
          </div>
        ) : viewMode === 'dockets' ? (
          /* View Mode A: Gazette Docket Cards */
          <div className="boss-dockets-stream">
            {filteredProjects.map((project) => {
              const isSelectedOnMap = project.id === selectedProjectId;
              const isPendingParcels = project.status === 'PARCELS_PENDING';

              return (
                <article
                  key={project.id}
                  className={`gazette-docket-card ${isSelectedOnMap ? 'docket-focused' : ''}`}
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  {/* Docket Masthead Bar */}
                  <div className="docket-top-bar">
                    <div className="docket-id-group">
                      <span className="docket-number">DOCKET № 2026/MoRD/{project.code}</span>
                      <span className="docket-authority-stamp">{project.proponentAuthority}</span>
                    </div>

                    <div className="docket-badges-group">
                      <span className="statutory-clause-chip">{project.rfctlarrSection}</span>
                      <span className={`status-pill pill-${project.status.toLowerCase()}`}>
                        {project.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Main Headline & Narrative Scope */}
                  <div className="docket-body">
                    <div className="docket-title-row">
                      <h4 className="docket-headline">
                        <Link
                          to={`/boss/projects/${project.id}`}
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
                          {project.requestedAreaAcres.toLocaleString()}<span className="spec-unit"> Acres</span>
                          <span className="spec-secondary">({project.requestedAreaHa} Ha)</span>
                        </div>
                      </div>

                      <div className="spec-cell">
                        <span className="spec-label">Corridor Geometry &amp; RoW:</span>
                        <div className="spec-val">
                          {project.corridorKm} km <span className="spec-unit">&bull; {project.alignmentWidthMeters}m RoW</span>
                        </div>
                        <span className="spec-secondary">{project.state} ({project.district})</span>
                      </div>

                      <div className="spec-cell">
                        <span className="spec-label">Candidate Parcels:</span>
                        <div className="spec-val">
                          {project.candidateParcelsCount ?? 0} <span className="spec-unit">Parcels</span>
                        </div>
                        <span className="spec-secondary">PostGIS ST_Intersects Buffer</span>
                      </div>

                      <div className="spec-cell">
                        <span className="spec-label">Statutory Nodal Officer:</span>
                        <div className="spec-val text-truncate">{project.nodalOfficer.name}</div>
                        <span className="spec-secondary text-truncate">{project.nodalOfficer.designation}</span>
                      </div>
                    </div>

                    {/* Proponent Statutory Callout */}
                    {isPendingParcels && (
                      <div className="docket-statutory-notice">
                        <span className="notice-icon">&#9873;</span>
                        <span>
                          <strong>Statutory Action Required:</strong> Alignment corridor geometry verified. {project.candidateParcelsCount || 0} candidate land parcels have been intersected. Bureau parcel determination and confirmation must be completed to initiate CALA field workflow.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Docket Action Strip */}
                  <div className="docket-action-bar">
                    <div className="docket-timestamp-meta">
                      <span>Submitted: {new Date(project.submissionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <span>&bull;</span>
                      <span>Target SLA: {new Date(project.slaDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>

                    <div className="docket-buttons">
                      <Link
                        to={`/boss/projects/${project.id}`}
                        className="btn-cta-outline"
                        style={{ fontSize: '13px', padding: '8px 18px' }}
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
                          className="btn-cta-blue"
                          style={{ fontSize: '13px', padding: '8px 22px' }}
                        >
                          Determine Land Parcels &rarr;
                        </button>
                      ) : project.status === 'PARCELS_CONFIRMED' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Link
                            to={`/boss/projects/${project.id}/parcels`}
                            className="btn-cta-outline"
                            style={{ fontSize: '13px', padding: '8px 14px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Parcels ({project.selectedParcelsCount ?? 250})
                          </Link>
                          <Link
                            to={`/boss/projects/${project.id}`}
                            className="btn-cta-blue"
                            style={{ fontSize: '13px', padding: '8px 18px', color: '#ffffff', backgroundColor: '#15803d', borderColor: '#15803d', fontWeight: 700 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Review &amp; Approve &rarr;
                          </Link>
                        </div>
                      ) : project.status === 'WORKFLOW_CONFIGURED' ? (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Link
                            to={`/boss/projects/${project.id}/workflow`}
                            className="btn-cta-outline"
                            style={{ fontSize: '13px', padding: '8px 14px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Manage Pipeline
                          </Link>
                          <Link
                            to={`/boss/projects/${project.id}`}
                            className="btn-cta-blue"
                            style={{ fontSize: '13px', padding: '8px 18px', color: '#ffffff', backgroundColor: '#15803d', borderColor: '#15803d', fontWeight: 700 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Approve Forward &rarr;
                          </Link>
                        </div>
                      ) : project.status === 'PROJECT_APPROVED' || project.status === 'WORKFLOW_ACTIVE' ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: '12px',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              color: '#15803d',
                              backgroundColor: '#dcfce7',
                              padding: '6px 12px',
                              border: '1px solid #86efac',
                            }}
                          >
                            ✓ APPROVED (IN PIPELINE)
                          </span>
                          <Link
                            to={`/boss/projects/${project.id}`}
                            className="btn-cta-outline"
                            style={{ fontSize: '13px', padding: '8px 14px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            Track Pipeline &rarr;
                          </Link>
                        </div>
                      ) : (
                        <Link
                          to={`/boss/projects/${project.id}`}
                          className="btn-cta-black"
                          style={{ fontSize: '13px', padding: '8px 20px' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Review Pre-Feasibility &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          /* View Mode B: Compact Gazette Tabular Register */
          <div className="boss-table-container">
            <table className="boss-broadsheet-table">
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
                    className={`boss-table-row ${project.id === selectedProjectId ? 'row-focused' : ''}`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <td>
                      <div className="boss-code-cell">
                        <span className="boss-project-code">{project.code}</span>
                        <span className="boss-proponent-agency">{project.proponentAuthority}</span>
                      </div>
                    </td>
                    <td>
                      <div className="boss-title-cell">
                        <Link
                          to={`/boss/projects/${project.id}`}
                          className="boss-project-link"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {project.title}
                        </Link>
                        <span className="boss-statutory-clause">{project.rfctlarrSection}</span>
                      </div>
                    </td>
                    <td>
                      <div className="boss-geo-cell">
                        <span className="boss-state-label">{project.state}</span>
                        <span className="boss-dist-label">{project.district}</span>
                      </div>
                    </td>
                    <td>
                      <div className="boss-area-cell">
                        <span className="boss-area-acres">{project.requestedAreaAcres.toLocaleString()} Acres</span>
                        <span className="boss-area-ha">({project.requestedAreaHa} Ha)</span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill pill-${project.status.toLowerCase()}`}>
                        {project.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={project.status === 'PARCELS_PENDING' ? `/boss/projects/${project.id}/parcels` : `/boss/projects/${project.id}`}
                        className="btn-cta-outline"
                        style={{ padding: '6px 12px', fontSize: '11.5px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {project.status === 'PARCELS_PENDING' ? 'Parcels \u2192' : 'Dossier \u2192'}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Gazette Colophon Footer */}
        <div className="boss-ledger-colophon">
          <span>Central Land Records Nodal Clearinghouse &bull; DoLR &bull; RFCTLARR Compliance Engine</span>
          <span>Showing {filteredProjects.length} of {projects.length} Registered Infrastructure Corridors</span>
        </div>
      </section>
    </div>
  );
};

export default BossDashboardPage;
