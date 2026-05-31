import { useEffect, useRef, useState } from 'react';
import { supabase, hasSupabase } from '../lib/supabase';
import { config } from '../lib/config';
import { getDeviceId } from '../services/identity';
import { ensureSession } from '../services/session';
import type { Coords } from './useLocation';

export interface NearbyUser {
  id: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
}

interface PresenceState {
  onlineCount: number;
  nearby: NearbyUser[];
}

const HEARTBEAT_MS = 15_000;

/** Publishes presence and reads back who's online within the radius. */
export function usePresence(coords: Coords | null, visible: boolean): PresenceState {
  const [state, setState] = useState<PresenceState>({ onlineCount: 0, nearby: [] });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!coords || !hasSupabase || !supabase) return;
    const sb = supabase;
    let cancelled = false;

    const beat = async () => {
      try {
        await ensureSession();
        const deviceId = getDeviceId();
        if (visible) {
          await sb.rpc('upsert_presence', {
            p_device_id: deviceId,
            p_lat: coords.latitude,
            p_lng: coords.longitude,
          });
        } else {
          await sb.rpc('go_invisible');
        }
        const { data, error } = await sb.rpc('nearby_online', {
          p_lat: coords.latitude,
          p_lng: coords.longitude,
          p_radius_m: config.nearbyRadiusMeters,
        });
        if (error || cancelled) return;
        const rows = (data ?? []) as Array<{ id: string; lat: number; lng: number; distance_m: number }>;
        setState({
          onlineCount: rows.length,
          nearby: rows.map((r) => ({
            id: r.id,
            latitude: r.lat,
            longitude: r.lng,
            distanceMeters: r.distance_m,
          })),
        });
      } catch {
        /* retry next beat */
      }
    };

    beat();
    timer.current = setInterval(beat, HEARTBEAT_MS);
    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
    };
  }, [coords, visible]);

  return state;
}
