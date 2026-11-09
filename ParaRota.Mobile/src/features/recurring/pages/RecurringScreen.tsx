import { useMemo, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Icon } from 'react-native-paper';
import { ListSkeleton } from '@shared/components/Skeleton';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppHeader } from '@shared/components/AppHeader';
import { ToolbarAddButton } from '@shared/components/ToolbarAddButton';
import { PageTour } from '@features/onboarding/PageTour';
import { CopilotStep } from 'react-native-copilot';
import { WalkView } from '@features/onboarding/tour';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { Body, Eyebrow, Money } from '@shared/components/Typography';
import { SwipeableRow } from '@shared/components/SwipeableRow';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { RecurringRuleFormModal, type RecurringRulePreset } from '@features/recurring/components/RecurringRuleFormModal';
import { PopularSubscriptionsStrip } from '@features/recurring/components/PopularSubscriptionsStrip';
import { SubscriptionRadarPanel } from '@features/recurring/components/SubscriptionRadarPanel';
import { PayrollManageModal } from '@features/payroll/components/PayrollManageModal';
import { useRecurringRulesQuery, useDeleteRecurringRule, useRunRecurringNow } from '@features/recurring/api/useRecurringRules';
import { formatCurrency, formatDate } from '@shared/lib/dateFormat';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import type { RecurringRuleDto } from '@shared/api/types';

type RecurringFilter = 'all' | 'active' | 'paused';

