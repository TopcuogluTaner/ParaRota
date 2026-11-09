import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AppProviders } from './providers/AppProviders';
import { AppRouter } from './routes/AppRouter';
import { useConfigStore } from '@shared/store/useConfigStore';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { LoadingScreen } from '@shared/components/LoadingScreen';
import { ErrorBoundary } from '@shared/components/ErrorBoundary';
import { useLocaleSync } from '@shared/i18n/useLocaleSync';
import { useVersionWatcher } from '@shared/hooks/useVersionWatcher';
import { startNotificationBus, stopNotificationBus } from '@shared/lib/notificationBus';

function AppShell() {
  useLocaleSync();
  useVersionWatcher();
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const baseUrl = useConfigStore((s) => s.baseUrl);

  useEffect(() => {
    if (isAuthenticated && baseUrl) {
      void startNotificationBus(baseUrl, qc);
    }
    return () => {
      // unmount veya auth düşerse bus'ı kapat
      if (!isAuthenticated) void stopNotificationBus();
    };
  }, [isAuthenticated, baseUrl, qc]);

  // Web'de satın alma YOK (2026-06-11 kararı): abonelik mobil mağazalardan alınır,
  // otorite backend /auth/me olduğu için premium web'de otomatik geçerli olur.
  // RevenueCat Web SDK bilinçli olarak başlatılmıyor (PaywallDialog bilgilendirme modunda).

  return <AppRouter />;
}

export default function App() {
  const { baseUrl, loaded, loadConfig } = useConfigStore();
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  useEffect(() => {
    if (!loaded) loadConfig();
  }, [loaded, loadConfig]);

  useEffect(() => {
    if (baseUrl) fetchUser();
  }, [baseUrl, fetchUser]);

  if (!loaded || isInitializing) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <AppProviders>
        <AppShell />
      </AppProviders>
    </ErrorBoundary>
  );
}
