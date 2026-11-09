import { create } from 'zustand';
import { setTokens, clearTokens, getAccessToken } from '@shared/lib/tokenStorage';
import { queryClient } from '@shared/api/queryClient';
import { toast } from '@shared/lib/toast';
import { resolveApiError, notifyError } from '@shared/lib/apiError';
import { useActiveHouseholdStore } from '@shared/store/useActiveHouseholdStore';
import { authApi } from '../api/authApi';
import type { AuthUser, LoginRequest } from '../types/auth.types';

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitializing: boolean;
  login: (payload: LoginRequest) => Promise<boolean>;
  googleLogin: (idToken: string) => Promise<boolean>;
  appleLogin: (payload: { identityToken: string; firstName?: string; lastName?: string }) => Promise<boolean>;
  fetchUser: () => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isInitializing: true,

  login: async (payload) => {
    set({ isLoading: true });
    try {
      const resp = await authApi.login(payload);
      if (!resp.data.isSuccess || !resp.data.data) {
        toast.error(resolveApiError({ response: { data: resp.data } }, 'errors:UNEXPECTED'));
        return false;
      }
      await setTokens(resp.data.data.accessToken, resp.data.data.refreshToken);
      set({ user: resp.data.data.user, isAuthenticated: true });
      return true;
    } catch (err) {
      notifyError(err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  googleLogin: async (idToken) => {
    set({ isLoading: true });
    try {
      const resp = await authApi.google(idToken);
      if (!resp.data.isSuccess || !resp.data.data) {
        toast.error(resolveApiError({ response: { data: resp.data } }, 'errors:UNEXPECTED'));
        return false;
      }
      await setTokens(resp.data.data.accessToken, resp.data.data.refreshToken);
      set({ user: resp.data.data.user, isAuthenticated: true });
      return true;
    } catch (err) {
      notifyError(err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  appleLogin: async (payload) => {
    set({ isLoading: true });
    try {
      const resp = await authApi.apple(payload);
      if (!resp.data.isSuccess || !resp.data.data) {
        toast.error(resolveApiError({ response: { data: resp.data } }, 'errors:UNEXPECTED'));
        return false;
      }
      await setTokens(resp.data.data.accessToken, resp.data.data.refreshToken);
      set({ user: resp.data.data.user, isAuthenticated: true });
      return true;
    } catch (err) {
      notifyError(err);
      return false;
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUser: async () => {
    if (!getAccessToken()) {
      set({ user: null, isAuthenticated: false, isInitializing: false });
      return;
    }
    try {
      const resp = await authApi.me();
      if (resp.data.isSuccess && resp.data.data) {
        set({ user: resp.data.data, isAuthenticated: true });
      } else {
        await get().logout();
      }
    } catch {
      await get().logout();
    } finally {
      set({ isInitializing: false });
    }
  },

  logout: async () => {
    await clearTokens();
    set({ user: null, isAuthenticated: false });
    useActiveHouseholdStore.setState({ activeId: null });
    queryClient.clear();
  },

  hasRole: (role) => !!get().user?.roles?.includes(role),
}));
