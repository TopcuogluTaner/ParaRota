import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { ProgressBar, Icon, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppHeader } from '@shared/components/AppHeader';
import { Screen } from '@shared/components/Screen';
import { RouteCard } from '@shared/components/RouteCard';
import { SubscriptionRadarCard } from '@features/dashboard/components/SubscriptionRadarCard';
import { InsightsCard } from '@features/dashboard/components/InsightsCard';
import { CashflowCard } from '@features/dashboard/components/CashflowCard';
import { RouteLine } from '@shared/components/RouteLine';
import { Reveal } from '@shared/components/Reveal';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { LoadingScreen } from '@shared/components/LoadingScreen';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { DonutChart, TrendBars } from '@shared/components/charts/TrendBars';
import { AppModal } from '@shared/components/AppModal';
import { AreaTrend } from '@shared/components/charts/AreaTrend';
import { Body, Display, Eyebrow, Money } from '@shared/components/Typography';
import { CopilotStep } from 'react-native-copilot';
import { WalkView } from '@features/onboarding/tour';
import { useDashboardSummaryQuery } from '@features/dashboard/api/useDashboard';
import { usePortfolioQuery } from '@features/investments/api/useInvestments';
import { formatCurrency, formatDate } from '@shared/lib/dateFormat';
import { normalizeIconName } from '@shared/lib/iconName';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { AiInsightsCard } from '@features/ai/components/AiInsightsCard';
import { usePrivacyStore } from '@shared/store/usePrivacyStore';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { colorAlpha } from '@shared/lib/colorAlpha';

const MONTH_LONG_KEYS = [
  'month_long_january', 'month_long_february', 'month_long_march', 'month_long_april',
  'month_long_may', 'month_long_june', 'month_long_july', 'month_long_august',
  'month_long_september', 'month_long_october', 'month_long_november', 'month_long_december',
] as const;

// Küratörlü, harita/parşömen estetiğine uyan sakin tonlar — kategori renkleri
// dağınık/çirkin olabildiği için donut dilimlerini index'e göre buradan boyarız.
// Hem aydınlık hem karanlık temada okunaklı, birbirinden net ayrışan 5 hue.
const DONUT_PALETTE = ['#5B8A72', '#4A6D8C', '#C99846', '#B05F47', '#7E6C97'] as const;

function greetingKey(hour: number): 'greeting_morning' | 'greeting_afternoon' | 'greeting_evening' | 'greeting_night' {
  if (hour < 6) return 'greeting_night';
  if (hour < 12) return 'greeting_morning';
  if (hour < 18) return 'greeting_afternoon';
  return 'greeting_evening';
}

