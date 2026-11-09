import { useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Icon } from 'react-native-paper';
import { ListSkeleton } from '@shared/components/Skeleton';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppHeader } from '@shared/components/AppHeader';
import { ToolbarAddButton } from '@shared/components/ToolbarAddButton';
import { CopilotStep } from 'react-native-copilot';
import { PageTour } from '@features/onboarding/PageTour';
import { WalkView } from '@features/onboarding/tour';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { SwipeableRow } from '@shared/components/SwipeableRow';
import { Body, Eyebrow, Money } from '@shared/components/Typography';
import { RouteLine } from '@shared/components/RouteLine';
import { BudgetFormModal } from '@features/budgets/components/BudgetFormModal';
import { useBudgetsQuery, useDeleteBudget } from '@features/budgets/api/useBudgets';
import { formatCurrency } from '@shared/lib/dateFormat';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { normalizeIconName } from '@shared/lib/iconName';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import type { BudgetDto } from '@shared/api/types';

export function BudgetsScreen() {
  const { colors } = useAppTheme();
  const fmtMoney = useMoneyFmt(); // gizlilik modunda tutarlari maskeler
  const { t } = useTranslation('pages');
  const { t: tCommon } = useTranslation('common');
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const [editing, setEditing] = useState<BudgetDto | null>(null);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<BudgetDto | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useBudgetsQuery(month, year);
  const del = useDeleteBudget();

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await del.mutateAsync(confirm.id);
      toast.success(t('budgets.toastDeleteSuccess'));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error'));
    } finally {
      setConfirm(null);
    }
  };

  return (
    <PageTour page="budgets">
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('budgets.eyebrow')} />
      <View style={styles.toolbar}>
        <View style={{ flex: 1 }} />
        <CopilotStep text={tCommon('onboarding.tour_bg_add')} order={1} name="bg-add">
        <WalkView>
        <ToolbarAddButton
          label={t('budgets.newButton')}
          onPress={() => { setEditing(null); setOpen(true); }}
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
          data={data ?? []}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ padding: 16, paddingBottom: 140, gap: 10 }}
          refreshing={isFetching}
          onRefresh={() => refetch()}
          ListEmptyComponent={
            <EmptyState
              eyebrow={t('budgets.eyebrow')}
              icon="chart-arc"
              title={t('budgets.emptyTitle')}
              message={t('budgets.emptyDescription')}
            />
          }
          renderItem={({ item, index }) => {
            const exceeded = item.alertLevel === 'exceeded';
            const tone = exceeded ? colors.halt : item.alertLevel === 'warning' ? colors.way : colors.go;
            const catColor = item.category?.color || colors.go;
            const alertKey = exceeded ? 'exceeded' : item.alertLevel === 'warning' ? 'warning' : 'normal';
            const alertIcon = exceeded ? 'alert-circle' : item.alertLevel === 'warning' ? 'alert-outline' : 'check-circle-outline';
            return (
              <Animated.View entering={FadeIn.delay(Math.min(index * 40, 240)).duration(300)}>
              <SwipeableRow
                rightActions={[
                  {
                    icon: 'pencil-outline',
                    label: tCommon('edit'),
                    tone: 'sky',
                    onPress: () => { setEditing(item); setOpen(true); },
                    accessibilityLabel: tCommon('edit'),
                  },
                  {
                    icon: 'trash-can-outline',
                    label: tCommon('delete'),
                    tone: 'halt',
                    onPress: () => setConfirm(item),
                    accessibilityLabel: tCommon('delete'),
                  },
                ]}
              >
              <Pressable
                onPress={() => { setEditing(item); setOpen(true); }}
                style={({ pressed }) => [styles.card, { backgroundColor: colors.paper, borderColor: colors.line, opacity: pressed ? 0.92 : 1 }]}
                accessibilityRole="button"
                accessibilityLabel={item.category?.name}
              >
                <View style={styles.head}>
                  <View style={[styles.iconChip, { backgroundColor: colorAlpha(catColor, 0.14) }]}>
                    <Icon source={normalizeIconName(item.category?.icon)} size={20} color={catColor} />
                  </View>
                  <Body weight="bold" numberOfLines={1} style={{ flex: 1 }}>{item.category?.name}</Body>
                  <View style={[styles.statusPill, { backgroundColor: colorAlpha(tone, 0.12) }]}>
                    <Icon source={alertIcon} size={12} color={tone} />
                    <Body size="xs" weight="bold" style={{ color: tone }}>{t(`budgets.alert_${alertKey}`)}</Body>
                  </View>
                </View>

                <View style={styles.amountRow}>
                  <Money size="lg" tone={exceeded ? 'halt' : 'ink'}>{formatCurrency(item.spent)}</Money>
                  <Body size="sm" tone="mute"> / {fmtMoney(item.monthlyLimit)}</Body>
                  <View style={{ flex: 1 }} />
                  <Body weight="bold" style={{ color: tone, fontSize: 18 }}>{tCommon('percentValue', { value: Math.round(item.usagePercentage) })}</Body>
                </View>

                <View style={[styles.track, { backgroundColor: colors.line }]}>
                  <View style={[styles.fill, { width: `${Math.min(100, item.usagePercentage)}%`, backgroundColor: tone }]} />
                  {item.warnThreshold > 0 && item.warnThreshold < 100 ? (
                    <View style={[styles.marker, { left: `${item.warnThreshold}%`, backgroundColor: colorAlpha(colors.ink, 0.3) }]} />
                  ) : null}
                </View>

                <RouteLine style={{ marginTop: 12 }} />
                <View style={styles.footer}>
                  <Eyebrow tone="mute">{t('budgets.formWarnThresholdLabel')}: {tCommon('percentValue', { value: item.warnThreshold })}</Eyebrow>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                    <Money size="sm" tone={item.remaining < 0 ? 'halt' : 'ink'}>{formatCurrency(item.remaining)}</Money>
                    <Eyebrow tone="mute">{t('budgets.remainingLabel')}</Eyebrow>
                  </View>
                </View>
                {(item.memberBreakdown?.length ?? 0) > 0 && (
                  <View style={styles.breakdown}>
                    <Eyebrow tone="mute">{t('budgets.memberBreakdownLabel')}</Eyebrow>
                    {item.memberBreakdown.map((m) => (
                      <View key={m.userId} style={styles.breakdownRow}>
                        <Body size="xs" tone="soft" numberOfLines={1} style={{ flex: 1 }}>
                          {m.name || tCommon('unknown')}
                        </Body>
                        <Money size="sm" tone="ink">{formatCurrency(m.amount)}</Money>
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
              </SwipeableRow>
              </Animated.View>
            );
          }}
        />
      )}
      <BudgetFormModal visible={open} initial={editing} onDismiss={() => setOpen(false)} month={month} year={year} />
      <ConfirmDialog visible={!!confirm} title={t('budgets.deleteTitle')} message={t('budgets.deleteDescription')} destructive loading={del.isPending} onConfirm={handleDelete} onCancel={() => setConfirm(null)} />
    </View>
    </PageTour>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconChip: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 14 },
  track: { height: 8, borderRadius: 999, marginTop: 10, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  marker: { position: 'absolute', top: 0, bottom: 0, width: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10 },
  breakdown: { marginTop: 10, gap: 4 },
  breakdownRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
});
