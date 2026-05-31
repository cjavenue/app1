import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../lib/supabase';

// Dismisses the auth browser if it's left open (e.g. on app re-focus).
WebBrowser.maybeCompleteAuthSession();

export type OAuthResult = { ok: true } | { ok: false; message: string };

// Deep link the OAuth provider redirects back to (matches `scheme` in app.json).
const redirectTo = makeRedirectUri({ scheme: 'nearby', path: 'auth-callback' });

/** Extracts params from both the query (?a=b) and fragment (#a=b) of a URL. */
function paramsFromUrl(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const collect = (segment?: string) => {
    if (!segment) return;
    for (const pair of segment.split('&')) {
      const [k, v] = pair.split('=');
      if (k) out[decodeURIComponent(k)] = decodeURIComponent(v ?? '');
    }
  };
  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  if (queryIndex >= 0) collect(url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined));
  if (hashIndex >= 0) collect(url.slice(hashIndex + 1));
  return out;
}

/** Turns the provider's redirect URL into a Supabase session. */
async function completeFromUrl(url: string): Promise<OAuthResult> {
  if (!supabase) return { ok: false, message: 'Backend not configured' };
  const p = paramsFromUrl(url);
  if (p.error) return { ok: false, message: p.error_description || p.error };

  if (p.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(p.code);
    return error ? { ok: false, message: error.message } : { ok: true };
  }
  if (p.access_token && p.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: p.access_token,
      refresh_token: p.refresh_token,
    });
    return error ? { ok: false, message: error.message } : { ok: true };
  }
  return { ok: false, message: 'No session returned' };
}

async function runBrowserFlow(authUrl: string): Promise<OAuthResult> {
  const res = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);
  if (res.type !== 'success') return { ok: false, message: 'Sign-in cancelled' };
  return completeFromUrl(res.url);
}

/**
 * Links Google to the CURRENT (verified) account so the user can sign in with
 * it on another device later. Requires "Manual linking" enabled in Supabase
 * Auth settings and the Google provider configured.
 */
export async function linkGoogle(): Promise<OAuthResult> {
  if (!supabase) return { ok: false, message: 'Backend not configured' };
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return { ok: false, message: error?.message ?? 'Could not start Google' };
  return runBrowserFlow(data.url);
}

/** Signs a RETURNING user into their existing Google-linked account. */
export async function signInWithGoogle(): Promise<OAuthResult> {
  if (!supabase) return { ok: false, message: 'Backend not configured' };
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return { ok: false, message: error?.message ?? 'Could not start Google' };
  return runBrowserFlow(data.url);
}
