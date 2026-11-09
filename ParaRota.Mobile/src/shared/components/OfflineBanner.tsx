import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { queryClient } from '@shared/api/queryClient';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { useOfflineStore } from '@shared/store/useOfflineStore';
import { API_BASE_URL } from '@shared/lib/appConfig';
import { Body } from './Typography';

const PING_INTERVAL_MS = 10_000;

/**
 * Çevrimdışı bandı: httpClient bir ağ hatası görünce görünür (bkz. useOfflineStore).
 * Görünürken 10 sn'de bir hafif ping atar — HERHANGİ bir HTTP yanıtı (404 dahil)
 * "sunucuya ulaşılıyor" demektir, bant kalkar ve aktif query'ler tazelenir.
 */
export function OfflineBanner() {
  const offline = useOfflineStore((s) => s.offline);
  const setOffline = useOfflineStore((s) => s.setOffline);
  const { colors } = useAppTheme();
  const { t } = useTranslation('common');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!offline) return;
    const timer = setInterval(async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5_000);
        await fetch(API_BASE_URL, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeout);
        setOffline(false);
        // Bağlantı geri geldi — ekrandaki query'ler tazelensin.
        queryClient.invalidateQueries();
      } catch {
        // hâlâ çevrimdışı — bir sonraki ping'te tekrar dene
      }
    }, PING_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [offline, setOffline]);

  if (!offline) return null;

  return (
    <View
      style={[styles.banner, { top: insets.top + 6, backgroundColor: colors.ink }]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Icon source="wifi-off" size={15} color={colors.paper} />
      <Body size="sm" weight="bold" style={{ color: colors.paper }}>{t('offline')}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 1000,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
});
