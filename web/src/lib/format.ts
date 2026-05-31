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
