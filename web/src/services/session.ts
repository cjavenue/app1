import { supabase } from '../lib/supabase';

/** Memoized anonymous session so presence + profile don't race. */
let sessionPromise: Promise<void> | null = null;

export function ensureSession(): Promise<void> {
  if (!supabase) return Promise.resolve();
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) await supabase.auth.signInAnonymously();
    })();
  }
  return sessionPromise;
}
