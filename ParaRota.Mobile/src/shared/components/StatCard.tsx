import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { Icon } from 'react-native-paper';
import { Body, Eyebrow, Money } from './Typography';
import { RouteLine } from './RouteLine';
import { Sparkline } from './charts/Sparkline';
import { colorAlpha } from '@shared/lib/colorAlpha';

type Tone = 'go' | 'halt' | 'way' | 'sky' | 'ink';

interface Props {
  eyebrow: string;
  value: string;
  hint?: string;
  icon?: string;
  tone?: Tone;
  /** index for "ROUTE 01" numbering. 1-based. */
  index?: number;
  sparkline?: number[];
  /**
   * Percent change vs previous period. Positive = green, negative = red,
   * direction is purely numeric — the *meaning* (good/bad) depends on the
   * metric (a +20% rise in expense is bad, but the card just shows the math).
   * `betterDirection` lets the caller flip the color so red/green stays
   * semantically correct.
   */
  trendDelta?: number | null;
  betterDirection?: 'up' | 'down';
}

const TONE_KEY: Record<Tone, 'go' | 'halt' | 'way' | 'sky' | 'ink'> = {
  go: 'go',
  halt: 'halt',
  way: 'way',
  sky: 'sky',
  ink: 'ink',
};

export function StatCard({ eyebrow, value, hint, icon, tone = 'ink', index, sparkline, trendDelta, betterDirection = 'up' }: Props) {
  const { colors } = useAppTheme();
  const { t: tCommon } = useTranslation('common');
  const accent = colors[TONE_KEY[tone]] as string;
  const moneyTone = tone === 'ink' ? 'ink' : tone;
  const stripe = String(index ?? 0).padStart(2, '0');
  const hasTrend = typeof trendDelta === 'number' && Number.isFinite(trendDelta);
  const trendUp = hasTrend && trendDelta! > 0;
  const trendDown = hasTrend && trendDelta! < 0;
  // A rise is "good" when betterDirection is 'up'. For expense cards we flip
  // it: a falling expense is the positive signal.
  const trendIsGood = hasTrend && (
    (betterDirection === 'up' && trendUp) ||
    (betterDirection === 'down' && trendDown)
  );
  const trendIsBad = hasTrend && trendDelta !== 0 && !trendIsGood;
  const trendColor = trendIsGood ? colors.go : trendIsBad ? colors.halt : colors.inkMute;
  const trendArrow = trendUp ? '▲' : trendDown ? '▼' : '·';

  return (
    <View style={[styles.card, { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow }]}>
      <View style={styles.topRow}>
        <View style={[styles.iconBox, { backgroundColor: colorAlpha(accent, 0.13) }]}>
          {icon ? <Icon source={icon} size={18} color={accent} /> : null}
        </View>
        {hasTrend ? (
          <View style={[styles.trendChip, { borderColor: colorAlpha(trendColor, 0.32), backgroundColor: colorAlpha(trendColor, 0.10) }]}>
            <Eyebrow style={{ color: trendColor, letterSpacing: 1 }}>
              {trendArrow} {tCommon('percentValue', { value: Math.abs(trendDelta!).toFixed(0) })}
            </Eyebrow>
          </View>
        ) : index != null ? (
          <Eyebrow tone="mute" style={{ letterSpacing: 2 }}>{`ROUTE ${stripe}`}</Eyebrow>
        ) : null}
      </View>
      <View style={{ marginTop: 14, minWidth: 0 }}>
        <Eyebrow tone="mute" numberOfLines={1}>{eyebrow}</Eyebrow>
        <Money
          size="lg"
          tone={moneyTone}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.55}
          style={{ marginTop: 6 }}
        >
          {value}
        </Money>
        {hint ? <Body size="xs" tone="mute" numberOfLines={1} style={{ marginTop: 6 }}>{hint}</Body> : null}
      </View>
      {sparkline && sparkline.length >= 2 ? (
        <View style={styles.spark}>
          <Sparkline values={sparkline} color={accent} width={160} height={28} />
        </View>
      ) : (
        <RouteLine style={{ marginTop: 12 }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    minHeight: 132,
    // Sparkline (w=160) dar karttan taşmasın diye kırpılır. boxShadow CSS semantiğiyle
    // kutunun DIŞINA çizildiğinden overflow:hidden onu kırpmaz (RN 0.76+).
    overflow: 'hidden',
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  trendChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  spark: { marginTop: 10, alignItems: 'stretch' },
});
