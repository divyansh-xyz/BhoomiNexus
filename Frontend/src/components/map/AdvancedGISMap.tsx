import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import type {
  GISScope,
  GISParcelFeature,
  GISProjectBoundary,
  GISLayerConfig,
  GISFilterState,
  GISKpiSummary,
  GISFilterOption,
  ParcelPopupData,
} from '../../types/gisV2.types';
import { DEFAULT_GIS_LAYERS } from '../../types/gisV2.types';
import { gisV2Service } from '../../services/api/gisV2.service';

/* ──────── Constants ──────── */

const PUNE_CENTER: L.LatLngTuple = [18.55, 73.85];
const INDIA_CENTER: L.LatLngTuple = [22.5, 82.0];

const SCOPE_DEFAULTS: Record<GISScope, { center: L.LatLngTuple; zoom: number }> = {
  national: { center: INDIA_CENTER, zoom: 5 },
  state: { center: [19.7, 75.7], zoom: 7 },
  district: { center: PUNE_CENTER, zoom: 11 },
  project: { center: PUNE_CENTER, zoom: 13 },
};

const STATUS_LABELS: Record<string, string> = {
  PROPOSED: 'Proposed',
  NOTIFIED: 'Notified',
  ACQUIRED: 'Acquired',
  COMPENSATION_PENDING: 'Comp. Pending',
  COMPENSATION_PAID: 'Comp. Paid',
  POSSESSION_PENDING: 'Poss. Pending',
  POSSESSION_COMPLETED: 'Poss. Completed',
  DISPUTED: 'Disputed',
};

/* ──────── Props ──────── */

interface AdvancedGISMapProps {
  scope: GISScope;
  /** Pre-scoped filters (e.g. projectId from route) */
  initialFilters?: Partial<GISFilterState>;
  /** Called when user clicks "View Passport" on a parcel popup.
   *  Provision for future Parcel Passport integration. */
  onViewPassport?: (parcelId: string, parcelData: ParcelPopupData) => void;
}

const EMPTY_FILTERS: GISFilterState = {
  stateId: '',
  districtId: '',
  projectId: '',
  lifecycle: '',
  parcelStatus: '',
  branchUnit: '',
};

/* ──────── Component ──────── */

