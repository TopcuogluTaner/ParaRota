import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'pararota.access';
const REFRESH_KEY = 'pararota.refresh';

let accessCache: string | null = null;
let refreshCache: string | null = null;
let hydrated = false;

export async function hydrateTokens(): Promise<void> {
  if (hydrated) return;
  accessCache = (await SecureStore.getItemAsync(ACCESS_KEY)) ?? null;
  refreshCache = (await SecureStore.getItemAsync(REFRESH_KEY)) ?? null;
  hydrated = true;
}

export function getAccessToken(): string | null {
  return accessCache;
}

export function getRefreshToken(): string | null {
  return refreshCache;
}

export async function setTokens(access: string | null, refresh: string | null): Promise<void> {
  accessCache = access;
  refreshCache = refresh;
  if (access) await SecureStore.setItemAsync(ACCESS_KEY, access);
  else await SecureStore.deleteItemAsync(ACCESS_KEY);
  if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  else await SecureStore.deleteItemAsync(REFRESH_KEY);
}

export async function clearTokens(): Promise<void> {
  await setTokens(null, null);
}
