import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase, hasSupabase } from '../lib/supabase';
import { ensureSession } from '../services/session';
import type { CategoryKey } from '../lib/categories';

export type JoinState = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface JoinActivity {
  id: string;
  statusId: string;
  requesterId: string;
  hostId: string;
  state: JoinState;
  createdAt: string;
  requesterNickname: string;
  hostNickname: string;
  statusBody: string;
  statusCategory: CategoryKey;
}

const REFRESH_MS = 20_000;

export function useMeetups(enabled: boolean) {
  const [myId, setMyId] = useState<string | null>(null);
  const [activity, setActivity] = useState<JoinActivity[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!hasSupabase || !supabase) return;
    await ensureSession();
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) setMyId(userData.user.id);
    const { data, error } = await supabase.rpc('my_join_activity');
    if (error || !data) return;
    const rows = data as Array<{
      id: string;
      status_id: string;
      requester_id: string;
      host_id: string;
      state: JoinState;
      created_at: string;
      requester_nickname: string;
      host_nickname: string;
      status_body: string;
      status_category: CategoryKey;
    }>;
    setActivity(
      rows.map((r) => ({
        id: r.id,
        statusId: r.status_id,
        requesterId: r.requester_id,
        hostId: r.host_id,
        state: r.state,
        createdAt: r.created_at,
        requesterNickname: r.requester_nickname,
        hostNickname: r.host_nickname,
        statusBody: r.status_body,
        statusCategory: r.status_category,
      }))
    );
  }, []);

  const requestJoin = useCallback(
    async (statusId: string) => {
      if (!supabase) return { ok: false, message: 'Backend not configured' };
      const { error } = await supabase.rpc('request_to_join', { p_status_id: statusId });
      if (error) {
        return {
          ok: false,
          message: error.message.includes('own_status')
            ? "That's your own status."
            : 'Could not send the request.',
        };
      }
      await refresh();
      return { ok: true };
    },
    [refresh]
  );

  const respond = useCallback(
    async (requestId: string, accept: boolean) => {
      if (!supabase) return { ok: false, message: 'Backend not configured' };
      const { error } = await supabase.rpc('respond_to_join', {
        p_request_id: requestId,
        p_accept: accept,
      });
      if (error) return { ok: false, message: 'Could not update the request.' };
      await refresh();
      return { ok: true };
    },
    [refresh]
  );

  const incoming = useMemo(
    () => activity.filter((a) => a.hostId === myId && a.state === 'pending'),
    [activity, myId]
  );

  const outgoingState = useCallback(
    (statusId: string): JoinState | undefined =>
      activity.find((a) => a.statusId === statusId && a.requesterId === myId)?.state,
    [activity, myId]
  );

  useEffect(() => {
    if (!enabled) return;
    refresh();
    timer.current = setInterval(refresh, REFRESH_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [enabled, refresh]);

  return { myId, incoming, outgoingState, requestJoin, respond, refresh };
}
