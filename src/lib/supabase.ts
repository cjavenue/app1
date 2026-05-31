import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { config, isSupabaseConfigured } from './config';

/**
 * Supabase client.
 *
 * Security:
 *  - Only the public anon key is used here. All data access MUST be guarded by
 *    Row-Level Security policies on the server (see supabase/migrations).
 *  - Auth session is persisted in AsyncStorage so the anonymous user survives
 *    app restarts.
 */
export const supabase = isSupabaseConfigured()
  ? createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

/** True when env is wired up; UI falls back to a local-only mode otherwise. */
export const hasSupabase = supabase !== null;
