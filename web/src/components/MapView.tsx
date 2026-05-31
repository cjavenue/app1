import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { colors } from '../theme';
import { config, isMapConfigured, mapStyleUrl } from '../lib/config';
import { circlePolygon } from '../lib/geo';
import type { Coords } from '../hooks/useLocation';
import type { NearbyUser } from '../hooks/usePresence';
import type { NearbyStatus } from '../hooks/useStatuses';

interface Props {
  coords: Coords | null;
  nearby: NearbyUser[];
  statuses: NearbyStatus[];
  recenterSignal: number;
}

const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

function pointFC(items: { id: string; latitude: number; longitude: number }[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: items.map((i) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [i.longitude, i.latitude] },
    })),
  };
}

/** Dark MapLibre GL JS canvas with the 5km ring, nearby users, and status pins. */
export function MapView({ coords, nearby, statuses, recenterSignal }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const ready = useRef(false);

  // Init once.
  useEffect(() => {
    if (!hostRef.current || mapRef.current || !isMapConfigured()) return;
    const map = new maplibregl.Map({
      container: hostRef.current,
      style: mapStyleUrl(),
      center: coords ? [coords.longitude, coords.latitude] : [0, 20],
      zoom: coords ? 13.5 : 1,
      attributionControl: false,
    });
    mapRef.current = map;
    map.on('load', () => {
      ready.current = true;
      map.addSource('radius', { type: 'geojson', data: empty });
      map.addLayer({ id: 'radius-fill', type: 'fill', source: 'radius', paint: { 'fill-color': colors.turquoise, 'fill-opacity': 0.06 } });
      map.addLayer({ id: 'radius-line', type: 'line', source: 'radius', paint: { 'line-color': colors.turquoise, 'line-width': 1.5, 'line-opacity': 0.4 } });

      map.addSource('nearby', { type: 'geojson', data: empty });
      map.addLayer({ id: 'nearby-glow', type: 'circle', source: 'nearby', paint: { 'circle-radius': 14, 'circle-color': colors.green, 'circle-opacity': 0.18 } });
      map.addLayer({ id: 'nearby-dot', type: 'circle', source: 'nearby', paint: { 'circle-radius': 6, 'circle-color': colors.green, 'circle-stroke-width': 2, 'circle-stroke-color': colors.bg } });

      map.addSource('statuses', { type: 'geojson', data: empty });
      map.addLayer({ id: 'status-glow', type: 'circle', source: 'statuses', paint: { 'circle-radius': 16, 'circle-color': colors.turquoise, 'circle-opacity': 0.2 } });
      map.addLayer({ id: 'status-dot', type: 'circle', source: 'statuses', paint: { 'circle-radius': 8, 'circle-color': colors.turquoise, 'circle-stroke-width': 2, 'circle-stroke-color': colors.white } });

      map.addSource('me', { type: 'geojson', data: empty });
      map.addLayer({ id: 'me-glow', type: 'circle', source: 'me', paint: { 'circle-radius': 18, 'circle-color': colors.turquoiseLight, 'circle-opacity': 0.25 } });
      map.addLayer({ id: 'me-dot', type: 'circle', source: 'me', paint: { 'circle-radius': 7, 'circle-color': '#3B82F6', 'circle-stroke-width': 3, 'circle-stroke-color': colors.white } });

      syncData();
    });
    return () => {
      map.remove();
      mapRef.current = null;
      ready.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncData = () => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const setData = (id: string, data: GeoJSON.FeatureCollection | GeoJSON.Feature) => {
      const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
      src?.setData(data as GeoJSON.GeoJSON);
    };
    setData('radius', coords ? circlePolygon(coords.longitude, coords.latitude, config.nearbyRadiusMeters) : empty);
    setData('nearby', pointFC(nearby));
    setData('statuses', pointFC(statuses));
    setData('me', coords ? pointFC([{ id: 'me', latitude: coords.latitude, longitude: coords.longitude }]) : empty);
  };

  // Keep layers in sync with data.
  useEffect(syncData, [coords, nearby, statuses]);

  // Recenter on the user.
  useEffect(() => {
    if (mapRef.current && coords) {
      mapRef.current.flyTo({ center: [coords.longitude, coords.latitude], zoom: 13.5, duration: 700 });
    }
  }, [coords, recenterSignal]);

  if (!isMapConfigured()) {
    return (
      <div className="map-host" style={{ display: 'grid', placeItems: 'center', textAlign: 'center', padding: 40 }}>
        <div className="muted">Add VITE_STADIA_API_KEY to .env to render the live map.</div>
      </div>
    );
  }

  return <div ref={hostRef} className="map-host" />;
}
