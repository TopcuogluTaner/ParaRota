import toast from 'react-hot-toast';
import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@shared/api/queryKeys';
import { deviceApi } from '@shared/api/endpoints/devices';
import {
  initializeFcm,
  isFcmConfigured,
  onFcmForegroundMessage,
  requestFcmToken,
  getCachedFcmToken,
} from './firebaseClient';
import {
  onNotification,
  startSignalR,
  stopSignalR,
} from './signalrClient';
import i18n from '@shared/i18n';
import type { NotificationDto } from '@shared/api/types';

// ────────────────────────────────────────────────────────────────────────────
// NotificationBus — tek üretim/dağıtım noktası.
//
// Login sonrası `start(baseUrl, qc)`, logout'ta `stop()` çağırılır. Bus:
//   • SignalR'a bağlanır → "notification" event'inde react-query cache'i
//     invalidate + toast popup (severity-aware)
//   • Firebase Web SDK init eder; permission verilirse FCM token'ı backend'e
//     register eder (POST /devices/register). Permission yoksa veya
//     VITE_FIREBASE_* eksikse no-op.
//   • Foreground FCM mesajlarını da aynı handler'a iletir (SignalR ile
//     paralel davranmak yerine — backend zaten online ise SignalR, offline
//     ise FCM atıyor, foreground'da iki kanaldan da gelmemesi gerekiyor).
//
// Tek yerden geçer; bell/widget/page hepsi react-query cache'i okur.
// ────────────────────────────────────────────────────────────────────────────

let started = false;
let unsubSignalR: (() => void) | null = null;
let unsubFcm: (() => void) | null = null;
let fcmRegisteredToken: string | null = null;

interface ToastVariant {
  severity: 'info' | 'success' | 'warning' | 'error';
  icon: string;
}

function parsePayload(payload: string | null | undefined): Record<string, unknown> {
  if (!payload) return {};
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function showToast(notif: NotificationDto) {
  const interp = parsePayload(notif.payload);
  const t = i18n.t.bind(i18n);
  const title = t(notif.titleKey, { ns: 'notifications', ...interp });
  const body = t(notif.messageKey, { ns: 'notifications', ...interp });
  const variant: ToastVariant['severity'] = notif.severity;

  const message = title + (body ? `\n${body}` : '');
  switch (variant) {
    case 'error':
      toast.error(message);
      break;
    case 'warning':
      toast(message, { icon: '⚠️' });
      break;
    case 'success':
      toast.success(message);
      break;
    default:
      toast(message, { icon: '🔔' });
  }
}

function handleIncoming(payload: unknown, qc: QueryClient) {
  // payload: NotificationDto (camelCase, JsonStringEnumConverter)
  if (!payload || typeof payload !== 'object') return;
  const notif = payload as NotificationDto;

  // Toast
  showToast(notif);

  // Cache invalidation — Topbar bell, /notifications page, dashboard
  void qc.invalidateQueries({ queryKey: queryKeys.notifications.all });

  // İlgili kaynak entity'ler için de
  if (notif.refType === 'budget') {
    void qc.invalidateQueries({ queryKey: queryKeys.budgets.all });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  } else if (notif.refType === 'recurring') {
    void qc.invalidateQueries({ queryKey: queryKeys.recurringRules.all });
    void qc.invalidateQueries({ queryKey: queryKeys.transactions.all });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  } else if (notif.refType === 'goal') {
    void qc.invalidateQueries({ queryKey: queryKeys.goals.all });
    void qc.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  } else if (notif.refType === 'household') {
    // Üye katıldı/ayrıldı/rol değişti → tüm üyelerin household listesi
    // ve member/invite listeleri taze veriyle senkronlanmalı.
    void qc.invalidateQueries({ queryKey: queryKeys.households.all });
  }
}

/**
 * Login sonrası çağrılır. baseUrl httpClient'la aynı, qc react-query client.
 * İdempotent: tekrar çağrılırsa no-op.
 */
export async function startNotificationBus(baseUrl: string, qc: QueryClient): Promise<void> {
  if (started) return;
  started = true;

  // 1) SignalR — online push
  try {
    await startSignalR(baseUrl);
    unsubSignalR = onNotification((payload) => handleIncoming(payload, qc));
  } catch (err) {
    console.warn('[notificationBus] signalr start failed', err);
  }

  // 2) FCM — offline push token register
  try {
    await initializeFcm();
    if (isFcmConfigured()) {
      const token = await requestFcmToken();
      if (token) {
        try {
          await deviceApi.register({ token, platform: 'web' });
          fcmRegisteredToken = token;
        } catch (err) {
          console.error('[notificationBus] device register failed', err);
        }
      }
      // Foreground messages — backend offline-only push atsa da bazı durumlarda
      // SignalR'la paralel gelebilir; idempotent toast OK.
      unsubFcm = onFcmForegroundMessage((payload) => {
        // FCM payload yapısı: { data: { ...NotificationDto fields... } }
        const fcmPayload = payload as { data?: Record<string, string> };
        if (fcmPayload.data) {
          const dto: NotificationDto = {
            id: Number(fcmPayload.data.id) || 0,
            type: (fcmPayload.data.type as NotificationDto['type']) ?? 'system',
            severity: (fcmPayload.data.severity as NotificationDto['severity']) ?? 'info',
            titleKey: fcmPayload.data.titleKey ?? '',
            messageKey: fcmPayload.data.messageKey ?? '',
            payload: fcmPayload.data.payload,
            refType: fcmPayload.data.refType,
            refId: fcmPayload.data.refId ? Number(fcmPayload.data.refId) : undefined,
            isRead: false,
            createdDate: fcmPayload.data.createdDate ?? new Date().toISOString(),
          };
          handleIncoming(dto, qc);
        }
      });
    }
  } catch (err) {
    console.warn('[notificationBus] fcm init failed', err);
  }
}

/** Logout veya app unmount'ta çağırılır. */
export async function stopNotificationBus(): Promise<void> {
  if (!started) return;
  started = false;
  unsubSignalR?.();
  unsubFcm?.();
  unsubSignalR = null;
  unsubFcm = null;

  // Logout'ta FCM token'ı backend'den revoke et (best-effort)
  const token = fcmRegisteredToken ?? getCachedFcmToken();
  if (token) {
    try {
      await deviceApi.revoke(token);
    } catch {
      /* noop */
    }
  }
  fcmRegisteredToken = null;

  await stopSignalR();
}
