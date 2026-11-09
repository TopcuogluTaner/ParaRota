import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import Cookies from 'js-cookie';
import { AUTH_COOKIE } from '@shared/api/httpClient';

// ────────────────────────────────────────────────────────────────────────────
// SignalR client wrapper — tek hub bağlantısı (NotificationsHub).
// Tek üretim noktası: notificationBus burayı kullanır. Başka kimse doğrudan
// SignalR'a dokunmaz.
// ────────────────────────────────────────────────────────────────────────────

let connection: HubConnection | null = null;
const handlers = new Map<string, Set<(payload: unknown) => void>>();

export function isSignalRConnected(): boolean {
  return connection?.state === HubConnectionState.Connected;
}

/** Hub'a bağlan. Bir kez çağrılır; tekrar çağrılırsa mevcut bağlantı korunur. */
export async function startSignalR(baseUrl: string): Promise<void> {
  if (connection && connection.state !== HubConnectionState.Disconnected) return;

  // Hub root'ta map'li (`/hubs/notifications`), API base'i ise `/api/v1` içerir —
  // mobil signalrClient ile aynı şekilde path soyulur (yoksa negotiate 404).
  const hubUrl = `${baseUrl.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '')}/hubs/notifications`;

  connection = new HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => Cookies.get(AUTH_COOKIE) ?? '',
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(LogLevel.Warning)
    .build();

  // Backend `await Clients.User(uid).SendAsync("notification", payload)` yolluyor.
  connection.on('notification', (payload: unknown) => {
    handlers.get('notification')?.forEach((fn) => {
      try {
        fn(payload);
      } catch (err) {
        console.error('[signalr] handler error', err);
      }
    });
  });

  try {
    await connection.start();
  } catch (err) {
    // FCM gibi opsiyonel — SignalR yoksa cache polling yedek olarak çalışır.
    console.warn('[signalr] connection failed — falling back to query polling', err);
  }
}

export async function stopSignalR(): Promise<void> {
  if (!connection) return;
  try {
    await connection.stop();
  } catch {
    /* noop */
  }
  connection = null;
  handlers.clear();
}

/**
 * "notification" event'ine subscriber ekle. Birden fazla subscriber olabilir
 * (Topbar bell + NotificationsPage + dashboard widget).
 * Unsubscribe için döndürülen fonksiyonu çağır.
 */
export function onNotification(handler: (payload: unknown) => void): () => void {
  if (!handlers.has('notification')) handlers.set('notification', new Set());
  handlers.get('notification')!.add(handler);
  return () => handlers.get('notification')?.delete(handler);
}
