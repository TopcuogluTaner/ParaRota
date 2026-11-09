import { useState } from 'react';
import { View, StyleSheet, Keyboard, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { TextInput, Button, ActivityIndicator, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { AppHeader } from '@shared/components/AppHeader';
import { Screen } from '@shared/components/Screen';
import { RouteCard } from '@shared/components/RouteCard';
import { RouteLine } from '@shared/components/RouteLine';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { Body, Display, Eyebrow, Money } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import { formatCurrency } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import type { LoanType, LoanCostResultDto } from '@shared/api/types';
import { useLoanQuery, type LoanParams } from '@features/loan/api/useLoan';

const TERMS = [12, 24, 36, 48, 60, 120] as const;
const TYPES: LoanType[] = ['Ihtiyac', 'Konut', 'Tasit'];
const MAX_ROWS = 120; // mobilde planı ilk 120 ayla sınırla (perf)
const fmtPct = (v: number) => v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function LoanScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation('loan');

  const [amountInput, setAmountInput] = useState('');
  const [rateInput, setRateInput] = useState('');
  const [term, setTerm] = useState(36);
  const [loanType, setLoanType] = useState<LoanType>('Ihtiyac');
  const [feeInput, setFeeInput] = useState('');
  const [params, setParams] = useState<LoanParams | null>(null);

  const { data, isFetching, isError, error, refetch } = useLoanQuery(params);

  const amount = parseAmount(amountInput);
  const rate = rateInput.trim() ? parseFloat(rateInput.replace(',', '.')) : NaN;
  const fee = feeInput.trim() ? parseAmount(feeInput) : 0;
  const valid = Number.isFinite(amount) && amount > 0 && Number.isFinite(rate) && rate >= 0 && term > 0;

  const build = (over?: Partial<LoanParams>): LoanParams => ({
    amount, monthlyRatePercent: rate, termMonths: term, loanType, dosyaMasrafi: Number.isFinite(fee) ? fee : 0, ...over,
  });
  const compute = () => { Keyboard.dismiss(); if (valid) setParams(build()); };
  const live = (over: Partial<LoanParams>) => { if (params) setParams({ ...params, ...over }); };
  const setT = (v: number) => { setTerm(v); live({ termMonths: v }); };
  const setType = (v: LoanType) => { setLoanType(v); live({ loanType: v }); };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('page_title')} back onBack={() => router.navigate('/(app)/calculators')} />
      <Screen edges={['bottom']} contentStyle={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <RouteCard eyebrow={t('page_eyebrow')} title={t('amountLabel')} icon="bank-outline" iconTone={colors.way}>
          <TextInput
            mode="outlined" label={t('amountLabel')} value={amountInput}
            onChangeText={(v) => setAmountInput(formatAmountInput(v, amountInput))}
            keyboardType="decimal-pad" left={<TextInput.Affix text="₺" />}
            contentStyle={{ fontSize: 18, fontWeight: '700' }} returnKeyType="next"
          />
          <TextInput
            mode="outlined" label={t('rateLabel')} value={rateInput}
            onChangeText={(v) => setRateInput(v.replace(/[^\d.,]/g, ''))}
            keyboardType="decimal-pad" right={<TextInput.Affix text={`% / ${t('month')}`} />}
            style={{ marginTop: 10 }} returnKeyType="done" onSubmitEditing={compute}
          />

          {/* Vade */}
          <Eyebrow tone="mute" style={{ marginTop: 14, marginBottom: 8 }}>{t('termLabel')}</Eyebrow>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {TERMS.map((v) => {
              const on = term === v;
              return (
                <Pressable key={v} onPress={() => setT(v)} accessibilityRole="button" accessibilityState={{ selected: on }}
                  style={[styles.chip, { borderColor: on ? colors.sky : colors.line, backgroundColor: on ? colorAlpha(colors.sky, 0.12) : 'transparent' }]}>
                  <Body size="xs" weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.sky : colors.inkSoft }}>{v} {t('mo')}</Body>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Kredi türü */}
          <Eyebrow tone="mute" style={{ marginTop: 16, marginBottom: 8 }}>{t('typeLabel')}</Eyebrow>
          <View style={[styles.seg, { borderColor: colors.line, backgroundColor: colors.bgAlt }]}>
            {TYPES.map((tp) => {
              const on = loanType === tp;
              return (
                <Pressable key={tp} onPress={() => setType(tp)} accessibilityRole="button" accessibilityState={{ selected: on }}
                  style={[styles.segBtn, on && { backgroundColor: colors.ink }]}>
                  <Body size="sm" weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.paper : colors.inkSoft }}>{t(`type_${tp.toLowerCase()}`)}</Body>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            mode="outlined" label={t('feeLabel')} value={feeInput}
            onChangeText={(v) => setFeeInput(formatAmountInput(v, feeInput))}
            keyboardType="decimal-pad" left={<TextInput.Affix text="₺" />}
            style={{ marginTop: 16 }} returnKeyType="done" onSubmitEditing={compute}
          />

          <Button mode="contained" icon="calculator" onPress={compute} disabled={!valid}
            buttonColor={colors.way} textColor={colors.onAccent}
            style={{ borderRadius: 999, marginTop: 16 }} contentStyle={{ paddingVertical: 6 }}>
            {t('calculate')}
          </Button>
          {params != null ? (
            <View style={styles.hintRow}>
              <Icon source="cursor-default-click-outline" size={14} color={colors.inkMute} />
              <Body size="xs" tone="mute" style={{ flex: 1 }}>{t('liveHint')}</Body>
            </View>
          ) : null}
        </RouteCard>

        <View style={{ height: 14 }} />

        {params == null ? (
          <EmptyState icon="bank-outline" title={t('emptyTitle')} message={t('emptyHint')} />
        ) : isFetching && !data ? (
          <View style={{ paddingTop: 32, alignItems: 'center' }}><ActivityIndicator color={colors.way} /></View>
        ) : isError && !data ? (
          <ErrorState message={getErrorMessage(error, t('error_title'))} onRetry={() => refetch()} />
        ) : data ? (
          <LoanResult data={data} isFetching={isFetching} />
        ) : null}
      </Screen>
    </View>
  );
}

function LoanResult({ data, isFetching = false }: { data: LoanCostResultDto; isFetching?: boolean }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation('loan');
  const [planOpen, setPlanOpen] = useState(false);
  const hasTax = data.totalTax > 0;
  const total = Math.max(data.totalPayment, 1);
  const rows = data.schedule.slice(0, MAX_ROWS);
  const extra = data.schedule.length - rows.length;

  return (
    <View style={{ opacity: isFetching ? 0.65 : 1 }}>
      <Animated.View
        key={`res-${data.amount}-${data.monthlyRatePercent}-${data.termMonths}-${data.kkdfPercent}`}
        entering={FadeInDown.duration(320)}
        style={[styles.summary, { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow }]}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroLabel}>
              <View style={[styles.heroIcon, { backgroundColor: colors.ink }]}><Icon source="bank-outline" size={15} color={colors.paper} /></View>
              <Eyebrow tone="mute">{t('result_eyebrow')}</Eyebrow>
            </View>
            <View style={[styles.ratePill, { backgroundColor: colorAlpha(colors.halt, 0.13) }]}>
              <Icon source="alert-decagram-outline" size={13} color={colors.halt} />
              <Body size="xs" weight="bold" style={{ color: colors.halt }}>{t('result_annualChip', { rate: fmtPct(data.annualCostRatePercent) })}</Body>
            </View>
          </View>
          <View style={styles.heroFigure}>
            <Display size="lg" numberOfLines={1} adjustsFontSizeToFit>{formatCurrency(data.monthlyPayment)}</Display>
            <Body size="sm" tone="mute" style={{ marginBottom: 6 }}>{t('perMonth')}</Body>
          </View>
          {/* Reklam → gerçek */}
          <View style={styles.compareRow}>
            <Body size="xs" tone="mute">{t('nominalAnnual')} %{fmtPct(data.nominalAnnualRatePercent)}</Body>
            <Icon source="arrow-right-thin" size={16} color={colors.inkMute} />
            <Body size="sm" weight="bold" style={{ color: colors.halt }}>{t('realAnnual')} %{fmtPct(data.annualCostRatePercent)}</Body>
          </View>
        </View>

        {/* Kırılım + satırlar */}
        <View style={[styles.rows, { borderTopColor: colors.line }]}>
          <View style={styles.barRow}>
            <View style={{ flex: Math.max(data.amount, 1), backgroundColor: colors.inkMute, borderRadius: 999 }} />
            <View style={{ flex: Math.max(data.totalInterest, 1), backgroundColor: colors.way, borderRadius: 999 }} />
            {hasTax ? <View style={{ flex: Math.max(data.totalTax, 1), backgroundColor: colors.halt, borderRadius: 999 }} /> : null}
          </View>
          <Row dot={colors.inkMute} label={t('result_principal')} colors={colors}><Money size="sm" numberOfLines={1}>{formatCurrency(data.amount)}</Money></Row>
          <Row dot={colors.way} label={t('result_interest')} colors={colors}><Money size="sm" numberOfLines={1} style={{ color: colors.way }}>{formatCurrency(data.totalInterest)}</Money></Row>
          {hasTax ? (
            <Row dot={colors.halt} label={t('result_tax', { kkdf: fmtPct(data.kkdfPercent), bsmv: fmtPct(data.bsmvPercent) })} colors={colors}>
              <Money size="sm" numberOfLines={1} style={{ color: colors.halt }}>{formatCurrency(data.totalTax)}</Money>
            </Row>
          ) : null}
          {data.dosyaMasrafi > 0 ? (
            <Row dot={colors.inkMute} label={t('result_fee')} colors={colors}><Money size="sm" numberOfLines={1}>{formatCurrency(data.dosyaMasrafi)}</Money></Row>
          ) : null}
          <RouteLine style={{ marginVertical: 6 }} />
          <View style={styles.row}>
            <Body size="sm" tone="soft" style={{ flex: 1 }}>{t('result_totalPayment')}</Body>
            <Money size="sm" numberOfLines={1}>{formatCurrency(data.totalPayment)}</Money>
          </View>
          <View style={styles.row}>
            <Body size="sm" weight="bold" style={{ flex: 1 }}>{t('result_totalCost')}</Body>
            <Money size="sm" numberOfLines={1} style={{ color: colors.halt }}>{formatCurrency(data.totalCost)}</Money>
          </View>
        </View>
      </Animated.View>

      {/* Açılabilir ödeme planı */}
      <Animated.View entering={FadeInDown.duration(320).delay(60)} style={[styles.planCard, { backgroundColor: colors.paper, borderColor: colors.line }]}>
        <Pressable onPress={() => setPlanOpen((o) => !o)} accessibilityRole="button" accessibilityState={{ expanded: planOpen }} style={styles.planHead}>
          <View style={styles.heroLabel}>
            <Icon source="table-clock" size={18} color={colors.inkSoft} />
            <Body weight="bold" size="sm">{t('schedule_title')}</Body>
          </View>
          <Icon source={planOpen ? 'chevron-up' : 'chevron-down'} size={22} color={colors.inkSoft} />
        </Pressable>
        {planOpen ? (
          <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
            <View style={[styles.planRowHead, { borderBottomColor: colors.line }]}>
              <Eyebrow tone="mute" numberOfLines={1} style={styles.cMonth}>{t('schedule_month')}</Eyebrow>
              <Eyebrow tone="mute" numberOfLines={1} style={styles.cNum}>{t('schedule_principal')}</Eyebrow>
              <Eyebrow tone="mute" numberOfLines={1} style={styles.cNum}>{t('schedule_interest')}</Eyebrow>
              {hasTax ? <Eyebrow tone="mute" numberOfLines={1} style={styles.cNum}>{t('schedule_tax')}</Eyebrow> : null}
              <Eyebrow tone="mute" numberOfLines={1} style={styles.cNum}>{t('schedule_balance')}</Eyebrow>
            </View>
            {rows.map((r) => (
              <View key={r.month} style={[styles.planRow, { borderBottomColor: colors.line }]}>
                <Body size="xs" tone="mute" style={styles.cMonth}>{r.month}</Body>
                <Money size="sm" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.cNum}>{formatCurrency(r.principal)}</Money>
                <Money size="sm" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.cNum}>{formatCurrency(r.interest)}</Money>
                {hasTax ? <Money size="sm" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.cNum}>{formatCurrency(r.tax)}</Money> : null}
                <Money size="sm" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={styles.cNum}>{formatCurrency(r.balance)}</Money>
              </View>
            ))}
            {extra > 0 ? <Body size="xs" tone="mute" style={{ textAlign: 'center', marginTop: 8 }}>{t('schedule_more', { count: extra })}</Body> : null}
          </View>
        ) : null}
      </Animated.View>

      {/* Yasal not */}
      <Animated.View entering={FadeInDown.duration(320).delay(120)} style={[styles.note, { backgroundColor: colorAlpha(colors.sky, 0.08), borderColor: colorAlpha(colors.sky, 0.25) }]}>
        <Icon source="scale-balance" size={16} color={colors.sky} />
        <Body size="xs" tone="soft" style={{ flex: 1, lineHeight: 18 }}>{t('note')}</Body>
      </Animated.View>
      <View style={{ height: 24 }} />
    </View>
  );
}

function Row({ dot, label, children, colors }: { dot?: string; label: string; children: React.ReactNode; colors: ReturnType<typeof useAppTheme>['colors'] }) {
  return (
    <View style={styles.row}>
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      <Body size="sm" tone="soft" style={{ flex: 1 }}>{label}</Body>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 6, paddingVertical: 2, paddingRight: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, minWidth: 48, alignItems: 'center' },
  seg: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, padding: 3 },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 999 },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  summary: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  hero: { padding: 18 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ratePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  heroFigure: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  compareRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  rows: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  barRow: { flexDirection: 'row', gap: 3, height: 8, borderRadius: 999, overflow: 'hidden', marginBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 999 },
  planCard: { marginTop: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  planHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14 },
  planRowHead: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  planRow: { flexDirection: 'row', paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth },
  cMonth: { width: 34 },
  cNum: { flex: 1, textAlign: 'right', fontSize: 11 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 14, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
});
