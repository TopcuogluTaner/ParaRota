import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';
import { useConfigStore } from '@shared/store/useConfigStore';
import { useActiveHouseholdStore } from '@features/household/store/useActiveHouseholdStore';

export const AUTH_COOKIE = 'auth_token';
export const REFRESH_COOKIE = 'refresh_token';
export const ACTIVE_HOUSEHOLD_HEADER = 'X-Active-Household-Id';

/**
 * Auth/refresh token çerezleri için güvenlik bayrakları.
 * - `sameSite: 'strict'` — CSRF yüzeyini kapatır (token zaten Authorization header'ıyla
 *   gönderiliyor, çerez cross-site otomatik iliştirilmez).
 * - `secure` — yalnız HTTPS'te. Dev http://localhost'ta secure çerez tarayıcıya yazılmaz,
 *   o yüzden protokole göre koşullu (aksi halde lokal login bozulurdu).
 * js-cookie httpOnly set EDEMEZ (istemci kütüphanesi); refresh token'ı httpOnly yapmak
 * backend tarafında ayrı iş (Set-Cookie).
 */
export const AUTH_COOKIE_OPTIONS: Cookies.CookieAttributes = {
  sameSite: 'strict',
  secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
};

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const refreshToken = Cookies.get(REFRESH_COOKIE);
      const baseUrl = useConfigStore.getState().baseUrl;
      if (!refreshToken || !baseUrl) return null;
      const resp = await axios.post(`${baseUrl}/auth/refresh-token`, { refreshToken });
      if (!resp.data?.isSuccess) return null;
      const newAccess = resp.data.data?.accessToken as string | undefined;
      const newRefresh = resp.data.data?.refreshToken as string | undefined;
      if (newAccess) Cookies.set(AUTH_COOKIE, newAccess, AUTH_COOKIE_OPTIONS);
      if (newRefresh) Cookies.set(REFRESH_COOKIE, newRefresh, AUTH_COOKIE_OPTIONS);
      return newAccess ?? null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

function createHttpClient(): AxiosInstance {
  const instance = axios.create({ timeout: 30000 });

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const baseUrl = useConfigStore.getState().baseUrl;
    if (baseUrl && config.url && !/^https?:\/\//i.test(config.url)) {
      config.baseURL = baseUrl;
    }
    const token = Cookies.get(AUTH_COOKIE);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    // Açıkça verilmiş header (ör. başka scope'un kategorilerini çekme) korunur; yoksa aktif scope.
    const activeId = useActiveHouseholdStore.getState().activeId;
    if (activeId != null && config.headers[ACTIVE_HOUSEHOLD_HEADER] == null) {
      config.headers[ACTIVE_HOUSEHOLD_HEADER] = String(activeId);
    }
    return config;
  });

  instance.interceptors.response.use(
    (resp) => resp,
    async (error) => {
      const original = error.config;
      if (error.response?.status === 401 && original && !original._retry) {
        original._retry = true;
        const newToken = await refreshAccessToken();
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return instance(original);
        }
      }
      return Promise.reject(error);
    },
  );

  return instance;
}

export const http = createHttpClient();
