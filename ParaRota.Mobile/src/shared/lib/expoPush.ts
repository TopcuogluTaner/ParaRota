import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function ensurePushPermission(): Promise<boolean> {
  if (!Device.isDevice) return false;
  const settings = await Notifications.getPermissionsAsync();
  if (settings.granted) return true;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

export async function registerExpoPushToken(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;
    const ok = await ensurePushPermission();
    if (!ok) return null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'ParaRotam',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }

    const projectId =
      (Constants?.expoConfig as { extra?: { eas?: { projectId?: string } } } | null)?.extra?.eas?.projectId ??
      (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return tokenData.data;
  } catch (err) {
    console.warn('[expoPush] register failed', err);
    return null;
  }
}

export function onForegroundNotification(handler: (notif: Notifications.Notification) => void): () => void {
  const sub = Notifications.addNotificationReceivedListener(handler);
  return () => sub.remove();
}

export function onNotificationResponse(handler: (resp: Notifications.NotificationResponse) => void): () => void {
  const sub = Notifications.addNotificationResponseReceivedListener(handler);
  return () => sub.remove();
}
