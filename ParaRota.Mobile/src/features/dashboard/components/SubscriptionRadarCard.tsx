import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { RouteCard } from '@shared/components/RouteCard';
import { Body, Eyebrow, Money } from '@shared/components/Typography';
import { formatCurrency } from '@shared/lib/dateFormat';
import { useSubscriptionRadarQuery } from '@features/recurring/api/useRecurringRules';

/**
 * Dashboard mini kartı: aylık abonelik toplamı + aktif adet + zam sayısı.
 * Hiç abonelik kuralı yoksa render edilmez; dokununca Tekrarlayanlar'a gider.
 */
export function SubscriptionRadarCard() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('pages');
  const router = useRouter();
  const { data } = useSubscriptionRadarQuery();

  if (!data || data.items.length === 0 || data.totals.length === 0) return null;

  const primary = data.totals[0];
  const raises = data.items.filter((x) => x.priceChange && x.priceChange.percent > 0).length;

  return (
    <>
      <View style={{ height: 14 }} />
      <RouteCard
        eyebrow={t('recurring.radarTitle')}
        title={t('recurring.radarCardTitle')}
        icon="radar"
        iconTone={colors.sky}
        onPress={() => router.push('/(app)/recurring')}
      >
        {/* Dar ekran sözleşmesi: tutar ve sayaç ayrı satırlar — tek satıra
            sıkıştırılırsa TR/DE gibi uzun dillerde 360px'te taşıyor. */}
        {/* adjustsFontSizeToFit kullanma — sarmalı düzende fontu kalıcı küçültebiliyor. */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, flexWrap: 'wrap' }}>
          <Money size="lg" numberOfLines={1}>
            {formatCurrency(primary.monthlyTotal, primary.currency)}
          </Money>
          <Eyebrow tone="mute">{t('recurring.radarPerMonth')}</Eyebrow>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
          <Eyebrow tone="mute" numberOfLines={1} style={{ flexShrink: 1 }}>
            {[
              t('recurring.radarActive', { count: data.activeCount }),
              data.pausedCount > 0 ? t('recurring.radarPaused', { count: data.pausedCount }) : null,
            ].filter(Boolean).join(' · ')}
          </Eyebrow>
          {raises > 0 ? (
            <Body size="xs" style={{ color: colors.way }} numberOfLines={1}>
              {t('recurring.radarRaises', { count: raises })}
            </Body>
          ) : null}
        </View>
      </RouteCard>
    </>
  );
}
