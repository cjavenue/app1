import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export type LocationPermissionState =
  | 'undetermined' // not asked yet -> show the permission sheet
  | 'granted'
  | 'denied'
  | 'manual'; // user chose to set location by hand

export interface Coords {
  latitude: number;
  longitude: number;
}

interface UseLocation {
  permission: LocationPermissionState;
  coords: Coords | null;
  /** Triggers the OS permission prompt and starts watching position. */
  requestAndStart: () => Promise<boolean>;
  /** User opted to skip GPS; we'll let them drop a manual pin later. */
  useManual: () => void;
  refreshPermission: () => Promise<void>;
}

/**
 * Owns location permission + the live position watcher.
 *
 * Privacy: we only ever start watching AFTER an explicit user action
 * (requestAndStart). We request `Balanced` accuracy — good enough for a 5km
 * neighborhood view without draining battery or exposing pinpoint precision.
 */
export function useLocation(): UseLocation {
  const [permission, setPermission] = useState<LocationPermissionState>('undetermined');
  const [coords, setCoords] = useState<Coords | null>(null);
  const watcher = useRef<Location.LocationSubscription | null>(null);

  const refreshPermission = useCallback(async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') setPermission('granted');
    else if (status === 'denied') setPermission('denied');
    else setPermission('undetermined');
  }, []);

  const startWatching = useCallback(async () => {
    if (watcher.current) return;
    watcher.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 25, // meters before we get an update
        timeInterval: 5000,
      },
      (loc) => {
        setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      }
    );
  }, []);

  const requestAndStart = useCallback(async (): Promise<boolean> => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPermission('denied');
      return false;
    }
    setPermission('granted');
    // Seed an immediate fix so the map can recenter without waiting for a watch tick.
    const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setCoords({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    await startWatching();
    return true;
  }, [startWatching]);

  const useManual = useCallback(() => {
    setPermission('manual');
  }, []);

  useEffect(() => {
    refreshPermission();
    return () => {
      watcher.current?.remove();
      watcher.current = null;
    };
  }, [refreshPermission]);

  return { permission, coords, requestAndStart, useManual, refreshPermission };
}
