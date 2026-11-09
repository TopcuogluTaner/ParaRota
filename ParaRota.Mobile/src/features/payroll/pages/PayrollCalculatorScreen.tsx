import { useState } from 'react';
import { View, StyleSheet, Keyboard, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { TextInput, Button, ActivityIndicator, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@shared/components/AppHeader';
import { Screen } from '@shared/components/Screen';
import { RouteCard } from '@shared/components/RouteCard';
import { RouteLine } from '@shared/components/RouteLine';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { AppDateTimePicker } from '@shared/components/AppDateTimePicker';
import { PressableScale } from '@shared/components/PressableScale';
import { Body, Display, Eyebrow, Money } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import { formatCurrency, formatDate } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { toast } from '@shared/lib/toast';
import { usePayrollQuery, usePayrollYearsQuery } from '@features/payroll/api/usePayroll';
import { useCategoriesQuery, useCreateCategory } from '@features/categories/api/useCategories';
import { useCreateRecurringRule, useRecurringRulesQuery } from '@features/recurring/api/useRecurringRules';

const FALLBACK_YEAR = 2026;
const MONTH_KEYS = [
  'month_short_jan', 'month_short_feb', 'month_short_mar', 'month_short_apr',
  'month_short_may', 'month_short_jun', 'month_short_jul', 'month_short_aug',
  'month_short_sep', 'month_short_oct', 'month_short_nov', 'month_short_dec',
] as const;

export function PayrollCalculatorScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation('payroll');
  const { t: tCommon } = useTranslation('common');

  const yearsQuery = usePayrollYearsQuery();
  const YEAR = yearsQuery.data?.length ? Math.max(...yearsQuery.data) : FALLBACK_YEAR;

  const [grossInput, setGrossInput] = useState('');
  const [submitted, setSubmitted] = useState(0);
  const { data, isFetching, isError, error } = usePayrollQuery(submitted, YEAR);

  // Kurulu maaş otomatiği var mı? (varsa kurulum yerine yönetim kartı gösterilir)
  const rulesQuery = useRecurringRulesQuery(true);
  const salaryRule = (rulesQuery.data ?? []).find((r) => r.payrollGrossMonthly != null);

  const cats = useCategoriesQuery();
  const createCategory = useCreateCategory();
  const createRule = useCreateRecurringRule();
  const [showPayday, setShowPayday] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(0); // data.months indeksi

  const compute = () => {
    Keyboard.dismiss();
    const g = parseAmount(grossInput);
    setSubmitted(Number.isFinite(g) && g > 0 ? g : 0);
  };

  const avgNet = data ? data.annualNet / Math.max(1, data.months.length) : 0;
  const annualDeductions = data ? data.annualGross - data.annualNet : 0;
  const netRate = data && data.annualGross > 0 ? Math.round((data.annualNet / data.annualGross) * 100) : 0;
  const bd = data?.months[Math.min(selectedMonth, (data?.months.length ?? 1) - 1)];

  // Varsayılan maaş günü: gelecek ayın 1'i (öğlen — saat dilimi kayması olmasın).
  // Varsayılan payday = BU ayın 1'i (geçmiş → kurulunca bu ayın maaşı hemen gelir olarak
  // işlenir + her ay tekrarlar). Gelecek ay seçilirse ilk gelir o tarihte düşer.
  const defaultPayday = (() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1, 12, 0, 0);
  })();

  // Maaş otomatiği kur: aylık tekrarlayan bir "maaş kuralı" oluştur. Backend her ay,
  // seçilen günde, o ay/yılın resmi kümülatif netini hesaplayıp gelir olarak ekler
  // (net ay-ay değiştiği için tek sabit tutar yerine payrollGrossMonthly saklanır).
  // "Maaş" gelir kategorisi yoksa oluşturulur.
  const setupSalary = async (payday: Date) => {
    if (!data) return;
    setAdding(true);
    try {
      const salaryName = t('salaryCategoryName');
      let categoryId = (cats.data ?? []).find(
        (c) => c.type === 'income' && (c.name.toLocaleLowerCase() === salaryName.toLocaleLowerCase() || /maa[şs]|salary/i.test(c.name)),
      )?.id;
      if (!categoryId) {
        const created = await createCategory.mutateAsync({ name: salaryName, icon: 'cash-multiple', type: 'income' });
        categoryId = created.id;
      }
      // Nominal tutar (listede görünür); gerçek tutar her ay backend'de yeniden hesaplanır.
      const startMonthNet = data.months.find((m) => m.month === payday.getMonth() + 1)?.net ?? avgNet;
      await createRule.mutateAsync({
        description: salaryName,
        type: 'income',
        nature: 'fixed',
        categoryId,
        amount: Math.round(startMonthNet * 100) / 100,
        currency: 'TRY',
        frequency: 'monthly',
        startDate: payday.toISOString(),
        autoApprove: true,
        notes: t('incomeNote'),
        payrollGrossMonthly: submitted,
      });
      toast.success(t('salarySetupSuccess', { date: formatDate(payday) }));
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    } finally {
      setAdding(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('title')} back onBack={() => router.navigate('/(app)/calculators')} />
      <Screen edges={['bottom']} contentStyle={{ paddingHorizontal: 16, paddingTop: 12 }}>
        {/* Giriş */}
        <RouteCard eyebrow={t('eyebrow')} title={t('grossLabel')} icon="calculator-variant-outline" iconTone={colors.go}>
          <View style={styles.inputRow}>
            <TextInput
              mode="outlined"
              label={t('grossLabel')}
              value={grossInput}
              onChangeText={(v) => setGrossInput(formatAmountInput(v, grossInput))}
              keyboardType="decimal-pad"
              left={<TextInput.Affix text="₺" />}
              style={{ flex: 1 }}
              contentStyle={{ fontSize: 18, fontWeight: '700' }}
              onSubmitEditing={compute}
              returnKeyType="done"
            />
          </View>
          <Eyebrow tone="mute" style={{ marginTop: 8 }}>{t('yearLabel')}: {YEAR}</Eyebrow>
          <Button
            mode="contained"
            icon="calculator"
            onPress={compute}
            buttonColor={colors.go}
            textColor={colors.onAccent}
            style={{ borderRadius: 999, marginTop: 14 }}
            contentStyle={{ paddingVertical: 6 }}
          >
            {t('calculate')}
          </Button>
        </RouteCard>

        <View style={{ height: 14 }} />

        {submitted <= 0 ? (
          <EmptyState icon="cash-multiple" title={t('eyebrow')} message={t('emptyHint')} />
        ) : isFetching && !data ? (
          <View style={{ paddingTop: 32, alignItems: 'center' }}><ActivityIndicator color={colors.go} /></View>
        ) : isError && !data ? (
          <ErrorState message={getErrorMessage(error, tCommon('error'))} onRetry={compute} />
        ) : data ? (
          <>
            {/* Özet — ortalama aylık net (hero) */}
            <View style={[styles.summary, { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow }]}>
              <View style={[styles.hero, { backgroundColor: colorAlpha(colors.go, 0.07) }]}>
                <View style={styles.heroTop}>
                  <View style={styles.heroLabel}>
                    <View style={[styles.heroIcon, { backgroundColor: colors.go }]}>
                      <Icon source="wallet-outline" size={15} color={colors.onAccent} />
                    </View>
                    <Eyebrow tone="mute">{t('result_avgNet')}</Eyebrow>
                  </View>
                  <View style={[styles.ratePill, { backgroundColor: colorAlpha(colors.go, 0.13) }]}>
                    <Icon source="trending-up" size={13} color={colors.go} />
                    <Body size="xs" weight="bold" style={{ color: colors.go }}>%{netRate} {t('netRateLabel')}</Body>
                  </View>
                </View>
                <View style={styles.heroFigure}>
                  <Display size="lg" style={{ color: colors.go }}>{formatCurrency(avgNet)}</Display>
                  <Body size="sm" tone="mute" style={{ marginBottom: 6 }}>{t('perMonth')}</Body>
                </View>
              </View>
              <View style={[styles.annualBlock, { borderTopColor: colors.line }]}>
                <Eyebrow tone="mute" style={{ marginBottom: 11 }}>{t('annualTitle')}</Eyebrow>
                {/* Yılın elde tutulan (net) vs kesinti oranı — tek bakışta */}
                <View style={styles.barRow}>
                  <View style={[styles.barSeg, { flex: Math.max(netRate, 1), backgroundColor: colors.go }]} />
                  <View style={[styles.barSeg, { flex: Math.max(100 - netRate, 1), backgroundColor: colorAlpha(colors.halt, 0.85) }]} />
                </View>
                <AnnualRow dot={colors.inkMute} label={t('result_annualGross')} value={formatCurrency(data.annualGross)} colors={colors} />
                <AnnualRow dot={colors.go} label={t('result_annualNet')} value={formatCurrency(data.annualNet)} valueColor={colors.go} colors={colors} />
                <AnnualRow dot={colors.halt} label={t('result_annualDeductions')} value={`− ${formatCurrency(annualDeductions)}`} valueColor={colors.halt} colors={colors} last />
              </View>
            </View>

            <View style={{ height: 12 }} />

            {/* Maaş otomatiği — kuruluysa Tekrarlayanlar'a yönlendir, değilse kur */}
            {salaryRule ? (
              <PressableScale
                onPress={() => router.push('/(app)/recurring')}
                style={[styles.cta, { backgroundColor: colorAlpha(colors.go, 0.06), borderColor: colorAlpha(colors.go, 0.2) }]}
              >
                <View style={[styles.ctaIcon, { backgroundColor: colorAlpha(colors.go, 0.15) }]}>
                  <Icon source="check-decagram-outline" size={20} color={colors.go} />
                </View>
                <View style={{ flex: 1 }}>
                  <Body weight="bold" style={{ color: colors.ink }}>{t('automationSetupNote')}</Body>
                  <Body size="xs" tone="mute">{t('automationManageHint')}</Body>
                </View>
                <Icon source="chevron-right" size={22} color={colors.inkMute} />
              </PressableScale>
            ) : (
              <PressableScale
                onPress={() => { if (!adding) setShowPayday(true); }}
                style={[styles.cta, { backgroundColor: colorAlpha(colors.go, 0.08), borderColor: colorAlpha(colors.go, 0.28), opacity: adding ? 0.7 : 1 }]}
              >
                <View style={[styles.ctaIcon, { backgroundColor: colors.go }]}>
                  {adding ? <ActivityIndicator size={18} color={colors.onAccent} /> : <Icon source="calendar-sync-outline" size={20} color={colors.onAccent} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Body weight="bold" style={{ color: colors.ink }}>{t('addIncomeCta')}</Body>
                  <Body size="xs" tone="mute">{t('addIncomeCtaHint')}</Body>
                </View>
                <Icon source="chevron-right" size={22} color={colors.inkMute} />
              </PressableScale>
            )}

            <View style={{ height: 14 }} />

            {/* Aylık kesinti kırılımı — ay seçilebilir */}
            {bd ? (
              <RouteCard eyebrow={t('eyebrow')} title={t('breakdown_title')} icon="receipt-text-outline" iconTone={colors.sky}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {data.months.map((m, i) => {
                    const on = i === Math.min(selectedMonth, data.months.length - 1);
                    return (
                      <Pressable
                        key={m.month}
                        onPress={() => setSelectedMonth(i)}
                        style={[styles.chip, { borderColor: on ? colors.sky : colors.line, backgroundColor: on ? colorAlpha(colors.sky, 0.12) : 'transparent' }]}
                      >
                        <Body size="xs" weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.sky : colors.inkSoft }}>{tCommon(MONTH_KEYS[m.month - 1])}</Body>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                <View style={{ height: 8 }} />
                <BdRow label={t('bd_sgk')} value={`− ${formatCurrency(bd.sgk)}`} colors={colors} />
                <BdRow label={t('bd_unemployment')} value={`− ${formatCurrency(bd.unemployment)}`} colors={colors} />
                <BdRow label={t('bd_incomeTax')} value={`− ${formatCurrency(bd.incomeTax)}`} colors={colors} />
                <BdRow label={t('bd_stamp')} value={`− ${formatCurrency(bd.stampTax)}`} colors={colors} />
                <RouteLine style={{ marginVertical: 8 }} />
                <View style={styles.bdRow}>
                  <Body weight="bold">{t('bd_net')}</Body>
                  <Money size="md" style={{ color: colors.go }}>{formatCurrency(bd.net)}</Money>
                </View>
              </RouteCard>
            ) : null}

            <View style={{ height: 14 }} />

            {/* 12 aylık tablo */}
            <RouteCard eyebrow={t('eyebrow')} title={t('table_title')} icon="calendar-month-outline" iconTone={colors.way}>
              <View style={styles.tableHead}>
                <Eyebrow tone="mute" style={{ flex: 1 }}>{t('col_month')}</Eyebrow>
                <Eyebrow tone="mute" style={{ width: 110, textAlign: 'right' }}>{t('col_gross')}</Eyebrow>
                <Eyebrow tone="mute" style={{ width: 110, textAlign: 'right' }}>{t('col_net')}</Eyebrow>
              </View>
              {data.months.map((m, i) => (
                <View key={m.month} style={[styles.tableRow, i < data.months.length - 1 ? { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth } : null]}>
                  <Body size="sm" weight="bold" style={{ flex: 1 }}>{tCommon(MONTH_KEYS[m.month - 1])}</Body>
                  <Body size="sm" tone="mute" style={{ width: 110, textAlign: 'right' }}>{formatCurrency(m.gross)}</Body>
                  <Money size="sm" tone="ink" style={{ width: 110, textAlign: 'right' }}>{formatCurrency(m.net)}</Money>
                </View>
              ))}
            </RouteCard>

            <View style={[styles.note, { backgroundColor: colorAlpha(colors.way, 0.1), borderColor: colorAlpha(colors.way, 0.3) }]}>
              <Icon source="information-outline" size={16} color={colors.way} />
              <Body size="xs" tone="soft" style={{ flex: 1, lineHeight: 18 }}>{t('note')}</Body>
            </View>
            <View style={{ height: 24 }} />
          </>
        ) : null}
      </Screen>

      <AppDateTimePicker
        visible={showPayday}
        value={defaultPayday}
        mode="date"
        onConfirm={(d) => { setShowPayday(false); setupSalary(d); }}
        onCancel={() => setShowPayday(false)}
      />
    </View>
  );
}

function AnnualRow({ dot, label, value, valueColor, colors, last }: { dot: string; label: string; value: string; valueColor?: string; colors: any; last?: boolean }) {
  return (
    <View style={[styles.annualRow, last ? null : { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <View style={[styles.dot, { backgroundColor: dot }]} />
      <Body size="sm" tone="soft" style={{ flex: 1 }}>{label}</Body>
      <Money size="sm" numberOfLines={1} style={{ color: valueColor ?? colors.ink }}>{value}</Money>
    </View>
  );
}

function BdRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.bdRow}>
      <Body size="sm" tone="soft">{label}</Body>
      <Money size="sm" tone="ink" style={{ color: colors.halt }}>{value}</Money>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summary: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  hero: { padding: 18 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ratePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  heroFigure: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  annualBlock: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6, borderTopWidth: StyleSheet.hairlineWidth },
  barRow: { flexDirection: 'row', gap: 3, height: 8, borderRadius: 999, overflow: 'hidden', marginBottom: 6 },
  barSeg: { borderRadius: 999 },
  annualRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  dot: { width: 8, height: 8, borderRadius: 999 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  ctaIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chips: { gap: 6, paddingVertical: 2, paddingRight: 4 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  bdRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
  tableHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 9 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 14, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
});
