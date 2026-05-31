const STADIA_DARK = 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json';

// Runtime config from /public/config.js (works on any host, no env vars needed).
// Falls back to Vite build-time env vars if the runtime config isn't present.
const rt = (typeof window !== 'undefined' && window.__NEARBY_CONFIG__) || {};

export const config = {
  map: {
    stadiaApiKey: rt.STADIA_API_KEY || import.meta.env.VITE_STADIA_API_KEY || '',
    styleBaseUrl: rt.MAP_STYLE || import.meta.env.VITE_MAP_STYLE || STADIA_DARK,
  },
  supabase: {
    url: rt.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL || '',
    anonKey: rt.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  },
  nearbyRadiusMeters: 5000,
} as const;

export const isMapConfigured = () => config.map.stadiaApiKey.length > 0;
export const mapStyleUrl = () =>
  isMapConfigured()
    ? `${config.map.styleBaseUrl}?api_key=${config.map.stadiaApiKey}`
    : config.map.styleBaseUrl;
export const isSupabaseConfigured = () =>
  config.supabase.url.length > 0 && config.supabase.anonKey.length > 0;
