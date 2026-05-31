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
  /** Contact + verification come from the auth user, not the profiles table. */
  email: string | null;
  emailVerified: boolean;
}

export type RenameResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'taken' | 'already_changed' | 'error' };

interface UseProfile {
  profile: Profile | null;
  loading: boolean;
  reload: () => Promise<void>;
  checkNickname: (name: string) => Promise<boolean>;
  rename: (name: string) => Promise<RenameResult>;
  startEmailVerification: (email: string) => Promise<{ ok: boolean; message?: string }>;
  confirmEmail: (email: string, code: string) => Promise<{ ok: boolean; message?: string }>;
}

/**
 * Owns the user's profile: auto-creates it once their location is shared,
 * loads it, supports a one-time rename, and drives the email-verification flow
 * that makes the (otherwise 24h-ephemeral) profile permanent.
 */
export function useProfile(locationReady: boolean): UseProfile {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!hasSupabase || !supabase) return;
    const sb = supabase;
    setLoading(true);
    try {
      await ensureSession();
      // Idempotent: returns the existing profile or creates one with a random name.
      await sb.rpc('create_profile');

      const { data: row } = await sb.from('profiles').select('*').maybeSingle();
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
      }
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
        const msg = error.message || '';
        if (msg.includes('invalid_nickname')) return { ok: false, reason: 'invalid' };
        if (msg.includes('nickname_taken')) return { ok: false, reason: 'taken' };
        if (msg.includes('already_changed')) return { ok: false, reason: 'already_changed' };
        return { ok: false, reason: 'error' };
      }
      await reload();
      return { ok: true };
    },
    [reload]
  );

  // Adds an email to the anonymous user; Supabase emails a 6-digit code.
  const startEmailVerification = useCallback(async (email: string) => {
    if (!supabase) return { ok: false, message: 'Backend not configured' };
    await ensureSession();
    const { error } = await supabase.auth.updateUser({ email });
    if (error) return { ok: false, message: error.message };
    return { ok: true };
  }, []);

  // Confirms the code; on success the user becomes permanent (survives cleanup).
  const confirmEmail = useCallback(
    async (email: string, code: string) => {
      if (!supabase) return { ok: false, message: 'Backend not configured' };
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: 'email_change',
      });
      if (error) return { ok: false, message: error.message };
      await reload();
      return { ok: true };
    },
    [reload]
  );

  useEffect(() => {
    if (locationReady) reload();
  }, [locationReady, reload]);

  return { profile, loading, reload, checkNickname, rename, startEmailVerification, confirmEmail };
}
