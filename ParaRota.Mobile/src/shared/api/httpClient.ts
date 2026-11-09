import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL } from '@shared/lib/appConfig';
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from '@shared/lib/tokenStorage';
import { useActiveHouseholdStore } from '@shared/store/useActiveHouseholdStore';
import { useOfflineStore } from '@shared/store/useOfflineStore';

export const ACTIVE_HOUSEHOLD_HEADER = 'X-Active-Household-Id';

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return null;
      const resp = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refreshToken });
      if (!resp.data?.isSuccess) return null;
      const newAccess = resp.data.data?.accessToken as string | undefined;
      const newRefresh = resp.data.data?.refreshToken as string | undefined;
      if (newAccess) {
        await setTokens(newAccess, newRefresh ?? refreshToken);
        return newAccess;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

function createHttpClient(): AxiosInstance {
  const instance = axios.create({ baseURL: API_BASE_URL, timeout: 30000 });

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    // Açıkça verilmiş header (ör. başka scope'un kategorilerini çekme) korunur; yoksa aktif scope.
    const activeId = useActiveHouseholdStore.getState().activeId;
    if (activeId != null && config.headers[ACTIVE_HOUSEHOLD_HEADER] == null) {
      config.headers[ACTIVE_HOUSEHOLD_HEADER] = String(activeId);
    }
    return config;
  });

  instance.interceptors.response.use(
    (resp) => {
      useOfflineStore.getState().setOffline(false);
      return resp;
    },
    async (error) => {
      // Yanıt hiç gelmediyse (DNS/ağ/timeout) → çevrimdışı say. HTTP hatası (4xx/5xx)
      // bir yanıttır; sunucuya ulaşabiliyoruz demektir, offline'a düşürmez.
      if (!error.response) useOfflineStore.getState().setOffline(true);
      else useOfflineStore.getState().setOffline(false);
      const original = error.config;
      if (error.response?.status === 401 && original && !original._retry) {
        original._retry = true;
        const newToken = await refreshAccessToken();
        if (newToken) {
          original.headers.Authorization = `Bearer ${newToken}`;
          return instance(original);
        }
        await clearTokens();
      }
      return Promise.reject(error);
    },
  );

  return instance;
}

export const http = createHttpClient();
