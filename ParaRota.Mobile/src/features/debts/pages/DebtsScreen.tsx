import { useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Icon } from 'react-native-paper';
import { ListSkeleton } from '@shared/components/Skeleton';
import { colorAlpha } from '@shared/lib/colorAlpha';
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
import { RouteLine } from '@shared/components/RouteLine';
import { SwipeableRow } from '@shared/components/SwipeableRow';
import { DebtFormModal } from '@features/debts/components/DebtFormModal';
import { DebtPaymentModal } from '@features/debts/components/DebtPaymentModal';
import { useDebtsQuery, useDeleteDebt, useDebtQuery } from '@features/debts/api/useDebts';
import { formatCurrency, formatDate } from '@shared/lib/dateFormat';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import type { DebtListItemDto } from '@shared/api/types';

export function DebtsScreen() {
  const { colors } = useAppTheme();
  const fmtMoney = useMoneyFmt(); // gizlilik modunda tutarlari maskeler
  const { t } = useTranslation('debts');
  const { t: tCommon } = useTranslation('common');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [paying, setPaying] = useState<DebtListItemDto | null>(null);
  const [confirm, setConfirm] = useState<DebtListItemDto | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useDebtsQuery();
  const detail = useDebtQuery(editingId);
  const del = useDeleteDebt();
  const sorted = (data ?? []).slice().sort((a, b) => b.id - a.id); // en son eklenen en üstte

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await del.mutateAsync(confirm.id);
      toast.success(t('delete_toastSuccess'));
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    } finally {
      setConfirm(null);
    }
  };

  return (
    <PageTour page="debts">
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('page_title')} />
      <View style={styles.toolbar}>
        <View style={{ flex: 1 }} />
        <CopilotStep text={tCommon('onboarding.tour_debt')} order={1} name="debt-add">
          <WalkView>
            <ToolbarAddButton
              label={t('list_create')}
              onPress={() => { setEditingId(null); setOpen(true); }}
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
          data={sorted}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 140, gap: 10 }}
          refreshing={isFetching}
          onRefresh={() => refetch()}
          ListEmptyComponent={
            <EmptyState eyebrow={t('page_eyebrow')} icon="cash-multiple" title={t('list_empty_title')} message={t('list_empty_description')} />
          }
          renderItem={({ item, index }) => {
            const paid = Math.max(0, item.amount - item.remainingAmount);
            const pct = item.amount > 0 ? Math.min(1, paid / item.amount) : 0;
            const kindTone = item.kind === 'payable' ? 'halt' : 'go';
            const kindColor = item.kind === 'payable' ? colors.halt : colors.go;
            // Due-date awareness: overdue payable = halt (urgent), due within 7 days = way.
            // Only matters for active debts that haven't been paid off.
            const isActive = item.status === 'active' && pct < 1;
            const due = item.nextDueDate ? new Date(item.nextDueDate).getTime() : null;
            const daysToDue = due ? Math.ceil((due - Date.now()) / (1000 * 60 * 60 * 24)) : null;
            const isOverdue = isActive && daysToDue !== null && daysToDue < 0;
            const isDueSoon = isActive && daysToDue !== null && daysToDue >= 0 && daysToDue <= 7;
            const dueTone: 'halt' | 'way' | 'mute' = isOverdue ? 'halt' : isDueSoon ? 'way' : 'mute';
            const progressColor = !isActive
              ? colors.go
              : isOverdue
                ? colors.halt
                : isDueSoon
                  ? colors.way
                  : colors.go;
            // Sağ üst durum pill'i: kapandı / iptal / (aktifse) borç-alacak türü.
            const closed = item.status === 'completed' || pct >= 1;
            const cancelled = item.status === 'cancelled';
            const pillTone = closed ? colors.go : cancelled ? colors.inkMute : kindColor;
            const pillIcon = closed ? 'check-circle' : cancelled ? 'close-circle-outline' : (item.kind === 'payable' ? 'arrow-top-right' : 'arrow-bottom-left');
            const pillText = closed ? t('status_completed') : cancelled ? t('status_cancelled') : t(`kind_${item.kind}_short` as any);
            return (
              <Animated.View entering={FadeIn.delay(Math.min(index * 40, 240)).duration(300)}>
              <SwipeableRow
                rightActions={[
                  {
                    icon: 'pencil-outline',
                    tone: 'sky',
                    onPress: () => { setEditingId(item.id); setOpen(true); },
                    accessibilityLabel: tCommon('edit'),
                  },
                  {
                    icon: 'trash-can-outline',
                    tone: 'halt',
                    onPress: () => setConfirm(item),
                    accessibilityLabel: tCommon('delete'),
                  },
                ]}
              >
                <Pressable
                  onPress={() => { setEditingId(item.id); setOpen(true); }}
                  style={({ pressed }) => [styles.card, { backgroundColor: colors.paper, borderColor: colors.line, opacity: pressed ? 0.92 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                >
                  {/* Başlık: tür ikonu + ad/karşı taraf + durum pill'i */}
                  <View style={styles.head}>
                    <View style={[styles.kindIcon, { backgroundColor: colorAlpha(kindColor, 0.14) }]}>
                      <Icon source={item.kind === 'payable' ? 'arrow-top-right' : 'arrow-bottom-left'} size={20} color={kindColor} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Body weight="bold" numberOfLines={1}>{item.title}</Body>
                      {item.counterpartyName ? <Body size="xs" tone="mute" numberOfLines={1}>{item.counterpartyName}</Body> : null}
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: colorAlpha(pillTone, 0.12) }]}>
                      <Icon source={pillIcon} size={12} color={pillTone} />
                      <Body size="xs" weight="bold" style={{ color: pillTone }}>{pillText}</Body>
                    </View>
                  </View>

                  {/* Tutar: ödenen (büyük) / toplam + sağda kalan */}
                  <View style={styles.amountRow}>
                    <Money size="lg" tone="ink">{formatCurrency(paid, item.currency)}</Money>
                    <Body size="sm" tone="mute"> / {fmtMoney(item.amount, item.currency)}</Body>
                    <View style={{ flex: 1 }} />
                    {item.remainingAmount > 0 ? (
                      <View style={{ alignItems: 'flex-end' }}>
                        <Money size="sm" tone={kindTone}>{formatCurrency(item.remainingAmount, item.currency)}</Money>
                        <Eyebrow tone="mute">{t('card_remaining')}</Eyebrow>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.progRow}>
                    <View style={[styles.track, { backgroundColor: colors.line }]}>
                      <View style={[styles.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: progressColor }]} />
                    </View>
                    <Body size="xs" weight="bold" style={{ color: progressColor }}>{tCommon('percentValue', { value: Math.round(pct * 100) })}</Body>
                  </View>

                  {/* Alt: vade tarihi (kendi satırı) → ödeme ekle (ayrı, belirgin buton) */}
                  {(item.nextDueDate || item.status === 'active') ? (
                    <>
                      <RouteLine style={{ marginTop: 12 }} />
                      {item.nextDueDate ? (
                        <View style={[styles.dueRow, { marginTop: 10 }]}>
                          <Icon source="calendar-clock-outline" size={13} color={colors[dueTone === 'mute' ? 'inkMute' : dueTone]} />
                          <Eyebrow tone={dueTone}>{t('card_nextDue')} · {formatDate(item.nextDueDate)}</Eyebrow>
                        </View>
                      ) : null}
                      {item.status === 'active' ? (
                        <Pressable
                          onPress={() => setPaying(item)}
                          style={[styles.payBtn, { borderColor: colorAlpha(colors.go, 0.4), backgroundColor: colorAlpha(colors.go, 0.08) }]}
                          accessibilityRole="button"
                          accessibilityLabel={t('actions_addPayment')}
                        >
                          <Icon source="plus-circle-outline" size={15} color={colors.go} />
                          <Eyebrow tone="go">{t('actions_addPayment')}</Eyebrow>
                        </Pressable>
                      ) : null}
                    </>
                  ) : null}
                </Pressable>
              </SwipeableRow>
              </Animated.View>
            );
          }}
        />
      )}
      <DebtFormModal visible={open} initial={editingId ? detail.data ?? null : null} onDismiss={() => setOpen(false)} />
      {paying ? <DebtPaymentModal visible={!!paying} debt={paying} onDismiss={() => setPaying(null)} /> : null}
      <ConfirmDialog
        visible={!!confirm}
        title={t('delete_confirmTitle')}
        message={confirm ? t('delete_confirmBody', { title: confirm.title }) : undefined}
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
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginHorizontal: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kindIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 14 },
  progRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  track: { flex: 1, height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 10,
  },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
});
