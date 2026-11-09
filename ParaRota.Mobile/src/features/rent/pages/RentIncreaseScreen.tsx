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
import { useRentIncreaseQuery, type RentIncreaseParams } from '@features/rent/api/useRentIncrease';

const MONTH_SHORT = [
  'month_short_jan', 'month_short_feb', 'month_short_mar', 'month_short_apr',
  'month_short_may', 'month_short_jun', 'month_short_jul', 'month_short_aug',
  'month_short_sep', 'month_short_oct', 'month_short_nov', 'month_short_dec',
] as const;
const MONTH_LONG = [
  'month_long_january', 'month_long_february', 'month_long_march', 'month_long_april',
  'month_long_may', 'month_long_june', 'month_long_july', 'month_long_august',
  'month_long_september', 'month_long_october', 'month_long_november', 'month_long_december',
] as const;

export function RentIncreaseScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation('rent');
  const { t: tCommon } = useTranslation('common');

  // Varsayılan yenileme = gelecek ay (sözleşmeler genelde ileri tarihte yenilenir).
  const now = new Date();
  const defaultMonth = now.getMonth() + 2; // 1-bazlı gelecek ay
  const [rentInput, setRentInput] = useState('');
  const [month, setMonth] = useState(defaultMonth > 12 ? 1 : defaultMonth);
  const [year, setYear] = useState(defaultMonth > 12 ? now.getFullYear() + 1 : now.getFullYear());
  const [params, setParams] = useState<RentIncreaseParams | null>(null);

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];
  const { data, isFetching, isError, error, refetch } = useRentIncreaseQuery(params);

  const compute = () => {
    Keyboard.dismiss();
    const r = parseAmount(rentInput);
    setParams(Number.isFinite(r) && r > 0 ? { rent: r, month, year } : null);
  };

  // İlk hesaptan sonra ay/yıl canlı kontrole dönüşür: chip'e dokun → sonuç anında
  // yeni döneme göre tazelenir (tekrar "Hesapla" istemek gereksiz sürtünme olurdu).
  const selectMonth = (m: number) => {
    setMonth(m);
    if (params) setParams({ ...params, month: m });
  };
  const selectYear = (y: number) => {
    setYear(y);
    if (params) setParams({ ...params, year: y });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('title')} back onBack={() => router.navigate('/(app)/calculators')} />
      <Screen edges={['bottom']} contentStyle={{ paddingHorizontal: 16, paddingTop: 12 }}>
        {/* Giriş */}
        <RouteCard eyebrow={t('eyebrow')} title={t('rentLabel')} icon="home-percent-outline" iconTone={colors.go}>
          <TextInput
            mode="outlined"
            label={t('rentLabel')}
            value={rentInput}
            onChangeText={(v) => setRentInput(formatAmountInput(v, rentInput))}
            keyboardType="decimal-pad"
            left={<TextInput.Affix text="₺" />}
            contentStyle={{ fontSize: 18, fontWeight: '700' }}
            onSubmitEditing={compute}
            returnKeyType="done"
          />

          <Eyebrow tone="mute" style={{ marginTop: 14, marginBottom: 8 }}>{t('renewalLabel')}</Eyebrow>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {MONTH_SHORT.map((key, i) => {
              const on = month === i + 1;
              return (
                <Pressable
                  key={key}
                  onPress={() => selectMonth(i + 1)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.chip, { borderColor: on ? colors.go : colors.line, backgroundColor: on ? colorAlpha(colors.go, 0.12) : 'transparent' }]}
                >
                  <Body size="xs" weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.go : colors.inkSoft }}>{tCommon(key)}</Body>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={[styles.seg, { borderColor: colors.line, backgroundColor: colors.bgAlt }]}>
            {years.map((y) => {
              const on = year === y;
              return (
                <Pressable
                  key={y}
                  onPress={() => selectYear(y)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  style={[styles.segBtn, on && { backgroundColor: colors.ink }]}
                >
                  <Body size="sm" weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.paper : colors.inkSoft }}>{y}</Body>
                </Pressable>
              );
            })}
          </View>

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

        {params == null ? (
          <EmptyState icon="home-percent-outline" title={t('eyebrow')} message={t('emptyHint')} />
        ) : isFetching && !data ? (
          <View style={{ paddingTop: 32, alignItems: 'center' }}><ActivityIndicator color={colors.go} /></View>
        ) : isError && !data ? (
          <ErrorState message={getErrorMessage(error, tCommon('error'))} onRetry={() => refetch()} />
        ) : data ? (
          <>
            {/* Sonuç — yeni kira üst sınırı (hero). Yılda birkaç kez yaşanan bir "an":
                kart + notlar 60ms arayla kademeli belirir (FadeInDown, ease-out;
                reanimated entering reduce-motion'a kendiliğinden saygı duyar). */}
            <Animated.View
              key={`res-${data.referenceMonth}-${data.referenceYear}-${data.currentRent}`}
              entering={FadeInDown.duration(320)}
              style={[styles.summary, { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow }]}
            >
              <View style={[styles.hero, { backgroundColor: colorAlpha(colors.go, 0.07) }]}>
                <View style={styles.heroTop}>
                  <View style={styles.heroLabel}>
                    <View style={[styles.heroIcon, { backgroundColor: colors.go }]}>
                      <Icon source="home-percent-outline" size={15} color={colors.onAccent} />
                    </View>
                    <Eyebrow tone="mute">{t('result_maxRent')}</Eyebrow>
                  </View>
                  <View style={[styles.ratePill, { backgroundColor: colorAlpha(colors.go, 0.13) }]}>
                    <Icon source="trending-up" size={13} color={colors.go} />
                    <Body size="xs" weight="bold" style={{ color: colors.go }}>
                      %{data.ratePercent.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Body>
                  </View>
                </View>
                <View style={styles.heroFigure}>
                  <Display size="lg" style={{ color: colors.go }}>{formatCurrency(data.maxNewRent)}</Display>
                  <Body size="sm" tone="mute" style={{ marginBottom: 6 }}>{t('perMonth')}</Body>
                </View>
              </View>
              <View style={[styles.rows, { borderTopColor: colors.line }]}>
                {/* Mevcut kira ↔ artış oranı tek bakışta: payroll'daki bar diliyle */}
                <View style={styles.barRow}>
                  <View style={[styles.barSeg, { flex: Math.max(data.currentRent, 1), backgroundColor: colors.inkMute }]} />
                  <View style={[styles.barSeg, { flex: Math.max(data.increaseAmount, 1), backgroundColor: colors.go }]} />
                </View>
                <Row dot={colors.inkMute} label={t('result_current')} value={formatCurrency(data.currentRent)} colors={colors} />
                <Row dot={colors.go} label={t('result_increase')} value={`+ ${formatCurrency(data.increaseAmount)}`} valueColor={colors.go} colors={colors} />
                <Row dot={colors.way} label={t('result_yearly')} value={`+ ${formatCurrency(data.increaseAmount * 12)}`} valueColor={colors.way} colors={colors} />
                <RouteLine style={{ marginVertical: 6 }} />
                <View style={styles.row}>
                  <Body size="sm" tone="soft" style={{ flex: 1 }}>{t('result_reference')}</Body>
                  <Body size="sm" weight="bold">
                    {tCommon(MONTH_LONG[data.referenceMonth - 1])} {data.referenceYear}
                  </Body>
                </View>
              </View>
            </Animated.View>

            {/* Veri henüz açıklanmadıysa uyarı */}
            {data.isProvisional ? (
              <Animated.View entering={FadeInDown.duration(320).delay(60)} style={[styles.note, { backgroundColor: colorAlpha(colors.way, 0.1), borderColor: colorAlpha(colors.way, 0.3) }]}>
                <Icon source="clock-alert-outline" size={16} color={colors.way} />
                <Body size="xs" tone="soft" style={{ flex: 1, lineHeight: 18 }}>{t('provisionalWarning')}</Body>
              </Animated.View>
            ) : null}

            {/* Yasal not */}
            <Animated.View entering={FadeInDown.duration(320).delay(data.isProvisional ? 120 : 60)} style={[styles.note, { backgroundColor: colorAlpha(colors.sky, 0.08), borderColor: colorAlpha(colors.sky, 0.25) }]}>
              <Icon source="scale-balance" size={16} color={colors.sky} />
              <Body size="xs" tone="soft" style={{ flex: 1, lineHeight: 18 }}>{t('note')}</Body>
            </Animated.View>
            <View style={{ height: 24 }} />
          </>
        ) : null}
      </Screen>
    </View>
  );
}

function Row({ dot, label, value, valueColor, colors }: { dot?: string; label: string; value: string; valueColor?: string; colors: ReturnType<typeof useAppTheme>['colors'] }) {
  return (
    <View style={styles.row}>
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      <Body size="sm" tone="soft" style={{ flex: 1 }}>{label}</Body>
      <Money size="sm" numberOfLines={1} style={{ color: valueColor ?? colors.ink }}>{value}</Money>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 6, paddingVertical: 2, paddingRight: 4 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  seg: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, padding: 3, marginTop: 10 },
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
  barRow: { flexDirection: 'row', gap: 3, height: 8, borderRadius: 999, overflow: 'hidden', marginBottom: 6 },
  barSeg: { borderRadius: 999 },
  dot: { width: 8, height: 8, borderRadius: 999 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 14, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
});
