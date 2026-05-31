import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, hasSupabase } from '../lib/supabase';
import { config } from '../lib/config';
import { ensureSession } from '../services/session';
import type { CategoryKey } from '../lib/categories';
import type { Coords } from './useLocation';

export interface NearbyStatus {
  id: string;
  body: string;
  category: CategoryKey;
  nickname: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  createdAt: string;
  expiresAt: string;
  isMine: boolean;
}

export type PostResult = { ok: true } | { ok: false; message: string };

const REFRESH_MS = 20_000;

interface UseStatuses {
  statuses: NearbyStatus[];
  refresh: () => Promise<void>;
  post: (body: string, category: CategoryKey) => Promise<PostResult>;
}

/**
 * Fetches non-expired statuses within the radius (polled) and posts new ones.
 */
export function useStatuses(coords: Coords | null): UseStatuses {
  const [statuses, setStatuses] = useState<NearbyStatus[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!hasSupabase || !supabase || !coords) return;
    const { data, error } = await supabase.rpc('nearby_statuses', {
      p_lat: coords.latitude,
      p_lng: coords.longitude,
      p_radius_m: config.nearbyRadiusMeters,
    });
    if (error || !data) return;
    const rows = data as Array<{
      id: string;
      body: string;
      category: CategoryKey;
      nickname: string;
      lat: number;
      lng: number;
      distance_m: number;
      created_at: string;
      expires_at: string;
      is_mine: boolean;
    }>;
    setStatuses(
      rows.map((r) => ({
        id: r.id,
        body: r.body,
        category: r.category,
        nickname: r.nickname,
        latitude: r.lat,
        longitude: r.lng,
        distanceMeters: r.distance_m,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
        isMine: r.is_mine,
      }))
    );
  }, [coords]);

  const post = useCallback(
    async (body: string, category: CategoryKey): Promise<PostResult> => {
      if (!supabase) return { ok: false, message: 'Backend not configured' };
      if (!coords) return { ok: false, message: 'Location not available yet' };
      await ensureSession();
      const { error } = await supabase.rpc('post_status', {
        p_body: body,
        p_category: category,
        p_lat: coords.latitude,
        p_lng: coords.longitude,
      });
      if (error) {
        return {
          ok: false,
          message: error.message.includes('invalid_body')
            ? 'Your status is too long or empty.'
            : 'Could not post. Try again.',
        };
      }
      await refresh();
      return { ok: true };
    },
    [coords, refresh]
  );

  useEffect(() => {
    if (!coords) return;
    refresh();
    timer.current = setInterval(refresh, REFRESH_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [coords, refresh]);

  return { statuses, refresh, post };
}
