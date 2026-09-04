import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import type { StateData } from '../../data/india-states';
import { findStateData } from '../../data/india-states';
import indiaStatesGeoJson from '../../data/india-states.json';

// Geographic bounds strictly confined to the Indian Subcontinent
const INDIA_BOUNDS: L.LatLngBoundsLiteral = [
  [6.5, 68.0],
  [37.2, 97.5],
];

// Hard constraint bounding box to prevent drifting to other countries
const HARD_PAN_BOUNDS: L.LatLngBoundsLiteral = [
  [4.0, 64.0],
  [39.0, 101.0],
];

/* ---- Style tokens ---- */
const COLORS = {
  default: {
    fillColor: '#1c1f24',
    color: '#333943',
    weight: 1,
    fillOpacity: 0.65,
  },
  hover: {
    fillColor: '#23262d',
    color: '#007afc',
    weight: 2,
    fillOpacity: 0.8,
  },
  selected: {
    fillColor: '#007afc',
    color: '#007afc',
    weight: 2,
    fillOpacity: 0.28,
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
      duration: 0.45,
    });
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize Leaflet map with Canvas renderer for ultra-smooth 60fps performance
    const map = L.map(mapContainerRef.current, {
      preferCanvas: true, // Eliminates SVG DOM repaints during zoom/pan animations
      maxBounds: HARD_PAN_BOUNDS,
      maxBoundsViscosity: 1.0, // Hard constraint against panning outside India
      minZoom: 4.2,
      maxZoom: 6.8,
      zoomControl: true,
      attributionControl: true,
    });

    // Dark CartoDB tile layer
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map);

    // Initial fit strictly to India
    map.fitBounds(INDIA_BOUNDS, { padding: [15, 15] });
    mapRef.current = map;

    // Render local optimized GeoJSON (63KB instead of 23MB)
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
            // Blur clicked element to prevent browser focus bounding box
            const targetEl = e.originalEvent?.target as HTMLElement | null;
            targetEl?.blur?.();

            const stateData = findStateData(stateName);
            if (!stateData) return;

            const targetPath = layer as L.Path;

            // Reset previously selected state (O(1) update)
            if (activeLayerRef.current && activeLayerRef.current !== targetPath) {
              activeLayerRef.current.setStyle(COLORS.default);
            }

            // Highlight newly selected state
            targetPath.setStyle(COLORS.selected);
            targetPath.bringToFront();
            activeLayerRef.current = targetPath;

            const bounds = (layer as L.Polygon).getBounds();
            const center = bounds.getCenter();
            const currentZoom = map.getZoom();

            // Smooth gliding without zooming out:
            // If already at inspection zoom level, smoothly glide directly with panTo.
            // If at full national overview, zoom in directly to the state.
            if (currentZoom >= 5.0) {
              map.panTo(center, {
                animate: true,
                duration: 0.35,
                easeLinearity: 0.25,
              });
            } else {
              map.flyTo(center, 5.5, {
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
    }, 250);

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
