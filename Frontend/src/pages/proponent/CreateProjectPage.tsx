import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import L from 'leaflet';
import { bossService } from '../../services/api/boss.service';
import { CORRIDOR_PRESETS } from '../../data/mock-corridor-presets';
import type { InfrastructureType } from '../../types/proponent.types';
import './proponent-dashboard.css';

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
    Array<{ id?: string; title: string; type: any; fileSize: string; hash: string }>
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
        `<div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 11px; padding: 2px 5px; background: #0f172a; color: #f8fafc; border: 1px solid #334155; border-radius: 4px;">
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
        documentIds: documents.map((doc: any) => doc.id).filter(Boolean),
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
    <div className="things-proponent-dashboard">
      <div className="things-dashboard-inner">
        {/* 1. Breadcrumb Bar */}
        <div className="things-breadcrumb-bar">
          <Link to="/projects" className="things-breadcrumb-link">
            &larr; Proponent Project Register
          </Link>
          <span className="things-breadcrumb-sep">/</span>
          <span className="things-breadcrumb-current">New Statutory Requisition</span>
          <span className="things-breadcrumb-sep">/</span>
          <span className="things-breadcrumb-label">Corridor Alignment Intake</span>
        </div>

        {/* 2. Masthead */}
        <section className="things-create-masthead">
          <div className="things-create-meta">
            <span>FORM 1A &bull; LAND ACQUISITION INTAKE</span>
            <span>&bull;</span>
            <span>Section 2(1) RFCTLARR Act 2013</span>
          </div>
          <h1 className="things-create-headline">Initiate Statutory Project Requisition</h1>
          <p className="things-create-subhead">
            Plot spatial corridor alignment geometry, specify acquisition buffer parameters, and attach preliminary gazette annexures for central BOSS scrutiny.
          </p>
        </section>

        {/* 3. Demo Alignment Presets (hidden when no presets configured) */}
        {CORRIDOR_PRESETS.length > 0 && (
          <section className="things-presets-bar">
            <span className="things-presets-label">&#x26A1; Live Demo Corridor Presets:</span>
            <div className="things-presets-chips">
              {CORRIDOR_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleLoadPreset(p)}
                  className="things-preset-btn"
                >
                  <span className="things-preset-agency">{p.agency}</span>
                  <span className="things-preset-name">{p.name}</span>
                  <span className="things-preset-meta">{p.suggestedAcres} Ac &bull; {p.suggestedWidthM}m</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 4. Two-Column Broadsheet Workbench */}
        <form onSubmit={handleSubmit} className="things-workbench-grid">
          {/* Left Column: Requisition Parameters */}
          <div className="things-form-column">
            {/* Card 1: Statutory Authority & Purpose */}
            <div className="things-form-card">
              <div className="things-form-card-header">
                <h3 className="things-form-card-title">1. Statutory Authority &amp; Project Metadata</h3>
                <span className="things-form-card-badge">Institutional Identity</span>
              </div>
              <div className="things-form-card-body">
                <div className="things-field-group">
                  <label className="things-form-label">Official Project Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Delhi–Jaipur Greenfield Expressway Alignment"
                    className="things-form-input"
                  />
                </div>

                <div className="things-field-grid-2">
                  <div className="things-field-group">
                    <label className="things-form-label">Proponent Authority *</label>
                    <select
                      value={proponentAuthority}
                      onChange={(e) => setProponentAuthority(e.target.value)}
                      className="things-form-select"
                    >
                      <option value="NHAI">NHAI (National Highways)</option>
                      <option value="DFCCIL">DFCCIL (Dedicated Freight)</option>
                      <option value="BMRCL">BMRCL (Bangalore Metro)</option>
                      <option value="DMRC">DMRC (Delhi Metro Rail)</option>
                      <option value="MoRTH">MoRTH (Central Highways)</option>
                      <option value="SECI">SECI (Renewable Energy)</option>
                    </select>
                  </div>

                  <div className="things-field-group">
                    <label className="things-form-label">Project Type *</label>
                    <select
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value as InfrastructureType)}
                      className="things-form-select"
                    >
                      <option value="HIGHWAY_CORRIDOR">Highway Corridor</option>
                      <option value="FREIGHT_CORRIDOR">Dedicated Freight Corridor</option>
                      <option value="METRO_RAIL">Metro Rail Corridor</option>
                      <option value="INDUSTRIAL_CORRIDOR">Industrial Corridor</option>
                      <option value="RENEWABLE_PARK">Renewable Energy Park</option>
                    </select>
                  </div>
                </div>

                <div className="things-field-grid-2">
                  <div className="things-field-group">
                    <label className="things-form-label">State *</label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="things-form-input"
                    />
                  </div>

                  <div className="things-field-group">
                    <label className="things-form-label">Primary District *</label>
                    <input
                      type="text"
                      required
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="things-form-input"
                    />
                  </div>
                </div>

                <div className="things-field-group">
                  <label className="things-form-label">Statutory RFCTLARR Section *</label>
                  <select
                    value={rfctlarrSection}
                    onChange={(e) => setRfctlarrSection(e.target.value)}
                    className="things-form-select"
                  >
                    <option value="Section 2(1) Infrastructure Corridor">Section 2(1) Infrastructure Corridor</option>
                    <option value="Section 4(1) Social Impact Assessment">Section 4(1) Social Impact Assessment Exemption</option>
                    <option value="Section 10(2) Multi-Crop Land Acquisition">Section 10(2) Multi-Crop Special Provision</option>
                  </select>
                </div>

                <div className="things-field-grid-2">
                  <div className="things-field-group">
                    <label className="things-form-label">Administrative Ministry *</label>
                    <input
                      type="text"
                      required
                      value={ministry}
                      onChange={(e) => setMinistry(e.target.value)}
                      className="things-form-input"
                    />
                  </div>

                  <div className="things-field-group">
                    <label className="things-form-label">Statutory Public Purpose *</label>
                    <input
                      type="text"
                      required
                      value={statutoryPurpose}
                      onChange={(e) => setStatutoryPurpose(e.target.value)}
                      className="things-form-input"
                    />
                  </div>
                </div>

                <div className="things-field-grid-2">
                  <div className="things-field-group">
                    <label className="things-form-label">Target Completion Date</label>
                    <input
                      type="date"
                      value={targetCompletionDate}
                      onChange={(e) => setTargetCompletionDate(e.target.value)}
                      className="things-form-input"
                    />
                  </div>

                  <div className="things-field-group">
                    <label className="things-form-label">Estimated Budget (₹ Cr)</label>
                    <input
                      type="number"
                      value={estimatedBudgetCr}
                      onChange={(e) => setEstimatedBudgetCr(Number(e.target.value))}
                      className="things-form-input"
                    />
                  </div>
                </div>

                <div className="things-field-group">
                  <label className="things-form-label">Statutory Scope &amp; Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe public purpose, connectivity impact, and pre-feasibility rationale..."
                    className="things-form-textarea"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: Corridor Buffer Configuration */}
            <div className="things-form-card">
              <div className="things-form-card-header">
                <h3 className="things-form-card-title">2. Spatial Acquisition Buffer Width</h3>
                <span className="things-form-card-badge">GIS Parameter</span>
              </div>
              <div className="things-form-card-body">
                <label className="things-form-label">
                  Right-of-Way (RoW) Swath Width: <strong>{alignmentWidthMeters} meters</strong>
                </label>
                <input
                  type="range"
                  min={20}
                  max={200}
                  step={5}
                  value={alignmentWidthMeters}
                  onChange={(e) => setAlignmentWidthMeters(Number(e.target.value))}
                  className="things-range-slider"
                />
                <div className="things-range-hints">
                  <span>20m (Urban Transit)</span>
                  <span>70m (Standard 6-Lane Expressway)</span>
                  <span>200m (Broad Multi-Modal Buffer)</span>
                </div>
              </div>
            </div>

            {/* Card 3: Gazette Annexures & Documents */}
            <div className="things-form-card">
              <div className="things-form-card-header">
                <h3 className="things-form-card-title">3. Statutory Gazette Annexures</h3>
                <span className="things-form-card-badge">Cryptographic Integrity</span>
              </div>
              <div className="things-form-card-body">
                <div>
                  {documents.length === 0 ? (
                    <div
                      style={{
                        padding: '14px 16px',
                        fontSize: '12.5px',
                        color: 'var(--tp-fog)',
                        backgroundColor: 'var(--tp-mist)',
                        border: '1px dashed var(--tp-hairline)',
                        borderRadius: '6px',
                        marginBottom: '12px',
                      }}
                    >
                      No statutory annexures attached yet. Use the upload dropzone below to attach DPR extracts or alignment specifications.
                    </div>
                  ) : (
                    documents.map((doc, idx) => (
                      <div key={idx} className="things-doc-item">
                        <div className="things-doc-info">
                          <span>📄</span>
                          <div>
                            <div className="things-doc-name">{doc.title}</div>
                            <div className="things-doc-meta">
                              {doc.fileSize} &bull; <span style={{ fontFamily: 'monospace' }}>{doc.hash.slice(0, 16)}...</span>
                            </div>
                          </div>
                        </div>
                        <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--tp-emerald)', fontFamily: 'monospace' }}>
                          &#10003; VERIFIED
                        </span>
                      </div>
                    ))
                  )}
                </div>

                <label className="things-doc-dropzone" style={{ display: 'block' }}>
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
            <div className="things-form-actions">
              <button
                type="button"
                onClick={() => navigate('/projects')}
                className="things-btn-outline"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="things-btn-requisition"
                style={{ margin: 0, padding: '10px 24px', fontSize: '14px' }}
              >
                {submitting ? 'Transmitting to BOSS...' : 'Submit Project Request to BOSS \u2192'}
              </button>
            </div>
          </div>

          {/* Right Column: Interactive Dark GIS Map Canvas */}
          <div className="things-map-column">
            <div className="things-gis-card">
              <div className="things-gis-header">
                <div>
                  <h4 className="things-gis-title">Spatial Corridor Alignment Drafter</h4>
                  <p className="things-gis-sub">Click anywhere on the map canvas to place alignment waypoints</p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={handleClearAlignment}
                    className="things-btn-outline"
                    style={{ padding: '5px 12px', fontSize: '12px' }}
                  >
                    Clear Points
                  </button>
                </div>
              </div>

              {/* Interactive Leaflet Dark Map */}
              <div className="things-map-wrapper">
                <div ref={mapContainerRef} className="things-leaflet-canvas" />

                {/* Real-time Telemetry HUD */}
                <div className="things-telemetry-hud">
                  <div className="things-hud-item">
                    <span className="things-hud-label">Plotted Waypoints</span>
                    <span className="things-hud-val">{coordinates.length}</span>
                  </div>
                  <div className="things-hud-sep" />
                  <div className="things-hud-item">
                    <span className="things-hud-label">Alignment Length</span>
                    <span className="things-hud-val" style={{ color: 'var(--tp-signal-blue)' }}>{totalKm} km</span>
                  </div>
                  <div className="things-hud-sep" />
                  <div className="things-hud-item">
                    <span className="things-hud-label">Buffer Swath</span>
                    <span className="things-hud-val">{alignmentWidthMeters} m</span>
                  </div>
                  <div className="things-hud-sep" />
                  <div className="things-hud-item">
                    <span className="things-hud-label">Estimated Footprint</span>
                    <span className="things-hud-val" style={{ color: 'var(--tp-emerald)' }}>{estimatedAcres} Acres</span>
                  </div>
                </div>
              </div>

              {/* Plotted Points Coordinate Ledger */}
              <div className="things-vertices-drawer">
                <span className="things-vertices-title">
                  Active Spatial Vertices ({coordinates.length})
                </span>
                {coordinates.length === 0 ? (
                  <span style={{ fontSize: '12.5px', color: 'var(--tp-fog)' }}>
                    No vertices plotted yet. Click map canvas or select a preset above to load an alignment.
                  </span>
                ) : (
                  <div className="things-vertices-chips">
                    {coordinates.map((c, i) => (
                      <div key={i} className="things-vertex-chip">
                        <span style={{ color: 'var(--tp-fog)' }}>#{i + 1}</span>
                        <span style={{ color: 'var(--tp-ink)' }}>
                          {c[0].toFixed(3)}°N, {c[1].toFixed(3)}°E
                        </span>
                        <button
                          type="button"
                          onClick={() => setCoordinates((prev) => prev.filter((_, idx) => idx !== i))}
                          className="things-vertex-remove"
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
    </div>
  );
};

export default CreateProjectPage;
