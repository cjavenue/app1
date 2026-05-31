import { supabase } from '../lib/supabase';

/**
 * Ensures a single anonymous Supabase auth session exists.
 *
 * Memoized so concurrent callers (presence + profile) can't race and create
 * two anonymous users. Safe to call repeatedly.
 */
let sessionPromise: Promise<void> | null = null;

export function ensureSession(): Promise<void> {
  if (!supabase) return Promise.resolve();
  if (!sessionPromise) {
    sessionPromise = (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        await supabase.auth.signInAnonymously();
      }
    })();
  }
  return sessionPromise;
}

/** Drop the memo (e.g. after sign-out) so the next call re-establishes a session. */
export function resetSessionMemo(): void {
  sessionPromise = null;
}
