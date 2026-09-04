import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import type { StateData } from '../../data/india-states';
import { findStateData } from '../../data/india-states';
import indiaStatesGeoJson from '../../data/india-states.json';

// Strict geographical bounds for India
const INDIA_BOUNDS = L.latLngBounds(
  [6.8, 68.0],  // South-West corner
  [37.2, 97.5]   // North-East corner
);

/* ---- Style tokens ---- */
const COLORS = {
  default: {
    fillColor: '#1c1f24',
    color: '#333943',
    weight: 1.2,
    fillOpacity: 0.7,
  },
  hover: {
    fillColor: '#23262d',
    color: '#007afc',
    weight: 2,
    fillOpacity: 0.85,
  },
  selected: {
    fillColor: '#007afc',
    color: '#007afc',
    weight: 2.2,
    fillOpacity: 0.3,
  },
} as const;

interface IndiaMapProps {
  onStateSelect: (state: StateData) => void;
  selectedStateId: string | null;
}

export const IndiaMap: React.FC<IndiaMapProps> = ({ onStateSelect, selectedStateId }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const activeLayerRef = useRef<L.Path | null>(null);

  const resetView = useCallback(() => {
    if (!mapRef.current) return;
    if (activeLayerRef.current) {
      activeLayerRef.current.setStyle(COLORS.default);
      activeLayerRef.current = null;
    }
    mapRef.current.fitBounds(INDIA_BOUNDS, {
      padding: [15, 15],
      animate: true,
      duration: 0.4,
    });
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize Leaflet map strictly locked to India
    const map = L.map(mapContainerRef.current, {
      maxBounds: INDIA_BOUNDS,
      maxBoundsViscosity: 1.0, // Hard impenetrable boundary wall
      minZoom: 4.6,           // Prevents zooming out to other continents
      maxZoom: 6.8,           // Prevents excessive micro-zooming
      zoomControl: true,
      attributionControl: true,
      bounceAtZoomLimits: false,
    });

    // Keep map permanently inside India bounds on drag
    map.on('drag', () => {
      map.panInsideBounds(INDIA_BOUNDS, { animate: false });
    });

    // Dark CartoDB tile layer
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
        bounds: INDIA_BOUNDS,
      }
    ).addTo(map);

    // Initial fit strictly to India
    map.fitBounds(INDIA_BOUNDS, { padding: [15, 15] });
    mapRef.current = map;

    // Render local 63KB GeoJSON with native SVG paths for bulletproof click detection
    const geojsonLayer = L.geoJSON(indiaStatesGeoJson as any, {
      style: () => ({ ...COLORS.default }),
      onEachFeature: (feature, layer) => {
        const stateName = feature.properties?.name || '';

        layer.bindTooltip(stateName, {
          sticky: true,
          className: 'map-tooltip',
          direction: 'top',
          offset: [0, -8],
        });

        layer.on({
          mouseover: (e: L.LeafletMouseEvent) => {
            const target = e.target as L.Path;
            if (target !== activeLayerRef.current) {
              target.setStyle(COLORS.hover);
              target.bringToFront();
            }
          },
          mouseout: (e: L.LeafletMouseEvent) => {
            const target = e.target as L.Path;
            if (target !== activeLayerRef.current) {
              target.setStyle(COLORS.default);
            }
          },
          click: (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);

            const targetPath = layer as L.Path;
            const stateData = findStateData(stateName);

            // Reset previous state
            if (activeLayerRef.current && activeLayerRef.current !== targetPath) {
              activeLayerRef.current.setStyle(COLORS.default);
            }

            // Highlight selected state
            targetPath.setStyle(COLORS.selected);
            targetPath.bringToFront();
            activeLayerRef.current = targetPath;

            const bounds = (layer as L.Polygon).getBounds();
            const center = bounds.getCenter();
            const currentZoom = map.getZoom();

            // Smooth gliding without zooming out:
            // If already at state inspection zoom (>= 5.0), simply glide with panTo!
            // If at initial national view, zoom directly into state at 5.4.
            if (currentZoom >= 5.0) {
              map.panTo(center, {
                animate: true,
                duration: 0.35,
                easeLinearity: 0.25,
              });
            } else {
              map.flyTo(center, 5.4, {
                duration: 0.45,
              });
            }

            onStateSelect(stateData);
          },
        });
      },
    }).addTo(map);

    geojsonLayerRef.current = geojsonLayer;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [onStateSelect]);

  // Handle external selection reset (e.g. when state drawer is closed)
  useEffect(() => {
    if (!selectedStateId && activeLayerRef.current) {
      activeLayerRef.current.setStyle(COLORS.default);
      activeLayerRef.current = null;
    }

    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize({ animate: false });
    }, 200);

    return () => clearTimeout(timer);
  }, [selectedStateId]);

  return (
    <div className="map-frame">
      <div
        ref={mapContainerRef}
        style={{ height: '100%', width: '100%', outline: 'none' }}
      />
      <button
        type="button"
        className="map-reset-btn"
        onClick={resetView}
        title="Reset to national view"
      >
        ↻ India
      </button>
    </div>
  );
};

export default IndiaMap;
