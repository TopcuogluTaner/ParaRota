import { create } from 'zustand';

interface AppConfig {
  Environment?: 'TEST' | 'PROD';
  EnvConfig?: Record<string, { ParaRotaApi?: { BaseUrl?: string } }>;
  GoogleClientId?: string;
  RevenueCatWebKey?: string;
}

interface ConfigState {
  baseUrl: string | null;
  environment: 'TEST' | 'PROD' | null;
  googleClientId: string | null;
  /** RevenueCat Web Billing public SDK key (boş = paywall satın alma pasif). */
  revenueCatWebKey: string | null;
  loaded: boolean;
  loadConfig: () => Promise<void>;
}

export const useConfigStore = create<ConfigState>((set) => ({
  baseUrl: null,
  environment: null,
  googleClientId: null,
  revenueCatWebKey: null,
  loaded: false,
  loadConfig: async () => {
    try {
      const resp = await fetch('/appsettings.json', { cache: 'no-store' });
      const cfg = (await resp.json()) as AppConfig;
      const env = (cfg.Environment ?? 'TEST') as 'TEST' | 'PROD';
      const baseUrl = cfg.EnvConfig?.[env]?.ParaRotaApi?.BaseUrl ?? null;
      set({
        baseUrl,
        environment: env,
        googleClientId: cfg.GoogleClientId || null,
        revenueCatWebKey: cfg.RevenueCatWebKey || null,
        loaded: true,
      });
    } catch (err) {
      console.error('appsettings.json yüklenemedi', err);
      set({ loaded: true });
    }
  },
}));
