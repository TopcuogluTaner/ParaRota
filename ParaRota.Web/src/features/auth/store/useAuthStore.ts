import { create } from 'zustand';
import { isAxiosError } from 'axios';
import Cookies from 'js-cookie';
import { AUTH_COOKIE, REFRESH_COOKIE, AUTH_COOKIE_OPTIONS } from '@shared/api/httpClient';
import { queryClient } from '@shared/api/queryClient';
import { SweetAlert } from '@shared/lib/sweetAlert';
import { useActiveHouseholdStore } from '@features/household/store/useActiveHouseholdStore';
import { authApi } from '../api/authApi';
import type { AuthUser, LoginRequest } from '../types/auth.types';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** Login/refresh mutation gibi user-initiated işlem yürürken. Sadece buton durumu. */
  isLoading: boolean;
  /** İlk açılışta cookie ile fetchUser çağrılırken. App tree'yi blocklar. */
  isInitializing: boolean;
  login: (payload: LoginRequest) => Promise<boolean>;
  /** Google authorization code ile giriş (web popup akışı). */
  googleLogin: (code: string) => Promise<boolean>;
  fetchUser: () => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: !!Cookies.get(AUTH_COOKIE),
  isLoading: false,
  isInitializing: false,

  login: async (payload) => {
    set({ isLoading: true });
    try {
      const resp = await authApi.login(payload);
      if (!resp.data.isSuccess || !resp.data.data) {
        SweetAlert.apiError({ response: { data: resp.data } });
        return false;
      }
      Cookies.set(AUTH_COOKIE, resp.data.data.accessToken, AUTH_COOKIE_OPTIONS);
      Cookies.set(REFRESH_COOKIE, resp.data.data.refreshToken, AUTH_COOKIE_OPTIONS);
      set({ user: resp.data.data.user, isAuthenticated: true });
      return true;
    } catch (err) {
      SweetAlert.apiError(err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  googleLogin: async (code) => {
    set({ isLoading: true });
    try {
      const resp = await authApi.google({ code });
      if (!resp.data.isSuccess || !resp.data.data) {
        SweetAlert.apiError({ response: { data: resp.data } });
        return false;
      }
      Cookies.set(AUTH_COOKIE, resp.data.data.accessToken, AUTH_COOKIE_OPTIONS);
      Cookies.set(REFRESH_COOKIE, resp.data.data.refreshToken, AUTH_COOKIE_OPTIONS);
      set({ user: resp.data.data.user, isAuthenticated: true });
      return true;
    } catch (err) {
      SweetAlert.apiError(err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUser: async () => {
    if (!Cookies.get(AUTH_COOKIE)) {
      set({ user: null, isAuthenticated: false });
      return;
    }
    set({ isInitializing: true });
    try {
      // 429 (rate limit) geçici bir durumdur — oturumu düşürmek yerine kısa
      // backoff'la en fazla 2 kez yeniden dene; ancak ondan sonra da olmazsa çık.
      let resp = await authApi.me().catch((err: unknown) => {
        if (isAxiosError(err) && err.response?.status === 429) return null;
        throw err;
      });
      for (let attempt = 0; resp == null && attempt < 2; attempt++) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        resp = await authApi.me().catch((err: unknown) => {
          if (isAxiosError(err) && err.response?.status === 429 && attempt < 1) return null;
          throw err;
        });
      }
      if (resp?.data.isSuccess) {
        set({ user: resp.data.data, isAuthenticated: true });
      } else {
        get().logout();
      }
    } catch {
      get().logout();
    } finally {
      set({ isInitializing: false });
    }
  },

  logout: () => {
    Cookies.remove(AUTH_COOKIE);
    Cookies.remove(REFRESH_COOKIE);
    set({ user: null, isAuthenticated: false });
    // Çok-hesap senaryosunda re-login'de stale data/scope sızıntısı olmasın.
    useActiveHouseholdStore.setState({ activeId: null });
    queryClient.clear();
  },

  hasRole: (role) => !!get().user?.roles?.includes(role),
}));
