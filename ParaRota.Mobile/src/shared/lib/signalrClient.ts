import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { SIGNALR_BASE_URL } from '@shared/lib/appConfig';
import { getAccessToken } from '@shared/lib/tokenStorage';

let connection: HubConnection | null = null;
const handlers = new Map<string, Set<(payload: unknown) => void>>();

export function isSignalRConnected(): boolean {
  return connection?.state === HubConnectionState.Connected;
}

export async function startSignalR(): Promise<void> {
  if (connection && connection.state !== HubConnectionState.Disconnected) return;

  const hubUrl = `${SIGNALR_BASE_URL.replace(/\/$/, '')}/hubs/notifications`;

  connection = new HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => getAccessToken() ?? '',
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    // Canlı bildirim BEST-EFFORT: bağlantı koparsa uygulama TanStack refetch + push ile
    // çalışmaya devam eder. SignalR kütüphanesinin console.error'larını (negotiation/timeout
    // başarısızlığı) sustur — kullanıcıya kırmızı LogBox hata kutusu çıkmasın.
    .configureLogging(LogLevel.None)
    .build();

  // Reverse-proxy keepalive toleransı: varsayılan 30s server-timeout'ta proxy ping'i geç
  // iletince "Server timeout" ile kopuyordu; daha geniş pencere + daha sık keepalive.
  connection.serverTimeoutInMilliseconds = 60000;
  connection.keepAliveIntervalInMilliseconds = 20000;

  connection.on('notification', (payload: unknown) => {
    handlers.get('notification')?.forEach((fn) => {
      try {
        fn(payload);
      } catch {
        /* handler hatası bildirim akışını bozmasın */
      }
    });
  });

  try {
    await connection.start();
  } catch {
    // Sessiz: realtime kanal kurulamadı; uygulama yine de çalışır (kırmızı kutu yok).
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

export function onNotification(handler: (payload: unknown) => void): () => void {
  if (!handlers.has('notification')) handlers.set('notification', new Set());
  handlers.get('notification')!.add(handler);
  return () => handlers.get('notification')?.delete(handler);
}
