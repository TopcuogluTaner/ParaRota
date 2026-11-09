import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@shared/components/AppHeader';
import { Screen } from '@shared/components/Screen';
import { ToolbarAddButton } from '@shared/components/ToolbarAddButton';
import { PageTour } from '@features/onboarding/PageTour';
import { CopilotStep } from 'react-native-copilot';
import { WalkView } from '@features/onboarding/tour';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { LoadingScreen } from '@shared/components/LoadingScreen';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { Body, Display, Eyebrow, Money } from '@shared/components/Typography';
import { formatCurrency, formatDate } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { toast } from '@shared/lib/toast';
import { usePortfolioQuery, useDeleteHolding } from '@features/investments/api/useInvestments';
import { SwipeableRow } from '@shared/components/SwipeableRow';
import { AddHoldingModal } from '@features/investments/components/AddHoldingModal';
import { MarketRatesModal } from '@features/investments/components/MarketRatesModal';
import { SellHoldingModal } from '@features/investments/components/SellHoldingModal';
import type { AssetType, HoldingDto } from '@shared/api/types';

const ASSET_ICON: Record<AssetType, string> = {
  goldGram: 'gold',
  goldQuarter: 'gold',
  goldHalf: 'gold',
  goldFull: 'gold',
  goldRepublic: 'gold',
  usd: 'currency-usd',
  cad: 'currency-usd',
  aud: 'currency-usd',
  eur: 'currency-eur',
  gbp: 'currency-gbp',
  jpy: 'currency-jpy',
  chf: 'cash',
  sar: 'cash',
  btc: 'bitcoin',
  eth: 'ethereum',
  usdt: 'hexagon-multiple',
  bnb: 'hexagon-multiple',
  sol: 'hexagon-multiple',
  xrp: 'hexagon-multiple',
  ada: 'hexagon-multiple',
  doge: 'hexagon-multiple',
  trx: 'hexagon-multiple',
  avax: 'hexagon-multiple',
  dot: 'hexagon-multiple',
  link: 'hexagon-multiple',
  thyao: 'chart-line',
  garan: 'chart-line',
  akbnk: 'chart-line',
  asels: 'chart-line',
  kchol: 'chart-line',
  sise: 'chart-line',
  eregl: 'chart-line',
  bimas: 'chart-line',
  tuprs: 'chart-line',
  sahol: 'chart-line',
  froto: 'chart-line',
  tcell: 'chart-line',
  tefasFund: 'chart-box-outline',
};

// Varlık-bazlı aksan (Dashboard donut paletiyle uyumlu) — tanınırlık + sakin canlılık.
const ASSET_COLOR: Record<AssetType, string> = {
  goldGram: '#C99846',
  goldQuarter: '#C99846',
  goldHalf: '#C99846',
  goldFull: '#C99846',
  goldRepublic: '#C99846',
  usd: '#5B8A72',
  eur: '#4A6D8C',
  gbp: '#7E6C97',
  chf: '#B05F47',
  jpy: '#9C5A8A',
  cad: '#6E8B3D',
  aud: '#3D7E8C',
  sar: '#8A7240',
  btc: '#E8A33D',
  eth: '#6E7BB8',
  usdt: '#7E6C97',
  bnb: '#7E6C97',
  sol: '#7E6C97',
  xrp: '#7E6C97',
  ada: '#7E6C97',
  doge: '#7E6C97',
  trx: '#7E6C97',
  avax: '#7E6C97',
  dot: '#7E6C97',
  link: '#7E6C97',
  thyao: '#3D7E8C',
  garan: '#3D7E8C',
  akbnk: '#3D7E8C',
  asels: '#3D7E8C',
  kchol: '#3D7E8C',
  sise: '#3D7E8C',
  eregl: '#3D7E8C',
  bimas: '#3D7E8C',
  tuprs: '#3D7E8C',
  sahol: '#3D7E8C',
  froto: '#3D7E8C',
  tcell: '#3D7E8C',
  tefasFund: '#A0566E',
};

function fmtQty(q: number, goldGram: boolean) {
  // gram altın 4 hane; kripto gibi <1 miktarlarda 8 hane (0.0017 BTC görünür); diğeri 2.
  const max = goldGram ? 4 : q < 1 ? 8 : 2;
  return q.toLocaleString('tr-TR', { maximumFractionDigits: max });
}

