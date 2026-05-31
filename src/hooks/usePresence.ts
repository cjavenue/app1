import { useEffect, useRef, useState } from 'react';
import { supabase, hasSupabase } from '../lib/supabase';
import { config } from '../lib/config';
import { getDeviceId } from '../services/identity';
import type { Coords } from './useLocation';

export interface NearbyUser {
  id: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
}

interface PresenceState {
  /** Number of users online within the radius (includes you). */
  onlineCount: number;
  nearby: NearbyUser[];
  /** 'live' when backed by Supabase, 'mock' when env isn't configured yet. */
  source: 'live' | 'mock';
}

const HEARTBEAT_MS = 15_000;

/**
 * Publishes our presence and reads back who else is online within the radius.
 *
 * How it works when Supabase is configured:
 *  1. Ensure an anonymous auth session (so RLS has an auth.uid()).
 *  2. On a heartbeat, upsert our coarse location into `presence`.
 *  3. Poll the `nearby_online` RPC (PostGIS ST_DWithin) for the radius view.
 *
 * Privacy: we never send raw GPS to other clients. The server returns only
 * coarse, snapped coordinates from the RPC, and rows auto-expire (see migration).
 */
export function usePresence(coords: Coords | null, visible: boolean): PresenceState {
  const [state, setState] = useState<PresenceState>({ onlineCount: 0, nearby: [], source: hasSupabase ? 'live' : 'mock' });
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!coords) return;

    // --- Fallback so the UI is demonstrable before backend keys are added. ---
    if (!hasSupabase || !supabase) {
      setState({ onlineCount: 0, nearby: [], source: 'mock' });
      return;
    }

    let cancelled = false;
    const sb = supabase; // captured non-null for the async closures below

    const ensureSession = async () => {
      const { data } = await sb.auth.getSession();
      if (!data.session) {
        // Anonymous sign-in = our "anonymous device identity" on the server.
        await sb.auth.signInAnonymously();
      }
    };

    const beat = async () => {
      try {
        await ensureSession();
        const deviceId = await getDeviceId();

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
        if (error) throw error;
        if (cancelled) return;

        const rows = (data ?? []) as Array<{ id: string; lat: number; lng: number; distance_m: number }>;
        setState({
          onlineCount: rows.length,
          nearby: rows.map((r) => ({
            id: r.id,
            latitude: r.lat,
            longitude: r.lng,
            distanceMeters: r.distance_m,
          })),
          source: 'live',
        });
      } catch {
        // Stay quiet on transient errors; next heartbeat retries.
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
