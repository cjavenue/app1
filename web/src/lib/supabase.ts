import { createClient } from '@supabase/supabase-js';
import { config, isSupabaseConfigured } from './config';

/**
 * Supabase client (web). Uses localStorage for the session by default and
 * detects OAuth redirects in the URL. Only the public publishable key ships
 * here — RLS protects the data.
 */
export const supabase = isSupabaseConfigured()
  ? createClient(config.supabase.url, config.supabase.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const hasSupabase = supabase !== null;
