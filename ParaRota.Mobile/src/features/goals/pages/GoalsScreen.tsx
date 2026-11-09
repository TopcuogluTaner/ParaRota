import { useRef, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { useScrollToTop } from '@react-navigation/native';
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
import { Body, Eyebrow, Money } from '@shared/components/Typography';
import { RouteLine } from '@shared/components/RouteLine';
import { SwipeableRow } from '@shared/components/SwipeableRow';
import { GoalFormModal } from '@features/goals/components/GoalFormModal';
import { QuickContributeModal } from '@features/goals/components/QuickContributeModal';
import { useGoalsQuery, useDeleteGoal } from '@features/goals/api/useGoals';
import { formatCurrency, formatDate } from '@shared/lib/dateFormat';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import type { GoalDto } from '@shared/api/types';

const PRIORITY_TONE = { low: 'sky', medium: 'way', high: 'halt' } as const;

export function GoalsScreen() {
  const { colors } = useAppTheme();
  const fmtMoney = useMoneyFmt(); // gizlilik modunda tutarlari maskeler
  const { t } = useTranslation('pages');
  const { t: tCommon } = useTranslation('common');
  const [editing, setEditing] = useState<GoalDto | null>(null);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<GoalDto | null>(null);
  const [contribute, setContribute] = useState<GoalDto | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useGoalsQuery();
  const del = useDeleteGoal();
  const sorted = (data ?? []).slice().sort((a, b) => b.id - a.id); // en son eklenen en üstte
  const listRef = useRef<FlatList<GoalDto>>(null);
  useScrollToTop(listRef); // aktif sekmeye tekrar dokununca en üste kaydır

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await del.mutateAsync(confirm.id);
      toast.success(t('goals.toastDeleteSuccess'));
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    } finally {
      setConfirm(null);
    }
  };

  return (
    <PageTour page="goals">
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('goals.eyebrow')} />
      <View style={styles.toolbar}>
        <View style={{ flex: 1 }} />
        <CopilotStep text={tCommon('onboarding.tour_gl_add')} order={1} name="gl-add">
        <WalkView>
        <ToolbarAddButton
          label={t('goals.newButton')}
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
          ref={listRef}
          showsVerticalScrollIndicator={false}
          data={sorted}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 140, gap: 10 }}
          refreshing={isFetching}
          onRefresh={() => refetch()}
          ListEmptyComponent={<EmptyState eyebrow={t('goals.eyebrow')} icon="flag-outline" title={t('goals.emptyTitle')} message={t('goals.emptyDescription')} />}
          renderItem={({ item, index }) => {
            const pct = item.target > 0 ? Math.min(1, item.current / item.target) : 0;
            // Progress bar tone reflects deadline state: passed = halt, within 7 days = way, else go.
            // Completed/paused goals are not warned about; status takes priority.
            const target = new Date(item.targetDate).getTime();
            const daysLeft = Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
            // "Tamamlandı" yalnızca hedefe ULAŞINCA (pct ≥ 1). Sadece status bayrağına güvenme:
            // tutar hedefin altındayken (ör. %60) yanlışlıkla tamamlandı görünmesin.
            const isComplete = pct >= 1;
            const progressColor = isComplete
              ? colors.go
              : daysLeft < 0
                ? colors.halt
                : daysLeft <= 7
                  ? colors.way
                  : colors.go;
            const dateTone: 'halt' | 'way' | 'mute' = isComplete
              ? 'mute'
              : daysLeft < 0
                ? 'halt'
                : daysLeft <= 7
                  ? 'way'
                  : 'mute';
            // Durum/son tarih pill'i + öncelik rengi (bütçe kartıyla tutarlı kart dili)
            const paused = item.status === 'paused';
            const pillTone = isComplete ? colors.go : paused ? colors.inkMute : daysLeft < 0 ? colors.halt : daysLeft <= 7 ? colors.way : colors.sky;
            const pillIcon = isComplete ? 'check-circle' : paused ? 'pause-circle-outline' : daysLeft < 0 ? 'alert-circle' : 'clock-outline';
            const pillText = isComplete ? t('goals.statusCompleted') : paused ? t('goals.statusPaused') : daysLeft < 0 ? t('goals.deadlinePassed') : t('goals.deadlineDays', { count: daysLeft });
            const prioColor = colors[PRIORITY_TONE[item.priority]];
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
                  onPress={() => setContribute(item)}
                  style={({ pressed }) => [styles.card, { backgroundColor: colors.paper, borderColor: colors.line, opacity: pressed ? 0.92 : 1 }]}
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                >
                  <View style={styles.head}>
                    <View style={[styles.iconChip, { backgroundColor: colorAlpha(progressColor, 0.14) }]}>
                      <Body style={{ fontSize: 22, lineHeight: 28 }}>{item.emoji || '🎯'}</Body>
                    </View>
                    <Body weight="bold" numberOfLines={1} style={{ flex: 1 }}>{item.name}</Body>
                    <View style={[styles.statusPill, { backgroundColor: colorAlpha(pillTone, 0.12) }]}>
                      <Icon source={pillIcon} size={12} color={pillTone} />
                      <Body size="xs" weight="bold" style={{ color: pillTone }}>{pillText}</Body>
                    </View>
                  </View>

                  <View style={styles.amountRow}>
                    <Money size="lg" tone="ink">{formatCurrency(item.current)}</Money>
                    <Body size="sm" tone="mute"> / {fmtMoney(item.target)}</Body>
                    <View style={{ flex: 1 }} />
                    <Body weight="bold" style={{ color: progressColor, fontSize: 18 }}>{tCommon('percentValue', { value: (pct * 100).toFixed(0) })}</Body>
                  </View>

                  <View style={[styles.track, { backgroundColor: colors.line }]}>
                    <View style={[styles.fill, { width: `${Math.round(pct * 100)}%`, backgroundColor: progressColor }]} />
                  </View>

                  <RouteLine style={{ marginTop: 12 }} />
                  <View style={styles.footer}>
                    <View style={styles.prio}>
                      <View style={[styles.prioDot, { backgroundColor: prioColor }]} />
                      <Eyebrow tone="mute">{t(`goals.priority${item.priority.charAt(0).toUpperCase()}${item.priority.slice(1)}` as any)}</Eyebrow>
                    </View>
                    <Eyebrow tone={dateTone}>{formatDate(item.targetDate)}</Eyebrow>
                  </View>
                </Pressable>
              </SwipeableRow>
              </Animated.View>
            );
          }}
        />
      )}
      <GoalFormModal visible={open} initial={editing} onDismiss={() => setOpen(false)} />
      <QuickContributeModal
        visible={!!contribute}
        goal={contribute}
        onDismiss={() => setContribute(null)}
        onEdit={() => { const g = contribute; setContribute(null); setEditing(g); setOpen(true); }}
      />
      <ConfirmDialog visible={!!confirm} title={t('goals.deleteTitle')} message={t('goals.deleteDescription')} destructive loading={del.isPending} onConfirm={handleDelete} onCancel={() => setConfirm(null)} />
    </View>
    </PageTour>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, marginHorizontal: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconChip: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 14 },
  track: { height: 8, borderRadius: 999, marginTop: 10, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  prio: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  prioDot: { width: 7, height: 7, borderRadius: 999 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
});
