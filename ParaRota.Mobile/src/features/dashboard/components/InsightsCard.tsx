import { View, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme, type AppColors } from '@shared/theme/AppThemeProvider';
import { RouteCard } from '@shared/components/RouteCard';
import { Body } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { useInsightsQuery } from '@features/dashboard/api/useDashboard';
import type { InsightDto } from '@shared/api/types';

// İçgörü anahtarı → ikon. Renk anlamdan (severity) gelir, süsten değil.
const ICONS: Record<string, string> = {
  categorySpike: 'trending-up',
  budgetPace: 'gauge',
  savingsRate: 'piggy-bank-outline',
  overspend: 'alert-circle-outline',
  upcomingWeek: 'calendar-clock',
};

function toneFor(severity: InsightDto['severity'], colors: AppColors): string {
  if (severity === 'warning') return colors.way;
  if (severity === 'success') return colors.go;
  return colors.sky;
}

/**
 * Kural bazlı içgörüler — Dashboard kartı (ücretsiz; premium AI kartından ayrı).
 * Backend key+params döner, metin burada kullanıcının dilinde kurulur
 * (bildirim sözleşmesinin aynısı). Hiç içgörü yoksa kart gizlenir.
 */
export function InsightsCard() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('dashboard');
  const fmt = useMoneyFmt();
  const { data } = useInsightsQuery();

  if (!data || data.length === 0) return null;

  return (
    <>
      <View style={{ height: 14 }} />
      <RouteCard eyebrow={t('insights_eyebrow')} title={t('insights_title')} icon="lightbulb-on-outline" iconTone={colors.sky}>
        <View style={{ gap: 12 }}>
          {data.map((insight) => {
            const tone = toneFor(insight.severity, colors);
            // Para parametresi gizlilik moduna duyarlı biçimlenir; bilinmeyen key sessizce atlanır.
            const text = t(`insight_${insight.key}`, {
              ...insight.params,
              amount: typeof insight.params.amount === 'number' ? fmt(insight.params.amount) : insight.params.amount,
              defaultValue: '',
            });
            if (!text) return null;
            return (
              <View key={insight.key} style={styles.row}>
                <View style={[styles.iconBox, { backgroundColor: colorAlpha(tone, 0.12) }]}>
                  <Icon source={ICONS[insight.key] ?? 'information-outline'} size={16} color={tone} />
                </View>
                <Body size="sm" style={{ flex: 1 }}>{text}</Body>
              </View>
            );
          })}
        </View>
      </RouteCard>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  iconBox: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
});
