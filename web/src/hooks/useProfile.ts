import { useCallback, useEffect, useState } from 'react';
import { supabase, hasSupabase } from '../lib/supabase';
import { ensureSession } from '../services/session';

export interface Profile {
  nickname: string;
  nicknameChanged: boolean;
  gender: string | null;
  interests: string[];
  meetups: number;
  createdAt: string;
  email: string | null;
  emailVerified: boolean;
}

export type RenameResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'taken' | 'already_changed' | 'error' };

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!hasSupabase || !supabase) {
      setError('Backend not configured (missing Supabase URL/key).');
      return;
    }
    const sb = supabase;
    setLoading(true);
    setError(null);
    try {
      await ensureSession();
      const { error: rpcErr } = await sb.rpc('create_profile');
      const { data: row, error: selErr } = await sb.from('profiles').select('*').maybeSingle();
      const { data: userData } = await sb.auth.getUser();
      const user = userData?.user;
      if (row) {
        setProfile({
          nickname: row.nickname,
          nicknameChanged: row.nickname_changed,
          gender: row.gender,
          interests: row.interests ?? [],
          meetups: row.meetups ?? 0,
          createdAt: row.created_at,
          email: user?.email ?? null,
          emailVerified: Boolean(user?.email_confirmed_at),
        });
        setError(null);
      } else {
        // Surface the real reason instead of a generic message.
        setError(rpcErr?.message || selErr?.message || 'Profile not found after create_profile().');
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const checkNickname = useCallback(async (name: string): Promise<boolean> => {
    if (!supabase) return false;
    const { data, error } = await supabase.rpc('nickname_available', { p_name: name });
    return !error && data === true;
  }, []);

  const rename = useCallback(
    async (name: string): Promise<RenameResult> => {
      if (!supabase) return { ok: false, reason: 'error' };
      const { error } = await supabase.rpc('set_nickname', { p_name: name });
      if (error) {
        const m = error.message || '';
        if (m.includes('invalid_nickname')) return { ok: false, reason: 'invalid' };
        if (m.includes('nickname_taken')) return { ok: false, reason: 'taken' };
        if (m.includes('already_changed')) return { ok: false, reason: 'already_changed' };
        return { ok: false, reason: 'error' };
      }
      await reload();
      return { ok: true };
    },
    [reload]
  );

  const startEmailVerification = useCallback(async (email: string) => {
    if (!supabase) return { ok: false, message: 'Backend not configured' };
    await ensureSession();
    const { error } = await supabase.auth.updateUser({ email });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }, []);

  const confirmEmail = useCallback(
    async (email: string, code: string) => {
      if (!supabase) return { ok: false, message: 'Backend not configured' };
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email_change' });
      if (error) return { ok: false, message: error.message };
      await reload();
      return { ok: true };
    },
    [reload]
  );

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    // Link to the current (verified) account; falls back to sign-in if not linkable.
    const redirectTo = window.location.origin;
    const { error } = await supabase.auth.linkIdentity({
      provider: 'google',
      options: { redirectTo },
    });
    if (error) {
      await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    }
  }, []);

  // A profile only needs a session, not location — load it on mount.
  useEffect(() => {
    reload();
  }, [reload]);

  return {
    profile,
    loading,
    error,
    reload,
    checkNickname,
    rename,
    startEmailVerification,
    confirmEmail,
    signInWithGoogle,
  };
}
