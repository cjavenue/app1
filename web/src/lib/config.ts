const STADIA_DARK = 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json';

export const config = {
  map: {
    stadiaApiKey: import.meta.env.VITE_STADIA_API_KEY ?? '',
    styleBaseUrl: import.meta.env.VITE_MAP_STYLE || STADIA_DARK,
  },
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL ?? '',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
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
