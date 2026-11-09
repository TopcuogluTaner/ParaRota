import { useMemo, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Icon } from 'react-native-paper';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@shared/components/AppHeader';
import { ToolbarAddButton } from '@shared/components/ToolbarAddButton';
import { PageTour } from '@features/onboarding/PageTour';
import { CopilotStep } from 'react-native-copilot';
import { WalkView } from '@features/onboarding/tour';
import { ListSkeleton } from '@shared/components/Skeleton';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { SwipeableRow } from '@shared/components/SwipeableRow';
import { Body, Eyebrow, Money } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { formatCurrency } from '@shared/lib/dateFormat';
import { normalizeIconName } from '@shared/lib/iconName';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { InstallmentFormModal } from '@features/installments/components/InstallmentFormModal';
import { useRecurringRulesQuery, useDeleteRecurringRule, useUpdateRecurringRule } from '@features/recurring/api/useRecurringRules';
import type { RecurringRuleDto } from '@shared/api/types';

const MONTH_SHORT = [
  'month_short_jan', 'month_short_feb', 'month_short_mar', 'month_short_apr',
  'month_short_may', 'month_short_jun', 'month_short_jul', 'month_short_aug',
  'month_short_sep', 'month_short_oct', 'month_short_nov', 'month_short_dec',
] as const;

type PlanState = 'active' | 'done' | 'closed';

// Plan durumu: tamamı ödendi → done; erken kapatıldı (pasif + eksik) → closed; diğeri active.
function planState(r: RecurringRuleDto): PlanState {
  const count = r.installmentCount ?? 0;
  if (r.paidInstallments >= count) return 'done';
  if (!r.isActive) return 'closed';
  return 'active';
}

// Verilen ayda bu planın taksidi var mı; varsa tutarı (son ayda küsurat kapanışı).
function amountInMonth(r: RecurringRuleDto, y: number, m: number): number {
  const start = new Date(r.startDate);
  const end = r.endDate ? new Date(r.endDate) : null;
  if (!end) return 0;
  const afterStart = y > start.getFullYear() || (y === start.getFullYear() && m >= start.getMonth() + 1);
  const beforeEnd = y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth() + 1);
  if (!afterStart || !beforeEnd) return 0;
  const isLast = y === end.getFullYear() && m === end.getMonth() + 1;
  if (!isLast) return r.amount;
  const count = r.installmentCount ?? 1;
  const total = r.installmentTotalAmount ?? r.amount * count;
  const residual = Math.round((total - r.amount * (count - 1)) * 100) / 100;
  return residual > 0 ? residual : r.amount;
}

