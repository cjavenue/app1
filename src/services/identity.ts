import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

/**
 * Anonymous device identity.
 *
 * We assign each install a random UUID stored locally. This lets us attribute
 * presence/status to a stable "user" WITHOUT collecting any personal data
 * (no email, phone, name). It can be upgraded to a real account later by
 * linking this id to an authenticated user server-side.
 *
 * Privacy note: this id is a random opaque value, not derived from any device
 * hardware identifier, so it cannot be used to track the user across apps.
 */
const DEVICE_ID_KEY = 'app1.deviceId';

let cachedId: string | null = null;

export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;

  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) {
    cachedId = existing;
    return existing;
  }

  const fresh = Crypto.randomUUID();
  await AsyncStorage.setItem(DEVICE_ID_KEY, fresh);
  cachedId = fresh;
  return fresh;
}

/** Wipes the local identity — used by a future "reset / sign out" action. */
export async function clearDeviceId(): Promise<void> {
  cachedId = null;
  await AsyncStorage.removeItem(DEVICE_ID_KEY);
}
