import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useLocation, type Coords, type LocationPermissionState } from '../hooks/useLocation';
import { usePresence, type NearbyUser } from '../hooks/usePresence';
import { useProfile } from '../hooks/useProfile';
import { usePosts } from '../hooks/usePosts';

interface AppContextValue {
  permission: LocationPermissionState;
  coords: Coords | null;
  requestAndStart: () => Promise<boolean>;
  useManual: () => void;
  onlineCount: number;
  nearby: NearbyUser[];
  displayCount: number;
  profile: ReturnType<typeof useProfile>;
  posts: ReturnType<typeof usePosts>;
}

const Ctx = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { permission, coords, requestAndStart, useManual } = useLocation();
  const [visible] = useState(true);
  const { onlineCount, nearby } = usePresence(coords, visible);
  const profile = useProfile();
  const posts = usePosts();

  const value = useMemo<AppContextValue>(
    () => ({
      permission,
      coords,
      requestAndStart,
      useManual,
      onlineCount,
      nearby,
      displayCount: onlineCount + (coords ? 1 : 0),
      profile,
      posts,
    }),
    [permission, coords, requestAndStart, useManual, onlineCount, nearby, profile, posts]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
