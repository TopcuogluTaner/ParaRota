import { useEffect, useState } from 'react';
import { Slot, SplashScreen } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import {
  useFonts as useFraunces,
  Fraunces_500Medium,
  Fraunces_500Medium_Italic,
  Fraunces_600SemiBold,
} from '@expo-google-fonts/fraunces';
import {
  useFonts as useGeist,
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
} from '@expo-google-fonts/geist';
import {
  useFonts as useGeistMono,
  GeistMono_500Medium,
  GeistMono_600SemiBold,
} from '@expo-google-fonts/geist-mono';
import { AppThemeProvider } from '@shared/theme/AppThemeProvider';
import { queryClient } from '@shared/api/queryClient';
import { initI18n } from '@shared/i18n';
import { hydrateTokens } from '@shared/lib/tokenStorage';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { ToastHost } from '@shared/components/ToastHost';
import { OfflineBanner } from '@shared/components/OfflineBanner';
import { LoadingScreen } from '@shared/components/LoadingScreen';
import { startNotificationBus, stopNotificationBus } from '@shared/lib/notificationBus';
import { configurePurchases, loginPurchases, logoutPurchases } from '@features/subscription/lib/purchases';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

// RevenueCat App User ID'yi bizim backend userId'mize bağlar (giriş/çıkışta).
// Sil-yükle & cihaz senkronu bu eşlemeye dayanır.
function PurchasesBridge() {
  const userId = useAuthStore((s) => s.user?.id ?? null);

  useEffect(() => {
    if (userId != null) {
      void loginPurchases(String(userId));
    } else {
      void logoutPurchases();
    }
  }, [userId]);

  return null;
}

function NotificationBusBridge() {
  const qc = useQueryClient();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      void startNotificationBus(qc);
    }
    return () => {
      if (!isAuthenticated) void stopNotificationBus();
    };
  }, [isAuthenticated, qc]);

  return null;
}

export default function RootLayout() {
  const [bootReady, setBootReady] = useState(false);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  const [frauncesLoaded] = useFraunces({
    Fraunces_500Medium,
    Fraunces_500Medium_Italic,
    Fraunces_600SemiBold,
  });
  const [geistLoaded] = useGeist({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
  });
  const [geistMonoLoaded] = useGeistMono({
    GeistMono_500Medium,
    GeistMono_600SemiBold,
  });

  useEffect(() => {
    (async () => {
      try {
        await Promise.all([hydrateTokens(), initI18n()]);
        configurePurchases();
        await fetchUser();
      } finally {
        setBootReady(true);
      }
    })();
  }, [fetchUser]);

  const fontsReady = frauncesLoaded && geistLoaded && geistMonoLoaded;
  const ready = bootReady && fontsReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => undefined);
  }, [ready]);

  if (!ready) {
    return (
      <AppThemeProvider>
        <LoadingScreen />
      </AppThemeProvider>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppThemeProvider>
            <StatusBar style="auto" />
            <NotificationBusBridge />
            <PurchasesBridge />
            <Slot />
            <OfflineBanner />
            <ToastHost />
          </AppThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
