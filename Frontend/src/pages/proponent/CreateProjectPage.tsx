import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import L from 'leaflet';
import { bossService } from '../../services/api/boss.service';
import { CORRIDOR_PRESETS } from '../../data/mock-corridor-presets';
import type { InfrastructureType } from '../../types/proponent.types';

// Haversine distance between two coordinates in kilometers
function calculateHaversineDistance(c1: [number, number], c2: [number, number]): number {
  const R = 6371; // Earth radius in km
  const dLat = ((c2[0] - c1[0]) * Math.PI) / 180;
  const dLon = ((c2[1] - c1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1[0] * Math.PI) / 180) *
      Math.cos((c2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateTotalCorridorKm(coords: [number, number][]): number {
  if (coords.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    total += calculateHaversineDistance(coords[i], coords[i + 1]);
  }
  return parseFloat(total.toFixed(2));
}

export const CreateProjectPage: React.FC = () => {
  const navigate = useNavigate();

  // Form State
  const [title, setTitle] = useState('');
  const [projectType, setProjectType] = useState<InfrastructureType>('HIGHWAY_CORRIDOR');
  const [proponentAuthority, setProponentAuthority] = useState('NHAI');
  const [ministry, setMinistry] = useState('');
  const [state, setState] = useState('');
  const [district, setDistrict] = useState('');
  const [rfctlarrSection, setRfctlarrSection] = useState('Section 2(1) Infrastructure Corridor');
  const [statutoryPurpose, setStatutoryPurpose] = useState('');
  const [description, setDescription] = useState('');
  const [targetCompletionDate, setTargetCompletionDate] = useState('');
  const [alignmentWidthMeters, setAlignmentWidthMeters] = useState(70);
  const [estimatedBudgetCr, setEstimatedBudgetCr] = useState(0);

  // Plotted Spatial Coordinates
  const [coordinates, setCoordinates] = useState<[number, number][]>([]);

  // Attached Documents (initialized empty for backend submission)
  const [documents, setDocuments] = useState<
    Array<{ title: string; type: any; fileSize: string; hash: string }>
  >([]);

  const [submitting, setSubmitting] = useState(false);

  // Map Refs
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const bufferPolylineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.CircleMarker[]>([]);

  // Telemetry
  const totalKm = calculateTotalCorridorKm(coordinates);
  // Area = (length in m * width in m) / 4046.86 (acres per m2)
  const estimatedAcres =
    totalKm > 0
      ? parseFloat(((totalKm * 1000 * alignmentWidthMeters) / 4046.86).toFixed(1))
      : 0;

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [28.0, 77.0],
      zoom: 7,
      zoomControl: true,
      attributionControl: false,
    });

    // Watermark-Free Esri Dark Gray Base Layer
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        attribution: '&copy; Esri',
      }
    ).addTo(map);

    // Esri Dark Reference Layer
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
      }
    ).addTo(map);

    // Click handler to drop corridor waypoints
    map.on('click', (e: L.LeafletMouseEvent) => {
      const newCoord: [number, number] = [
        parseFloat(e.latlng.lat.toFixed(5)),
        parseFloat(e.latlng.lng.toFixed(5)),
      ];
      setCoordinates((prev) => [...prev, newCoord]);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Map Vectors when Coordinates or Buffer Width Change
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];

    // Clear old polylines
    if (polylineRef.current) map.removeLayer(polylineRef.current);
    if (bufferPolylineRef.current) map.removeLayer(bufferPolylineRef.current);

    if (coordinates.length === 0) return;

    // 1. Render Acquisition Buffer Swath (wide translucent stroke)
    const bufferPixelWeight = Math.max(12, Math.min(48, Math.round(alignmentWidthMeters / 2.5)));
    const bufferPoly = L.polyline(coordinates, {
      color: '#0058fe',
      weight: bufferPixelWeight,
      opacity: 0.22,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);
    bufferPolylineRef.current = bufferPoly;

    // 2. Render Sharp Corridor Centerline
    const centerPoly = L.polyline(coordinates, {
      color: '#38bdf8',
      weight: 3,
      opacity: 0.95,
      dashArray: '6 4',
    }).addTo(map);
    polylineRef.current = centerPoly;

    // 3. Render Waypoint Markers
    coordinates.forEach((coord, idx) => {
      const isStart = idx === 0;
      const isEnd = idx === coordinates.length - 1 && coordinates.length > 1;

      const marker = L.circleMarker(coord, {
        radius: isStart || isEnd ? 7 : 5,
        fillColor: isStart ? '#10b981' : isEnd ? '#f43f5e' : '#0058fe',
        color: '#ffffff',
        weight: 2,
        fillOpacity: 1,
      }).addTo(map);

      marker.bindTooltip(
        `<div style="font-family: 'Lora', serif; font-size: 11px; padding: 2px 5px; background: #0f172a; color: #f8fafc; border: 1px solid #334155;">
           <strong>${isStart ? 'CORRIDOR ORIGIN' : isEnd ? 'CORRIDOR TERMINUS' : `WAYPOINT #${idx + 1}`}</strong><br/>
           ${coord[0].toFixed(4)}°N, ${coord[1].toFixed(4)}°E
         </div>`,
        { direction: 'top' }
      );

      markersRef.current.push(marker);
    });
  }, [coordinates, alignmentWidthMeters]);

  // Load Preset Alignment
  const handleLoadPreset = (preset: typeof CORRIDOR_PRESETS[0]) => {
    setTitle(preset.name);
    setProponentAuthority(preset.agency);
    setProjectType(preset.type);
    setState(preset.state);
    setDistrict(preset.district);
    setRfctlarrSection(preset.rfctlarrSection);
    setStatutoryPurpose(preset.description);
    if (preset.agency === 'NHAI') setMinistry('Ministry of Road Transport and Highways (MoRTH)');
    else if (preset.agency === 'DFCCIL') setMinistry('Ministry of Railways');
    else if (preset.agency === 'BMRCL') setMinistry('Ministry of Housing and Urban Affairs & Govt of Karnataka');
    else setMinistry('Central Infrastructure Ministry');
    setAlignmentWidthMeters(preset.suggestedWidthM);
    setDescription(preset.description);
    setCoordinates(preset.coordinates);

    if (mapRef.current && preset.coordinates.length > 0) {
      const bounds = L.latLngBounds(preset.coordinates);
      mapRef.current.fitBounds(bounds.pad(0.3));
    }
  };

  // Clear Map
  const handleClearAlignment = () => {
    setCoordinates([]);
  };

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Please specify the official project name/corridor title.');
      return;
    }

    if (coordinates.length < 2) {
      alert('Please plot at least 2 alignment coordinates on the map or click a preset.');
      return;
    }

    try {
      setSubmitting(true);
      const newProject = await bossService.createProjectRequest({
        title,
        projectType,
        proponentAuthority,
        ministry,
        statutoryPurpose,
        rfctlarrSection,
        state,
        district,
        corridorKm: totalKm,
        alignmentWidthMeters,
        requestedAreaAcres: estimatedAcres,
        targetCompletionDate,
        description: description || `Statutory infrastructure corridor by ${proponentAuthority}`,
        estimatedBudgetCr,
        corridorCoordinates: coordinates,
        documentIds: documents.map((doc: any) => doc.id),
      });

      // Navigate to project detail view
      navigate(`/projects/${newProject.id}`);
    } catch (err) {
      console.error('Failed to submit project request', err);
      alert('Failed to submit requisition. Please check form parameters.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="boss-page-container">
      {/* 1. Breadcrumb Bar */}
      <div className="boss-breadcrumb-bar">
        <Link to="/projects" className="boss-breadcrumb-link">
          &larr; Proponent Project Register
        </Link>
        <span className="boss-breadcrumb-sep">/</span>
        <span className="boss-breadcrumb-current">New Statutory Requisition</span>
        <span className="boss-breadcrumb-sep">/</span>
        <span className="boss-breadcrumb-label">Corridor Alignment Intake</span>
      </div>

      {/* 2. Masthead */}
      <section className="boss-masthead" style={{ marginBottom: '16px' }}>
        <div className="boss-masthead-meta">
          <span className="editorial-tag">FORM 1A &bull; LAND ACQUISITION INTAKE</span>
          <span className="gazette-num">Section 2(1) RFCTLARR Act 2013</span>
        </div>
        <h1 className="boss-headline" style={{ fontSize: '32px' }}>Initiate Statutory Project Requisition</h1>
        <p className="boss-subhead">
          Plot spatial corridor alignment geometry, specify acquisition buffer parameters, and attach preliminary gazette annexures for central BOSS scrutiny.
        </p>
      </section>

      {/* 3. Demo Alignment Presets (hidden when no presets configured) */}
      {CORRIDOR_PRESETS.length > 0 && (
        <>
          <section className="intake-presets-bar">
            <span className="presets-label">⚡ Live Demo Corridor Presets:</span>
            <div className="presets-chips-row">
              {CORRIDOR_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleLoadPreset(p)}
                  className="preset-chip-btn"
                >
                  <span className="preset-agency-tag">{p.agency}</span>
                  <span className="preset-name">{p.name}</span>
                  <span className="preset-meta">{p.suggestedAcres} Ac &bull; {p.suggestedWidthM}m</span>
                </button>
              ))}
            </div>
          </section>
          <div className="hairline-fullwidth" style={{ margin: '14px 0 20px' }} />
        </>
      )}

      {/* 4. Two-Column Broadsheet Workbench */}
      <form onSubmit={handleSubmit} className="proponent-workbench-grid">
        {/* Left Column: Requisition Parameters */}
        <div className="proponent-form-column">
          {/* Card 1: Statutory Authority & Purpose */}
          <div className="boss-card">
            <div className="boss-card-header">
              <h3 className="boss-card-title">1. Statutory Authority &amp; Project Metadata</h3>
              <span className="boss-card-badge">Institutional Identity</span>
            </div>
            <div className="boss-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-field-label">Official Project Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Delhi–Jaipur Greenfield Expressway Alignment"
                  className="form-text-input"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-field-label">Proponent Authority *</label>
                  <select
                    value={proponentAuthority}
                    onChange={(e) => setProponentAuthority(e.target.value)}
                    className="form-select-input"
                  >
                    <option value="NHAI">NHAI (National Highways)</option>
                    <option value="DFCCIL">DFCCIL (Dedicated Freight)</option>
                    <option value="BMRCL">BMRCL (Bangalore Metro)</option>
                    <option value="DMRC">DMRC (Delhi Metro Rail)</option>
                    <option value="MoRTH">MoRTH (Central Highways)</option>
                    <option value="SECI">SECI (Renewable Energy)</option>
                  </select>
                </div>

                <div>
                  <label className="form-field-label">Project Type *</label>
                  <select
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value as InfrastructureType)}
                    className="form-select-input"
                  >
                    <option value="HIGHWAY_CORRIDOR">Highway Corridor</option>
                    <option value="FREIGHT_CORRIDOR">Dedicated Freight Corridor</option>
                    <option value="METRO_RAIL">Metro Rail Corridor</option>
                    <option value="INDUSTRIAL_CORRIDOR">Industrial Corridor</option>
                    <option value="RENEWABLE_PARK">Renewable Energy Park</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-field-label">State *</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="form-text-input"
                  />
                </div>

                <div>
                  <label className="form-field-label">Primary District *</label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="form-text-input"
                  />
                </div>
              </div>

              <div>
                <label className="form-field-label">Statutory RFCTLARR Section *</label>
                <select
                  value={rfctlarrSection}
                  onChange={(e) => setRfctlarrSection(e.target.value)}
                  className="form-select-input"
                >
                  <option value="Section 2(1) Infrastructure Corridor">Section 2(1) Infrastructure Corridor</option>
                  <option value="Section 4(1) Social Impact Assessment">Section 4(1) Social Impact Assessment Exemption</option>
                  <option value="Section 10(2) Multi-Crop Land Acquisition">Section 10(2) Multi-Crop Special Provision</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-field-label">Administrative Ministry *</label>
                  <input
                    type="text"
                    required
                    value={ministry}
                    onChange={(e) => setMinistry(e.target.value)}
                    className="form-text-input"
                  />
                </div>

                <div>
                  <label className="form-field-label">Statutory Public Purpose *</label>
                  <input
                    type="text"
                    required
                    value={statutoryPurpose}
                    onChange={(e) => setStatutoryPurpose(e.target.value)}
                    className="form-text-input"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-field-label">Target Completion Date</label>
                  <input
                    type="date"
                    value={targetCompletionDate}
                    onChange={(e) => setTargetCompletionDate(e.target.value)}
                    className="form-text-input"
                  />
                </div>

                <div>
                  <label className="form-field-label">Estimated Budget (₹ Cr)</label>
                  <input
                    type="number"
                    value={estimatedBudgetCr}
                    onChange={(e) => setEstimatedBudgetCr(Number(e.target.value))}
                    className="form-text-input"
                  />
                </div>
              </div>

              <div>
                <label className="form-field-label">Statutory Scope &amp; Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe public purpose, connectivity impact, and pre-feasibility rationale..."
                  className="form-textarea-input"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Corridor Buffer Configuration */}
          <div className="boss-card">
            <div className="boss-card-header">
              <h3 className="boss-card-title">2. Spatial Acquisition Buffer Width</h3>
              <span className="boss-card-badge">GIS Parameter</span>
            </div>
            <div className="boss-card-body">
              <label className="form-field-label">
                Right-of-Way (RoW) Swath Width: <strong>{alignmentWidthMeters} meters</strong>
              </label>
              <input
                type="range"
                min={20}
                max={200}
                step={5}
                value={alignmentWidthMeters}
                onChange={(e) => setAlignmentWidthMeters(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-signal-blue)', margin: '8px 0 14px' }}
              />
              <div className="range-hints-row">
                <span>20m (Urban Transit)</span>
                <span>70m (Standard 6-Lane Expressway)</span>
                <span>200m (Broad Multi-Modal Buffer)</span>
              </div>
            </div>
          </div>

          {/* Card 3: Gazette Annexures & Documents */}
          <div className="boss-card">
            <div className="boss-card-header">
              <h3 className="boss-card-title">3. Statutory Gazette Annexures</h3>
              <span className="boss-card-badge">Cryptographic Integrity</span>
            </div>
            <div className="boss-card-body">
              <div className="attached-docs-list">
                {documents.length === 0 ? (
                  <div
                    style={{
                      padding: '12px 14px',
                      fontSize: '12px',
                      color: 'var(--color-text-secondary)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px dashed var(--color-border)',
                      marginBottom: '10px',
                    }}
                  >
                    No statutory annexures attached yet. Use the upload dropzone below to attach DPR extracts or alignment specifications.
                  </div>
                ) : (
                  documents.map((doc, idx) => (
                    <div key={idx} className="attached-doc-item">
                      <div className="doc-icon">📄</div>
                      <div className="doc-info">
                        <span className="doc-name">{doc.title}</span>
                        <span className="doc-sub">
                          {doc.fileSize} &bull; <span style={{ fontFamily: 'monospace' }}>{doc.hash.slice(0, 16)}...</span>
                        </span>
                      </div>
                      <span className="doc-verified-badge">&#10003; VERIFIED</span>
                    </div>
                  ))
                )}
              </div>

              <label className="doc-upload-dropzone" style={{ display: 'block', cursor: 'pointer' }}>
                <input 
                  type="file" 
                  style={{ display: 'none' }} 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const uploadedDoc = await bossService.uploadDocument(file, 'ALIGNMENT_GEOJSON');
                        setDocuments((prev) => [...prev, uploadedDoc]);
                      } catch (err) {
                        console.error('Failed to upload document', err);
                        alert('Failed to upload document.');
                      }
                    }
                    e.target.value = ''; // Reset input
                  }}
                  accept=".pdf,.doc,.docx,.zip"
                />
                <span>+ Click to attach additional statutory annexure / DPR extract</span>
              </label>
            </div>
          </div>

          {/* Action Button Bar */}
          <div className="form-submit-bar">
            <button
              type="button"
              onClick={() => navigate('/projects')}
              className="btn-cta-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-cta-blue"
              style={{ padding: '12px 28px', fontSize: '15px', color: '#ffffff' }}
            >
              {submitting ? 'Transmitting to BOSS...' : 'Submit Project Request to BOSS →'}
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Dark GIS Map Canvas */}
        <div className="proponent-map-column">
          <div className="gis-canvas-card">
            <div className="gis-canvas-header">
              <div>
                <h4 className="gis-card-title">Spatial Corridor Alignment Drafter</h4>
                <p className="gis-card-sub">Click anywhere on the map canvas to place alignment waypoints</p>
              </div>
              <div className="gis-canvas-actions">
                <button
                  type="button"
                  onClick={handleClearAlignment}
                  className="btn-cta-outline"
                  style={{ padding: '4px 10px', fontSize: '11px' }}
                >
                  Clear Points
                </button>
              </div>
            </div>

            {/* Interactive Leaflet Dark Map */}
            <div className="proponent-map-wrapper">
              <div ref={mapContainerRef} className="proponent-leaflet-canvas" />

              {/* Real-time Telemetry HUD */}
              <div className="corridor-telemetry-hud">
                <div className="hud-metric">
                  <span className="hud-label">Plotted Waypoints</span>
                  <span className="hud-val">{coordinates.length}</span>
                </div>
                <div className="hud-sep" />
                <div className="hud-metric">
                  <span className="hud-label">Alignment Length</span>
                  <span className="hud-val text-cyan">{totalKm} km</span>
                </div>
                <div className="hud-sep" />
                <div className="hud-metric">
                  <span className="hud-label">Buffer Swath</span>
                  <span className="hud-val">{alignmentWidthMeters} m</span>
                </div>
                <div className="hud-sep" />
                <div className="hud-metric">
                  <span className="hud-label">Estimated Footprint</span>
                  <span className="hud-val text-emerald">{estimatedAcres} Acres</span>
                </div>
              </div>
            </div>

            {/* Plotted Points Coordinate Ledger */}
            <div className="plotted-coords-drawer">
              <span className="ledger-title">
                Active Spatial Vertices ({coordinates.length})
              </span>
              {coordinates.length === 0 ? (
                <span className="ledger-empty">
                  No vertices plotted yet. Click map canvas or select a preset above to load an alignment.
                </span>
              ) : (
                <div className="coords-chips-scroll">
                  {coordinates.map((c, i) => (
                    <div key={i} className="coord-chip">
                      <span className="coord-idx">#{i + 1}</span>
                      <span className="coord-latlng">
                        {c[0].toFixed(3)}°N, {c[1].toFixed(3)}°E
                      </span>
                      <button
                        type="button"
                        onClick={() => setCoordinates((prev) => prev.filter((_, idx) => idx !== i))}
                        className="coord-remove-btn"
                        title="Remove point"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateProjectPage;
