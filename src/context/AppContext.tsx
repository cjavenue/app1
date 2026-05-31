import React, { createContext, useContext, useMemo, useState } from 'react';
import { useLocation, type Coords, type LocationPermissionState } from '../hooks/useLocation';
import { usePresence } from '../hooks/usePresence';
import { useProfile } from '../hooks/useProfile';

type UseProfileReturnT = ReturnType<typeof useProfile>;

interface AppContextValue {
  permission: LocationPermissionState;
  coords: Coords | null;
  locationReady: boolean;
  requestAndStart: () => Promise<boolean>;
  useManual: () => void;

  onlineCount: number;
  nearby: ReturnType<typeof usePresence>['nearby'];
  /** Online count including the current user (shown on the badge). */
  displayCount: number;

  profile: UseProfileReturnT;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { permission, coords, requestAndStart, useManual } = useLocation();
  const [visible] = useState(true);

  const { onlineCount, nearby } = usePresence(coords, visible);

  const locationReady = coords !== null;
  const profile = useProfile(locationReady);

  const value = useMemo<AppContextValue>(
    () => ({
      permission,
      coords,
      locationReady,
      requestAndStart,
      useManual,
      onlineCount,
      nearby,
      displayCount: onlineCount + (coords ? 1 : 0),
      profile,
    }),
    [permission, coords, locationReady, requestAndStart, useManual, onlineCount, nearby, profile]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
