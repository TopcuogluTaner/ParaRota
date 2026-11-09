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
import { usePrivacyStore } from '@shared/store/usePrivacyStore';
import { formatCurrency, formatNumber } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useGoldDaysQuery } from '@features/goldDays/api/useGoldDays';
import { GoldDayCreateModal } from '@features/goldDays/components/GoldDayCreateModal';
import type { GoldDayListItemDto } from '@shared/api/types';

const qty = (n: number, hide: boolean) => (hide ? '••' : n % 1 === 0 ? String(n) : formatNumber(n));

export function GoldDaysScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('goldDays');
  const { t: tCommon } = useTranslation('common');
  const router = useRouter();
  const hide = usePrivacyStore((s) => s.hideAmounts);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading, isError, error, refetch, isFetching } = useGoldDaysQuery();

  const contribLabel = (it: GoldDayListItemDto) =>
    it.contributionType === 'gold' ? `${qty(it.contributionAmount, hide)} ${t(`unit_${it.contributionUnit}`)}`
      : it.contributionUnit === 'TRY' ? (hide ? '••••' : formatCurrency(it.contributionAmount)) : `${qty(it.contributionAmount, hide)} ${it.contributionUnit}`;

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
            refreshing={isFetching}
            onRefresh={() => refetch()}
            ListEmptyComponent={isLoading ? null : <EmptyState eyebrow={t('page_eyebrow')} icon="gold" title={t('empty_title')} message={t('empty_hint')} />}
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push(`/(app)/gold-day-detail?id=${item.id}` as never)}
                accessibilityRole="button" accessibilityLabel={item.name}
                style={({ pressed }) => [styles.card, { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow, opacity: pressed ? 0.85 : 1 }]}>
                <View style={styles.cardTop}>
                  <View style={[styles.icon, { backgroundColor: colorAlpha(colors.way, 0.13) }]}>
                    <Icon source={item.contributionType === 'gold' ? 'gold' : 'cash-multiple'} size={20} color={colors.way} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Display size="xs" numberOfLines={1}>{item.name}</Display>
                    <Body size="sm" tone="soft">{contribLabel(item)} · {t('memberCount', { count: item.memberCount })}</Body>
                  </View>
                  {item.status === 'completed' && (
                    <View style={[styles.pill, { backgroundColor: colorAlpha(colors.go, 0.13) }]}>
                      <Body size="xs" weight="bold" style={{ color: colors.go }}>{t('status_completed')}</Body>
                    </View>
                  )}
                </View>
                {/* İlerleme */}
                <View style={[styles.bar, { backgroundColor: colors.line }]}>
                  <View style={{ height: '100%', borderRadius: 999, backgroundColor: colors.way, width: `${Math.round((item.completedMeetings / Math.max(item.memberCount, 1)) * 100)}%` }} />
                </View>
                <View style={styles.cardBottom}>
                  <Body size="sm" tone="soft">{t('progress', { done: item.completedMeetings, total: item.memberCount })}</Body>
                  {item.potValueTry != null && (
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                      <Body size="sm" tone="soft">{t('pot')}:</Body>
                      <Money size="sm" numberOfLines={1}>{formatCurrency(item.potValueTry)}</Money>
                    </View>
                  )}
                </View>
                {item.status === 'active' && item.nextHostName ? (
                  <View style={styles.nextRow}>
                    <Icon source="account-arrow-right-outline" size={15} color={colors.way} />
                    <Body size="sm" weight="bold" style={{ color: colors.way }}>{t('nextHost', { name: item.nextHostName })}</Body>
                  </View>
                ) : null}
              </Pressable>
            )}
          />
        )}
      </View>
      <GoldDayCreateModal visible={createOpen} onDismiss={() => setCreateOpen(false)} onCreated={(id) => { setCreateOpen(false); router.push(`/(app)/gold-day-detail?id=${id}` as never); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  bar: { height: 6, borderRadius: 999, overflow: 'hidden', marginTop: 14 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  nextRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10 },
});
