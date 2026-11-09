import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, FlatList, Pressable, TextInput } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { Icon, Menu } from 'react-native-paper';
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
import { fontFamily } from '@shared/theme/tokens';
import { SwipeableRow } from '@shared/components/SwipeableRow';
import { TransactionFormModal } from '@features/transactions/components/TransactionFormModal';
import { MoveScopeModal } from '@features/transactions/components/MoveScopeModal';
import { useTransactionsQuery, useDeleteTransaction } from '@features/transactions/api/useTransactions';
import { useActiveHouseholdStore } from '@shared/store/useActiveHouseholdStore';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { formatCurrency, formatDate } from '@shared/lib/dateFormat';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { normalizeIconName } from '@shared/lib/iconName';
import { colorAlpha } from '@shared/lib/colorAlpha';
import type { TransactionDto, TxType } from '@shared/api/types';

export function TransactionsScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('pages');
  const { t: tCommon } = useTranslation('common');
  const { t: tHousehold } = useTranslation('household');
  const [q, setQ] = useState('');
  const [type, setType] = useState<TxType | undefined>(undefined);
  const [filterMenu, setFilterMenu] = useState(false);

  // Ana ekran hero kartından "gelir/gider"e tıklanınca filtreli açılır (type + ts param'ı).
  const params = useLocalSearchParams<{ type?: string; ts?: string }>();
  useEffect(() => {
    if (params.type === 'income' || params.type === 'expense') setType(params.type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.type, params.ts]);
  const [editing, setEditing] = useState<TransactionDto | null>(null);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<TransactionDto | null>(null);
  const [moveTarget, setMoveTarget] = useState<TransactionDto | null>(null);
  const activeHouseholdId = useActiveHouseholdStore((s) => s.activeId);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const { data, isLoading, isError, error, refetch, isFetching } = useTransactionsQuery({ q: q || undefined, type, pageSize: 50 });
  const del = useDeleteTransaction();
  const items = useMemo(() => data?.items ?? [], [data]);
  const listRef = useRef<FlatList<TransactionDto>>(null);
  useScrollToTop(listRef); // aktif sekmeye tekrar dokununca en üste kaydır

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await del.mutateAsync(confirm.id);
      toast.success(t('transactions.toastDeleteSuccess'));
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    } finally {
      setConfirm(null);
    }
  };

  return (
    <PageTour page="transactions">
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('transactions.title')} />

      <View style={styles.toolbar}>
        {/* Custom arama alanı — Paper Searchbar 44px'e zorlanınca yazı dikey kayıyordu;
            burada ikon + TextInput tam ortalanır. */}
        <CopilotStep text={tCommon('onboarding.tour_tx_search')} order={1} name="tx-search">
        <WalkView style={{ flex: 1 }}>
        <View style={[styles.search, { backgroundColor: colors.paper, borderColor: colors.line }]}>
          <Icon source="magnify" size={18} color={colors.inkSoft} />
          <TextInput
            placeholder={tCommon('searchPlaceholder')}
            placeholderTextColor={colors.inkMute}
            value={q}
            onChangeText={setQ}
            returnKeyType="search"
            style={[styles.searchInput, { color: colors.ink }]}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8} accessibilityLabel={tCommon('close')}>
              <Icon source="close-circle" size={18} color={colors.inkMute} />
            </Pressable>
          ) : null}
        </View>
        </WalkView>
        </CopilotStep>
        <Menu
          visible={filterMenu}
          onDismiss={() => setFilterMenu(false)}
          anchor={
            <CopilotStep text={tCommon('onboarding.tour_tx_filter')} order={2} name="tx-filter">
            <WalkView>
            <Pressable
              onPress={() => setFilterMenu(true)}
              style={[styles.filterChip, { borderColor: colors.line, backgroundColor: colors.paper }]}
              accessibilityRole="button"
              accessibilityLabel={t('transactions.filter_typeAll')}
            >
              <Icon source="filter-variant" size={16} color={colors.ink} />
              <Eyebrow tone={type ? 'go' : 'mute'}>
                {type === 'income' ? t('transactions.filter_typeIncome') : type === 'expense' ? t('transactions.filter_typeExpense') : t('transactions.filter_typeAll')}
              </Eyebrow>
            </Pressable>
            </WalkView>
            </CopilotStep>
          }
          contentStyle={{ backgroundColor: colors.paper }}
        >
          <Menu.Item onPress={() => { setType(undefined); setFilterMenu(false); }} title={t('transactions.filter_typeAll')} leadingIcon={!type ? 'check' : undefined} />
          <Menu.Item onPress={() => { setType('income'); setFilterMenu(false); }} title={t('transactions.filter_typeIncome')} leadingIcon={type === 'income' ? 'check' : 'arrow-down'} />
          <Menu.Item onPress={() => { setType('expense'); setFilterMenu(false); }} title={t('transactions.filter_typeExpense')} leadingIcon={type === 'expense' ? 'check' : 'arrow-up'} />
        </Menu>
        <CopilotStep text={tCommon('onboarding.tour_tx_add')} order={3} name="tx-add">
        <WalkView>
        <ToolbarAddButton
          label={t('transactions.newButton')}
          onPress={() => { setEditing(null); setOpen(true); }}
          iconOnly
          accessibilityLabel={t('transactions.newButton')}
        />
        </WalkView>
        </CopilotStep>
      </View>

      {isLoading ? (
        <ListSkeleton />
      ) : isError && !data ? (
        <ErrorState message={getErrorMessage(error, tCommon('error'))} onRetry={() => refetch()} />
      ) : (
        // Tur 4. adımı liste alanını vurgular: kaydırma (düzenle/taşı/sil) keşfedilemeyen
        // bir jest — turda anlatılmazsa kullanıcı bulamıyor.
        <CopilotStep text={tCommon('onboarding.tour_tx_swipe')} order={4} name="tx-swipe">
        <WalkView style={{ flex: 1 }}>
        <FlatList
          ref={listRef}
          showsVerticalScrollIndicator={false}
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ paddingTop: 6, paddingBottom: 140 }}
          refreshing={isFetching}
          onRefresh={() => refetch()}
          ListEmptyComponent={
            <EmptyState
              eyebrow={t('transactions.eyebrow')}
              icon="swap-horizontal"
              title={t('transactions.emptyTitle')}
              message={t('transactions.emptyDescription')}
            />
          }
          ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: colors.line }]} />}
          renderItem={({ item, index }) => {
            // Sahiplik: kişisel scope'ta her kayıt senin; aile scope'unda yalnız oluşturduğun.
            const isOwner = activeHouseholdId === null || item.userId === currentUserId;
            return (
            <Animated.View entering={FadeIn.delay(Math.min(index * 30, 240)).duration(280)}>
              <SwipeableRow
                rightActions={!isOwner ? [] : [
                  {
                    icon: 'swap-horizontal',
                    label: tHousehold('move_action'),
                    tone: 'way',
                    onPress: () => setMoveTarget(item),
                    accessibilityLabel: tHousehold('move_action'),
                  },
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
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                  accessibilityRole="button"
                  accessibilityLabel={item.notes || item.category?.name}
                >
                  <View style={[styles.iconBox, { backgroundColor: colorAlpha(item.category?.color ?? colors.go, 0.12) }]}>
                    <Icon source={normalizeIconName(item.category?.icon)} size={20} color={item.category?.color ?? colors.go} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Body weight="bold" numberOfLines={1}>{item.notes || item.category?.name}</Body>
                    <Eyebrow tone="mute" numberOfLines={1} style={styles.subLine}>{formatDate(item.transactionDate)}</Eyebrow>
                    {activeHouseholdId && item.createdByName ? <Eyebrow tone="mute" numberOfLines={1} style={styles.subLine}>{item.createdByName}</Eyebrow> : null}
                  </View>
                  <Money
                    size="md"
                    tone={item.type === 'income' ? 'go' : 'halt'}
                    numberOfLines={1}
                    style={{ flexShrink: 0, marginLeft: 10 }}
                  >
                    {item.type === 'expense' ? '−' : '+'}{formatCurrency(item.amount, item.currency)}
                  </Money>
                </Pressable>
              </SwipeableRow>
            </Animated.View>
            );
          }}
        />
        </WalkView>
        </CopilotStep>
      )}

      <TransactionFormModal visible={open} initial={editing} onDismiss={() => setOpen(false)} />
      <MoveScopeModal visible={!!moveTarget} tx={moveTarget} onDismiss={() => setMoveTarget(null)} />
      <ConfirmDialog
        visible={!!confirm}
        title={t('transactions.deleteTitle')}
        message={t('transactions.deleteDescription')}
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
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: fontFamily.body, paddingVertical: 0 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  subLine: { marginTop: 2 },
  iconBox: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 66, marginRight: 16 },
});
