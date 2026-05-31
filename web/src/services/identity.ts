const KEY = 'nearby.deviceId';

/** Random, opaque device id persisted in localStorage (no PII). */
export function getDeviceId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}
