/**
 * Central place for runtime configuration sourced from environment variables.
 *
 * Expo exposes any var prefixed with EXPO_PUBLIC_ to the JS bundle. These are
 * NOT secrets — the Stadia API key and Supabase publishable key are designed
 * to be shipped in clients. Real secrets (Supabase secret key, etc.) must
 * NEVER live here; they belong only in server-side / Edge Function environments.
 */

const STADIA_DARK_STYLE = 'https://tiles.stadiamaps.com/styles/alidade_smooth_dark.json';

export const config = {
  map: {
    // Free Stadia Maps API key (no credit card). https://client.stadiamaps.com/
    stadiaApiKey: process.env.EXPO_PUBLIC_STADIA_API_KEY ?? '',
    // Dark vector style that mirrors the screenshot aesthetic.
    styleBaseUrl: process.env.EXPO_PUBLIC_MAP_STYLE ?? STADIA_DARK_STYLE,
  },
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  },
  /** Radius (meters) used for the "people near you" query. */
  nearbyRadiusMeters: 5000,
} as const;

export const isMapConfigured = () => config.map.stadiaApiKey.length > 0;

/** Style URL with the Stadia key appended (Stadia authenticates via query param). */
export const mapStyleUrl = () =>
  isMapConfigured()
    ? `${config.map.styleBaseUrl}?api_key=${config.map.stadiaApiKey}`
    : config.map.styleBaseUrl;

export const isSupabaseConfigured = () =>
  config.supabase.url.length > 0 && config.supabase.anonKey.length > 0;
