import Constants from 'expo-constants';

interface ExtraConfig {
  apiBaseUrl: string;
  signalrBaseUrl: string;
  googleWebClientId: string;
  googleIosClientId: string;
  googleAndroidClientId: string;
  revenueCatIosKey: string;
  revenueCatAndroidKey: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as Partial<ExtraConfig>;

export const API_BASE_URL = extra.apiBaseUrl ?? 'http://localhost:5143/api/v1';
export const SIGNALR_BASE_URL = extra.signalrBaseUrl ?? API_BASE_URL.replace(/\/api\/v1\/?$/, '');

// Google Sign-In client ID'leri (boş = yapılandırılmamış → buton gizlenir).
export const GOOGLE_WEB_CLIENT_ID = extra.googleWebClientId || '';
export const GOOGLE_IOS_CLIENT_ID = extra.googleIosClientId || '';
export const GOOGLE_ANDROID_CLIENT_ID = extra.googleAndroidClientId || '';

// RevenueCat public SDK API key'leri (platform başına; boş = yapılandırılmamış → paywall pasif).
export const REVENUECAT_IOS_KEY = extra.revenueCatIosKey || '';
export const REVENUECAT_ANDROID_KEY = extra.revenueCatAndroidKey || '';