export function InvestmentsScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('investments');
  const { t: tCommon } = useTranslation('common');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<HoldingDto | null>(null);
  const [selling, setSelling] = useState<HoldingDto | null>(null);
  const [confirm, setConfirm] = useState<HoldingDto | null>(null);
  const [ratesOpen, setRatesOpen] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = usePortfolioQuery();
  const del = useDeleteHolding();

  const items = data?.items ?? [];
  const pnlPositive = (data?.totalProfitLoss ?? 0) >= 0;
  const pnlTone = pnlPositive ? colors.go : colors.halt;

  const openCreate = () => { setEditing(null); setOpen(true); };
  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await del.mutateAsync(confirm.id);
      toast.success(t('toast_delete'));
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    } finally {
      setConfirm(null);
    }
  };

  if (isLoading && !data) {
    return <LoadingScreen />;
  }
  if (isError && !data) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <AppHeader title={t('title')} />
        <ErrorState message={getErrorMessage(error, t('error_title'))} onRetry={() => refetch()} />
      </View>
    );
  }

  return (
    <PageTour page="investments">
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('title')} />
      <View style={styles.toolbar}>
        <Pressable
          onPress={() => setRatesOpen(true)}
          style={[styles.ratesBtn, { borderColor: colors.line, backgroundColor: colors.paper }]}
          accessibilityRole="button"
          accessibilityLabel={t('rates_button')}
        >
          <Icon source="finance" size={16} color={colors.go} />
          <Eyebrow tone="go" numberOfLines={1}>{t('rates_button')}</Eyebrow>
        </Pressable>
        <View style={{ flex: 1 }} />
        <CopilotStep text={t('common:onboarding.tour_inv')} order={1} name="inv-add">
          <WalkView>
            <ToolbarAddButton label={t('newButton')} onPress={openCreate} />
          </WalkView>
        </CopilotStep>
      </View>

      <Screen onRefresh={() => refetch()} refreshing={isFetching} edges={['bottom']} contentStyle={{ paddingHorizontal: 16, paddingTop: 0 }}>
        {/* Özet kart — güncel portföy değeri + K/Z (dashboard hero diliyle tutarlı) */}
        <View style={[styles.hero, { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow }]}>
          <View style={styles.heroTop}>
            <View style={styles.heroLabel}>
              <Icon source="chart-areaspline" size={13} color={colors.inkMute} />
              <Eyebrow tone="mute" style={{ letterSpacing: 1 }}>{t('stat_value')}</Eyebrow>
            </View>
            <View style={[styles.pnlPill, { borderColor: colorAlpha(pnlTone, 0.35), backgroundColor: colorAlpha(pnlTone, 0.14) }]}>
              <Icon source={pnlPositive ? 'trending-up' : 'trending-down'} size={13} color={pnlTone} />
              <Eyebrow style={{ color: pnlTone, letterSpacing: 0.5 }}>
                {pnlPositive ? '+' : ''}{(data?.totalProfitLossPct ?? 0).toFixed(1)}%
              </Eyebrow>
            </View>
          </View>

          <Money size="xl" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: colors.ink, fontSize: 34, lineHeight: 40, marginTop: 10 }}>
            {formatCurrency(data?.totalCurrentValue ?? 0)}
          </Money>

          <View style={[styles.heroStrip, { backgroundColor: colors.bgAlt, borderColor: colors.line }]}>
            <View style={styles.heroStat}>
              <View style={[styles.heroStatIcon, { backgroundColor: colorAlpha(colors.sky, 0.14) }]}>
                <Icon source="wallet-outline" size={15} color={colors.sky} />
              </View>
              <Eyebrow numberOfLines={1} style={{ color: colors.inkMute, marginTop: 8 }}>{t('stat_invested')}</Eyebrow>
              <Money size="sm" tone="ink" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ marginTop: 2 }}>
                {formatCurrency(data?.totalInvested ?? 0)}
              </Money>
            </View>
            <View style={[styles.heroVDiv, { backgroundColor: colors.line }]} />
            <View style={styles.heroStat}>
              <View style={[styles.heroStatIcon, { backgroundColor: colorAlpha(pnlTone, 0.14) }]}>
                <Icon source={pnlPositive ? 'trending-up' : 'trending-down'} size={15} color={pnlTone} />
              </View>
              <Eyebrow numberOfLines={1} style={{ color: colors.inkMute, marginTop: 8 }}>{t('stat_pnl')}</Eyebrow>
              <Money size="sm" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: pnlTone, marginTop: 2 }}>
                {pnlPositive ? '+' : ''}{formatCurrency(data?.totalProfitLoss ?? 0)}
              </Money>
            </View>
          </View>
        </View>

        {data?.lastUpdated ? (
          <Eyebrow tone="mute" style={{ marginTop: 10, marginBottom: 4 }}>
            {t('lastUpdated')}: {formatDate(data.lastUpdated)}
          </Eyebrow>
        ) : <View style={{ height: 14 }} />}

        {items.length === 0 ? (
          <EmptyState icon="chart-line-variant" title={t('empty_title')} message={t('empty_description')} />
        ) : (
          items.map((h) => {
            const gold = h.assetType === 'goldGram';
            const positive = h.profitLoss >= 0;
            const priceKnown = h.currentUnitPrice > 0;
            const accent = ASSET_COLOR[h.assetType];
            // Yüzde metnini tek string olarak hazırla (JSX'te çok-parçalı metin bazı RN
            // sürümlerinde basılmıyor) — örn. "+3.2%" / "-5.0%".
            const pctNum = Number.isFinite(h.profitLossPct) ? h.profitLossPct : 0;
            const pctStr = `${positive ? '+' : ''}${pctNum.toFixed(2)}%`;
            return (
              <SwipeableRow
                key={h.id}
                rightActions={[
                  { icon: 'pencil-outline', tone: 'sky', onPress: () => { setEditing(h); setOpen(true); }, accessibilityLabel: tCommon('edit') },
                  { icon: 'cash-multiple', tone: 'go', onPress: () => setSelling(h), accessibilityLabel: t('sell_action') },
                  { icon: 'trash-can-outline', tone: 'halt', onPress: () => setConfirm(h), accessibilityLabel: tCommon('delete') },
                ]}
              >
              <Pressable
                onPress={() => { setEditing(h); setOpen(true); }}
                style={[styles.card, { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow }]}
              >
                {/* Başlık: ikon + ad/miktar·tarih + sağda K/Z% pill */}
                <View style={styles.cardHead}>
                  <View style={[styles.assetIcon, { backgroundColor: colorAlpha(accent, 0.16) }]}>
                    <Icon source={ASSET_ICON[h.assetType]} size={20} color={accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Body weight="bold" numberOfLines={1}>
                      {h.assetType === 'tefasFund' ? (h.fundName || h.fundCode || t('asset_tefasFund')) : t(`asset_${h.assetType}`)}
                    </Body>
                    <Eyebrow tone="mute" style={{ marginTop: 2 }} numberOfLines={1}>
                      {h.assetType === 'tefasFund' && h.fundCode ? `${h.fundCode} · ` : ''}
                      {fmtQty(h.quantity, gold)}{gold ? ` ${t('unit_gram_short')}` : ''} · {formatDate(h.purchaseDate)}
                    </Eyebrow>
                  </View>
                  {priceKnown ? (
                    <View style={[styles.cardPnlPill, { backgroundColor: colorAlpha(positive ? colors.go : colors.halt, 0.14) }]}>
                      <Icon source={positive ? 'trending-up' : 'trending-down'} size={13} color={positive ? colors.go : colors.halt} />
                      <Body size="xs" weight="bold" style={{ color: positive ? colors.go : colors.halt }}>{pctStr}</Body>
                    </View>
                  ) : (
                    <Eyebrow tone="mute">{t('price_pending')}</Eyebrow>
                  )}
                </View>

                {/* Basit özet: Yatırılan 1.000₺ → Şu an 1.030₺ (iki kolon, taşmaz) */}
                {priceKnown ? (
                  <View style={[styles.valueRow, { borderTopColor: colors.line }]}>
                    <View style={styles.valueCol}>
                      <Eyebrow tone="mute">{t('card_invested')}</Eyebrow>
                      <Money size="md" tone="ink" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ marginTop: 3 }}>
                        {formatCurrency(h.investedAmount)}
                      </Money>
                    </View>
                    <View style={{ marginHorizontal: 8 }}>
                      <Icon source="arrow-right-thin" size={20} color={colors.inkMute} />
                    </View>
                    <View style={[styles.valueCol, { alignItems: 'flex-end' }]}>
                      <Eyebrow tone="mute">{t('card_now')}</Eyebrow>
                      <Money size="md" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: positive ? colors.go : colors.halt, marginTop: 3 }}>
                        {formatCurrency(h.currentValue)}
                      </Money>
                    </View>
                  </View>
                ) : null}
              </Pressable>
              </SwipeableRow>
            );
          })
        )}

        <View style={{ height: 24 }} />
      </Screen>

      <AddHoldingModal visible={open} initial={editing} onDismiss={() => setOpen(false)} />
      <SellHoldingModal visible={selling !== null} holding={selling} onDismiss={() => setSelling(null)} />
      <MarketRatesModal visible={ratesOpen} onDismiss={() => setRatesOpen(false)} />
      <ConfirmDialog
        visible={!!confirm}
        title={t('delete_title')}
        message={t('delete_description')}
        destructive
        loading={del.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirm(null)}
      />
    </View>
    </PageTour>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  ratesBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  hero: { borderRadius: 20, padding: 18, borderWidth: StyleSheet.hairlineWidth, marginTop: 6 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pnlPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  heroStrip: { flexDirection: 'row', alignItems: 'center', marginTop: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingVertical: 14 },
  heroStat: { flex: 1, alignItems: 'center', paddingHorizontal: 4 },
  heroStatIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  heroVDiv: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 8 },
  card: { padding: 14, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, marginBottom: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  assetIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardPnlPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, flexShrink: 0 },
  valueRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  valueCol: { flex: 1, minWidth: 0 },
});
