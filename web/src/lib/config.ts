const STADIA_DARK = 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json';
// Keyless dark basemap — no API key, no domain authorization. Default for web.
const CARTO_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

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

/** A usable dark style is always available (keyless CARTO fallback). */
export const mapStyleUrl = (): string => {
  if (config.map.style) return config.map.style;
  if (config.map.stadiaApiKey) return `${STADIA_DARK}?api_key=${config.map.stadiaApiKey}`;
  return CARTO_DARK;
};
export const isMapConfigured = () => true;
export const isSupabaseConfigured = () =>
  config.supabase.url.length > 0 && config.supabase.anonKey.length > 0;
