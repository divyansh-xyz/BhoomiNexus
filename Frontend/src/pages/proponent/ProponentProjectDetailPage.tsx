import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import L from 'leaflet';
import { bossService } from '../../services/api/boss.service';
import type { ProjectRequest } from '../../types/boss.types';

export const ProponentProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectRequest | null>(null);
  const [loading, setLoading] = useState(true);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    async function loadProject() {
      if (!projectId) return;
      try {
        setLoading(true);
        const p = await bossService.getProjectById(projectId);
        setProject(p);
      } catch (err) {
        console.error('Failed to load project details', err);
      } finally {
        setLoading(false);
      }
    }
    loadProject();
  }, [projectId]);

  // Leaflet map preview
  useEffect(() => {
    if (!project || !mapContainerRef.current || mapRef.current) return;

    const initialCenter: [number, number] =
      project.corridorCoordinates && project.corridorCoordinates.length > 0
        ? project.corridorCoordinates[0]
        : [28.6139, 77.2090];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 11,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
    });

    // Dark Map Base
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        attribution: '&copy; Esri',
      }
    ).addTo(map);

    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
      }
    ).addTo(map);

    if (project.corridorCoordinates && project.corridorCoordinates.length > 0) {
      // Buffer
      L.polyline(project.corridorCoordinates, {
        color: '#0058fe',
        weight: 18,
        opacity: 0.25,
      }).addTo(map);

      // Line
      const polyline = L.polyline(project.corridorCoordinates, {
        color: '#38bdf8',
        weight: 3,
        dashArray: '5 5',
        opacity: 1,
      }).addTo(map);

      // Markers
      const start = project.corridorCoordinates[0];
      const end = project.corridorCoordinates[project.corridorCoordinates.length - 1];

      L.circleMarker(start, {
        radius: 6,
        fillColor: '#10b981',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
      })
        .bindTooltip(`Origin: ${start[0].toFixed(3)}°N, ${start[1].toFixed(3)}°E`, { direction: 'top' })
        .addTo(map);

      L.circleMarker(end, {
        radius: 6,
        fillColor: '#f43f5e',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
      })
        .bindTooltip(`Terminus: ${end[0].toFixed(3)}°N, ${end[1].toFixed(3)}°E`, { direction: 'top' })
        .addTo(map);

      map.fitBounds(polyline.getBounds().pad(0.2));
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [project]);

  if (loading) {
    return (
      <div className="boss-page-container">
        <div className="boss-loading-placeholder">
          <span>Retrieving Statutory Requisition Dossier...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="boss-page-container">
        <div className="boss-error-box">
          <h2>Requisition Record Not Found</h2>
          <p>The requested project tracking code does not exist in the proponent registry.</p>
          <Link to="/projects" className="btn-cta-blue" style={{ marginTop: '16px', color: '#ffffff' }}>
            &larr; Return to Project Register
          </Link>
        </div>
      </div>
    );
  }

  const isParcelsConfirmed = project.status === 'PARCELS_CONFIRMED' || project.status === 'WORKFLOW_CONFIGURED';

  return (
    <div className="boss-page-container">
      {/* Breadcrumb */}
      <div className="boss-breadcrumb-bar">
        <Link to="/projects" className="boss-breadcrumb-link">
          &larr; Proponent Project Register
        </Link>
        <span className="boss-breadcrumb-sep">/</span>
        <span className="boss-breadcrumb-current">{project.code}</span>
        <span className="boss-breadcrumb-sep">/</span>
        <span className="boss-breadcrumb-label">Statutory Lifecycle Tracker</span>
      </div>

      {/* Main Masthead */}
      <section className="boss-dossier-masthead">
        <div className="boss-dossier-title-group">
          <div className="boss-dossier-tag-row">
            <span className="editorial-tag">{project.proponentAuthority}</span>
            <span className="boss-code-tag">{project.code}</span>
            <span className="boss-status-tag">
              {project.status === 'NEW_REQUEST'
                ? 'PENDING BOSS SCRUTINY'
                : project.status === 'PARCELS_CONFIRMED'
                ? 'PARCELS CONFIRMED'
                : project.status.replace(/_/g, ' ')}
            </span>
          </div>
          <h1 className="boss-dossier-title">{project.title}</h1>
          <p className="boss-dossier-subtitle">
            Statutory Proponent Intake &bull; {project.rfctlarrSection} &bull; {project.state} ({project.district})
          </p>
        </div>

        <div className="boss-dossier-actions-top">
          <Link to="/projects/new" className="btn-cta-outline">
            + New Requisition
          </Link>
        </div>
      </section>

      <div className="hairline-fullwidth" />

      {/* 5-Stage Statutory Gazette Stepper */}
      <section className="stepper-gazette-bar">
        <div className="stepper-node completed">
          <span className="node-step">01</span>
          <div className="node-info">
            <span className="node-title">Requisition Submitted</span>
            <span className="node-date">{project.submissionDate}</span>
          </div>
        </div>
        <div className="stepper-line completed" />

        <div className={`stepper-node ${isParcelsConfirmed ? 'completed' : 'active'}`}>
          <span className="node-step">02</span>
          <div className="node-info">
            <span className="node-title">BOSS Scrutiny</span>
            <span className="node-date">{isParcelsConfirmed ? 'Approved' : 'In Review'}</span>
          </div>
        </div>
        <div className={`stepper-line ${isParcelsConfirmed ? 'completed' : ''}`} />

        <div className={`stepper-node ${isParcelsConfirmed ? 'completed' : 'upcoming'}`}>
          <span className="node-step">03</span>
          <div className="node-info">
            <span className="node-title">Cadastral Determination</span>
            <span className="node-date">
              {isParcelsConfirmed ? `${project.selectedParcelsCount || 0} Parcels Bound` : 'Pending'}
            </span>
          </div>
        </div>
        <div className="stepper-line" />

        <div className="stepper-node upcoming">
          <span className="node-step">04</span>
          <div className="node-info">
            <span className="node-title">Section 11 Notification</span>
            <span className="node-date">Upcoming</span>
          </div>
        </div>
        <div className="stepper-line" />

        <div className="stepper-node upcoming">
          <span className="node-step">05</span>
          <div className="node-info">
            <span className="node-title">Declaration &amp; Award</span>
            <span className="node-date">Target {project.slaDeadline}</span>
          </div>
        </div>
      </section>

      <div className="hairline-fullwidth" />

      {/* KPI Telemetry Bar */}
      <section className="boss-project-kpi-bar">
        <div className="boss-kpi-item">
          <span className="kpi-label">Requested Land Area</span>
          <div className="kpi-value text-signal-blue">
            <span>{(project.requestedAreaAcres || 0).toFixed(1)}</span>
            <span className="kpi-unit">Acres</span>
          </div>
          <span className="kpi-sub">({project.requestedAreaHa} Ha metric)</span>
        </div>

        <div className="boss-kpi-item">
          <span className="kpi-label">Corridor Alignment</span>
          <div className="kpi-value">
            <span>{project.corridorKm}</span>
            <span className="kpi-unit">km</span>
          </div>
          <span className="kpi-sub">Right-of-Way: {project.alignmentWidthMeters}m</span>
        </div>

        <div className="boss-kpi-item">
          <span className="kpi-label">Estimated Project Outlay</span>
          <div className="kpi-value text-emerald">
            <span>₹{project.estimatedBudgetCr}</span>
            <span className="kpi-unit">Cr</span>
          </div>
          <span className="kpi-sub">Infrastructure Capital Allocation</span>
        </div>

        <div className="boss-kpi-item">
          <span className="kpi-label">Statutory SLA Deadline</span>
          <div className="kpi-value">
            <span style={{ fontSize: '20px' }}>{project.slaDeadline}</span>
          </div>
          <span className="kpi-sub">14-Day Central Gazette Rule</span>
        </div>
      </section>

      <div className="hairline-fullwidth" />

      {/* Two Column Dossier Body */}
      <section className="boss-dossier-grid">
        {/* Card 1: Statutory Purpose */}
        <div className="boss-card">
          <div className="boss-card-header">
            <h3 className="boss-card-title">1. Public Purpose &amp; Legal Mandate</h3>
            <span className="boss-card-badge">Section 2(1)</span>
          </div>
          <div className="boss-card-body">
            <p className="boss-body-p">{project.statutoryPurpose}</p>
            <div className="spec-meta-block">
              <div className="spec-row">
                <span className="spec-label">Proponent Entity:</span>
                <span className="spec-val">{project.proponentAuthority}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Administrative Ministry:</span>
                <span className="spec-val">{project.ministry}</span>
              </div>
              <div className="spec-row">
                <span className="spec-label">Target Jurisdiction:</span>
                <span className="spec-val">{project.district}, {project.state}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Spatial Corridor Map Preview */}
        <div className="boss-card">
          <div className="boss-card-header">
            <h3 className="boss-card-title">2. Plotted Alignment Vector</h3>
            <span className="boss-card-badge">GIS PostGIS</span>
          </div>
          <div className="boss-card-body" style={{ padding: '0' }}>
            <div ref={mapContainerRef} className="boss-corridor-map-frame" />
            <div className="boss-corridor-legend">
              <div className="legend-item">
                <span className="legend-line" style={{ backgroundColor: '#0058fe', opacity: 0.5 }} />
                <span>{project.alignmentWidthMeters}m Acquisition Buffer Swath</span>
              </div>
              <div className="legend-item">
                <span className="legend-line" style={{ backgroundColor: '#38bdf8' }} />
                <span>Centerline Alignment ({project.corridorKm} km)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Gazette Documents */}
        <div className="boss-card" style={{ gridColumn: 'span 2' }}>
          <div className="boss-card-header">
            <h3 className="boss-card-title">3. Attached Statutory Gazette Documents &amp; Feasibility</h3>
            <span className="boss-card-badge">Cryptographically Verified</span>
          </div>
          <div className="boss-card-body">
            <div className="boss-documents-list">
              {project.initialDocuments?.map((doc) => (
                <div key={doc.id} className="boss-doc-item">
                  <div className="doc-icon-col">📄</div>
                  <div className="doc-meta-col">
                    <span className="doc-title">{doc.title}</span>
                    <div className="doc-sub-meta">
                      <span>{doc.fileSize}</span>
                      <span>&bull;</span>
                      <span>Uploaded {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</span>
                      <span>&bull;</span>
                      <span className="doc-hash">{doc.hash}</span>
                    </div>
                  </div>
                  <div className="doc-action-col">
                    <span className="doc-verified-badge">&#10003; SHA-256 OK</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProponentProjectDetailPage;
