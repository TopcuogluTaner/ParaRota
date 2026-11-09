import { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Icon, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { AppHeader } from '@shared/components/AppHeader';
import { ToolbarAddButton } from '@shared/components/ToolbarAddButton';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { Body, Money } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { formatCurrency, formatDate } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { toast } from '@shared/lib/toast';
import { ASSET_ICON, ASSET_COLOR } from '@features/investments/lib/assetMeta';
import { usePriceAlarmsQuery, useDeletePriceAlarm, useRearmPriceAlarm } from '@features/priceAlarms/api/usePriceAlarms';
import { PriceAlarmModal } from '@features/priceAlarms/components/PriceAlarmModal';
import type { AlarmStatus, PriceAlarmDto } from '@shared/api/types';

type Filter = 'all' | AlarmStatus;
const FILTERS: Filter[] = ['all', 'active', 'triggered'];

export function PriceAlarmsScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('priceAlarms');
  const { t: tInv } = useTranslation('investments');
  const { t: tCommon } = useTranslation('common');

  const [filter, setFilter] = useState<Filter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PriceAlarmDto | undefined>(undefined);
  const [toDelete, setToDelete] = useState<PriceAlarmDto | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = usePriceAlarmsQuery(filter === 'all' ? undefined : filter);
  const del = useDeletePriceAlarm();
  const rearm = useRearmPriceAlarm();

  const counts = useMemo(() => ({
    active: data?.filter((a) => a.status === 'active').length ?? 0,
    triggered: data?.filter((a) => a.status === 'triggered').length ?? 0,
  }), [data]);

  const openCreate = () => { setEditing(undefined); setModalOpen(true); };
  const openEdit = (a: PriceAlarmDto) => { setEditing(a); setModalOpen(true); };

  const handleRearm = async (a: PriceAlarmDto) => {
    try { await rearm.mutateAsync(a.id); toast.success(t('rearmed')); }
    catch (err) { toast.error(getErrorMessage(err, tCommon('errorGeneric'))); }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try { await del.mutateAsync(toDelete.id); toast.success(t('deleted')); setToDelete(null); }
    catch (err) { toast.error(getErrorMessage(err, tCommon('errorGeneric'))); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('page_title')} />
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {/* Üst bar: filtre + ekle */}
        <View style={styles.toolbar}>
          <View style={[styles.filters, { borderColor: colors.line, backgroundColor: colors.bgAlt }]}>
            {FILTERS.map((f) => {
              const on = filter === f;
              const badge = f === 'active' ? counts.active : f === 'triggered' ? counts.triggered : 0;
              return (
                <Pressable key={f} style={[styles.filterBtn, on && { backgroundColor: colors.ink }]}
                  onPress={() => setFilter(f)} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <Body size="xs" weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.paper : colors.inkSoft }}>
                    {t(`filter_${f}`)}{badge ? ` ·${badge}` : ''}
                  </Body>
                </Pressable>
              );
            })}
          </View>
          <ToolbarAddButton label={t('new')} onPress={openCreate} />
        </View>

        {isError && !data ? (
          <ErrorState message={getErrorMessage(error, tCommon('error'))} onRetry={() => refetch()} />
        ) : (
          <FlatList
            showsVerticalScrollIndicator={false}
            data={data ?? []}
            keyExtractor={(it) => String(it.id)}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 120, gap: 10 }}
            refreshing={isFetching && !isLoading}
            onRefresh={() => refetch()}
            ListEmptyComponent={isLoading ? null : (
              <EmptyState eyebrow={t('page_eyebrow')} icon="bell-plus-outline" title={t('empty_title')} message={t('empty_hint')} />
            )}
            renderItem={({ item }) => {
              const accent = ASSET_COLOR[item.assetType];
              const triggered = item.status === 'triggered';
              const isAbove = item.direction === 'above';
              const dirColor = isAbove ? colors.go : colors.halt;
              return (
                <View style={[styles.card, { backgroundColor: colors.paper, borderColor: triggered ? colorAlpha(colors.way, 0.5) : colors.line, boxShadow: colors.cardShadow }]}>
                  <View style={styles.cardTop}>
                    <View style={[styles.icon, { backgroundColor: colorAlpha(accent, 0.14) }]}>
                      <Icon source={ASSET_ICON[item.assetType]} size={22} color={accent} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={styles.titleRow}>
                        <Body weight="bold" numberOfLines={1}>
                          {item.assetType === 'tefasFund' ? (item.fundCode || item.fundName || tInv('asset_tefasFund')) : tInv(`asset_short_${item.assetType}`)}
                        </Body>
                        <View style={[styles.dirPill, { backgroundColor: colorAlpha(dirColor, 0.12) }]}>
                          <Icon source={isAbove ? 'trending-up' : 'trending-down'} size={12} color={dirColor} />
                          <Body size="xs" weight="bold" style={{ color: dirColor }}>{t(`dir_${item.direction}`)}</Body>
                        </View>
                        {triggered && (
                          <View style={[styles.dirPill, { backgroundColor: colorAlpha(colors.way, 0.16) }]}>
                            <Icon source="bell-ring" size={12} color={colors.way} />
                            <Body size="xs" weight="bold" style={{ color: colors.way }}>{t('status_triggered')}</Body>
                          </View>
                        )}
                      </View>
                      <Money size="lg" style={{ marginTop: 2 }}>{formatCurrency(item.thresholdPrice)}</Money>
                      <View style={styles.metaRow}>
                        {item.currentPrice != null && (
                          <Body size="xs" tone="soft">{t('current_price')}: {formatCurrency(item.currentPrice)}</Body>
                        )}
                        {triggered && item.triggeredPrice != null && item.triggeredAt && (
                          <Body size="xs" style={{ color: colors.way }}>
                            {t('triggered_at', { price: formatCurrency(item.triggeredPrice), date: formatDate(item.triggeredAt) })}
                          </Body>
                        )}
                      </View>
                      {item.note ? <Body size="xs" tone="mute" style={{ marginTop: 4, fontStyle: 'italic' }}>{item.note}</Body> : null}
                    </View>
                  </View>

                  <View style={styles.actions}>
                    {triggered && (
                      <IconButton icon="bell-check-outline" size={20} iconColor={colors.way} disabled={rearm.isPending}
                        onPress={() => handleRearm(item)} accessibilityLabel={t('rearm')} />
                    )}
                    <IconButton icon="pencil-outline" size={20} onPress={() => openEdit(item)} accessibilityLabel={tCommon('edit')} />
                    <IconButton icon="trash-can-outline" size={20} iconColor={colors.halt} onPress={() => setToDelete(item)} accessibilityLabel={tCommon('delete')} />
                  </View>
                </View>
              );
            }}
          />
        )}
      </View>

      <PriceAlarmModal visible={modalOpen} onDismiss={() => setModalOpen(false)} alarm={editing} />

      <ConfirmDialog
        visible={!!toDelete}
        title={t('delete_title')}
        message={t('delete_body')}
        confirmLabel={tCommon('delete')}
        cancelLabel={tCommon('cancel')}
        destructive
        loading={del.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 8 },
  filters: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, padding: 3, flexShrink: 1 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 16, position: 'relative' },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  dirPill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  actions: { position: 'absolute', top: 6, right: 6, flexDirection: 'row' },
});
