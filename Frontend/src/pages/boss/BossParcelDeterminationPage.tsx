import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { bossService } from '../../services/api/boss.service';
import type { ProjectRequest, LandParcel } from '../../types/boss.types';
import BhoomiLogo from '../../components/common/BhoomiLogo';

export const BossParcelDeterminationPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectRequest | null>(null);
  const [parcels, setParcels] = useState<LandParcel[]>([]);
  const [selectedParcelIds, setSelectedParcelIds] = useState<Set<string>>(new Set());
  const [activeParcel, setActiveParcel] = useState<LandParcel | null>(null);

  const [loading, setLoading] = useState(true);
  const [isFetchingRecords, setIsFetchingRecords] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectionFilter, setSelectionFilter] = useState<'ALL' | 'SELECTED' | 'EXCLUDED'>('ALL');
  const [baseMapLayer, setBaseMapLayer] = useState<'vector' | 'satellite'>('vector');

  // Confirmation state
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmationSuccess, setConfirmationSuccess] = useState(false);

  // Leaflet refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const parcelLayersRef = useRef<{ [key: string]: L.Polygon }>({});
  const corridorLayerRef = useRef<L.Polyline | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProjectAndParcels(projectId);
    }
  }, [projectId]);

  const loadProjectAndParcels = async (id: string) => {
    setLoading(true);
    try {
      const proj = await bossService.getProjectById(id);
      setProject(proj);

      const candidateParcels = await bossService.fetchCandidateLandRecords(id);
      setParcels(candidateParcels);

      // Pre-select parcels with status === 'SELECTED'
      const initialSelected = new Set(
        candidateParcels.filter((p) => p.status === 'SELECTED').map((p) => p.id)
      );
      setSelectedParcelIds(initialSelected);

      if (candidateParcels.length > 0) {
        setActiveParcel(candidateParcels[0]);
      }
    } catch (err) {
      console.error('Failed to load parcel determination workbench', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch simulated PostGIS intersection
  const handleRefreshRecords = async () => {
    if (!projectId) return;
    setIsFetchingRecords(true);
    try {
      // Simulate network & PostGIS ST_Intersects execution
      await new Promise((r) => setTimeout(r, 600));
      const freshParcels = await bossService.fetchCandidateLandRecords(projectId);
      setParcels(freshParcels);
    } catch (err) {
      console.error('Failed to re-fetch land records', err);
    } finally {
      setIsFetchingRecords(false);
    }
  };

  // Telemetry Calculations
  const metrics = useMemo(() => {
    const candidateCount = parcels.length;
    const selectedCount = selectedParcelIds.size;
    const requestedArea = project?.requestedAreaAcres ?? 0;

    let selectedArea = 0;
    for (const p of parcels) {
      if (selectedParcelIds.has(p.id)) {
        selectedArea += p.areaAcres;
      }
    }

    const variance = selectedArea - requestedArea;
    const percentCovered = requestedArea > 0 ? (selectedArea / requestedArea) * 100 : 0;

    return {
      candidateCount,
      selectedCount,
      requestedArea,
      selectedArea: parseFloat(selectedArea.toFixed(2)),
      variance: parseFloat(variance.toFixed(2)),
      percentCovered: parseFloat(percentCovered.toFixed(1)),
    };
  }, [parcels, selectedParcelIds, project]);

  // Parcel Selection Toggles
  const toggleParcel = (parcelId: string) => {
    setSelectedParcelIds((prev) => {
      const next = new Set(prev);
      if (next.has(parcelId)) {
        next.delete(parcelId);
      } else {
        next.add(parcelId);
      }
      return next;
    });

    const target = parcels.find((p) => p.id === parcelId);
    if (target) setActiveParcel(target);
  };

  const handleSelectAll = () => {
    setSelectedParcelIds(new Set(parcels.map((p) => p.id)));
  };

  const handleSelectPreVerified = () => {
    const preSelected = parcels.filter((p) => p.status === 'SELECTED').map((p) => p.id);
    if (preSelected.length > 0) {
      setSelectedParcelIds(new Set(preSelected));
    } else {
      setSelectedParcelIds(new Set(parcels.map((p) => p.id)));
    }
  };

  const handleDeselectAll = () => {
    setSelectedParcelIds(new Set());
  };

  // Final confirmation action
  const handleConfirmParcels = async () => {
    if (!projectId) return;
    if (selectedParcelIds.size === 0) {
      alert('Statutory Scrutiny Alert: You must select at least one parcel before confirming.');
      return;
    }

    setIsConfirming(true);
    try {
      await bossService.confirmProjectParcels(projectId, Array.from(selectedParcelIds));
      setConfirmationSuccess(true);
    } catch (err: any) {
      alert(`Parcel Confirmation failed: ${err?.message}`);
    } finally {
      setIsConfirming(false);
    }
  };

  const hasFittedBoundsRef = useRef<boolean>(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || parcels.length === 0) return;

    const initialCenter: [number, number] =
      project?.corridorCoordinates && project.corridorCoordinates.length > 0
        ? project.corridorCoordinates[0]
        : parcels.length > 0 && parcels[0].coordinates.length > 0
        ? parcels[0].coordinates[0]
        : [28.6139, 77.2090];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });

    const tileLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        maxNativeZoom: 16,
        attribution: '&copy; Esri',
      }
    ).addTo(map);
    baseTileLayerRef.current = tileLayer;

    // Render Corridor Polyline
    if (project?.corridorCoordinates) {
      const corridor = L.polyline(project.corridorCoordinates, {
        color: '#0058fe',
        weight: 6,
        opacity: 0.9,
      }).addTo(map);

      // Add dashed center stripe
      L.polyline(project.corridorCoordinates, {
        color: '#38bdf8',
        weight: 2,
        dashArray: '5 6',
        opacity: 1,
      }).addTo(map);

      corridorLayerRef.current = corridor;
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      parcelLayersRef.current = {};
      hasFittedBoundsRef.current = false;
    };
  }, [parcels, project]);

  // Switch Base Map Layer
  useEffect(() => {
    if (!mapRef.current || !baseTileLayerRef.current) return;

    mapRef.current.removeLayer(baseTileLayerRef.current);

    const newUrl =
      baseMapLayer === 'vector'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
        : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    const newLayer = L.tileLayer(newUrl, {
      maxZoom: 19,
      maxNativeZoom: baseMapLayer === 'vector' ? 16 : 19,
      attribution: '&copy; Esri',
    }).addTo(mapRef.current);
    baseTileLayerRef.current = newLayer;
  }, [baseMapLayer]);

  // Render & Update Parcel Polygons on Map
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear previous polygon layers
    Object.values(parcelLayersRef.current).forEach((l) => map.removeLayer(l));
    parcelLayersRef.current = {};

    const allBounds = L.latLngBounds([]);

    parcels.forEach((p) => {
      const isSelected = selectedParcelIds.has(p.id);
      const isActive = activeParcel?.id === p.id;

      const style: L.PathOptions = {
        color: isActive ? '#ffffff' : isSelected ? '#38bdf8' : '#64748b',
        weight: isActive ? 3 : isSelected ? 2 : 1,
        dashArray: isSelected ? undefined : '3 4',
        fillColor: isSelected ? '#0058fe' : '#1e293b',
        fillOpacity: isActive ? 0.55 : isSelected ? 0.35 : 0.2,
      };

      const polygon = L.polygon(p.coordinates, style);

      polygon.bindTooltip(
        `<div style="font-family: 'Lora', serif; font-size: 11.5px; padding: 3px 6px; background: #0f172a; color: #f8fafc; border: 1px solid #334155;">
           <strong style="color: #60a5fa;">Khasra: ${p.surveyNumber}</strong><br/>
           ULPIN: <span style="font-family: monospace;">${p.ulpin}</span><br/>
           Area: ${p.areaAcres} Acres (${p.landType})<br/>
           <em>Owner: ${p.ownerReference}</em><br/>
           <span style="color: ${isSelected ? '#38bdf8' : '#94a3b8'}; font-weight: 600;">
             ${isSelected ? '&#10003; SELECTED' : 'EXCLUDED'}
           </span>
         </div>`,
        { direction: 'top', sticky: true }
      );

      polygon.on('click', () => {
        toggleParcel(p.id);
      });

      polygon.addTo(map);
      parcelLayersRef.current[p.id] = polygon;

      p.coordinates.forEach((c) => allBounds.extend(c));
    });

    if (allBounds.isValid() && !hasFittedBoundsRef.current) {
      map.fitBounds(allBounds.pad(0.12));
      hasFittedBoundsRef.current = true;
    }
  }, [parcels, selectedParcelIds, activeParcel]);

  // Zoom to parcel when activeParcel changes
  const zoomToParcel = (p: LandParcel) => {
    setActiveParcel(p);
    if (mapRef.current && parcelLayersRef.current[p.id]) {
      mapRef.current.fitBounds(parcelLayersRef.current[p.id].getBounds().pad(0.8));
    }
  };

  // Filtered parcels for table
  const filteredParcels = useMemo(() => {
    return parcels.filter((p) => {
      const isSelected = selectedParcelIds.has(p.id);
      const matchesSelection =
        selectionFilter === 'ALL' ||
        (selectionFilter === 'SELECTED' && isSelected) ||
        (selectionFilter === 'EXCLUDED' && !isSelected);

      const matchesType = typeFilter === 'ALL' || p.landType === typeFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        p.ulpin.toLowerCase().includes(q) ||
        p.surveyNumber.toLowerCase().includes(q) ||
        p.village.toLowerCase().includes(q) ||
        p.ownerReference.toLowerCase().includes(q);

      return matchesSelection && matchesType && matchesQuery;
    });
  }, [parcels, selectedParcelIds, selectionFilter, typeFilter, searchQuery]);

  if (loading) {
    return (
      <div className="boss-page-container">
        <div className="boss-loading-placeholder">
          <span>Executing Spatial Intersection: Project Geometry &cap; Cadastral Land Records...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="boss-page-container">
      {/* Top Breadcrumb Bar */}
      <div className="boss-breadcrumb-bar">
        <Link to="/boss/dashboard" className="boss-breadcrumb-link">
          &larr; BOSS Central Worklist
        </Link>
        <span className="boss-breadcrumb-sep">/</span>
        <Link to={`/boss/projects/${project?.id}`} className="boss-breadcrumb-link">
          {project?.code} Scrutiny
        </Link>
        <span className="boss-breadcrumb-sep">/</span>
        <span className="boss-breadcrumb-label">Land Parcel Determination &amp; Confirmation</span>
      </div>

      {/* Page Title & Context Header */}
      <section className="boss-workbench-header">
        <div className="boss-workbench-title-group">
          <div className="hero-eyebrow">
            <span className="hero-meta">PostGIS Spatial Intersection &bull; ST_Intersects Cadastre Pipeline</span>
          </div>
          <h1 className="boss-workbench-title">
            Land Parcel Determination &amp; Confirmation
          </h1>
          <p className="boss-workbench-subtitle">
            Corridor: <strong>{project?.title}</strong> ({project?.state} &bull; {project?.corridorKm} km &bull; RoW {project?.alignmentWidthMeters}m)
          </p>
        </div>

        <div className="boss-workbench-actions-top">
          <Link
            to={`/boss/projects/${project?.id}`}
            className="btn-cta-outline"
            style={{ fontSize: '13px', padding: '8px 16px' }}
          >
            &larr; Back to Dossier
          </Link>
          <button
            type="button"
            onClick={handleRefreshRecords}
            disabled={isFetchingRecords}
            className="btn-cta-outline"
            style={{ fontSize: '13px', padding: '8px 16px' }}
          >
            {isFetchingRecords ? 'Executing ST_Intersects...' : 'Fetch Cadastral Records \u21bb'}
          </button>
          <button
            type="button"
            onClick={handleConfirmParcels}
            disabled={isConfirming || metrics.selectedCount === 0}
            className="btn-cta-blue"
            style={{ fontSize: '13px', padding: '8px 20px', color: '#ffffff' }}
          >
            {isConfirming ? 'Persisting Confirmed Parcels...' : 'Confirm Project Parcels \u2192'}
          </button>
        </div>
      </section>

      <div className="hairline-fullwidth" />

      {/* Flagship Telemetry Balance Strip (Broadsheet Numbers) */}
      <section className="boss-telemetry-banner">
        <div className="telemetry-grid">
          <div className="telemetry-card">
            <span className="telemetry-eyebrow">Candidate Parcels</span>
            <div className="telemetry-value">{metrics.candidateCount}</div>
            <span className="telemetry-desc">Intersecting Corridor Geometry</span>
          </div>

          <div className="telemetry-card highlight-card">
            <span className="telemetry-eyebrow">Selected Parcels</span>
            <div className="telemetry-value text-signal-blue">{metrics.selectedCount}</div>
            <span className="telemetry-desc">
              {metrics.selectedCount > 0 ? 'Active Selection Set' : 'No Parcels Selected'}
            </span>
          </div>

          <div className="telemetry-card">
            <span className="telemetry-eyebrow">Requested Land Area</span>
            <div className="telemetry-value">
              {metrics.requestedArea.toFixed(1)}<span className="telemetry-unit"> Acres</span>
            </div>
            <span className="telemetry-desc">Proponent Requisition</span>
          </div>

          <div className="telemetry-card highlight-card">
            <span className="telemetry-eyebrow">Selected Land Area</span>
            <div className="telemetry-value text-signal-blue">
              {metrics.selectedArea.toFixed(1)}<span className="telemetry-unit"> Acres</span>
            </div>
            <span className="telemetry-desc">
              {(metrics.selectedArea * 0.404686).toFixed(1)} Hectares Determined
            </span>
          </div>

          <div className="telemetry-card">
            <span className="telemetry-eyebrow">Requisition Variance</span>
            <div className={`telemetry-value ${metrics.variance < 0 ? 'text-variance-neg' : 'text-variance-pos'}`}>
              {metrics.variance >= 0 ? `+${metrics.variance}` : metrics.variance}<span className="telemetry-unit"> Ac</span>
            </div>
            <span className="telemetry-desc">
              {metrics.percentCovered}% of Requisition Fulfilled
            </span>
          </div>
        </div>
      </section>

      <div className="hairline-fullwidth" />

      {/* Main Dual-Pane GIS & Gazette Workbench */}
      <section className="boss-spatial-workbench">
        {/* Left Pane: Interactive Leaflet GIS Cadastral Map */}
        <div className="workbench-map-pane">
          <div className="map-toolbar-top">
            <div className="map-layer-selector">
              <button
                type="button"
                className={`map-layer-btn ${baseMapLayer === 'vector' ? 'active' : ''}`}
                onClick={() => setBaseMapLayer('vector')}
              >
                Vector Cadastre
              </button>
              <button
                type="button"
                className={`map-layer-btn ${baseMapLayer === 'satellite' ? 'active' : ''}`}
                onClick={() => setBaseMapLayer('satellite')}
              >
                Satellite Orthophoto
              </button>
            </div>

            <div className="map-legend-pills">
              <span className="legend-pill selected">
                <span className="dot" style={{ backgroundColor: '#0058fe' }} />
                Selected ({metrics.selectedCount})
              </span>
              <span className="legend-pill excluded">
                <span className="dot" style={{ backgroundColor: '#7b7f83' }} />
                Excluded ({metrics.candidateCount - metrics.selectedCount})
              </span>
            </div>
          </div>

          {/* Leaflet Map Frame */}
          <div ref={mapContainerRef} className="workbench-map-canvas" />

          {/* Map Bottom Status Bar */}
          <div className="map-statusbar">
            <span>Projection: EPSG:3857 &bull; Spatial Datum: WGS84</span>
            <span>Click any parcel on map to toggle inclusion in statutory acquisition set</span>
          </div>
        </div>

        {/* Right Pane: Broadsheet Gazette Parcel Ledger & Inspector */}
        <div className="workbench-ledger-pane">
          {/* Controls: Search & Filters */}
          <div className="ledger-controls">
            <div className="ledger-search-row">
              <input
                type="text"
                placeholder="Filter by ULPIN, Khasra No, Village, or Landowner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ledger-search-input"
              />
            </div>

            <div className="ledger-filter-row">
              <div className="filter-pill-group">
                <button
                  type="button"
                  className={`filter-pill ${selectionFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setSelectionFilter('ALL')}
                >
                  All ({parcels.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${selectionFilter === 'SELECTED' ? 'active' : ''}`}
                  onClick={() => setSelectionFilter('SELECTED')}
                >
                  Selected ({metrics.selectedCount})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${selectionFilter === 'EXCLUDED' ? 'active' : ''}`}
                  onClick={() => setSelectionFilter('EXCLUDED')}
                >
                  Excluded ({metrics.candidateCount - metrics.selectedCount})
                </button>
              </div>

              <div className="filter-type-select-wrap">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="filter-type-select"
                  aria-label="Filter by Land Classification"
                >
                  <option value="ALL">All Land Types</option>
                  <option value="Agricultural">Agricultural</option>
                  <option value="Wet Paddy">Wet Paddy</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Residential">Residential</option>
                  <option value="Forest">Forest</option>
                  <option value="Barren">Barren</option>
                </select>
              </div>

              {/* Quick Preset Bulk Buttons */}
              <div className="bulk-actions-group">
                <button
                  type="button"
                  onClick={handleSelectPreVerified}
                  className="bulk-btn"
                  title="Select Pre-Verified / Candidate Parcels"
                >
                  Select Verified
                </button>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="bulk-btn"
                >
                  All ({parcels.length})
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="bulk-btn"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Broadsheet Parcel Table */}
          <div className="ledger-table-wrapper">
            <table className="boss-broadsheet-table ledger-table">
              <thead>
                <tr>
                  <th style={{ width: '6%' }}>Sel</th>
                  <th style={{ width: '22%' }}>Khasra / ULPIN</th>
                  <th style={{ width: '18%' }}>Village</th>
                  <th style={{ width: '16%' }}>Land Type</th>
                  <th style={{ width: '16%' }}>Area (Acres)</th>
                  <th style={{ width: '22%' }}>Owner Record</th>
                </tr>
              </thead>
              <tbody>
                {filteredParcels.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="boss-table-empty">
                      No candidate parcels match the active search/filter.
                    </td>
                  </tr>
                ) : (
                  filteredParcels.map((p) => {
                    const isSelected = selectedParcelIds.has(p.id);
                    const isActive = activeParcel?.id === p.id;

                    return (
                      <tr
                        key={p.id}
                        className={`ledger-row ${isSelected ? 'row-selected' : ''} ${isActive ? 'row-active' : ''}`}
                        onClick={() => zoomToParcel(p)}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleParcel(p.id)}
                            className="login-square-checkbox"
                          />
                        </td>
                        <td>
                          <div className="cell-khasra">
                            <span className="khasra-number">{p.surveyNumber}</span>
                            <span className="ulpin-tag">{p.ulpin}</span>
                          </div>
                        </td>
                        <td>
                          <span className="village-name">{p.village}</span>
                        </td>
                        <td>
                          <span className="land-type-badge">{p.landType}</span>
                        </td>
                        <td>
                          <div className="cell-area">
                            <span className="area-acres-val">{p.areaAcres} Ac</span>
                            <span className="area-ha-val">({p.areaHa} Ha)</span>
                          </div>
                        </td>
                        <td>
                          <span className="owner-name" title={p.ownerReference}>
                            {p.ownerReference}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Selected Parcel Inspector Mini Drawer */}
          {activeParcel && (
            <div className="active-parcel-card">
              <div className="active-parcel-header">
                <div>
                  <span className="active-khasra">Khasra No: {activeParcel.surveyNumber}</span>
                  <span className="active-ulpin">Bhu-Aadhaar ULPIN: {activeParcel.ulpin}</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleParcel(activeParcel.id)}
                  className={selectedParcelIds.has(activeParcel.id) ? 'btn-cta-black' : 'btn-cta-blue'}
                  style={{ padding: '6px 14px', fontSize: '12px' }}
                >
                  {selectedParcelIds.has(activeParcel.id) ? 'Exclude from Corridor' : 'Add to Corridor Set'}
                </button>
              </div>
              <div className="active-parcel-meta-grid">
                <div>
                  <span className="meta-label">Landowner (Khatauni):</span>
                  <span className="meta-value">{activeParcel.ownerReference}</span>
                </div>
                <div>
                  <span className="meta-label">Village &amp; Tehsil:</span>
                  <span className="meta-value">{activeParcel.village}, {activeParcel.district}</span>
                </div>
                <div>
                  <span className="meta-label">Statutory Area:</span>
                  <span className="meta-value">{activeParcel.areaAcres} Acres ({activeParcel.areaHa} Ha)</span>
                </div>
                <div>
                  <span className="meta-label">Circle Rate:</span>
                  <span className="meta-value">&#8377;{activeParcel.marketRatePerAcre.toLocaleString()} / Acre</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Confirmation Success Modal */}
      {confirmationSuccess && (
        <div className="boss-modal-backdrop" onClick={() => setConfirmationSuccess(false)}>
          <div className="boss-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setConfirmationSuccess(false)}
              className="modal-close-btn"
              title="Close Dialog"
            >
              &times;
            </button>

            {/* Sovereign Gazette Header Badge */}
            <div className="modal-gazette-badge">
              <span>SOVEREIGN LAND RECORDS REGISTRY</span>
              <span>&bull;</span>
              <span>SECTION 2(1) RFCTLARR 2013</span>
            </div>

            <div className="modal-icon-row">
              <div className="modal-seal-badge">
                <BhoomiLogo size={28} strokeWidth={2.4} />
              </div>
            </div>

            <h2 className="modal-title">Project Parcels Confirmed &amp; Gazetted</h2>
            <p className="modal-prose">
              The central spatial cadastral parcel set for docket <strong>{project?.code}</strong> has been successfully determined, authenticated with 14-digit Bhu-Aadhaar ULPIN records, and locked into the sovereign registry.
            </p>

            <div className="modal-summary-box">
              <div className="modal-summary-item">
                <span className="item-label">Total Confirmed Parcels:</span>
                <span className="item-value font-mono">{metrics.selectedCount} Cadastral Plots</span>
              </div>
              <div className="modal-summary-item">
                <span className="item-label">Total Confirmed Area:</span>
                <span className="item-value font-mono">
                  {metrics.selectedArea} Acres ({((metrics.selectedArea) * 0.404686).toFixed(2)} Ha)
                </span>
              </div>
              <div className="modal-summary-item">
                <span className="item-label">Statutory Jurisdiction:</span>
                <span className="item-value">{project?.district}, {project?.state}</span>
              </div>
              <div className="modal-summary-item">
                <span className="item-label">Statutory Status:</span>
                <span className="status-pill-confirmed">
                  &#10003; PARCELS_CONFIRMED
                </span>
              </div>
              <div className="modal-summary-item">
                <span className="item-label">Audit Timestamp:</span>
                <span className="item-value font-mono" style={{ fontSize: '12px', color: 'var(--color-fossil-gray)' }}>
                  {new Date().toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="modal-actions-container">
              <button
                type="button"
                onClick={() => navigate(`/boss/projects/${project?.id}/workflow?select=true`)}
                className="modal-btn-primary"
              >
                Choose Workflow &rarr;
              </button>

              <div className="modal-actions-secondary-row">
                <button
                  type="button"
                  onClick={() => setConfirmationSuccess(false)}
                  className="modal-btn-secondary"
                >
                  &larr; Review Workbench
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/boss/dashboard')}
                  className="modal-btn-secondary-black"
                >
                  BOSS Worklist &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BossParcelDeterminationPage;
