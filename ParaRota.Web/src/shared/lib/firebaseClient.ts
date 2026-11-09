// ────────────────────────────────────────────────────────────────────────────
// Firebase Cloud Messaging wrapper — graceful no-op.
//
// `.env`'de VITE_FIREBASE_* set değilse modül NoOp moduna geçer:
//   - initialize() sadece log basar, hata atmaz
//   - getFcmToken() null döner
//   - onForegroundMessage() sıfır handler çağırır
//
// Gerçek FCM aktivasyonu için (Faz 2+):
//   VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID,
//   VITE_FIREBASE_MESSAGING_SENDER_ID, VITE_FIREBASE_APP_ID, VITE_FIREBASE_VAPID_KEY
//   set edilir + public/firebase-messaging-sw.js eklenir.
// ────────────────────────────────────────────────────────────────────────────

import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type Messaging,
} from 'firebase/messaging';

interface FirebaseEnvConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  vapidKey: string;
}

function readEnv(): FirebaseEnvConfig | null {
  const env = import.meta.env;
  const keys: (keyof FirebaseEnvConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
    'vapidKey',
  ];
  const envKey = (k: string) => `VITE_FIREBASE_${k.replace(/[A-Z]/g, (m) => '_' + m).toUpperCase()}`;
  const cfg: Partial<FirebaseEnvConfig> = {};
  for (const k of keys) {
    const v = env[envKey(k)];
    if (!v) return null; // herhangi biri eksikse NoOp
    cfg[k] = v;
  }
  return cfg as FirebaseEnvConfig;
}

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;
let cachedToken: string | null = null;
let initialized = false;
let envConfig: FirebaseEnvConfig | null = null;

export function isFcmConfigured(): boolean {
  return envConfig !== null;
}

export async function initializeFcm(): Promise<void> {
  if (initialized) return;
  initialized = true;
  envConfig = readEnv();
  if (!envConfig) {
    console.info('[fcm] disabled — VITE_FIREBASE_* env değişkenleri ayarlanmamış');
    return;
  }
  try {
    const supported = await isSupported();
    if (!supported) {
      console.warn('[fcm] tarayıcı desteklenmiyor (eski browser veya iOS Safari < 16.4)');
      envConfig = null;
      return;
    }
    app = initializeApp(envConfig);
    messaging = getMessaging(app);
    console.info('[fcm] initialized');
  } catch (err) {
    console.error('[fcm] init failed', err);
    envConfig = null;
  }
}

/**
 * Tarayıcı permission iste + FCM token al. Permission reddedilirse veya FCM
 * NoOp moddaysa null döner — caller "register" çağrısını skip eder.
 */
export async function requestFcmToken(): Promise<string | null> {
  if (!messaging || !envConfig) return null;
  if (typeof Notification === 'undefined') return null;

  let perm = Notification.permission;
  if (perm === 'default') {
    perm = await Notification.requestPermission();
  }
  if (perm !== 'granted') return null;

  try {
    // Service worker registration için: public/firebase-messaging-sw.js
    // dosyası gerekli. Yoksa hata fırlatır.
    const token = await getToken(messaging, { vapidKey: envConfig.vapidKey });
    cachedToken = token || null;
    return cachedToken;
  } catch (err) {
    console.error('[fcm] token alma başarısız', err);
    return null;
  }
}

export function getCachedFcmToken(): string | null {
  return cachedToken;
}

/** Foreground (uygulama açıkken) gelen mesajları dinle. NoOp moddaysa unsubscribe = no-op. */
export function onFcmForegroundMessage(handler: (payload: unknown) => void): () => void {
  if (!messaging) return () => {};
  const unsub = onMessage(messaging, handler);
  return unsub;
}
