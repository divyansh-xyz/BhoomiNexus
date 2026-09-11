import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './boss-dashboard.css';
import { bossService } from '../../services/api/boss.service';
import { workflowService } from '../../services/api/workflow.service';
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
  const [hasWorkflow, setHasWorkflow] = useState(false);

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
      let candidateParcels = await bossService.getProjectParcels(id);
      if (!candidateParcels || candidateParcels.length === 0) {
        candidateParcels = await bossService.fetchCandidateLandRecords(id);
      }
      const [proj, wf] = await Promise.all([
        bossService.getProjectById(id),
        workflowService.getProjectWorkflow(id).catch(() => null),
      ]);
      setProject(proj);
      setParcels(candidateParcels);

      const workflowSelected =
        (!!wf && (wf.stages || []).length > 0) ||
        proj?.status === 'WORKFLOW_CONFIGURED' ||
        proj?.status === 'WORKFLOW_ACTIVE' ||
        proj?.status === 'PROJECT_APPROVED';
      setHasWorkflow(workflowSelected);

      // Pre-select parcels with status === 'CONFIRMED' or 'SELECTED'
      const initialSelected = new Set(
        candidateParcels
          .filter((p) => p.status === 'CONFIRMED' || p.status === 'SELECTED')
          .map((p) => p.id)
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
    const requestedArea = Number(project?.requestedAreaAcres ?? 0);

    let selectedArea = 0;
    for (const p of parcels) {
      if (selectedParcelIds.has(p.id)) {
        selectedArea += Number(p.areaAcres || 0);
      }
    }

    const variance = selectedArea - requestedArea;
    const percentCovered = requestedArea > 0 ? (selectedArea / requestedArea) * 100 : 0;

    return {
      candidateCount,
      selectedCount,
      requestedArea,
      selectedArea: parseFloat(Number(selectedArea).toFixed(2)),
      variance: parseFloat(Number(variance).toFixed(2)),
      percentCovered: parseFloat(Number(percentCovered).toFixed(1)),
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
        : project?.district?.toLowerCase() === 'agra'
        ? [27.1767, 78.0081]
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

    // Render Corridor Polyline if linear
    if (project?.corridorCoordinates && project.corridorCoordinates.length > 0) {
      const corridor = L.polyline(project.corridorCoordinates, {
        color: '#2576eb',
        weight: 6,
        opacity: 0.9,
      }).addTo(map);

      // Add dashed center stripe
      L.polyline(project.corridorCoordinates, {
        color: '#5c9cf5',
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
      if (!p.coordinates || p.coordinates.length === 0) return;
      const isSelected = selectedParcelIds.has(p.id);
      const isActive = activeParcel?.id === p.id;

      const style: L.PathOptions = {
        color: isActive ? '#ffffff' : isSelected ? '#5c9cf5' : '#838b96',
        weight: isActive ? 3 : isSelected ? 2 : 1,
        dashArray: isSelected ? undefined : '3 4',
        fillColor: isSelected ? '#2576eb' : '#303336',
        fillOpacity: isActive ? 0.55 : isSelected ? 0.35 : 0.2,
      };

      const polygon = L.polygon(p.coordinates, style);

      polygon.bindTooltip(
        `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11.5px; padding: 4px 8px; background: #303336; color: #ffffff; border-radius: 4px;">
           <strong style="color: #5c9cf5;">Khasra: ${p.surveyNumber}</strong><br/>
           ULPIN: <span style="font-family: monospace;">${p.ulpin}</span><br/>
           Area: ${p.areaAcres} Acres (${p.landType})<br/>
           <em>Owner: ${p.ownerReference}</em><br/>
           <span style="color: ${isSelected ? '#34d399' : '#94a3b8'}; font-weight: 600;">
             ${isSelected ? '✓ SELECTED' : 'EXCLUDED'}
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

    if (allBounds.isValid()) {
      map.fitBounds(allBounds.pad(0.12));
      hasFittedBoundsRef.current = true;
    } else if (project?.corridorCoordinates && project.corridorCoordinates.length > 0) {
      map.fitBounds(L.polyline(project.corridorCoordinates).getBounds().pad(0.2));
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
      <div className="things-boss-dashboard">
        <div className="things-boss-inner" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div className="things-review-card" style={{ padding: '40px', textAlign: 'center', maxWidth: '460px', width: '100%', alignItems: 'center' }}>
            <span className="things-boss-dot-pulse" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px', color: 'var(--tb-ink)' }}>
              Executing Spatial Cadastral Intersection
            </h3>
            <p style={{ fontSize: '13.5px', color: 'var(--tb-fog)', margin: 0, lineHeight: 1.5 }}>
              Evaluating PostGIS ST_Intersects against cadastral vector registry and Bhu-Aadhaar records...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="things-boss-dashboard">
      <div className="things-boss-inner">
        {/* Top Breadcrumb Bar */}
        <nav className="things-boss-breadcrumb" aria-label="Breadcrumb">
          <Link to="/boss/dashboard" className="things-boss-breadcrumb-link">
            &larr; BOSS Central Worklist
          </Link>
          <span className="things-boss-breadcrumb-sep">/</span>
          <Link to={`/boss/projects/${project?.id}`} className="things-boss-breadcrumb-link">
            {project?.code} Scrutiny
          </Link>
          <span className="things-boss-breadcrumb-sep">/</span>
          <span className="things-boss-breadcrumb-label">Land Parcel Determination &amp; Confirmation</span>
        </nav>

        {/* Page Title & Context Header */}
        <section className="things-dossier-masthead">
          <div className="things-dossier-info">
            <div className="things-dossier-tag-row">
              <span className="things-pill things-pill-neutral">{project?.proponentAuthority}</span>
              <span className="things-pill things-pill-blue things-pill-mono">{project?.code}</span>
              <span className="things-pill things-pill-neutral things-pill-mono">
                PostGIS ST_Intersects Cadastre Pipeline
              </span>
            </div>
            <h1 className="things-dossier-title">Land Parcel Determination &amp; Confirmation</h1>
            <p className="things-dossier-subtitle">
              {project?.corridorKm && project.corridorKm > 0 ? (
                <>
                  Corridor: <strong>{project.title}</strong> ({project.state} &bull; {project.corridorKm} km &bull; RoW {project.alignmentWidthMeters}m)
                </>
              ) : (
                <>
                  Footprint: <strong>{project?.title}</strong> ({project?.district}, {project?.state} &bull; {(project?.requestedAreaAcres ?? 0).toLocaleString()} Acres)
                </>
              )}
            </p>
          </div>

          <div className="things-dossier-actions">
            <Link
              to={`/boss/projects/${project?.id}`}
              className="things-btn things-btn-outline"
            >
              &larr; Back to Dossier
            </Link>
            <button
              type="button"
              onClick={handleRefreshRecords}
              disabled={isFetchingRecords}
              className="things-btn things-btn-outline"
            >
              {isFetchingRecords ? 'Executing ST_Intersects...' : 'Fetch Cadastral Records ↻'}
            </button>
            <button
              type="button"
              onClick={handleConfirmParcels}
              disabled={isConfirming || metrics.selectedCount === 0}
              className="things-btn things-btn-success"
            >
              {isConfirming ? 'Persisting Confirmed Parcels...' : 'Confirm Project Parcels →'}
            </button>
          </div>
        </section>

        {/* Telemetry Strip (Broadsheet Numbers) */}
        <section className="things-telemetry-grid">
          <div className="things-telemetry-card">
            <span className="things-telemetry-label">Candidate Parcels</span>
            <div className="things-telemetry-val">{metrics.candidateCount}</div>
            <span className="things-telemetry-sub">Intersecting Project Geometry</span>
          </div>

          <div className="things-telemetry-card" style={{ borderColor: 'var(--tb-signal-blue)' }}>
            <span className="things-telemetry-label">Selected Parcels</span>
            <div className="things-telemetry-val" style={{ color: 'var(--tb-signal-blue)' }}>{metrics.selectedCount}</div>
            <span className="things-telemetry-sub">
              {metrics.selectedCount > 0 ? 'Active Selection Set' : 'No Parcels Selected'}
            </span>
          </div>

          <div className="things-telemetry-card">
            <span className="things-telemetry-label">Requested Land Area</span>
            <div className="things-telemetry-val">
              {Number(metrics?.requestedArea || 0).toFixed(1)}
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tb-fog)' }}> Ac</span>
            </div>
            <span className="things-telemetry-sub">Proponent Requisition</span>
          </div>

          <div className="things-telemetry-card" style={{ borderColor: '#10b981' }}>
            <span className="things-telemetry-label">Selected Land Area</span>
            <div className="things-telemetry-val" style={{ color: '#059669' }}>
              {Number(metrics?.selectedArea || 0).toFixed(1)}
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tb-fog)' }}> Ac</span>
            </div>
            <span className="things-telemetry-sub">
              {(Number(metrics?.selectedArea || 0) * 0.404686).toFixed(1)} Hectares Determined
            </span>
          </div>

          <div className="things-telemetry-card">
            <span className="things-telemetry-label">Requisition Variance</span>
            <div className="things-telemetry-val" style={{ color: metrics.variance < 0 ? '#ef4444' : '#059669' }}>
              {metrics.variance >= 0 ? `+${metrics.variance}` : metrics.variance}
              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--tb-fog)' }}> Ac</span>
            </div>
            <span className="things-telemetry-sub">
              {metrics.percentCovered}% of Requisition Fulfilled
            </span>
          </div>
        </section>

        {/* Main Dual-Pane GIS & Gazette Workbench */}
        <section className="things-spatial-workbench">
          {/* Left Pane: Interactive Leaflet GIS Cadastral Map */}
          <div className="things-map-pane">
            <div className="things-map-toolbar">
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`things-btn things-btn-sm ${baseMapLayer === 'vector' ? 'things-btn-primary' : 'things-btn-outline'}`}
                  onClick={() => setBaseMapLayer('vector')}
                >
                  Vector Cadastre
                </button>
                <button
                  type="button"
                  className={`things-btn things-btn-sm ${baseMapLayer === 'satellite' ? 'things-btn-primary' : 'things-btn-outline'}`}
                  onClick={() => setBaseMapLayer('satellite')}
                >
                  Satellite Orthophoto
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="things-pill things-pill-blue things-pill-mono" style={{ fontSize: '11px' }}>
                  ● Selected ({metrics.selectedCount})
                </span>
                <span className="things-pill things-pill-neutral things-pill-mono" style={{ fontSize: '11px' }}>
                  ● Excluded ({metrics.candidateCount - metrics.selectedCount})
                </span>
              </div>
            </div>

            {/* Leaflet Map Frame */}
            <div ref={mapContainerRef} className="things-map-canvas" />

            {/* Map Bottom Status Bar */}
            <div className="things-map-statusbar">
              <span>Projection: EPSG:3857 &bull; Spatial Datum: WGS84</span>
              <span>Click any parcel on map to toggle inclusion in statutory acquisition set</span>
            </div>
          </div>

          {/* Right Pane: Broadsheet Gazette Parcel Ledger & Inspector */}
          <div className="things-ledger-pane">
            {/* Controls: Search & Filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="text"
                placeholder="Filter by ULPIN, Khasra No, Village, or Landowner..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="things-input"
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className={`things-btn things-btn-sm ${selectionFilter === 'ALL' ? 'things-btn-primary' : 'things-btn-outline'}`}
                    onClick={() => setSelectionFilter('ALL')}
                  >
                    All ({parcels.length})
                  </button>
                  <button
                    type="button"
                    className={`things-btn things-btn-sm ${selectionFilter === 'SELECTED' ? 'things-btn-primary' : 'things-btn-outline'}`}
                    onClick={() => setSelectionFilter('SELECTED')}
                  >
                    Selected ({metrics.selectedCount})
                  </button>
                  <button
                    type="button"
                    className={`things-btn things-btn-sm ${selectionFilter === 'EXCLUDED' ? 'things-btn-primary' : 'things-btn-outline'}`}
                    onClick={() => setSelectionFilter('EXCLUDED')}
                  >
                    Excluded ({metrics.candidateCount - metrics.selectedCount})
                  </button>
                </div>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="things-select"
                  style={{ width: 'auto', padding: '5px 10px', fontSize: '12px' }}
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
              <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--tb-hairline)', paddingTop: '8px' }}>
                <button
                  type="button"
                  onClick={handleSelectPreVerified}
                  className="things-btn things-btn-outline things-btn-sm"
                  title="Select Pre-Verified / Candidate Parcels"
                >
                  Select Verified
                </button>
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="things-btn things-btn-outline things-btn-sm"
                >
                  All ({parcels.length})
                </button>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="things-btn things-btn-outline things-btn-sm"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Broadsheet Parcel Table */}
            <div style={{ overflowX: 'auto', maxHeight: '340px', border: '1px solid var(--tb-hairline)', borderRadius: '8px' }}>
              <table className="things-register-table">
                <thead>
                  <tr>
                    <th style={{ width: '6%', textAlign: 'center' }}>Sel</th>
                    <th style={{ width: '22%' }}>Khasra / ULPIN</th>
                    <th style={{ width: '18%' }}>Village</th>
                    <th style={{ width: '16%' }}>Land Type</th>
                    <th style={{ width: '16%' }}>Area</th>
                    <th style={{ width: '22%' }}>Owner Record</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredParcels.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--tb-fog)', fontSize: '13px' }}>
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
                          className={isActive ? 'row-focused' : ''}
                          style={{
                            backgroundColor: isSelected ? '#f8fafc' : undefined,
                            cursor: 'pointer',
                          }}
                          onClick={() => zoomToParcel(p)}
                        >
                          <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleParcel(p.id)}
                              style={{ accentColor: 'var(--tb-signal-blue)', cursor: 'pointer' }}
                            />
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 700, color: 'var(--tb-ink)', fontSize: '13px' }}>
                                {p.surveyNumber}
                              </span>
                              <span style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--tb-fog)' }}>
                                {p.ulpin}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '12.5px', color: 'var(--tb-ink)' }}>{p.village}</span>
                          </td>
                          <td>
                            <span className="things-pill things-pill-neutral things-pill-mono" style={{ fontSize: '10.5px' }}>
                              {p.landType}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: 600, fontSize: '12.5px', color: 'var(--tb-ink)' }}>
                                {p.areaAcres} Ac
                              </span>
                              <span style={{ fontSize: '10.5px', color: 'var(--tb-fog)' }}>({p.areaHa} Ha)</span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: 'var(--tb-ash)' }} title={p.ownerReference}>
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
              <div className="things-active-parcel-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div>
                    <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--tb-ink)' }}>
                      Khasra № {activeParcel.surveyNumber}
                    </span>
                    <span style={{ display: 'block', fontSize: '11px', fontFamily: 'monospace', color: 'var(--tb-fog)' }}>
                      ULPIN: {activeParcel.ulpin}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleParcel(activeParcel.id)}
                    className={`things-btn things-btn-sm ${selectedParcelIds.has(activeParcel.id) ? 'things-btn-outline-red' : 'things-btn-primary'}`}
                  >
                    {selectedParcelIds.has(activeParcel.id) ? 'Exclude from Set' : 'Add to Acquisition Set'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '12px', borderTop: '1px solid var(--tb-hairline)', paddingTop: '8px' }}>
                  <div>
                    <span style={{ color: 'var(--tb-fog)', display: 'block', fontSize: '10.5px', textTransform: 'uppercase' }}>Landowner:</span>
                    <strong style={{ color: 'var(--tb-ink)' }}>{activeParcel.ownerReference}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--tb-fog)', display: 'block', fontSize: '10.5px', textTransform: 'uppercase' }}>Village &amp; Tehsil:</span>
                    <strong style={{ color: 'var(--tb-ink)' }}>{activeParcel.village}, {activeParcel.district}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--tb-fog)', display: 'block', fontSize: '10.5px', textTransform: 'uppercase' }}>Statutory Area:</span>
                    <strong style={{ color: 'var(--tb-signal-blue)' }}>{activeParcel.areaAcres} Acres ({activeParcel.areaHa} Ha)</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--tb-fog)', display: 'block', fontSize: '10.5px', textTransform: 'uppercase' }}>Circle Valuation:</span>
                    <strong style={{ color: '#059669' }}>&#8377;{(activeParcel.marketRatePerAcre ?? 0).toLocaleString()} / Acre</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Colophon Footer */}
        <footer className="things-boss-colophon">
          <div>
            <strong>BhoomiNexus</strong> &bull; Bureau of Statutory Scrutiny (BOSS) Cadastral Workbench
          </div>
          <div>
            RFCTLARR Act 2013 Statutory Compliance Registry &bull; Gazette Seal Verified
          </div>
        </footer>
      </div>

      {/* Confirmation Success Modal */}
      {confirmationSuccess && (
        <div className="things-modal-backdrop">
          <div className="things-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div style={{ textAlign: 'center', padding: '10px 0 6px' }}>
              <div style={{ display: 'inline-flex', padding: '12px', backgroundColor: '#ecfdf5', borderRadius: '9999px', marginBottom: '12px' }}>
                <BhoomiLogo size={32} strokeWidth={2.4} />
              </div>
              <h2 className="things-modal-title" style={{ fontSize: '22px' }}>Project Parcels Confirmed &amp; Gazetted</h2>
              <p className="things-modal-prose" style={{ marginTop: '8px' }}>
                The central cadastral parcel set for docket <strong>{project?.code}</strong> has been successfully determined, authenticated with 14-digit Bhu-Aadhaar ULPIN records, and locked into the sovereign registry.
              </p>
            </div>

            <div style={{ padding: '16px 20px', backgroundColor: '#fafbfc', border: '1px solid var(--tb-hairline)', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--tb-fog)' }}>Total Confirmed Parcels:</span>
                <strong style={{ color: 'var(--tb-ink)', fontFamily: 'ui-monospace, monospace' }}>{metrics.selectedCount} Cadastral Plots</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--tb-fog)' }}>Total Confirmed Area:</span>
                <strong style={{ color: '#059669', fontFamily: 'ui-monospace, monospace' }}>
                  {Number(metrics?.selectedArea || 0).toFixed(1)} Acres ({(Number(metrics?.selectedArea || 0) * 0.404686).toFixed(2)} Ha)
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--tb-fog)' }}>Statutory Jurisdiction:</span>
                <strong style={{ color: 'var(--tb-ink)' }}>{project?.district}, {project?.state}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--tb-fog)' }}>Statutory Status:</span>
                <span className="things-pill things-pill-emerald things-pill-mono" style={{ fontSize: '11px' }}>
                  ✓ PARCELS_CONFIRMED
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--tb-ash)' }}>
                <span>Audit Timestamp:</span>
                <span style={{ fontFamily: 'ui-monospace, monospace' }}>{new Date().toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="things-modal-footer" style={{ justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {hasWorkflow ? (
                <button
                  type="button"
                  onClick={() => navigate(`/boss/projects/${project?.id}`)}
                  className="things-btn things-btn-primary"
                >
                  Return to Project Dossier &rarr;
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => navigate(`/boss/projects/${project?.id}/workflow?select=true`)}
                    className="things-btn things-btn-success"
                  >
                    Choose Workflow &rarr;
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/boss/projects/${project?.id}`)}
                    className="things-btn things-btn-outline"
                  >
                    &larr; Project Dossier
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/boss/dashboard')}
                    className="things-btn things-btn-outline"
                  >
                    BOSS Worklist &rarr;
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BossParcelDeterminationPage;
