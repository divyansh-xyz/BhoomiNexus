import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import type { StateData } from '../../data/india-states';
import { findStateData } from '../../data/india-states';

const INDIA_CENTER: L.LatLngTuple = [22.5, 82.0];
const INDIA_ZOOM = 5;

const GEOJSON_URL =
  'https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson';

/* ---- Style tokens (mirrors CSS custom properties) ---- */
const COLORS = {
  default: {
    fillColor: '#1c1f24',
    color: '#333943',
    weight: 1,
    fillOpacity: 0.6,
  },
  hover: {
    fillColor: '#23262d',
    color: '#007afc',
    weight: 2,
    fillOpacity: 0.7,
  },
  selected: {
    fillColor: '#007afc',
    color: '#007afc',
    weight: 2.5,
    fillOpacity: 0.25,
  },
} as const;

interface IndiaMapProps {
  onStateSelect: (state: StateData) => void;
  selectedStateId: string | null;
}

const IndiaMap: React.FC<IndiaMapProps> = ({ onStateSelect, selectedStateId }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const geojsonLayerRef = useRef<L.GeoJSON | null>(null);
  const selectedRef = useRef<string | null>(null);

  // Keep selectedRef in sync
  selectedRef.current = selectedStateId;

  const resetView = useCallback(() => {
    mapRef.current?.flyTo(INDIA_CENTER, INDIA_ZOOM, { duration: 0.8 });
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: INDIA_CENTER,
      zoom: INDIA_ZOOM,
      minZoom: 4,
      maxZoom: 8,
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

    mapRef.current = map;

    // Load GeoJSON
    fetch(GEOJSON_URL)
      .then((res) => res.json())
      .then((data) => {
        const geojsonLayer = L.geoJSON(data, {
          style: () => ({
            ...COLORS.default,
          }),
          onEachFeature: (feature, layer) => {
            const stateName =
              feature.properties?.NAME_1 ||
              feature.properties?.name ||
              feature.properties?.ST_NM ||
              '';

            // Tooltip
            layer.bindTooltip(stateName, {
              sticky: true,
              className: 'map-tooltip',
              direction: 'top',
              offset: [0, -8],
            });

            layer.on({
              mouseover: (e: L.LeafletMouseEvent) => {
                const target = e.target as L.Path;
                const currentSelected = selectedRef.current;
                const stateData = findStateData(stateName);
                if (stateData?.id !== currentSelected) {
                  target.setStyle(COLORS.hover);
                  target.bringToFront();
                }
              },
              mouseout: (e: L.LeafletMouseEvent) => {
                const target = e.target as L.Path;
                const stateData = findStateData(stateName);
                const currentSelected = selectedRef.current;
                if (stateData?.id !== currentSelected) {
                  target.setStyle(COLORS.default);
                }
              },
              click: () => {
                const stateData = findStateData(stateName);
                if (!stateData) return;

                // Reset all layers first
                geojsonLayer.setStyle(COLORS.default);

                // Highlight selected
                (layer as L.Path).setStyle(COLORS.selected);
                (layer as L.Path).bringToFront();

                // Fly to state bounds
                const bounds = (layer as L.FeatureGroup).getBounds();
                map.flyToBounds(bounds, {
                  padding: [60, 60],
                  duration: 0.6,
                  maxZoom: 7,
                });

                onStateSelect(stateData);
              },
            });
          },
        }).addTo(map);

        geojsonLayerRef.current = geojsonLayer;
      })
      .catch((err) => {
        console.error('Failed to load India GeoJSON:', err);
      });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync selected state highlight when selectedStateId changes externally (e.g. panel close)
  useEffect(() => {
    if (!geojsonLayerRef.current) return;
    if (!selectedStateId) {
      geojsonLayerRef.current.setStyle(COLORS.default);
    }
  }, [selectedStateId]);

  return (
    <div className="map-frame">
      <div
        ref={mapContainerRef}
        style={{ height: '100%', width: '100%' }}
      />
      <button
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
