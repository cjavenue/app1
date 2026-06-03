import type { StyleSpecification } from 'maplibre-gl';

const STADIA_DARK = 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json';

// Runtime config from /public/config.js (works on any host, no env vars needed).
// Falls back to Vite build-time env vars if the runtime config isn't present.
const rt = (typeof window !== 'undefined' && window.__NEARBY_CONFIG__) || {};

export const config = {
  map: {
    // Optional Stadia key — only used if you provide one AND authorize your domain.
    stadiaApiKey: rt.STADIA_API_KEY || import.meta.env.VITE_STADIA_API_KEY || '',
    // Optional explicit style URL override.
    style: rt.MAP_STYLE || import.meta.env.VITE_MAP_STYLE || '',
  },
  supabase: {
    url: rt.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: rt.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  nearbyRadiusMeters: 5000,
} as const;

// Keyless dark RASTER basemap (CARTO dark_all). Raster PNG tiles are far more
// reliable than a vector-GL style on iOS PWAs — no glyphs, sprites, or vector
// tile web worker to silently fail. This is the default for web.
const cartoDarkRaster = (): StyleSpecification => ({
  version: 8,
  sources: {
    carto: {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
        'https://d.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap, © CARTO',
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': '#0F1316' } },
    { id: 'carto', type: 'raster', source: 'carto' },
  ],
});

/**
 * A usable dark style is always available. Returns a style URL when one is
 * explicitly configured (custom or Stadia), otherwise a keyless raster style.
 */
export const mapStyle = (): string | StyleSpecification => {
  if (config.map.style) return config.map.style;
  if (config.map.stadiaApiKey) return `${STADIA_DARK}?api_key=${config.map.stadiaApiKey}`;
  return cartoDarkRaster();
};
export const isMapConfigured = () => true;
export const isSupabaseConfigured = () =>
  config.supabase.url.length > 0 && config.supabase.anonKey.length > 0;
