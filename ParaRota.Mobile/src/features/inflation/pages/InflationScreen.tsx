import { useState } from 'react';
import { View, StyleSheet, Keyboard, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { TextInput, Button, ActivityIndicator, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { AppHeader } from '@shared/components/AppHeader';
import { Screen } from '@shared/components/Screen';
import { RouteCard } from '@shared/components/RouteCard';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { Body, Display, Eyebrow, Money } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import { formatCurrency } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useInflationQuery, type InflationParams } from '@features/inflation/api/useInflation';
import { MonthYearRow } from '@features/inflation/components/MonthYearRow';
import { PurchasingPowerTrend } from '@features/inflation/components/PurchasingPowerTrend';

const MIN_YEAR = 2003;
const MONTH_LONG = [
  'month_long_january', 'month_long_february', 'month_long_march', 'month_long_april',
  'month_long_may', 'month_long_june', 'month_long_july', 'month_long_august',
  'month_long_september', 'month_long_october', 'month_long_november', 'month_long_december',
] as const;
const MONTH_SHORT = [
  'month_short_jan', 'month_short_feb', 'month_short_mar', 'month_short_apr',
  'month_short_may', 'month_short_jun', 'month_short_jul', 'month_short_aug',
  'month_short_sep', 'month_short_oct', 'month_short_nov', 'month_short_dec',
] as const;

const fmtPct = (v: number) => v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function InflationScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation('inflation');
  const { t: tCommon } = useTranslation('common');

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  const [amountInput, setAmountInput] = useState('');
  const [fromMonth, setFromMonth] = useState(1);
  const [fromYear, setFromYear] = useState(curYear - 10);
  const [toMode, setToMode] = useState<'today' | 'custom'>('today');
  const [toMonth, setToMonth] = useState(curMonth);
  const [toYear, setToYear] = useState(curYear);
  const [params, setParams] = useState<InflationParams | null>(null);

  const { data, isFetching, isError, error, refetch } = useInflationQuery(params);

  const buildParams = (over?: Partial<InflationParams>): InflationParams => ({
    amount: parseAmount(amountInput),
    fromMonth,
    fromYear,
    toMonth: toMode === 'today' ? null : toMonth,
    toYear: toMode === 'today' ? null : toYear,
    ...over,
  });
  const compute = () => {
    Keyboard.dismiss();
    const a = parseAmount(amountInput);
    setParams(Number.isFinite(a) && a > 0 ? buildParams({ amount: a }) : null);
  };
  const live = (over: Partial<InflationParams>) => { if (params) setParams({ ...params, ...over }); };

  const setFM = (m: number) => { setFromMonth(m); live({ fromMonth: m }); };
  const setFY = (y: number) => { setFromYear(y); live({ fromYear: y }); };
  const setTM = (m: number) => { setToMonth(m); live({ toMonth: m }); };
  const setTY = (y: number) => { setToYear(y); live({ toYear: y }); };
  const setMode = (mode: 'today' | 'custom') => {
    setToMode(mode);
    live(mode === 'today' ? { toMonth: null, toYear: null } : { toMonth, toYear });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('title')} back onBack={() => router.navigate('/(app)/calculators')} />
      <Screen edges={['bottom']} contentStyle={{ paddingHorizontal: 16, paddingTop: 12 }}>
        {/* Giriş */}
        <RouteCard eyebrow={t('eyebrow')} title={t('amountLabel')} icon="cash-clock" iconTone={colors.go}>
          <TextInput
            mode="outlined"
            label={t('amountLabel')}
            value={amountInput}
            onChangeText={(v) => setAmountInput(formatAmountInput(v, amountInput))}
            keyboardType="decimal-pad"
            left={<TextInput.Affix text="₺" />}
            contentStyle={{ fontSize: 18, fontWeight: '700' }}
            onSubmitEditing={compute}
            returnKeyType="done"
          />

          <MonthYearRow
            label={t('fromLabel')}
            month={fromMonth}
            year={fromYear}
            minYear={MIN_YEAR}
            maxYear={curYear}
            onMonth={setFM}
            onYear={setFY}
          />

          {/* Bitiş: Bugün / Özel tarih */}
          <Eyebrow tone="mute" style={{ marginTop: 16, marginBottom: 8 }}>{t('toLabel')}</Eyebrow>
          <View style={[styles.seg, { borderColor: colors.line, backgroundColor: colors.bgAlt }]}>
            {(['today', 'custom'] as const).map((mode) => {
              const on = toMode === mode;
              return (
                <Pressable
                  key={mode}
                  onPress={() => setMode(mode)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.segBtn, on && { backgroundColor: colors.ink }]}
                >
                  <Body size="sm" weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.paper : colors.inkSoft }}>
                    {t(mode === 'today' ? 'toToday' : 'toCustom')}
                  </Body>
                </Pressable>
              );
            })}
          </View>

          {toMode === 'custom' ? (
            <MonthYearRow
              month={toMonth}
              year={toYear}
              minYear={MIN_YEAR}
              maxYear={curYear}
              onMonth={setTM}
              onYear={setTY}
            />
          ) : null}

          <Button
            mode="contained"
            icon="calculator"
            onPress={compute}
            buttonColor={colors.go}
            textColor={colors.onAccent}
            style={{ borderRadius: 999, marginTop: 16 }}
            contentStyle={{ paddingVertical: 6 }}
          >
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
          <EmptyState icon="cash-clock" title={t('emptyTitle')} message={t('emptyHint')} />
        ) : isFetching && !data ? (
          <View style={{ paddingTop: 32, alignItems: 'center' }}><ActivityIndicator color={colors.go} /></View>
        ) : isError && !data ? (
          <ErrorState message={getErrorMessage(error, tCommon('error'))} onRetry={() => refetch()} />
        ) : data ? (
          <InflationResult data={data} isFetching={isFetching} />
        ) : null}
      </Screen>
    </View>
  );
}

