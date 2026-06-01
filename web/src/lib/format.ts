export function distanceLabel(m: number): string {
  if (m < 950) return `${Math.max(1, Math.round(m / 10) * 10)} m away`;
  return `${Math.round(m / 1000)} km away`;
}

export function timeAgo(iso: string): string {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export function initials(name: string): string {
  return name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
}

export function memberSince(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export type Liveness = 'fresh' | 'fading' | 'expiring';

/**
 * Post liveness over its 1-hour life, weighted to nudge action near the end:
 *   fresh    🟢  0–30m   (#1AA7A0 teal-green)
 *   fading   🟠  30–50m  (#F5C518 amber)
 *   expiring 🔴  50–60m  (#F87171 red)
 * Computed from minutes ELAPSED since createdAt.
 */
export function liveness(createdAtIso: string): Liveness {
  const mins = (Date.now() - new Date(createdAtIso).getTime()) / 60000;
  if (mins < 30) return 'fresh';
  if (mins < 50) return 'fading';
  return 'expiring';
}

export const LIVENESS_COLOR: Record<Liveness, string> = {
  fresh: '#22C55E',
  fading: '#F5C518',
  expiring: '#F87171',
};

