import { useMemo, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Icon } from 'react-native-paper';
import { ListSkeleton } from '@shared/components/Skeleton';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppHeader } from '@shared/components/AppHeader';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { Body } from '@shared/components/Typography';
import { SwipeableRow, type SwipeAction } from '@shared/components/SwipeableRow';
import { ToolbarAddButton } from '@shared/components/ToolbarAddButton';
import { PageTour } from '@features/onboarding/PageTour';
import { CopilotStep } from 'react-native-copilot';
import { WalkView } from '@features/onboarding/tour';
import { CategoryFormModal } from '@features/categories/components/CategoryFormModal';
import { useCategoriesQuery, useDeleteCategory } from '@features/categories/api/useCategories';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { normalizeIconName } from '@shared/lib/iconName';
import type { CategoryDto } from '@shared/api/types';

export function CategoriesScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('pages');
  const { t: tCommon } = useTranslation('common');
  const [editing, setEditing] = useState<CategoryDto | null>(null);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<CategoryDto | null>(null);
  const [filter, setFilter] = useState<'all' | 'expense' | 'income'>('all');

  const { data, isLoading, isError, error, refetch, isFetching } = useCategoriesQuery();
  const del = useDeleteCategory();
  // Sistem kategorileri üstte sabit; kullanıcı kategorileri en son eklenen en üstte.
  const sorted = useMemo(
    () => (data ?? []).slice().sort((a, b) => (b.isSystem ? 1 : 0) - (a.isSystem ? 1 : 0) || b.id - a.id),
    [data],
  );
  const counts = useMemo(
    () => ({ all: sorted.length, expense: sorted.filter((c) => c.type === 'expense').length, income: sorted.filter((c) => c.type === 'income').length }),
    [sorted],
  );
  const filtered = filter === 'all' ? sorted : sorted.filter((c) => c.type === filter);

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await del.mutateAsync(confirm.id);
      toast.success(t('categories.toastDeleteSuccess'));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Error'));
    } finally {
      setConfirm(null);
    }
  };

  return (
    <PageTour page="categories">
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('categories.eyebrow')} />
      <View style={styles.toolbar}>
        {(['all', 'expense', 'income'] as const).map((mode) => {
          const on = filter === mode;
          const label = mode === 'all' ? tCommon('all') : mode === 'expense' ? t('categories.tabExpense') : t('categories.tabIncome');
          return (
            <Pressable
              key={mode}
              onPress={() => setFilter(mode)}
              hitSlop={4}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.filterChip, { backgroundColor: on ? colors.ink : 'transparent', borderColor: on ? colors.ink : colors.line }]}
            >
              <Body size="xs" weight="bold" style={{ color: on ? colors.paper : colors.inkSoft }}>
                {label} · {counts[mode]}
              </Body>
            </Pressable>
          );
        })}
        <View style={{ flex: 1 }} />
        <CopilotStep text={tCommon('onboarding.tour_cat')} order={1} name="cat-add">
          <WalkView>
            <ToolbarAddButton
              label={t('categories.newButton')}
              onPress={() => { setEditing(null); setOpen(true); }}
              iconOnly
              accessibilityLabel={t('categories.newButton')}
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
          contentContainerStyle={{ paddingVertical: 16, paddingBottom: 140, gap: 10 }}
          refreshing={isFetching}
          onRefresh={() => refetch()}
          ListEmptyComponent={
            <EmptyState
              eyebrow={t('categories.eyebrow')}
              icon="shape-outline"
              title={t('categories.emptyTitle')}
              message={t('categories.emptyDescription')}
            />
          }
          renderItem={({ item, index }) => {
            // System categories are immutable — no swipe actions, no tap-to-edit.
            const rightActions: SwipeAction[] = item.isSystem
              ? []
              : [
                  {
                    icon: 'pencil-outline',
                    label: tCommon('edit'),
                    tone: 'ink',
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
                ];
            return (
              <Animated.View entering={FadeIn.delay(Math.min(index * 20, 200)).duration(260)}>
                <SwipeableRow rightActions={rightActions}>
                  <Pressable
                    onPress={item.isSystem ? undefined : () => { setEditing(item); setOpen(true); }}
                    style={({ pressed }) => [styles.card, { backgroundColor: colors.paper, borderColor: colors.line }, pressed && !item.isSystem && { opacity: 0.9 }]}
                    accessibilityRole="button"
                    accessibilityLabel={item.name}
                  >
                    <View style={[styles.iconBox, { backgroundColor: item.color ?? colors.go }]}>
                      <Icon source={normalizeIconName(item.icon)} size={22} color={colors.onAccent} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Body weight="bold" numberOfLines={1}>{item.name}</Body>
                      {item.isSystem ? (
                        <View style={styles.sysRow}>
                          <Icon source="lock-outline" size={11} color={colors.inkMute} />
                          <Body size="xs" tone="mute">{t('categories.systemBadge')}</Body>
                        </View>
                      ) : null}
                    </View>
                    <View style={[styles.typePill, { backgroundColor: colorAlpha(item.type === 'income' ? colors.go : colors.halt, 0.12) }]}>
                      <Icon source={item.type === 'income' ? 'arrow-bottom-left' : 'arrow-top-right'} size={11} color={item.type === 'income' ? colors.go : colors.halt} />
                      <Body size="xs" weight="bold" style={{ color: item.type === 'income' ? colors.go : colors.halt }}>
                        {item.type === 'income' ? t('categories.tabIncome') : t('categories.tabExpense')}
                      </Body>
                    </View>
                  </Pressable>
                </SwipeableRow>
              </Animated.View>
            );
          }}
        />
      )}

      <CategoryFormModal visible={open} initial={editing} onDismiss={() => setOpen(false)} />
      <ConfirmDialog
        visible={!!confirm}
        title={t('categories.deleteTitle')}
        message={t('categories.deleteDescription')}
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
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, marginHorizontal: 16, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  sysRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  typePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
