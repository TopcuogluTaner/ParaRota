import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { ActivityIndicator, Button, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { RouteCard } from '@shared/components/RouteCard';
import { Body, Eyebrow } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useEntitlement } from '@features/subscription/hooks/useEntitlement';
import { openPaywall } from '@features/subscription/lib/paywallNav';
import { useMonthlyInsightsQuery } from '@features/ai/api/useAi';
import type { InsightTone } from '@shared/api/types';

/**
 * Pano AI içgörü kartı (premium). Lazy: kullanıcı istemeden Gemini kotası yakılmaz —
 * "içgörüleri getir" dokunuşuyla yüklenir, 12 saat önbellekli (client + server).
 * Rakamlar sunucuda hesaplanır; AI yalnız yorumlar.
 */
export function AiInsightsCard() {
  const { t } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const { isPremium } = useEntitlement();
  const [requested, setRequested] = useState(false);

  const now = new Date();
  const q = useMonthlyInsightsQuery(now.getMonth() + 1, now.getFullYear(), requested && isPremium);

  const toneColor = (tone: InsightTone) =>
    tone === 'positive' ? colors.go : tone === 'warning' ? colors.way : colors.inkMute;

  return (
    <RouteCard eyebrow={t('insights_eyebrow')} title={t('insights_title')} icon="creation" iconTone={colors.way}>
      {!isPremium ? (
        // Kilitli: dokun → paywall (fiş tarama gate'iyle aynı dil)
        <Pressable
          onPress={() => openPaywall('ai')}
          accessibilityRole="button"
          accessibilityLabel={t('insights_locked')}
          style={({ pressed }) => [styles.locked, { opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={[styles.lockIcon, { backgroundColor: colorAlpha(colors.way, 0.12) }]}>
            <Icon source="lock-outline" size={17} color={colors.way} />
          </View>
          <Body size="sm" tone="soft" style={{ flex: 1 }}>{t('insights_locked')}</Body>
          <Icon source="chevron-right" size={20} color={colors.inkMute} />
        </Pressable>
      ) : !requested ? (
        <View>
          <Body size="sm" tone="soft" style={{ lineHeight: 19 }}>{t('insights_hint')}</Body>
          <Button
            mode="outlined"
            compact
            icon="creation"
            onPress={() => setRequested(true)}
            style={{ borderRadius: 999, marginTop: 12, alignSelf: 'flex-start', borderColor: colorAlpha(colors.way, 0.45) }}
            textColor={colors.way}
          >
            {t('insights_cta')}
          </Button>
        </View>
      ) : q.isFetching && !q.data ? (
        <View style={styles.loading}>
          <ActivityIndicator size={18} color={colors.way} />
          <Body size="sm" tone="mute">{t('insights_loading')}</Body>
        </View>
      ) : q.isError ? (
        <View>
          <Body size="sm" tone="soft">{getErrorMessage(q.error, tCommon('errorGeneric'))}</Body>
          <Button mode="text" compact onPress={() => q.refetch()} textColor={colors.go} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
            {tCommon('retry', { defaultValue: 'Tekrar dene' })}
          </Button>
        </View>
      ) : q.data ? (
        <View style={{ gap: 10 }}>
          {q.data.items.map((item, i) => (
            <View key={i} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: toneColor(item.tone) }]} />
              <Body size="sm" style={{ flex: 1, lineHeight: 19 }}>{item.text}</Body>
            </View>
          ))}
          <Eyebrow tone="mute" style={{ marginTop: 2 }}>{t('insights_disclaimer')}</Eyebrow>
        </View>
      ) : null}
    </RouteCard>
  );
}

const styles = StyleSheet.create({
  locked: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lockIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 7, height: 7, borderRadius: 999, marginTop: 6 },
});
