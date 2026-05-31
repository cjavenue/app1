/**
 * Central place for runtime configuration sourced from environment variables.
 *
 * Expo exposes any var prefixed with EXPO_PUBLIC_ to the JS bundle. These are
 * NOT secrets — the Mapbox public token and Supabase anon key are designed to
 * be shipped in clients. Real secrets (service role keys, etc.) must NEVER live
 * here; they belong only in server-side / Edge Function environments.
 */

export const config = {
  mapbox: {
    // Public (pk.*) access token from https://account.mapbox.com/access-tokens
    accessToken: process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '',
    // Swap for a custom dark style URL to match the exact screenshot aesthetic.
    styleUrl: process.env.EXPO_PUBLIC_MAPBOX_STYLE ?? 'mapbox://styles/mapbox/dark-v11',
  },
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  },
  /** Radius (meters) used for the "people near you" query. */
  nearbyRadiusMeters: 5000,
} as const;

export const isMapboxConfigured = () => config.mapbox.accessToken.startsWith('pk.');
export const isSupabaseConfigured = () =>
  config.supabase.url.length > 0 && config.supabase.anonKey.length > 0;
