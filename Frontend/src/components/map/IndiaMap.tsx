import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import type { StateData } from '../../data/india-states';
import { findStateData } from '../../data/india-states';
import indiaStatesGeoJson from '../../data/india-states.json';

// Strict geographical bounds for India (including Ladakh & Andaman & Nicobar)
const INDIA_BOUNDS = L.latLngBounds(
  [6.5, 68.0],  // South-West corner
  [37.5, 97.5]  // North-East corner
);

/* ---- Style tokens (OpenWeb Editorial Broadsheet palette) ---- */
const COLORS = {
  default: {
    fillColor: '#e8dedb',
    color: '#000000',
    weight: 1.0,
    fillOpacity: 0.85,
  },
  hover: {
    fillColor: '#ffffff',
    color: '#0058fe',
    weight: 2.0,
    fillOpacity: 0.95,
  },
  selected: {
    fillColor: '#0058fe',
    color: '#0058fe',
    weight: 2.4,
    fillOpacity: 0.22,
  },
} as const;

interface IndiaMapProps {
  onStateSelect: (state: StateData) => void;
  onReset?: () => void;
  selectedStateId: string | null;
}

export const IndiaMap: React.FC<IndiaMapProps> = ({ onStateSelect, onReset, selectedStateId }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const activeLayerRef = useRef<L.Path | null>(null);
  const hasMountedRef = useRef(false);

  // Keep references to state & callbacks to prevent map recreation
  const onStateSelectRef = useRef(onStateSelect);
  onStateSelectRef.current = onStateSelect;

  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;

  const selectedStateIdRef = useRef(selectedStateId);
  selectedStateIdRef.current = selectedStateId;

  const handleResetToNational = useCallback(() => {
    if (activeLayerRef.current) {
      activeLayerRef.current.setStyle(COLORS.default);
      activeLayerRef.current = null;
    }
    // Inform parent (which closes sidebar and clears selectedStateId)
    onResetRef.current?.();

    if (mapRef.current) {
      mapRef.current.fitBounds(INDIA_BOUNDS, {
        padding: [15, 15],
        duration: 0.5,
      });
    }
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize Leaflet map locked to India
    const map = L.map(mapContainerRef.current, {
      maxBounds: INDIA_BOUNDS.pad(0.08),
      maxBoundsViscosity: 1.0,
      minZoom: 3.5,
      maxZoom: 9,
      zoomControl: true,
      attributionControl: true,
      bounceAtZoomLimits: false,
      zoomSnap: 0.5,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 120,
    });

    // Fit precisely within India bounds so Ladakh/J&K and southern tips are fully visible
    map.fitBounds(INDIA_BOUNDS, { padding: [15, 15], animate: false });

    // Keep map inside India bounds on drag
    map.on('drag', () => {
      map.panInsideBounds(INDIA_BOUNDS, { animate: false });
    });

    // Esri World Light Gray Canvas base layer — 100% free, no API key, zero watermarks, pairs with Blush Paper
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        attribution:
          '&copy; <a href="https://www.esri.com/">Esri</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
        maxZoom: 16,
      }
    ).addTo(map);

    mapRef.current = map;

    // Render local GeoJSON with SVG paths for click and hover
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

            // Reset previous state styling
            if (activeLayerRef.current && activeLayerRef.current !== targetPath) {
              activeLayerRef.current.setStyle(COLORS.default);
            }

            // Immediately highlight selected state
            targetPath.setStyle(COLORS.selected);
            targetPath.bringToFront();
            activeLayerRef.current = targetPath;

            const isFirstSelection = !selectedStateIdRef.current;

            // Trigger parent state selection to open inspector
            onStateSelectRef.current(stateData);

            const bounds = (layer as L.Polygon).getBounds();

            const flyToState = () => {
              if (!mapRef.current) return;
              const optimalZoom = mapRef.current.getBoundsZoom(bounds, false, L.point(30, 30));
              const targetZoom = Math.min(Math.max(optimalZoom, 5.8), 8.0);
              mapRef.current.flyTo(bounds.getCenter(), targetZoom, {
                duration: 0.55,
                easeLinearity: 0.25,
              });
            };

            if (isFirstSelection) {
              // First click: sidebar panel is opening, causing container to resize.
              // Wait for layout resize to complete so invalidateSize doesn't abort flyTo.
              setTimeout(() => {
                if (!mapRef.current) return;
                mapRef.current.invalidateSize({ animate: false });
                flyToState();
              }, 100);
            } else {
              // Subsequent clicks: sidebar is already open, fly immediately and smoothly!
              flyToState();
            }
          },
        });
      },
    }).addTo(map);

    geojsonLayerRef.current = geojsonLayer;

    // Observe container resize to auto-invalidate map dimensions
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []); // Run ONCE on mount — map instance is never torn down on re-renders

  // Handle external selection reset (e.g. when state drawer is closed via '✕')
  useEffect(() => {
    selectedStateIdRef.current = selectedStateId;

    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }

    if (!selectedStateId) {
      if (activeLayerRef.current) {
        activeLayerRef.current.setStyle(COLORS.default);
        activeLayerRef.current = null;
      }
      // Return smoothly to full India national bounds when inspector closes
      const timer = setTimeout(() => {
        if (!mapRef.current) return;
        mapRef.current.invalidateSize({ animate: false });
        mapRef.current.fitBounds(INDIA_BOUNDS, {
          padding: [15, 15],
          duration: 0.5,
        });
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [selectedStateId]);

  return (
    <div className="map-frame">
      <div
        ref={mapContainerRef}
        style={{ height: '100%', width: '100%', outline: 'none' }}
      />
      {selectedStateId && (
        <button
          type="button"
          className="map-reset-btn"
          onClick={handleResetToNational}
          title="Reset to national view"
          aria-label="Reset to national view"
        >
          ↻ India
        </button>
      )}
    </div>
  );
};

export default IndiaMap;
