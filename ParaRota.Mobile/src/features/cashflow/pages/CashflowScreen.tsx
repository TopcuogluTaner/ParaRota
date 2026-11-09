import { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, FlatList } from 'react-native';
import { ActivityIndicator, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { AppHeader } from '@shared/components/AppHeader';
import { Screen } from '@shared/components/Screen';
import { Body, Eyebrow, Money } from '@shared/components/Typography';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { dayjs, formatCurrency, formatDate } from '@shared/lib/dateFormat';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { useCashflowQuery } from '@features/dashboard/api/useDashboard';
import type { CashflowItemDto } from '@shared/api/types';

/**
 * Nakit Akışı takvimi: ay grid'i üzerinde planlanan tekrarlayan akışlar
 * (yeşil nokta = gelir, kırmızı = gider), güne dokununca o günün kalemleri.
 * Seçim deseni: sticky seçim + "Tümü" reset pill (ürün sözleşmesi).
 * Dar ekran: takvim hücreleri ekrana orantılı (flex), sabit genişlik yok.
 */
export function CashflowScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('pages');
  const { t: tCommon } = useTranslation('common');
  const fmt = useMoneyFmt();
  const { data, isLoading, isError, error, refetch } = useCashflowQuery();
  const [selectedDay, setSelectedDay] = useState<string | null>(null); // 'YYYY-MM-DD'

  const monthStart = data ? dayjs(data.monthStart) : dayjs().startOf('month');
  const daysInMonth = monthStart.daysInMonth();
  const today = dayjs().format('YYYY-MM-DD');

  // Gün → kalemler haritası (tek geçiş).
  const byDay = useMemo(() => {
    const map = new Map<string, CashflowItemDto[]>();
    for (const item of data?.items ?? []) {
      const key = dayjs(item.date).format('YYYY-MM-DD');
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [data?.items]);

  // Gün anahtarı tek yerde (byDay) üretilir; seçim filtrelemesi oradan okunur.
  const visibleItems = selectedDay ? (byDay.get(selectedDay) ?? []) : (data?.items ?? []);

  // Pazartesi başlangıçlı grid: ayın ilk gününün hafta içi ofseti + gün hücreleri.
  const cells = useMemo(() => {
    const startOffset = (monthStart.day() + 6) % 7;
    const list: (number | null)[] = Array.from({ length: startOffset }, () => null);
    for (let d = 1; d <= daysInMonth; d++) list.push(d);
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [monthStart, daysInMonth]);

  const weekdayLabels = useMemo(
    () => Array.from({ length: 7 }, (_, i) => dayjs().day((i + 1) % 7).format('dd')),
    [],
  );

  const positive = (data?.projectedNet ?? 0) >= 0;
  const tone = positive ? colors.go : colors.halt;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader eyebrow={t('cashflow.eyebrow')} title={t('cashflow.title')} back />
      {/* Üç durum ayrı: yüklenirken spinner (EmptyState flaşı olmasın); veri var ama hiç
          akış/gerçekleşen yoksa boş durum; aksi halde özet HER ZAMAN görünür (planlanan
          kalem kalmasa bile tahmin/gerçekleşen anlamlıdır). */}
      {isError && !data ? (
        // API düşünce sonsuz spinner yerine hata + tekrar dene.
        <ErrorState message={getErrorMessage(error, tCommon('error'))} onRetry={() => refetch()} />
      ) : isLoading || !data ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.go} />
        </View>
      ) : data.items.length === 0 && data.actualIncome === 0 && data.actualExpense === 0 ? (
        <EmptyState icon="chart-timeline-variant" title={t('cashflow.emptyTitle')} message={t('cashflow.emptyDescription')} />
      ) : (
        <Screen contentStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 40 }}>
          {/* Özet: tahmin kahraman, kırılım sessiz */}
          <View style={[styles.summary, { backgroundColor: colors.paper, borderColor: colors.line }]}>
            <Eyebrow tone="mute">{t('cashflow.projected', { date: formatDate(data.monthEnd, 'D MMMM') })}</Eyebrow>
            <Money size="xl" numberOfLines={1} style={{ color: tone, marginTop: 4 }}>
              {positive ? '+' : '−'}{formatCurrency(Math.abs(data.projectedNet))}
            </Money>
            <View style={styles.breakdownRow}>
              <View style={styles.breakdownCell}>
                <Eyebrow tone="mute">{t('cashflow.actualNet')}</Eyebrow>
                <Money size="sm">{fmt(data.actualNet)}</Money>
              </View>
              <View style={styles.breakdownCell}>
                <Eyebrow tone="mute">{t('cashflow.plannedIncome')}</Eyebrow>
                <Money size="sm" style={{ color: colors.go }}>+{fmt(data.plannedIncome)}</Money>
              </View>
              <View style={styles.breakdownCell}>
                <Eyebrow tone="mute">{t('cashflow.plannedExpense')}</Eyebrow>
                <Money size="sm" style={{ color: colors.halt }}>−{fmt(data.plannedExpense)}</Money>
              </View>
            </View>
          </View>

          {/* Takvim */}
          <View style={[styles.calendar, { backgroundColor: colors.paper, borderColor: colors.line }]}>
            <View style={styles.weekRow}>
              {weekdayLabels.map((w) => (
                <Eyebrow key={w} tone="mute" align="center" style={styles.weekday}>{w}</Eyebrow>
              ))}
            </View>
            <View style={styles.daysWrap}>
              {cells.map((day, idx) => {
                if (day === null) return <View key={`e${idx}`} style={styles.dayCell} />;
                const key = monthStart.date(day).format('YYYY-MM-DD');
                const items = byDay.get(key);
                const isSelected = selectedDay === key;
                const isToday = key === today;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelectedDay(isSelected ? null : key)}
                    disabled={!items}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={formatDate(key, 'D MMMM')}
                    style={[
                      styles.dayCell,
                      isSelected && { backgroundColor: colorAlpha(colors.sky, 0.14), borderRadius: 10 },
                    ]}
                  >
                    <Body
                      size="sm"
                      weight={isToday ? 'bold' : 'medium'}
                      tone={items ? 'ink' : 'mute'}
                      style={isToday ? { color: colors.sky } : undefined}
                    >
                      {day}
                    </Body>
                    <View style={styles.dotRow}>
                      {items?.some((i) => i.type === 'income') ? <View style={[styles.dot, { backgroundColor: colors.go }]} /> : null}
                      {items?.some((i) => i.type === 'expense') ? <View style={[styles.dot, { backgroundColor: colors.halt }]} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Liste başlığı + reset pill */}
          <View style={styles.listHead}>
            <Eyebrow tone="mute">
              {selectedDay ? formatDate(selectedDay, 'D MMMM dddd') : t('cashflow.upcomingAll')}
            </Eyebrow>
            {selectedDay ? (
              <Pressable
                onPress={() => setSelectedDay(null)}
                accessibilityRole="button"
                style={[styles.resetPill, { borderColor: colors.line }]}
              >
                <Eyebrow tone="mute">{t('cashflow.showAll')}</Eyebrow>
              </Pressable>
            ) : null}
          </View>

          <FlatList
            data={visibleItems}
            scrollEnabled={false}
            keyExtractor={(it, i) => `${it.ruleId}-${it.date}-${i}`}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            ListEmptyComponent={<Body size="sm" tone="mute">{t('cashflow.dayEmpty')}</Body>}
            renderItem={({ item }) => {
              const isIncome = item.type === 'income';
              const itemTone = isIncome ? colors.go : colors.halt;
              return (
                <View style={[styles.itemRow, { backgroundColor: colors.paper, borderColor: colors.line }]}>
                  <View style={[styles.itemIcon, { backgroundColor: colorAlpha(itemTone, 0.12) }]}>
                    <Icon source={isIncome ? 'arrow-bottom-left' : 'arrow-top-right'} size={16} color={itemTone} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Body size="sm" weight="bold" numberOfLines={1}>{item.description}</Body>
                    <Eyebrow tone="mute">{formatDate(item.date, 'D MMMM dddd')}</Eyebrow>
                  </View>
                  <Money size="sm" style={{ color: itemTone }}>
                    {isIncome ? '+' : '−'}{fmt(item.amount, item.currency)}
                  </Money>
                </View>
              );
            }}
          />
        </Screen>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  breakdownRow: { flexDirection: 'row', gap: 18, marginTop: 12, flexWrap: 'wrap' },
  breakdownCell: { gap: 2 },
  calendar: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 10, marginTop: 14 },
  weekRow: { flexDirection: 'row' },
  weekday: { flex: 1 },
  daysWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  // 100/7 ≈ %14.28 — hücreler ekrana orantılı, sabit genişlik yok (dar ekran güvenliği).
  dayCell: { width: '14.28%', alignItems: 'center', paddingVertical: 7, gap: 3 },
  dotRow: { flexDirection: 'row', gap: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
  resetPill: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 12,
  },
  itemIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
