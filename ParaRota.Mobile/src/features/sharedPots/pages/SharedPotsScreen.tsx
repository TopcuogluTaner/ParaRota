import { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { AppHeader } from '@shared/components/AppHeader';
import { ToolbarAddButton } from '@shared/components/ToolbarAddButton';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { Body, Display, Money } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { formatCurrency } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useSharedPotsQuery } from '@features/sharedPots/api/useSharedPots';
import { SharedPotCreateModal } from '@features/sharedPots/components/SharedPotCreateModal';
import type { SharedPotListItemDto } from '@shared/api/types';

export function SharedPotsScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('sharedPots');
  const { t: tCommon } = useTranslation('common');
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, isError, error, refetch, isFetching } = useSharedPotsQuery();

  const balLabel = (it: SharedPotListItemDto) => {
    const bal = it.myBalance ?? null;
    if (bal === null || Math.abs(bal) < 0.01) return { text: t('settled_up'), color: colors.inkMute };
    return { text: `${bal > 0 ? '+' : ''}${formatCurrency(bal)}`, color: bal > 0 ? colors.go : colors.halt };
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('page_title')} />
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingTop: 8 }}>
          <ToolbarAddButton label={t('new')} onPress={() => setCreateOpen(true)} />
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
              <EmptyState eyebrow={t('page_eyebrow')} icon="account-cash-outline" title={t('empty_title')} message={t('empty_hint')} />
            )}
            renderItem={({ item }) => {
              const b = balLabel(item);
              return (
                <Pressable onPress={() => router.push(`/(app)/shared-pot-detail?id=${item.id}` as never)}
                  accessibilityRole="button" accessibilityLabel={item.name}
                  style={({ pressed }) => [styles.card, { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow, opacity: pressed ? 0.85 : 1 }]}>
                  <View style={[styles.icon, { backgroundColor: colorAlpha(colors.sky, 0.13) }]}>
                    <Icon source="account-cash-outline" size={22} color={colors.sky} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Display size="xs" numberOfLines={1}>{item.name}</Display>
                    <Body size="sm" tone="soft">{t('memberCount', { count: item.memberCount })} · {t('totalSpent')}: {formatCurrency(item.totalSpent)}</Body>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Body size="xs" tone="mute">{t('your_balance')}</Body>
                    <Money size="sm" style={{ color: b.color }}>{b.text}</Money>
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>
      <SharedPotCreateModal visible={createOpen} onDismiss={() => setCreateOpen(false)} onCreated={(id) => { setCreateOpen(false); router.push(`/(app)/shared-pot-detail?id=${id}` as never); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