export function DashboardScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const monthName = tCommon(MONTH_LONG_KEYS[now.getMonth()]);
  const greeting = t(greetingKey(now.getHours()));
  // Günün saatine göre selamlama ikonu + sıcak/soğuk aksan (gündüz amber, gece sky).
  const hour = now.getHours();
  const greetMeta =
    hour < 6 ? { icon: 'weather-night', tone: colors.sky }
    : hour < 12 ? { icon: 'weather-sunset-up', tone: colors.way }
    : hour < 18 ? { icon: 'weather-sunny', tone: colors.way }
    : { icon: 'weather-sunset-down', tone: colors.way };

  // Gizlilik modu — göz ikonuyla tüm tutarlar ₺•••• (Money otomatik; düz
  // metin noktaları fmtMoney ile). Tercih kalıcı, tüm ekranları etkiler.
  const hideAmounts = usePrivacyStore((s) => s.hideAmounts);
  const togglePrivacy = usePrivacyStore((s) => s.toggle);
  const fmtMoney = useMoneyFmt();

  const { data, refetch, isFetching, isLoading, isError, error } = useDashboardSummaryQuery(month, year);
  const { data: portfolio } = usePortfolioQuery();
  const { t: tInv } = useTranslation('investments');

  const income = data?.income ?? 0;
  const expense = data?.expense ?? 0;
  const net = data?.net ?? 0;
  const savings = data?.savingsRate ?? 0;
  const savingsPct = tCommon('percentValue', { value: (savings * 100).toFixed(0) });
  const netSign = net >= 0 ? '+' : '−';
  // Net bakiye: uzunluğa göre sabit büyük font (auto-shrink yok — normal tutarlar hep büyük).
  const netStr = `${netSign}${formatCurrency(Math.abs(net))}`;
  const netFont = netStr.length > 15 ? 30 : netStr.length > 12 ? 36 : netStr.length > 10 ? 42 : 46;

  const trendData = (data?.monthlyTrend ?? []).slice(-6);
  const [chartKind, setChartKind] = useState<'area' | 'bars'>('area');
  const [trendRange, setTrendRange] = useState<3 | 6>(6);
  const shownTrend = trendData.slice(-trendRange);

  // Tasarruf öngörüsü (orana göre kademeli ipucu + en çok harcanan kalem).
  const [savingsOpen, setSavingsOpen] = useState(false);
  const savingsTier = savings < 0 ? 'negative' : savings < 0.1 ? 'low' : savings < 0.2 ? 'ok' : 'great';
  const savingsToneColor = savings < 0 ? colors.halt : savings < 0.1 ? colors.way : colors.go;
  const topCatName = data?.topExpensesByCategory?.[0]?.name;
  const savingsTip = t(`savings_tip_${savingsTier}`, { cat: topCatName ?? '—' });

  const donutData = (data?.topExpensesByCategory ?? []).slice(0, 5).map((c, i) => ({
    label: c.name,
    value: c.amount,
    color: DONUT_PALETTE[i % DONUT_PALETTE.length],
  }));
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0);
  const [selectedSlice, setSelectedSlice] = useState<number | null>(null);
  const toggleSlice = (i: number) => setSelectedSlice((cur) => (cur === i ? null : i));
  const focused = selectedSlice !== null ? donutData[selectedSlice] : null;
  const focusedPct = focused && donutTotal > 0 ? Math.round((focused.value / donutTotal) * 100) : null;

  // Month-over-month delta: compare the latest point to the one before it.
  // Returned as a signed percentage; null when there isn't enough history or
  // when the previous value is zero (division would be undefined).
  const deltaPct = (a: number, b: number): number | null => {
    if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
    return ((a - b) / Math.abs(b)) * 100;
  };
  const lastIdx = trendData.length - 1;
  const netDelta = lastIdx >= 1
    ? deltaPct(
        trendData[lastIdx].income - trendData[lastIdx].expense,
        trendData[lastIdx - 1].income - trendData[lastIdx - 1].expense,
      )
    : null;

  // İlk yüklemede (cache yokken) spinner; özet hatası all-zeros olarak
  // gösterilmesin diye isError && !data dalında ErrorState (retry → refetch).
  if (isLoading && !data) {
    return <LoadingScreen />;
  }

  if (isError && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <AppHeader
          eyebrow={`${monthName} ${year}`}
          title={user ? `${greeting}, ${user.firstName}` : greeting}
        />
        <ErrorState message={getErrorMessage(error, tCommon('error'))} onRetry={() => refetch()} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader brand menuTourText={tCommon('onboarding.tour_menu')} scopeTourText={tCommon('onboarding.tour_scope')} />
      <Screen
        onRefresh={() => refetch()}
        refreshing={isFetching}
        onScrollBeginDrag={() => setSelectedSlice(null)}
        edges={['bottom']}
        contentStyle={{ paddingHorizontal: 16, paddingTop: 0 }}
      >
        {/* Tarih + selam — net bakiye kartının hemen üstünde (marka header'da).
            Zaman-duyarlı ikon çipi (sabah gün doğumu / gece ay) sıcak bir karşılama verir. */}
        <View style={styles.greetBlock}>
          <View style={[styles.greetIcon, { backgroundColor: colorAlpha(greetMeta.tone, 0.14) }]}>
            <Icon source={greetMeta.icon} size={19} color={greetMeta.tone} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Eyebrow tone="mute" style={{ letterSpacing: 1.6 }}>{monthName} {year}</Eyebrow>
            <Display size="md" numberOfLines={1} style={{ marginTop: 1 }}>
              {greeting}{user ? <Display size="md" italic style={{ color: greetMeta.tone }}>, {user.firstName}</Display> : null}
            </Display>
          </View>
        </View>

        {/* Hero özet paneli — ayın net bakiyesi headline + gelir/gider kırılımı. Temaya
            uyumlu açık yüzey (light'ta açık paper, dark'ta koyu paper); net tutar işaret
            rengiyle (pozitif=go, negatif=halt) canlanır. Tur'un 1. adımı buraya bağlı:
            ekranın tepesinde, ilk açılışta görünür → tooltip doğru konumlanır. */}
        <CopilotStep text={tCommon('onboarding.tour_hero')} order={1} name="hero">
        <WalkView>
        <Animated.View
          entering={FadeInDown.duration(360)}
          style={[
            styles.hero,
            {
              backgroundColor: colors.paper,
              borderColor: colors.line,
              borderWidth: StyleSheet.hairlineWidth,
              boxShadow: colors.cardShadow,
            },
          ]}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroLabel}>
              <Icon source="map-marker-path" size={13} color={colors.inkMute} />
              <Eyebrow style={{ color: colors.inkMute, letterSpacing: 1 }}>{t('stat_net')} · {monthName}</Eyebrow>
            </View>
            <View style={styles.heroRight}>
              {netDelta != null ? (
                <View
                  style={[
                    styles.heroDelta,
                    {
                      borderColor: colorAlpha(netDelta >= 0 ? colors.go : colors.halt, 0.35),
                      backgroundColor: colorAlpha(netDelta >= 0 ? colors.go : colors.halt, 0.14),
                    },
                  ]}
                >
                  <Icon source={netDelta >= 0 ? 'trending-up' : 'trending-down'} size={13} color={netDelta >= 0 ? colors.go : colors.halt} />
                  <Eyebrow style={{ color: netDelta >= 0 ? colors.go : colors.halt, letterSpacing: 0.5 }}>
                    {tCommon('percentValue', { value: Math.abs(netDelta).toFixed(0) })}
                  </Eyebrow>
                </View>
              ) : null}
              {/* Gizlilik modu — omuz üstü bakışlara karşı tek dokunuş */}
              <CopilotStep text={tCommon('onboarding.tour_privacy')} order={3} name="privacy">
                <WalkView>
                  <Pressable
                    onPress={togglePrivacy}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={hideAmounts ? tCommon('showAmounts') : tCommon('hideAmounts')}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                  >
                    <Icon source={hideAmounts ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.inkMute} />
                  </Pressable>
                </WalkView>
              </CopilotStep>
            </View>
          </View>
          <Money
            size="xl"
            numberOfLines={1}
            style={{ color: net >= 0 ? colors.go : colors.halt, fontSize: netFont, lineHeight: netFont + 6, marginTop: 10 }}
          >
            {netStr}
          </Money>

          {/* Gömülü "ledger" şeridi — ikon-öncülü 3 kalem, ince dikey çizgilerle ayrık */}
          <View style={[styles.heroStrip, { backgroundColor: colors.bgAlt, borderColor: colors.line }]}>
            <HeroStat icon="arrow-bottom-left" tone={colors.go} label={t('stat_income')} value={formatCurrency(income)} colors={colors} onPress={() => router.push({ pathname: '/(app)/(tabs)/transactions', params: { type: 'income', ts: String(Date.now()) } })} />
            <View style={[styles.heroVDiv, { backgroundColor: colors.line }]} />
            <HeroStat icon="arrow-top-right" tone={colors.halt} label={t('stat_expense')} value={formatCurrency(expense)} colors={colors} onPress={() => router.push({ pathname: '/(app)/(tabs)/transactions', params: { type: 'expense', ts: String(Date.now()) } })} />
            <View style={[styles.heroVDiv, { backgroundColor: colors.line }]} />
            <HeroStat icon="piggy-bank-outline" tone={colors.way} label={t('stat_savings')} value={savingsPct} colors={colors} onPress={() => setSavingsOpen(true)} />
          </View>
        </Animated.View>
        </WalkView>
        </CopilotStep>

        <Reveal index={1}><CashflowCard /></Reveal>

        <View style={{ height: 14 }} />

        <Reveal index={2}>
        <RouteCard eyebrow={t('flow_eyebrow')} title={t('flow_title')} icon="chart-areaspline" iconTone={colors.sky}>
          {trendData.length > 0 ? (
            <>
              <View style={styles.chartToolbar}>
                <View style={[styles.seg, { borderColor: colors.line, backgroundColor: colors.bgAlt }]}>
                  {(['area', 'bars'] as const).map((k) => {
                    const on = chartKind === k;
                    return (
                      <Pressable key={k} onPress={() => setChartKind(k)} style={[styles.segBtn, on && { backgroundColor: colors.ink }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                        <Icon source={k === 'area' ? 'chart-areaspline' : 'chart-bar'} size={17} color={on ? colors.paper : colors.inkMute} />
                      </Pressable>
                    );
                  })}
                </View>
                <View style={[styles.seg, { borderColor: colors.line, backgroundColor: colors.bgAlt }]}>
                  {([3, 6] as const).map((r) => {
                    const on = trendRange === r;
                    return (
                      <Pressable key={r} onPress={() => setTrendRange(r)} style={[styles.segBtn, on && { backgroundColor: colors.ink }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                        <Eyebrow style={{ color: on ? colors.paper : colors.inkSoft }}>{t(r === 3 ? 'flow_range3' : 'flow_range6')}</Eyebrow>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              {chartKind === 'area' ? <AreaTrend data={shownTrend} /> : <TrendBars data={shownTrend} />}
            </>
          ) : (
            <EmptyState icon="chart-bar" title={t('flow_eyebrow')} />
          )}
        </RouteCard>
        </Reveal>

        <View style={{ height: 14 }} />

        <Reveal index={3}>
        <RouteCard eyebrow={t('donut_eyebrow')} title={t('donut_title')} icon="chart-donut" iconTone={colors.way}>
          {donutData.length === 0 ? (
            <EmptyState icon="chart-donut" title={t('donut_empty')} />
          ) : (
            <View>
              {/* Donut ortada; legend tam-genişlik altta → dar ekranda adlar/tutarlar sığar
                  (eskiden yan-yana layout'ta legend'a çok az yer kalıp iç içe giriyordu). */}
              <View style={{ alignItems: 'center', marginBottom: 8 }}>
                <DonutChart
                  data={donutData}
                  size={208}
                  thickness={26}
                  selectedIndex={selectedSlice}
                  onSlicePress={toggleSlice}
                  onClear={() => setSelectedSlice(null)}
                  centerValue={focused ? formatCurrency(focused.value) : formatCurrency(expense)}
                  centerLabel={focused ? tCommon('percentValue', { value: focusedPct }) : t('donut_totalExpense')}
                />
                {selectedSlice !== null ? (
                  <Pressable
                    onPress={() => setSelectedSlice(null)}
                    hitSlop={8}
                    style={[styles.resetPill, { backgroundColor: colors.paper2, borderColor: colors.line }]}
                  >
                    <Icon source="close" size={13} color={colors.inkMute} />
                    <Eyebrow tone="mute">{tCommon('all')}</Eyebrow>
                  </Pressable>
                ) : null}
                </View>
              {donutData.map((d, i) => {
                const isOn = selectedSlice === i;
                const isDimmed = selectedSlice !== null && !isOn;
                const pct = donutTotal > 0 ? Math.round((d.value / donutTotal) * 100) : 0;
                return (
                  <Pressable
                    key={d.label}
                    onPress={() => toggleSlice(i)}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isOn }}
                    style={[
                      styles.legendRow,
                      {
                        backgroundColor: isOn ? colorAlpha(d.color, 0.10) : 'transparent',
                        opacity: isDimmed ? 0.5 : 1,
                        borderColor: isOn ? colorAlpha(d.color, 0.35) : 'transparent',
                      },
                    ]}
                  >
                    <View style={[styles.legendDot, { backgroundColor: d.color, width: isOn ? 10 : 8, height: isOn ? 10 : 8 }]} />
                    <Body size="sm" numberOfLines={1} weight={isOn ? 'bold' : 'medium'} style={{ flex: 1 }}>{d.label}</Body>
                    <Eyebrow tone="mute">{tCommon('percentValue', { value: pct })}</Eyebrow>
                    <Money size="sm" tone="ink">{formatCurrency(d.value)}</Money>
                  </Pressable>
                );
              })}
            </View>
          )}
        </RouteCard>
        </Reveal>

        <View style={{ height: 14 }} />

        <Reveal index={4}>
        <RouteCard
          eyebrow={t('budget_eyebrow')}
          title={t('budget_title')}
          icon="wallet-outline"
          iconTone={colors.go}
          right={
            <Pressable
              onPress={() => router.push('/(app)/(tabs)/budgets')}
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel={tCommon('viewAll')}
            >
              <Eyebrow tone="go">{tCommon('viewAll')} →</Eyebrow>
            </Pressable>
          }
        >
          {(data?.budgetStatuses ?? []).length === 0 ? (
            <EmptyState icon="chart-arc" title={t('budget_empty')} />
          ) : (
            (data?.budgetStatuses ?? []).slice(0, 3).map((b, idx, arr) => {
              const tone = b.alertLevel === 'exceeded' ? colors.halt : b.alertLevel === 'warning' ? colors.way : colors.go;
              return (
                <View key={b.id} style={{ marginBottom: idx === arr.length - 1 ? 0 : 14 }}>
                  <View style={styles.budgetHead}>
                    <View style={{ flex: 1 }}>
                      <Body weight="bold">{b.category?.name}</Body>
                      <Eyebrow tone="mute">{b.alertLevel}</Eyebrow>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Money size="md" tone={b.alertLevel === 'exceeded' ? 'halt' : 'ink'}>{formatCurrency(b.spent)}</Money>
                      <Body size="xs" tone="mute">/ {fmtMoney(b.monthlyLimit)}</Body>
                    </View>
                  </View>
                  <ProgressBar
                    progress={Math.min(1, b.usagePercentage / 100)}
                    color={tone}
                    style={[styles.bar, { backgroundColor: colors.line, marginTop: 6 }]}
                  />
                </View>
              );
            })
          )}
        </RouteCard>
        </Reveal>

        <Reveal index={5}><SubscriptionRadarCard /></Reveal>

        <View style={{ height: 14 }} />

        {portfolio && portfolio.items.length > 0 ? (
          <Reveal index={6}>
            <RouteCard
              eyebrow={tInv('eyebrow')}
              title={tInv('title')}
              icon="finance"
              iconTone={colors.way}
              right={
                <Pressable
                  onPress={() => router.push('/(app)/investments')}
                  hitSlop={8}
                  accessibilityRole="link"
                  accessibilityLabel={tCommon('viewAll')}
                >
                  <Eyebrow tone="go">{tCommon('viewAll')} →</Eyebrow>
                </Pressable>
              }
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <View>
                  <Eyebrow tone="mute">{tInv('stat_value')}</Eyebrow>
                  <Money size="md" tone="ink" style={{ marginTop: 2 }}>{formatCurrency(portfolio.totalCurrentValue)}</Money>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Eyebrow tone="mute">{tInv('stat_pnl')}</Eyebrow>
                  <Money size="md" style={{ color: portfolio.totalProfitLoss >= 0 ? colors.go : colors.halt, marginTop: 2 }}>
                    {portfolio.totalProfitLoss >= 0 ? '+' : ''}{formatCurrency(portfolio.totalProfitLoss)} ({portfolio.totalProfitLossPct.toFixed(1)}%)
                  </Money>
                </View>
              </View>
            </RouteCard>
            <View style={{ height: 14 }} />
          </Reveal>
        ) : null}

        <Reveal index={7}><AiInsightsCard /></Reveal>

        <Reveal index={8}><InsightsCard /></Reveal>

        <View style={{ height: 14 }} />

        <Reveal index={9}>
        <RouteCard
          eyebrow={t('recent_eyebrow')}
          title={t('recent_title')}
          icon="swap-horizontal"
          iconTone={colors.inkMute}
          right={
            <Pressable
              onPress={() => router.push('/(app)/(tabs)/transactions')}
              hitSlop={8}
              accessibilityRole="link"
              accessibilityLabel={tCommon('viewAll')}
            >
              <Eyebrow tone="go">{tCommon('viewAll')} →</Eyebrow>
            </Pressable>
          }
        >
          {(data?.recentTransactions ?? []).length === 0 ? (
            <EmptyState icon="map-search-outline" title={t('recent_empty')} />
          ) : (
            (data?.recentTransactions ?? []).slice(0, 5).map((tx, i, arr) => (
              <View key={tx.id} style={[styles.txRow, i === arr.length - 1 ? null : { marginBottom: 12 }]}>
                <View style={[styles.txIcon, { backgroundColor: colorAlpha(tx.category?.color ?? colors.go, 0.13) }]}>
                  <Icon source={normalizeIconName(tx.category?.icon)} size={18} color={tx.category?.color ?? colors.go} />
                </View>
                <View style={{ flex: 1 }}>
                  <Body weight="bold" numberOfLines={1}>{tx.notes || tx.category?.name}</Body>
                  <Eyebrow tone="mute">{formatDate(tx.transactionDate)}</Eyebrow>
                </View>
                <Money size="md" tone={tx.type === 'income' ? 'go' : 'halt'}>
                  {tx.type === 'expense' ? '−' : '+'}{formatCurrency(tx.amount, tx.currency)}
                </Money>
              </View>
            ))
          )}
        </RouteCard>
        </Reveal>

        <View style={{ height: 24 }} />
        <RouteLine />
        <View style={{ alignItems: 'center', paddingVertical: 14 }}>
          <Eyebrow tone="mute">{tCommon('appName')} · {year}</Eyebrow>
        </View>
      </Screen>

      {/* Tasarruf öngörü modalı — orana göre ipucu + hedef/bütçe yönlendirme */}
      <AppModal visible={savingsOpen} onDismiss={() => setSavingsOpen(false)} eyebrow={t('savings_eyebrow')} title={t('savings_title')}>
        <View style={[styles.savingsHero, { backgroundColor: colorAlpha(savingsToneColor, 0.1), borderColor: colorAlpha(savingsToneColor, 0.3) }]}>
          <View style={[styles.greetIcon, { backgroundColor: colorAlpha(savingsToneColor, 0.18) }]}>
            <Icon source="piggy-bank-outline" size={22} color={savingsToneColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Eyebrow tone="mute">{t('savings_rateLabel')}</Eyebrow>
            <Display size="md" style={{ color: savingsToneColor, marginTop: 2 }}>{savingsPct}</Display>
          </View>
        </View>
        <Body style={{ marginTop: 14, lineHeight: 22 }}>{savingsTip}</Body>
        <Button mode="contained" icon="flag-outline" onPress={() => { setSavingsOpen(false); router.push('/goals'); }} buttonColor={colors.go} textColor={colors.onAccent} style={{ borderRadius: 999, marginTop: 16 }}>
          {t('savings_cta_goal')}
        </Button>
        <Button mode="outlined" icon="chart-arc" onPress={() => { setSavingsOpen(false); router.push('/budgets'); }} textColor={colors.ink} style={{ borderRadius: 999, borderColor: colors.line }}>
          {t('savings_cta_budget')}
        </Button>
      </AppModal>
    </View>
  );
}

interface HeroStatProps {
  icon: string;
  tone: string;
  label: string;
  value: string;
  colors: ReturnType<typeof useAppTheme>['colors'];
  onPress?: () => void;
}

// Hero şeridindeki tek kalem: tinted ikon çipi + etiket + tutar (dikey, ortalı).
// onPress verilirse tıklanabilir (ör. gelir/gider → Hareketler'e filtreli git).
function HeroStat({ icon, tone, label, value, colors, onPress }: HeroStatProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.heroStat, { opacity: pressed && onPress ? 0.6 : 1 }]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${label} ${value}` : undefined}
    >
      <View style={[styles.heroStatIcon, { backgroundColor: colorAlpha(tone, 0.14) }]}>
        <Icon source={icon} size={15} color={tone} />
      </View>
      <Eyebrow numberOfLines={1} style={{ color: colors.inkMute, marginTop: 8 }}>{label}</Eyebrow>
      <Money size="sm" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: tone, marginTop: 2 }}>
        {value}
      </Money>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  greetBlock: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6, marginBottom: 16, paddingHorizontal: 2 },
  greetIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  chartToolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  seg: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, padding: 2 },
  segBtn: { paddingHorizontal: 13, paddingVertical: 6, borderRadius: 999, alignItems: 'center', justifyContent: 'center', minWidth: 42 },
  savingsHero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  hero: { borderRadius: 22, paddingHorizontal: 22, paddingVertical: 20, marginBottom: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroDelta: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingLeft: 6, paddingRight: 9, paddingVertical: 3, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  heroStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 18, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 14 },
  heroStat: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  heroStatIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  heroVDiv: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 8 },
  bar: { height: 6, borderRadius: 999 },
  budgetHead: { flexDirection: 'row', alignItems: 'center' },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  donutRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 3,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  legendDot: { borderRadius: 999 },
  resetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
    paddingLeft: 8,
    paddingRight: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
