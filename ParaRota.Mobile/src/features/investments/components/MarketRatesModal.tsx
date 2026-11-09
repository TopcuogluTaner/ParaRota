import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { AppModal } from '@shared/components/AppModal';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { Body, Eyebrow, Money } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { formatCurrency, formatDate } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useRatesQuery } from '@features/investments/api/useInvestments';
import { ASSET_ICON, ASSET_COLOR, CLASS_ORDER, CLASS_ICON } from '@features/investments/lib/assetMeta';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function MarketRatesModal({ visible, onDismiss }: Props) {
  const { t } = useTranslation('investments');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const { data, isLoading, isError, error, refetch } = useRatesQuery(visible);

  const grouped = useMemo(() => {
    const rates = data ?? [];
    return CLASS_ORDER
      .map((cls) => ({ cls, items: rates.filter((r) => r.assetClass === cls && r.sell != null) }))
      .filter((g) => g.items.length > 0);
  }, [data]);

  const asOf = (data ?? []).find((r) => r.asOf)?.asOf ?? null;

  return (
    <AppModal visible={visible} onDismiss={onDismiss} eyebrow={t('rates_eyebrow')} title={t('rates_title')}>
      {isLoading && !data ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}><ActivityIndicator color={colors.go} /></View>
      ) : isError && !data ? (
        <ErrorState message={getErrorMessage(error, tCommon('error'))} onRetry={() => refetch()} />
      ) : grouped.length === 0 ? (
        <EmptyState icon="chart-line-variant" title={t('rates_empty')} />
      ) : (
        <>
          {asOf ? (
            <Eyebrow tone="mute" style={{ marginBottom: 4 }}>{t('rates_asOf')}: {formatDate(asOf)}</Eyebrow>
          ) : null}
          {grouped.map((g) => (
            <View key={g.cls} style={{ marginTop: 14 }}>
              <View style={styles.sectionHead}>
                <Icon source={CLASS_ICON[g.cls]} size={15} color={colors.inkMute} />
                <Eyebrow tone="mute" style={{ letterSpacing: 1 }}>{t(`cat_${g.cls}`)}</Eyebrow>
              </View>
              <View style={[styles.card, { backgroundColor: colors.paper, borderColor: colors.line }]}>
                {g.items.map((r, i) => {
                  const accent = ASSET_COLOR[r.assetType];
                  const isTefas = r.assetType === 'tefasFund';
                  const label = isTefas ? (r.fundName || r.fundCode || t('asset_tefasFund')) : t(`asset_${r.assetType}`);
                  return (
                    <View
                      key={isTefas ? (r.fundCode ?? r.assetType) : r.assetType}
                      style={[styles.row, i < g.items.length - 1 ? { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth } : null]}
                    >
                      <View style={[styles.icon, { backgroundColor: colorAlpha(accent, 0.14) }]}>
                        <Icon source={ASSET_ICON[r.assetType]} size={17} color={accent} />
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Body weight="bold" numberOfLines={1}>{label}</Body>
                        {isTefas && r.fundCode ? <Eyebrow tone="mute" numberOfLines={1}>{r.fundCode}</Eyebrow> : null}
                      </View>
                      <Money size="sm" tone="ink" numberOfLines={1}>{formatCurrency(r.sell ?? 0)}</Money>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </>
      )}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingLeft: 2 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