export function InstallmentsScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('installments');
  const { t: tCommon } = useTranslation('common');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringRuleDto | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<RecurringRuleDto | null>(null);
  const [confirmClose, setConfirmClose] = useState<RecurringRuleDto | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useRecurringRulesQuery();
  const del = useDeleteRecurringRule();
  const closeUpdate = useUpdateRecurringRule(confirmClose?.id ?? 0);

  const plans = useMemo(
    () => (data ?? []).filter((r) => r.installmentCount != null).sort((a, b) => b.id - a.id),
    [data],
  );

  const now = new Date();
  const thisMonth = useMemo(() => {
    const active = plans.filter((r) => planState(r) !== 'closed');
    const total = active.reduce((sum, r) => sum + amountInMonth(r, now.getFullYear(), now.getMonth() + 1), 0);
    const count = active.filter((r) => amountInMonth(r, now.getFullYear(), now.getMonth() + 1) > 0).length;
    return { total, count };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans]);

  // Rahatlama takvimi: aktif planları bitiş ayına göre grupla — "o ay bitince aylık yük ne kadar azalır".
  const relief = useMemo(() => {
    const map = new Map<string, { y: number; m: number; amount: number }>();
    for (const r of plans) {
      if (planState(r) !== 'active' || !r.endDate) continue;
      const end = new Date(r.endDate);
      if (end < now) continue;
      const key = `${end.getFullYear()}-${end.getMonth()}`;
      const cur = map.get(key) ?? { y: end.getFullYear(), m: end.getMonth(), amount: 0 };
      cur.amount += r.amount;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => a.y - b.y || a.m - b.m).slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plans]);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await del.mutateAsync(confirmDelete.id);
      toast.success(t('toastDeleted'));
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    } finally {
      setConfirmDelete(null);
    }
  };

  // Erken kapatma = endDate'i bugüne çek + pasifleştir; motor bir daha taksit üretmez,
  // geçmiş işlemler aynen kalır.
  const handleClose = async () => {
    const r = confirmDelete ? null : confirmClose;
    if (!r) return;
    try {
      await closeUpdate.mutateAsync({
        description: r.description,
        nature: r.nature,
        categoryId: r.categoryId,
        amount: r.amount,
        currency: r.currency,
        frequency: r.frequency,
        startDate: r.startDate,
        endDate: new Date().toISOString(),
        autoApprove: r.autoApprove,
        isActive: false,
        notes: r.notes,
      });
      toast.success(t('toastClosed'));
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    } finally {
      setConfirmClose(null);
    }
  };

  const endLabel = (r: RecurringRuleDto) => {
    if (!r.endDate) return '';
    const d = new Date(r.endDate);
    return `${tCommon(MONTH_SHORT[d.getMonth()])} ${d.getFullYear()}`;
  };

  return (
    <PageTour page="installments">
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <AppHeader title={t('title')} />
        <View style={styles.toolbar}>
          <Eyebrow tone="mute">{t('plansLabel', { count: plans.length })}</Eyebrow>
          <View style={{ flex: 1 }} />
          <CopilotStep text={tCommon('onboarding.tour_inst_add')} order={2} name="inst-add">
            <WalkView>
              <ToolbarAddButton
                label={t('newButton')}
                onPress={() => { setEditing(null); setFormOpen(true); }}
                iconOnly
                accessibilityLabel={t('newButton')}
              />
            </WalkView>
          </CopilotStep>
        </View>

        {isLoading ? (
          <ListSkeleton />
        ) : isError && !data ? (
          <ErrorState message={getErrorMessage(error, tCommon('error'))} onRetry={() => refetch()} />
        ) : (
          <FlatList
            showsVerticalScrollIndicator={false}
            data={plans}
            keyExtractor={(it) => String(it.id)}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 140, gap: 10 }}
            refreshing={isFetching}
            onRefresh={() => refetch()}
            ListHeaderComponent={
              plans.length > 0 ? (
                // Hero: bu ayki toplam taksit yükü — ekranın cevapladığı ilk soru.
                <CopilotStep text={tCommon('onboarding.tour_inst_hero')} order={1} name="inst-hero">
                  <WalkView>
                    <View style={[styles.hero, { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow }]}>
                      <View style={styles.heroLabel}>
                        <View style={[styles.heroIcon, { backgroundColor: colorAlpha(colors.halt, 0.12) }]}>
                          <Icon source="credit-card-clock-outline" size={16} color={colors.halt} />
                        </View>
                        <Eyebrow tone="mute">{t('heroLabel')}</Eyebrow>
                      </View>
                      <View style={styles.heroLine}>
                        <Money size="xl" style={{ color: thisMonth.total > 0 ? colors.halt : colors.inkMute }}>
                          {formatCurrency(thisMonth.total)}
                        </Money>
                        <Body size="sm" tone="mute" style={{ marginBottom: 5 }}>
                          {t('heroHint', { count: thisMonth.count })}
                        </Body>
                      </View>
                    </View>
                  </WalkView>
                </CopilotStep>
              ) : null
            }
            ListEmptyComponent={
              <EmptyState
                eyebrow={t('eyebrow')}
                icon="credit-card-clock-outline"
                title={t('emptyTitle')}
                message={t('emptyDescription')}
              />
            }
            ListFooterComponent={
              relief.length > 0 ? (
                <View style={[styles.relief, { backgroundColor: colors.bgAlt, borderColor: colors.line }]}>
                  <View style={styles.reliefHead}>
                    <Icon source="weather-sunset-up" size={15} color={colors.go} />
                    <Eyebrow tone="mute">{t('reliefTitle')}</Eyebrow>
                  </View>
                  {relief.map((g) => (
                    <View key={`${g.y}-${g.m}`} style={styles.reliefRow}>
                      <Body size="sm" tone="soft" style={{ flex: 1 }}>
                        {tCommon(MONTH_SHORT[g.m])} {g.y}
                      </Body>
                      <Money size="sm" style={{ color: colors.go }}>+ {formatCurrency(g.amount)}{t('perMonthSuffix')}</Money>
                    </View>
                  ))}
                </View>
              ) : null
            }
            renderItem={({ item, index }) => {
              const state = planState(item);
              const count = item.installmentCount ?? 1;
              const progress = Math.min(1, item.paidInstallments / count);
              const catColor = item.category?.color ?? colors.go;
              return (
                <Animated.View entering={FadeIn.delay(Math.min(index * 40, 240)).duration(300)}>
                  <SwipeableRow
                    rightActions={[
                      {
                        icon: 'pencil-outline',
                        label: tCommon('edit'),
                        tone: 'ink',
                        onPress: () => { setEditing(item); setFormOpen(true); },
                        accessibilityLabel: tCommon('edit'),
                      },
                      ...(state === 'active'
                        ? [{
                            icon: 'stop-circle-outline',
                            label: t('closeAction'),
                            tone: 'way' as const,
                            onPress: () => setConfirmClose(item),
                            accessibilityLabel: t('closeAction'),
                          }]
                        : []),
                      {
                        icon: 'trash-can-outline',
                        label: tCommon('delete'),
                        tone: 'halt',
                        onPress: () => setConfirmDelete(item),
                        accessibilityLabel: tCommon('delete'),
                      },
                    ]}
                  >
                    <View style={[styles.card, { backgroundColor: colors.paper, borderColor: colors.line }]}>
                      <View style={styles.cardHead}>
                        <View style={[styles.catIcon, { backgroundColor: colorAlpha(catColor, 0.12) }]}>
                          <Icon source={normalizeIconName(item.category?.icon)} size={18} color={catColor} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Body weight="bold" numberOfLines={1}>{item.description}</Body>
                          <Eyebrow tone="mute" style={{ marginTop: 2 }}>
                            {state === 'done'
                              ? t('stateDone')
                              : state === 'closed'
                                ? t('stateClosed')
                                : t('stateEnds', { date: endLabel(item) })}
                          </Eyebrow>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Money size="md" tone={state === 'active' ? 'halt' : 'ink'}>
                            {formatCurrency(item.amount, item.currency)}
                          </Money>
                          <Eyebrow tone="mute" style={{ marginTop: 1 }}>{t('perMonth')}</Eyebrow>
                        </View>
                      </View>
                      {/* İlerleme: k/n + bar — taksitin tek bakışta okunan kimliği */}
                      <View style={styles.progressRow}>
                        <View style={[styles.track, { backgroundColor: colors.bgAlt }]}>
                          <View
                            style={[
                              styles.fill,
                              {
                                flex: Math.max(progress, 0.02),
                                backgroundColor: state === 'done' ? colors.go : state === 'closed' ? colors.inkMute : catColor,
                              },
                            ]}
                          />
                          <View style={{ flex: Math.max(1 - progress, 0.001) }} />
                        </View>
                        <Body size="xs" weight="bold" style={{ color: colors.inkSoft }}>
                          {item.paidInstallments}/{count}
                        </Body>
                      </View>
                    </View>
                  </SwipeableRow>
                </Animated.View>
              );
            }}
          />
        )}

        <InstallmentFormModal
          visible={formOpen}
          initial={editing}
          onDismiss={() => { setFormOpen(false); setEditing(null); }}
        />
        <ConfirmDialog
          visible={!!confirmDelete}
          title={t('deleteTitle')}
          message={t('deleteDescription')}
          destructive
          loading={del.isPending}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
        <ConfirmDialog
          visible={!!confirmClose}
          title={t('closeTitle')}
          message={t('closeDescription')}
          loading={closeUpdate.isPending}
          onConfirm={handleClose}
          onCancel={() => setConfirmClose(null)}
        />
      </View>
    </PageTour>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  hero: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginHorizontal: 16, marginBottom: 4 },
  heroLabel: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  heroLine: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 10 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginHorizontal: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  track: { flex: 1, height: 7, borderRadius: 999, flexDirection: 'row', overflow: 'hidden' },
  fill: { borderRadius: 999 },
  relief: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginHorizontal: 16, marginTop: 6 },
  reliefHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  reliefRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
});