function InflationResult({ data, isFetching = false }: { data: import('@shared/api/types').InflationConvertResultDto; isFetching?: boolean }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation('inflation');
  const { t: tCommon } = useTranslation('common');
  const longDate = (m: number, y: number) => `${tCommon(MONTH_LONG[m - 1])} ${y}`;
  const shortDate = (m: number, y: number) => `${tCommon(MONTH_SHORT[m - 1])} ${y}`;

  const rising = data.equivalentAmount >= data.amount;
  const tone = rising ? colors.go : colors.way;
  const pctText = `${data.inflationPercent < 0 ? '−' : '+'}%${fmtPct(Math.abs(data.inflationPercent))}`;
  const fromLabel = longDate(data.fromMonth, data.fromYear);
  const effLabel = longDate(data.effectiveToMonth, data.effectiveToYear);

  return (
    <View style={{ opacity: isFetching ? 0.65 : 1 }}>
      <Animated.View
        key={`res-${data.fromMonth}-${data.fromYear}-${data.effectiveToMonth}-${data.effectiveToYear}-${data.amount}`}
        entering={FadeInDown.duration(320)}
        style={[styles.summary, { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow }]}
      >
        {/* Hero — eşdeğer tutar */}
        <View style={[styles.hero, { backgroundColor: colorAlpha(tone, 0.07) }]}>
          <View style={styles.heroTop}>
            <View style={styles.heroLabel}>
              <View style={[styles.heroIcon, { backgroundColor: tone }]}>
                <Icon source="cash-clock" size={15} color={colors.onAccent} />
              </View>
              <Eyebrow tone="mute">{t('result_eyebrow')}</Eyebrow>
            </View>
            <View style={[styles.ratePill, { backgroundColor: colorAlpha(tone, 0.13) }]}>
              <Icon source={rising ? 'trending-up' : 'trending-down'} size={13} color={tone} />
              <Body size="xs" weight="bold" style={{ color: tone }}>{pctText}</Body>
            </View>
          </View>
          <View style={styles.heroFigure}>
            <Display size="lg" style={{ color: tone }} numberOfLines={1} adjustsFontSizeToFit>
              {formatCurrency(data.equivalentAmount)}
            </Display>
          </View>
          <Body size="sm" tone="mute" style={{ marginTop: 4 }}>
            {t('result_caption', { amount: formatCurrency(data.amount), from: fromLabel, to: effLabel })}
          </Body>
        </View>

        {/* Eğri + satırlar */}
        <View style={[styles.rows, { borderTopColor: colors.line }]}>
          <PurchasingPowerTrend
            series={data.series}
            rising={rising}
            startLabel={shortDate(data.fromMonth, data.fromYear)}
            endLabel={shortDate(data.effectiveToMonth, data.effectiveToYear)}
          />
          <View style={{ height: 6 }} />
          <Row dot={colors.inkMute} label={t('result_input', { date: fromLabel })} colors={colors}>
            <Money size="sm" numberOfLines={1}>{formatCurrency(data.amount)}</Money>
          </Row>
          <Row dot={tone} label={t('result_cumulative')} colors={colors}>
            <Body size="sm" weight="bold" style={{ color: tone }}>{pctText}</Body>
          </Row>
          {data.annualizedPercent > 0 ? (
            <Row dot={colors.inkMute} label={t('result_annual')} colors={colors}>
              <Body size="sm" weight="bold">%{fmtPct(data.annualizedPercent)}</Body>
            </Row>
          ) : null}
          <Row dot={colors.inkMute} label={t('result_multiplier')} colors={colors}>
            <Body size="sm" weight="bold">×{fmtPct(data.cumulativeMultiplier)}</Body>
          </Row>
        </View>
      </Animated.View>

      {/* Veri henüz açıklanmadıysa uyarı */}
      {data.isProvisional ? (
        <Animated.View entering={FadeInDown.duration(320).delay(60)} style={[styles.note, { backgroundColor: colorAlpha(colors.way, 0.1), borderColor: colorAlpha(colors.way, 0.3) }]}>
          <Icon source="clock-alert-outline" size={16} color={colors.way} />
          <Body size="xs" tone="soft" style={{ flex: 1, lineHeight: 18 }}>{t('provisionalWarning', { date: effLabel })}</Body>
        </Animated.View>
      ) : null}

      {/* Kaynak notu */}
      <Animated.View entering={FadeInDown.duration(320).delay(data.isProvisional ? 120 : 60)} style={[styles.note, { backgroundColor: colorAlpha(colors.sky, 0.08), borderColor: colorAlpha(colors.sky, 0.25) }]}>
        <Icon source="database-outline" size={16} color={colors.sky} />
        <Body size="xs" tone="soft" style={{ flex: 1, lineHeight: 18 }}>{t('source')}</Body>
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
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  seg: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, padding: 3 },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 999 },
  summary: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  hero: { padding: 18 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ratePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  heroFigure: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  rows: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 10, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  dot: { width: 8, height: 8, borderRadius: 999 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 14, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
});
