import { useCallback, useEffect, useRef, useState } from 'react';

export type LocationPermissionState = 'undetermined' | 'granted' | 'denied' | 'manual';

export interface Coords {
  latitude: number;
  longitude: number;
}

interface UseLocation {
  permission: LocationPermissionState;
  coords: Coords | null;
  requestAndStart: () => Promise<boolean>;
  useManual: () => void;
}

/**
 * Browser geolocation. We only start watching after an explicit user gesture
 * (requestAndStart), which also triggers the browser permission prompt.
 */
export function useLocation(): UseLocation {
  const [permission, setPermission] = useState<LocationPermissionState>('undetermined');
  const [coords, setCoords] = useState<Coords | null>(null);
  const watchId = useRef<number | null>(null);

  const startWatch = useCallback(() => {
    if (watchId.current != null || !('geolocation' in navigator)) return;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: false, maximumAge: 10_000, timeout: 15_000 }
    );
  }, []);

  const requestAndStart = useCallback(async (): Promise<boolean> => {
    if (!('geolocation' in navigator)) {
      setPermission('denied');
      return false;
    }
    return new Promise<boolean>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setPermission('granted');
          setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          startWatch();
          resolve(true);
        },
        () => {
          setPermission('denied');
          resolve(false);
        },
        { enableHighAccuracy: false, timeout: 15_000 }
      );
    });
  }, [startWatch]);

  const useManual = useCallback(() => setPermission('manual'), []);

  // If permission was already granted in a previous visit, start silently.
  useEffect(() => {
    navigator.permissions
      ?.query({ name: 'geolocation' as PermissionName })
      .then((status) => {
        if (status.state === 'granted') {
          setPermission('granted');
          startWatch();
        }
      })
      .catch(() => {});
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [startWatch]);

  return { permission, coords, requestAndStart, useManual };
}
