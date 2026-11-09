import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { RouteCard } from '@shared/components/RouteCard';
import { Eyebrow, Money } from '@shared/components/Typography';
import { formatCurrency } from '@shared/lib/dateFormat';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { useCashflowQuery } from '@features/dashboard/api/useDashboard';

/**
 * Ay sonu tahmini — Dashboard kartı. Bilinen gelecek akış yoksa (hiç aktif
 * tekrarlayan kural yok) render edilmez: tahmin = mevcut net olurdu, onu
 * hero zaten gösteriyor. Dokununca takvim ekranına gider.
 */
export function CashflowCard() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('dashboard');
  const router = useRouter();
  const fmt = useMoneyFmt();
  const { data } = useCashflowQuery();

  if (!data || data.items.length === 0) return null;

  const positive = data.projectedNet >= 0;
  const tone = positive ? colors.go : colors.halt;
  const sign = positive ? '+' : '−';

  return (
    <>
      <View style={{ height: 14 }} />
      <RouteCard
        eyebrow={t('cashflow_eyebrow')}
        title={t('cashflow_title')}
        icon="chart-timeline-variant"
        iconTone={tone}
        onPress={() => router.push('/(app)/cashflow')}
      >
        <Money size="xl" numberOfLines={1} style={{ color: tone }}>
          {sign}{formatCurrency(Math.abs(data.projectedNet))}
        </Money>
        {/* Dar ekran: kırılım satırı tek parça metin — sarmasına izin verilir, kesilmez. */}
        <Eyebrow tone="mute" style={{ marginTop: 6 }}>
          {t('cashflow_breakdown', {
            actual: fmt(data.actualNet),
            income: fmt(data.plannedIncome),
            expense: fmt(data.plannedExpense),
          })}
        </Eyebrow>
      </RouteCard>
    </>
  );
}
