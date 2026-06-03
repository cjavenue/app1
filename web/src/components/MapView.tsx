import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { colors } from '../theme';
import { mapStyle, cartoFallback } from '../lib/config';
import { categoryOf } from '../lib/categories';
import { liveness, LIVENESS_COLOR } from '../lib/format';
import type { Coords } from '../hooks/useLocation';
import type { NearbyUser } from '../hooks/usePresence';
import type { MapPost, Bounds } from '../hooks/usePosts';

interface Props {
  coords: Coords | null;
  nearby: NearbyUser[];
  posts: MapPost[];
  recenterSignal: number;
  onBoundsChange: (b: Bounds) => void;
  onOpenPost: (post: MapPost) => void;
}

const empty: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };

function pointFC(items: { latitude: number; longitude: number }[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: items.map((i) => ({
      type: 'Feature',
      properties: {},
      geometry: { type: 'Point', coordinates: [i.longitude, i.latitude] },
    })),
  };
}

/** Dark MapLibre canvas with the "me"/nearby dots and tappable category post pins. */
export function MapView({ coords, nearby, posts, recenterSignal, onBoundsChange, onOpenPost }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const ready = useRef(false);
  const didFallback = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [, setTick] = useState(0); // re-project pins on every map move

  const boundsCb = useRef(onBoundsChange);
  boundsCb.current = onBoundsChange;

  const emitBounds = (map: maplibregl.Map) => {
    const b = map.getBounds();
    boundsCb.current({
      minLat: b.getSouth(),
      minLng: b.getWest(),
      maxLat: b.getNorth(),
      maxLng: b.getEast(),
    });
  };

  // Init once.
  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;
    const host = hostRef.current;
    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: host,
        style: mapStyle(),
        center: coords ? [coords.longitude, coords.latitude] : [0, 20],
        zoom: coords ? 14 : 1,
        attributionControl: false,
      });
    } catch (e) {
      setError(`Map init failed: ${(e as Error).message}`);
      return;
    }
    mapRef.current = map;

    map.on('error', (e: maplibregl.ErrorEvent) => {
      const msg = e?.error?.message ?? 'Unknown map error';
      // If the primary (Stadia) style fails to load — e.g. domain not
      // authorized / 401 — fall back once to the keyless CARTO raster so the
      // map never goes black.
      if (!ready.current && !didFallback.current && /style|tiles|403|401|fetch|load/i.test(msg)) {
        didFallback.current = true;
        try {
          map.setStyle(cartoFallback());
          return;
        } catch {
          /* fall through to showing the error */
        }
      }
      setError(msg);
    });

    let raf = 0;
    const reproject = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setTick((n) => n + 1));
    };
    map.on('move', reproject);
    map.on('moveend', () => emitBounds(map));

    // Adds our overlay sources/layers; safe to call again after a style swap.
    const addOverlays = () => {
      if (map.getSource('nearby')) return; // already present on this style
      map.addSource('nearby', { type: 'geojson', data: empty });
      map.addLayer({ id: 'nearby-glow', type: 'circle', source: 'nearby', paint: { 'circle-radius': 13, 'circle-color': colors.teal, 'circle-opacity': 0.15 } });
      map.addLayer({ id: 'nearby-dot', type: 'circle', source: 'nearby', paint: { 'circle-radius': 5, 'circle-color': colors.teal, 'circle-stroke-width': 2, 'circle-stroke-color': colors.bg } });
      map.addSource('me', { type: 'geojson', data: empty });
      map.addLayer({ id: 'me-glow', type: 'circle', source: 'me', paint: { 'circle-radius': 18, 'circle-color': colors.tealLight, 'circle-opacity': 0.25 } });
      map.addLayer({ id: 'me-dot', type: 'circle', source: 'me', paint: { 'circle-radius': 7, 'circle-color': colors.tealLight, 'circle-stroke-width': 3, 'circle-stroke-color': colors.white } });
      syncDots();
    };

    map.on('load', () => {
      ready.current = true;
      setError(null);
      setLoaded(true);
      addOverlays();
      emitBounds(map);
    });

    // After a fallback setStyle(), re-add overlays once the new style is ready.
    map.on('styledata', () => {
      if (ready.current && map.isStyleLoaded()) addOverlays();
    });

    requestAnimationFrame(() => map.resize());
    const t = setTimeout(() => map.resize(), 400);
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(host);

    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      ready.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncDots = () => {
    const map = mapRef.current;
    if (!map || !ready.current) return;
    const setData = (id: string, data: GeoJSON.FeatureCollection) => {
      const src = map.getSource(id) as maplibregl.GeoJSONSource | undefined;
      src?.setData(data as GeoJSON.GeoJSON);
    };
    setData('nearby', pointFC(nearby));
    setData('me', coords ? pointFC([coords]) : empty);
  };

  useEffect(syncDots, [coords, nearby]);

  useEffect(() => {
    if (mapRef.current && coords) {
      mapRef.current.flyTo({ center: [coords.longitude, coords.latitude], zoom: 14, duration: 700 });
    }
  }, [coords, recenterSignal]);

  const map = mapRef.current;

  return (
    <>
      <div ref={hostRef} className="map-host" />

      {/* Post pins projected onto the canvas */}
      {map && ready.current && posts.map((p) => {
        const pt = map.project([p.longitude, p.latitude]);
        const cat = categoryOf(p.category);
        const color = LIVENESS_COLOR[liveness(p.createdAt)];
        return (
          <button
            key={p.id}
            onClick={() => onOpenPost(p)}
            className="map-pin"
            style={{ left: pt.x, top: pt.y, borderColor: color }}
            aria-label={`${cat.label} post by ${p.nickname}`}
          >
            <cat.Glyph size={20} weight="fill" color={color} />
            {p.commentCount > 0 && <span className="map-pin-badge">{p.commentCount}</span>}
          </button>
        );
      })}

      {!loaded && !error && (
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, textAlign: 'center', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: 13, pointerEvents: 'none' }}>
          Loading map…
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top) + 56px)',
            left: 16,
            right: 16,
            background: 'rgba(248,113,113,0.12)',
            border: '1px solid rgba(248,113,113,0.5)',
            color: '#FCA5A5',
            borderRadius: 12,
            padding: '10px 12px',
            fontSize: 12,
            lineHeight: 1.4,
          }}
          onClick={() => setError(null)}
        >
          Map error: {error}
        </div>
      )}
    </>
  );
}