export function RecurringScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('pages');
  const { t: tCommon } = useTranslation('common');
  const { t: tPayroll } = useTranslation('payroll');
  const [editing, setEditing] = useState<RecurringRuleDto | null>(null);
  const [preset, setPreset] = useState<RecurringRulePreset | null>(null);
  const [open, setOpen] = useState(false);
  const [managePayroll, setManagePayroll] = useState<RecurringRuleDto | null>(null);
  const [confirm, setConfirm] = useState<RecurringRuleDto | null>(null);
  const [filter, setFilter] = useState<RecurringFilter>('all');

  // Maaş otomatiği kuralları (PayrollGrossMonthly dolu) jenerik form yerine maaş yönetimine gider.
  const isPayroll = (r: RecurringRuleDto) => r.payrollGrossMonthly != null;
  const openRule = (r: RecurringRuleDto) => {
    if (isPayroll(r)) { setManagePayroll(r); }
    else { setEditing(r); setOpen(true); }
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useRecurringRulesQuery();
  const del = useDeleteRecurringRule();
  const runNow = useRunRecurringNow();

  // Taksit planları burada GÖRÜNMEZ — evleri Taksitler ekranı. (Payroll'dan farkı: payroll'un
  // kendi ekranı yok, o yüzden burada rozetle yaşıyor; taksit iki listede çift sayım +
  // jenerik formun taksit kilitlerine çarpması demek olurdu.)
  const rules = useMemo(() => (data ?? []).filter((r) => r.installmentCount == null), [data]);

  const filtered = useMemo(() => {
    let all = rules.slice().sort((a, b) => b.id - a.id); // en son eklenen en üstte
    if (filter === 'active') all = all.filter((r) => r.isActive);
    if (filter === 'paused') all = all.filter((r) => !r.isActive);
    return all;
  }, [rules, filter]);
  const activeCount = rules.filter((r) => r.isActive).length;
  const totalCount = rules.length;

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await del.mutateAsync(confirm.id);
      toast.success(t('recurring.toastDeleteSuccess'));
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    } finally {
      setConfirm(null);
    }
  };

  return (
    <PageTour page="recurring">
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('recurring.eyebrow')} />
      <View style={styles.filterRow}>
        {(['all', 'active', 'paused'] as const).map((mode) => {
          const isOn = filter === mode;
          const label = mode === 'all' ? tCommon('all') : mode === 'active' ? t('recurring.tabActive') : t('recurring.tabPaused');
          const count = mode === 'all' ? totalCount : mode === 'active' ? activeCount : totalCount - activeCount;
          return (
            <Pressable
              key={mode}
              onPress={() => setFilter(mode)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityState={{ selected: isOn }}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isOn ? colors.ink : 'transparent',
                  borderColor: isOn ? colors.ink : colors.line,
                },
              ]}
            >
              <Eyebrow numberOfLines={1} style={{ color: isOn ? colors.paper : colors.inkSoft }}>
                {label} {totalCount > 0 ? `· ${count}` : ''}
              </Eyebrow>
            </Pressable>
          );
        })}
        <View style={{ flex: 1 }} />
        <CopilotStep text={tCommon('onboarding.tour_rec')} order={1} name="rec-add">
          <WalkView>
            <ToolbarAddButton
              label={t('recurring.newButton')}
              onPress={() => { setEditing(null); setPreset(null); setOpen(true); }}
              iconOnly
              accessibilityLabel={t('recurring.newButton')}
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
          data={filtered}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 140, gap: 10 }}
          refreshing={isFetching}
          onRefresh={() => refetch()}
          ListHeaderComponent={
            <>
              <SubscriptionRadarPanel />
              <PopularSubscriptionsStrip
                onSelect={(item, categoryId) => {
                  setEditing(null);
                  setPreset({
                    description: item.name,
                    categoryId,
                    amount: item.suggestedAmount,
                    currency: item.currency,
                    frequency: item.frequency,
                  });
                  setOpen(true);
                }}
              />
            </>
          }
          ListEmptyComponent={
            <EmptyState eyebrow={t('recurring.eyebrow')} icon="autorenew" title={t('recurring.emptyTitle')} message={t('recurring.emptyDescription')} />
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeIn.delay(Math.min(index * 40, 240)).duration(300)}>
              <SwipeableRow
                rightActions={[
                  {
                    icon: isPayroll(item) ? 'cog-outline' : 'pencil-outline',
                    label: tCommon('edit'),
                    tone: 'ink',
                    onPress: () => openRule(item),
                    accessibilityLabel: tCommon('edit'),
                  },
                  {
                    icon: 'play-outline',
                    label: t('recurring.runNow'),
                    tone: 'sky',
                    onPress: async () => {
                      try {
                        const created = await runNow.mutateAsync(item.id);
                        toast.success(t('recurring.runNowSuccess') + (typeof created === 'number' ? ` × ${created}` : ''));
                      } catch (err) {
                        toast.error(getErrorMessage(err, tCommon('errorGeneric')));
                      }
                    },
                    accessibilityLabel: t('recurring.runNow'),
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
                  onPress={() => openRule(item)}
                  style={({ pressed }) => [styles.card, { backgroundColor: colors.paper, borderColor: colors.line, opacity: pressed ? 0.92 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel={item.description}
                >
                  <View style={styles.head}>
                    <View style={{ flex: 1 }}>
                      <Eyebrow tone={item.isActive ? 'go' : 'mute'}>
                        {item.isActive ? t('recurring.tabActive') : t('recurring.tabPaused')} · {t(`recurring.freq${item.frequency.charAt(0).toUpperCase()}${item.frequency.slice(1)}` as any)}
                      </Eyebrow>
                      <View style={styles.titleRow}>
                        <Body weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>{item.description}</Body>
                        {isPayroll(item) ? (
                          <View style={[styles.badge, { backgroundColor: colorAlpha(colors.go, 0.12) }]}>
                            <Icon source="calendar-sync-outline" size={11} color={colors.go} />
                            <Body size="xs" weight="bold" style={{ color: colors.go }}>{tPayroll('automationBadge')}</Body>
                          </View>
                        ) : null}
                      </View>
                    </View>
                    <Money size="md" tone={item.type === 'income' ? 'go' : 'halt'}>
                      {item.type === 'expense' ? '−' : '+'}{formatCurrency(item.amount, item.currency)}
                    </Money>
                  </View>
                  <View style={styles.footer}>
                    <Eyebrow tone="mute">{t('recurring.nextRunLabel')} · {formatDate(item.nextRunDate)}</Eyebrow>
                  </View>
                </Pressable>
              </SwipeableRow>
            </Animated.View>
          )}
        />
      )}
      <RecurringRuleFormModal visible={open} initial={editing} preset={preset} onDismiss={() => { setOpen(false); setPreset(null); }} />
      <PayrollManageModal visible={!!managePayroll} rule={managePayroll} onDismiss={() => setManagePayroll(null)} />
      <ConfirmDialog visible={!!confirm} title={t('recurring.deleteTitle')} message={t('recurring.deleteDescription')} destructive loading={del.isPending} onConfirm={handleDelete} onCancel={() => setConfirm(null)} />
    </View>
    </PageTour>
  );
}

const styles = StyleSheet.create({
  // flexWrap KULLANMA: esnek boşluk + wrap, "+" butonunu alt satıra atıyordu.
  // Dar ekran/uzun dil koruması çiplerin kendisinde (flexShrink + tek satır).
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexShrink: 1, // uzun dilde buton sağda sabit kalsın diye çip daralır (metin tek satır)
  },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginHorizontal: 16 },
  head: { flexDirection: 'row', alignItems: 'flex-start' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
});