export const AdvancedGISMap: React.FC<AdvancedGISMapProps> = ({
  scope,
  initialFilters,
  onViewPassport,
}) => {
  const navigate = useNavigate();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const parcelLayersRef = useRef<L.LayerGroup>(L.layerGroup());
  const boundaryLayersRef = useRef<L.LayerGroup>(L.layerGroup());

  const [layers, setLayers] = useState<GISLayerConfig[]>(() =>
    DEFAULT_GIS_LAYERS.map((l) => ({ ...l }))
  );
  const [filters, setFilters] = useState<GISFilterState>({
    ...EMPTY_FILTERS,
    ...initialFilters,
  });
  const [kpis, setKpis] = useState<GISKpiSummary | null>(null);
  const [parcels, setParcels] = useState<GISParcelFeature[]>([]);
  const [boundaries, setBoundaries] = useState<GISProjectBoundary[]>([]);
  const [filterOptions, setFilterOptions] = useState<{
    states: GISFilterOption[];
    districts: GISFilterOption[];
    projects: GISFilterOption[];
    lifecycles: GISFilterOption[];
    statuses: GISFilterOption[];
    branchUnits: GISFilterOption[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedParcel, setSelectedParcel] = useState<ParcelPopupData | null>(null);

  // Stable refs for popup callbacks
  const onViewPassportRef = useRef(onViewPassport);
  onViewPassportRef.current = onViewPassport;

  /* ──── Initialise map ──── */
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const defaults = SCOPE_DEFAULTS[scope];
    const map = L.map(mapContainerRef.current, {
      center: defaults.center,
      zoom: defaults.zoom,
      minZoom: 4,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: true,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 120,
    });

    // Dark satellite-style tile layer
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &copy; Maxar',
        maxZoom: 19,
      }
    ).addTo(map);

    // Labels overlay for readability
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { maxZoom: 19, opacity: 0.65 }
    ).addTo(map);

    parcelLayersRef.current.addTo(map);
    boundaryLayersRef.current.addTo(map);

    mapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [scope]);

  /* ──── Load filter options ──── */
  useEffect(() => {
    gisV2Service.getFilterOptions(scope).then(setFilterOptions);
  }, [scope]);

  /* ──── Load data whenever filters change ──── */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [p, b, k] = await Promise.all([
        gisV2Service.getParcels(scope, filters),
        gisV2Service.getBoundaries(scope, filters),
        gisV2Service.getKpis(scope, filters),
      ]);
      setParcels(p);
      setBoundaries(b);
      setKpis(k);
    } catch (err) {
      console.error('[AdvancedGISMap] Failed to load GIS data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [scope, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ──── Render parcels on map ──── */
  useEffect(() => {
    const parcelGroup = parcelLayersRef.current;
    parcelGroup.clearLayers();

    const visibleStatuses = new Set(
      layers
        .filter((l) => l.type === 'PARCEL_STATUS' && l.visible && l.statusFilter)
        .map((l) => l.statusFilter)
    );

    const layerMap = new Map(
      layers.filter((l) => l.type === 'PARCEL_STATUS').map((l) => [l.statusFilter, l])
    );

    parcels.forEach((parcel) => {
      if (!visibleStatuses.has(parcel.status)) return;

      const layerCfg = layerMap.get(parcel.status);
      if (!layerCfg) return;

      const latlngs = parcel.coordinates.map(
        ([lng, lat]) => [lat, lng] as L.LatLngTuple
      );

      const polygon = L.polygon(latlngs, {
        color: layerCfg.color,
        fillColor: layerCfg.fillColor,
        fillOpacity: layerCfg.fillOpacity,
        weight: 1.8,
      });

      polygon.bindTooltip(
        `<strong>${parcel.surveyNumber}</strong><br/>${STATUS_LABELS[parcel.status] || parcel.status}`,
        { sticky: true, className: 'gis-v2-tooltip', direction: 'top', offset: [0, -6] }
      );

      polygon.on('click', () => {
        setSelectedParcel({
          parcelId: parcel.parcelId,
          ulpin: parcel.ulpin,
          surveyNumber: parcel.surveyNumber,
          ownerName: parcel.ownerName,
          village: parcel.village,
          district: parcel.district,
          state: parcel.state,
          projectName: parcel.projectName,
          status: parcel.status,
          areaAcres: parcel.areaAcres,
          areaHa: parcel.areaHa,
          marketRatePerAcre: parcel.marketRatePerAcre,
        });

        if (mapRef.current) {
          mapRef.current.flyTo(parcel.centroid, Math.max(mapRef.current.getZoom(), 14), {
            duration: 0.5,
          });
        }
      });

      polygon.addTo(parcelGroup);
    });
  }, [parcels, layers]);

  /* ──── Render boundaries on map ──── */
  useEffect(() => {
    const boundaryGroup = boundaryLayersRef.current;
    boundaryGroup.clearLayers();

    const boundaryLayer = layers.find((l) => l.type === 'PROJECT_BOUNDARY');
    if (!boundaryLayer?.visible) return;

    boundaries.forEach((b) => {
      const latlngs = b.coordinates.map(
        ([lng, lat]) => [lat, lng] as L.LatLngTuple
      );

      const polygon = L.polygon(latlngs, {
        color: boundaryLayer.color,
        fillColor: boundaryLayer.fillColor,
        fillOpacity: boundaryLayer.fillOpacity,
        weight: 2.5,
        dashArray: '8 4',
      });

      polygon.bindTooltip(
        `<strong>${b.projectName}</strong><br/>${b.projectCode} • ${b.totalParcels} parcels`,
        { sticky: true, className: 'gis-v2-tooltip', direction: 'top' }
      );

      polygon.addTo(boundaryGroup);
    });
  }, [boundaries, layers]);

  /* ──── Layer toggle handler ──── */
  const handleLayerToggle = (layerId: string) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
    );
  };

  /* ──── Filter change handler ──── */
  const handleFilterChange = (key: keyof GISFilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({ ...EMPTY_FILTERS, ...initialFilters });
  };

  /* ──── Passport handler ──── */
  const handleViewPassport = () => {
    if (selectedParcel && onViewPassportRef.current) {
      onViewPassportRef.current(selectedParcel.parcelId, selectedParcel);
    } else if (selectedParcel) {
      navigate(
        `/parcels/${selectedParcel.ulpin || selectedParcel.parcelId}?stateId=${selectedParcel.state || 'MH'}&districtId=${selectedParcel.district || 'pune'}&projectId=${filters.projectId || 'p-nhai-ringroad-2026'}`
      );
    }
  };

  /* ──── Format helpers ──── */
  const fmtCurrency = (val: number) =>
    '₹' + val.toLocaleString('en-IN');

  const scopeLabel =
    scope === 'national' ? 'National' :
    scope === 'state' ? 'State' :
    scope === 'district' ? 'District' : 'Project';

  return (
    <div className="gis-v2-page">
      {/* ────── KPI Header Bar ────── */}
      <div className="gis-v2-kpi-bar">
        <div className="gis-v2-kpi-title-group">
          <span className="gis-v2-kpi-badge">{scopeLabel} GIS</span>
          <h2 className="gis-v2-kpi-heading">
            Advanced Land Monitoring • Geospatial Intelligence System
          </h2>
        </div>
        {kpis && (
          <div className="gis-v2-kpi-metrics">
            <div className="gis-v2-kpi-item">
              <span className="gis-v2-kpi-value">{kpis.projectCount}</span>
              <span className="gis-v2-kpi-label">Projects</span>
            </div>
            <div className="gis-v2-kpi-item">
              <span className="gis-v2-kpi-value">{kpis.totalParcels.toLocaleString()}</span>
              <span className="gis-v2-kpi-label">Parcels</span>
            </div>
            <div className="gis-v2-kpi-item">
              <span className="gis-v2-kpi-value">{kpis.totalAreaHa.toLocaleString()} ha</span>
              <span className="gis-v2-kpi-label">Total Area</span>
            </div>
            <div className="gis-v2-kpi-item gis-v2-kpi-acquired">
              <span className="gis-v2-kpi-value">{kpis.acquiredCount}</span>
              <span className="gis-v2-kpi-label">Acquired</span>
            </div>
            <div className="gis-v2-kpi-item gis-v2-kpi-disputed">
              <span className="gis-v2-kpi-value">{kpis.disputedCount}</span>
              <span className="gis-v2-kpi-label">Disputed</span>
            </div>
          </div>
        )}
        <div className="gis-v2-kpi-actions">
          <button
            type="button"
            className="gis-v2-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? 'Hide Filters' : 'Show Filters'}
          >
            {sidebarOpen ? '◂ Hide Filters' : '▸ Filters & Layers'}
          </button>
          <button
            type="button"
            className="gis-v2-refresh-btn"
            onClick={loadData}
            disabled={isLoading}
          >
            {isLoading ? 'Loading…' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* ────── Main Content: Sidebar + Map ────── */}
      <div className="gis-v2-body">
        {/* Sidebar: Layers + Filters */}
        {sidebarOpen && (
          <aside className="gis-v2-sidebar">
            {/* Layers Section */}
            <div className="gis-v2-sidebar-section">
              <h3 className="gis-v2-sidebar-heading">Layers</h3>
              <div className="gis-v2-layer-list">
                {layers.map((layer) => (
                  <label key={layer.id} className="gis-v2-layer-toggle">
                    <input
                      type="checkbox"
                      checked={layer.visible}
                      onChange={() => handleLayerToggle(layer.id)}
                    />
                    <span
                      className="gis-v2-layer-swatch"
                      style={{ backgroundColor: layer.fillColor, borderColor: layer.color }}
                    />
                    <span className="gis-v2-layer-label">{layer.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filters Section */}
            <div className="gis-v2-sidebar-section">
              <div className="gis-v2-filter-header">
                <h3 className="gis-v2-sidebar-heading">Filters</h3>
                <button
                  type="button"
                  className="gis-v2-clear-filters"
                  onClick={handleClearFilters}
                >
                  Clear All
                </button>
              </div>

              {scope === 'national' && (
                <div className="gis-v2-filter-group">
                  <label className="gis-v2-filter-label">State</label>
                  <select
                    className="gis-v2-filter-select"
                    value={filters.stateId}
                    onChange={(e) => handleFilterChange('stateId', e.target.value)}
                  >
                    <option value="">All States</option>
                    {filterOptions?.states.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {(scope === 'national' || scope === 'state') && (
                <div className="gis-v2-filter-group">
                  <label className="gis-v2-filter-label">District</label>
                  <select
                    className="gis-v2-filter-select"
                    value={filters.districtId}
                    onChange={(e) => handleFilterChange('districtId', e.target.value)}
                  >
                    <option value="">All Districts</option>
                    {filterOptions?.districts.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {scope !== 'project' && (
                <div className="gis-v2-filter-group">
                  <label className="gis-v2-filter-label">Project</label>
                  <select
                    className="gis-v2-filter-select"
                    value={filters.projectId}
                    onChange={(e) => handleFilterChange('projectId', e.target.value)}
                  >
                    <option value="">All Projects</option>
                    {filterOptions?.projects.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="gis-v2-filter-group">
                <label className="gis-v2-filter-label">Lifecycle Stage</label>
                <select
                  className="gis-v2-filter-select"
                  value={filters.lifecycle}
                  onChange={(e) => handleFilterChange('lifecycle', e.target.value)}
                >
                  <option value="">All Stages</option>
                  {filterOptions?.lifecycles.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="gis-v2-filter-group">
                <label className="gis-v2-filter-label">Parcel Status</label>
                <select
                  className="gis-v2-filter-select"
                  value={filters.parcelStatus}
                  onChange={(e) => handleFilterChange('parcelStatus', e.target.value)}
                >
                  <option value="">All Statuses</option>
                  {filterOptions?.statuses.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              <div className="gis-v2-filter-group">
                <label className="gis-v2-filter-label">Branch / Unit</label>
                <select
                  className="gis-v2-filter-select"
                  value={filters.branchUnit}
                  onChange={(e) => handleFilterChange('branchUnit', e.target.value)}
                >
                  <option value="">All Units</option>
                  {filterOptions?.branchUnits.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Legend Section */}
            <div className="gis-v2-sidebar-section">
              <h3 className="gis-v2-sidebar-heading">Legend</h3>
              <div className="gis-v2-legend">
                {layers
                  .filter((l) => l.type === 'PARCEL_STATUS')
                  .map((l) => (
                    <div key={l.id} className="gis-v2-legend-item">
                      <span
                        className="gis-v2-legend-swatch"
                        style={{ backgroundColor: l.fillColor }}
                      />
                      <span className="gis-v2-legend-text">{l.label}</span>
                    </div>
                  ))}
                <div className="gis-v2-legend-item">
                  <span
                    className="gis-v2-legend-swatch gis-v2-legend-boundary"
                    style={{ borderColor: '#6366f1' }}
                  />
                  <span className="gis-v2-legend-text">Project Boundary</span>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Map Canvas */}
        <div className="gis-v2-map-wrapper">
          <div ref={mapContainerRef} className="gis-v2-map-canvas" />

          {isLoading && (
            <div className="gis-v2-map-loading">
              <div className="gis-v2-spinner" />
              <span>Loading geospatial data…</span>
            </div>
          )}

          {/* Parcel Popup Card */}
          {selectedParcel && (
            <div className="gis-v2-parcel-popup">
              <div className="gis-v2-popup-header">
                <div>
                  <h4 className="gis-v2-popup-title">{selectedParcel.surveyNumber}</h4>
                  <span className="gis-v2-popup-ulpin">ULPIN: {selectedParcel.ulpin}</span>
                </div>
                <button
                  type="button"
                  className="gis-v2-popup-close"
                  onClick={() => setSelectedParcel(null)}
                  aria-label="Close parcel popup"
                >
                  ✕
                </button>
              </div>
              <div className="gis-v2-popup-body">
                <div className="gis-v2-popup-row">
                  <span className="gis-v2-popup-label">Owner</span>
                  <span className="gis-v2-popup-value">{selectedParcel.ownerName}</span>
                </div>
                <div className="gis-v2-popup-row">
                  <span className="gis-v2-popup-label">Location</span>
                  <span className="gis-v2-popup-value">
                    {selectedParcel.village}, {selectedParcel.district}, {selectedParcel.state}
                  </span>
                </div>
                <div className="gis-v2-popup-row">
                  <span className="gis-v2-popup-label">Project</span>
                  <span className="gis-v2-popup-value">{selectedParcel.projectName}</span>
                </div>
                <div className="gis-v2-popup-row">
                  <span className="gis-v2-popup-label">Area</span>
                  <span className="gis-v2-popup-value">
                    {selectedParcel.areaAcres} acres ({selectedParcel.areaHa} ha)
                  </span>
                </div>
                <div className="gis-v2-popup-row">
                  <span className="gis-v2-popup-label">Market Rate</span>
                  <span className="gis-v2-popup-value">
                    {fmtCurrency(selectedParcel.marketRatePerAcre)}/acre
                  </span>
                </div>
                <div className="gis-v2-popup-row">
                  <span className="gis-v2-popup-label">Status</span>
                  <span
                    className="gis-v2-popup-status"
                    data-status={selectedParcel.status}
                  >
                    {STATUS_LABELS[selectedParcel.status] || selectedParcel.status}
                  </span>
                </div>
              </div>
              <div className="gis-v2-popup-footer">
                <button
                  type="button"
                  className="gis-v2-passport-btn"
                  onClick={handleViewPassport}
                >
                  View Passport →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedGISMap;
