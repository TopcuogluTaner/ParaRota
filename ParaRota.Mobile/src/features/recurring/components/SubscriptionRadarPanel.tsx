import { View, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { Body, Eyebrow, Money } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { formatCurrency, formatDate } from '@shared/lib/dateFormat';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { useSubscriptionRadarQuery } from '@features/recurring/api/useRecurringRules';

/**
 * Abonelik Radarı — Tekrarlayanlar listesinin başında maliyet özeti:
 * aylık/yıllık toplam + aktif adet + üretilen işlemlerden zam tespiti.
 * Veri yoksa (hiç abonelik kuralı yok) sessizce gizlenir.
 *
 * Dar ekran sözleşmesi (360px'e kadar): zam satırı iki katmanlıdır —
 * üstte isim + yüzde pili (isim daralır), altında tutar geçişi. Tek
 * satıra sıkıştırılmaz; taşma yerine sarma tercih edilir.
 */
export function SubscriptionRadarPanel() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('pages');
  const fmt = useMoneyFmt();
  const { data } = useSubscriptionRadarQuery();

  if (!data || data.items.length === 0) return null;

  const primary = data.totals[0];
  const others = data.totals.slice(1);
  const priceChanges = data.items.filter((x) => x.priceChange);

  // "0 duraklatılmış" bilgi taşımaz — yalnız varsa göster. Başlık asla kesilmez.
  const countText = [
    t('recurring.radarActive', { count: data.activeCount }),
    data.pausedCount > 0 ? t('recurring.radarPaused', { count: data.pausedCount }) : null,
  ].filter(Boolean).join(' · ');

  return (
    <View style={[styles.card, { backgroundColor: colors.paper, borderColor: colors.line }]}>
      <View style={styles.headRow}>
        <View style={[styles.iconCircle, { backgroundColor: colorAlpha(colors.sky, 0.12) }]}>
          <Icon source="radar" size={18} color={colors.sky} />
        </View>
        <Eyebrow tone="mute" numberOfLines={1}>
          {t('recurring.radarTitle')}
        </Eyebrow>
        <View style={{ flex: 1, minWidth: 8 }} />
        <Eyebrow tone="mute" numberOfLines={1} style={{ flexShrink: 1 }}>
          {countText}
        </Eyebrow>
      </View>

      {primary ? (
        <View style={styles.totalsRow}>
          <View style={[styles.totalCell, { flexGrow: 1 }]}>
            {/* adjustsFontSizeToFit KULLANMA: flexWrap kapsayıcıda RN ilk ölçümde
                fontu gereksizce %60'a düşürüp bırakabiliyor (aylık tutar minicik
                görünüyordu). Dar ekran güvenliği sarma ile sağlanır. */}
            <View style={styles.amountRow}>
              <Money size="xl" numberOfLines={1}>
                {formatCurrency(primary.monthlyTotal, primary.currency)}
              </Money>
              <Eyebrow tone="mute">{t('recurring.radarPerMonth')}</Eyebrow>
            </View>
          </View>
          <View style={[styles.totalCell, { alignItems: 'flex-end' }]}>
            <Money size="sm" tone="soft" numberOfLines={1}>
              {formatCurrency(primary.yearlyTotal, primary.currency)}
            </Money>
            <Eyebrow tone="mute">{t('recurring.radarPerYear')}</Eyebrow>
          </View>
        </View>
      ) : null}
      {others.length > 0 ? (
        <Body size="xs" tone="mute" style={{ marginTop: 2 }}>
          {others.map((o) => `+ ${fmt(o.monthlyTotal, o.currency)}${t('recurring.radarPerMonth')}`).join(' · ')}
        </Body>
      ) : null}

      {priceChanges.length > 0 ? (
        <View style={[styles.changes, { borderTopColor: colors.line }]}>
          {priceChanges.map((item) => {
            const pc = item.priceChange!;
            const up = pc.percent > 0;
            const tone = up ? colors.way : colors.go;
            return (
              <View key={item.ruleId} style={styles.changeBlock}>
                <View style={styles.changeHead}>
                  <Icon source={up ? 'trending-up' : 'trending-down'} size={16} color={tone} />
                  <Body size="sm" weight="bold" numberOfLines={1} style={styles.changeName}>
                    {item.description}
                  </Body>
                  <View style={[styles.pctPill, { backgroundColor: colorAlpha(tone, 0.12) }]}>
                    <Eyebrow style={{ color: tone }} numberOfLines={1}>
                      {up ? '+' : ''}{pc.percent}%
                    </Eyebrow>
                  </View>
                </View>
                <View style={styles.changeMeta}>
                  <Body size="xs" tone="mute" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {fmt(pc.previousAmount, item.currency)} → {fmt(pc.currentAmount, item.currency)}
                  </Body>
                  <Eyebrow tone="mute">{formatDate(pc.changedAt, 'MMM YYYY')}</Eyebrow>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconCircle: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  totalsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginTop: 2 },
  totalCell: { gap: 2, flexShrink: 1 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  changes: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 10 },
  changeBlock: { gap: 3 },
  changeHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  changeName: { flexShrink: 1, flexGrow: 1 },
  changeMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingLeft: 24 },
  pctPill: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
});
