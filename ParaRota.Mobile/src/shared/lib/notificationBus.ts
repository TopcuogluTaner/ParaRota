import type { QueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { queryKeys } from '@shared/api/queryKeys';
import { deviceApi } from '@shared/api/endpoints/devices';
import { onNotification, startSignalR, stopSignalR } from './signalrClient';
import { registerExpoPushToken, onForegroundNotification, ensurePushPermission } from './expoPush';
import { toast } from './toast';
import i18n from '@shared/i18n';
import type { NotificationDto } from '@shared/api/types';

let started = false;
let unsubSignalR: (() => void) | null = null;
let unsubFg: (() => void) | null = null;
let registeredToken: string | null = null;

function parsePayload(payload: string | null | undefined): Record<string, unknown> {
  if (!payload) return {};
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function showNotifToast(notif: NotificationDto) {
  const interp = parsePayload(notif.payload);
  const t = i18n.t.bind(i18n);
  const title = t(notif.titleKey, { ns: 'notifications', ...interp });
  const body = t(notif.messageKey, { ns: 'notifications', ...interp });
  const message = title + (body ? `\n${body}` : '');
  switch (notif.severity) {
    case 'error':
      toast.error(message);
      break;
    case 'warning':
      toast.warning(message);
      break;
    case 'success':
      toast.success(message);
      break;
    default:
      toast.info(message);
  }
}

function handleIncoming(payload: unknown, qc: QueryClient) {
  if (!payload || typeof payload !== 'object') return;
  const notif = payload as NotificationDto;

  showNotifToast(notif);

  void qc.invalidateQueries({ queryKey: queryKeys.notifications.all });

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
    void qc.invalidateQueries({ queryKey: queryKeys.households.all });
  }
}

export async function startNotificationBus(qc: QueryClient): Promise<void> {
  if (started) return;
  started = true;

  try {
    await startSignalR();
    unsubSignalR = onNotification((payload) => handleIncoming(payload, qc));
  } catch (err) {
    console.warn('[notificationBus] signalr start failed', err);
  }

  try {
    await ensurePushPermission();
    const token = await registerExpoPushToken();
    if (token) {
      try {
        const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
        await deviceApi.register({ token, platform });
        registeredToken = token;
      } catch (err) {
        console.warn('[notificationBus] device register failed', err);
      }
    }
    unsubFg = onForegroundNotification((notif) => {
      const data = notif.request.content.data as Record<string, unknown> | undefined;
      if (data && typeof data === 'object' && 'titleKey' in data) {
        handleIncoming(data, qc);
      }
    });
  } catch (err) {
    console.warn('[notificationBus] push init failed', err);
  }
}

export async function stopNotificationBus(): Promise<void> {
  if (!started) return;
  started = false;
  unsubSignalR?.();
  unsubFg?.();
  unsubSignalR = null;
  unsubFg = null;

  if (registeredToken) {
    try {
      await deviceApi.revoke(registeredToken);
    } catch {
      /* noop */
    }
    registeredToken = null;
  }

  await stopSignalR();
}
