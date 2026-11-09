import { View, StyleSheet, Pressable, type GestureResponderEvent } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import Svg, { Defs, LinearGradient, Stop, Rect, Line, G, Circle } from 'react-native-svg';
import { } from 'react-native-paper';
import { Eyebrow, Money } from '@shared/components/Typography';

interface Point {
  monthKey: string;
  income: number;
  expense: number;
}

interface Props {
  data: Point[];
  height?: number;
}

/** Dual-bar trend chart with parchment grid lines. */
export function TrendBars({ data, height = 168 }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation(['common', 'dashboard']);
  const padding = { top: 16, right: 8, bottom: 22, left: 8 };
  const width = 320;
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  const groupW = innerW / Math.max(1, data.length);
  const barW = Math.min(14, groupW * 0.35);

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
        <Defs>
          <LinearGradient id="goGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.goSoft} />
            <Stop offset="100%" stopColor={colors.go} />
          </LinearGradient>
          <LinearGradient id="haltGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={colors.haltSoft} />
            <Stop offset="100%" stopColor={colors.halt} />
          </LinearGradient>
        </Defs>
        {[0.25, 0.5, 0.75, 1].map((p, i) => (
          <Line
            key={i}
            x1={padding.left}
            y1={padding.top + innerH * (1 - p)}
            x2={width - padding.right}
            y2={padding.top + innerH * (1 - p)}
            stroke={colors.line}
            strokeWidth={0.6}
            strokeDasharray="2 4"
            opacity={0.6}
          />
        ))}
        {data.map((d, i) => {
          const cx = padding.left + groupW * i + groupW / 2;
          const incomeH = (d.income / max) * innerH;
          const expenseH = (d.expense / max) * innerH;
          return (
            <G key={i}>
              <Rect x={cx - barW - 1} y={padding.top + innerH - incomeH} width={barW} height={Math.max(2, incomeH)} rx={3} fill="url(#goGrad)" />
              <Rect x={cx + 1} y={padding.top + innerH - expenseH} width={barW} height={Math.max(2, expenseH)} rx={3} fill="url(#haltGrad)" />
            </G>
          );
        })}
        <Line
          x1={padding.left}
          y1={padding.top + innerH + 0.5}
          x2={width - padding.right}
          y2={padding.top + innerH + 0.5}
          stroke={colors.lineStrong}
          strokeWidth={0.8}
        />
      </Svg>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Eyebrow tone="mute">{t(d.monthKey).toLocaleUpperCase('tr-TR')}</Eyebrow>
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.go }]} />
          <Eyebrow tone="mute">{t('dashboard:stat_income')}</Eyebrow>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.halt }]} />
          <Eyebrow tone="mute">{t('dashboard:stat_expense')}</Eyebrow>
        </View>
      </View>
    </View>
  );
}

interface RingProps {
  value: number;
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  caption?: string;
  centerValue?: string;
}

/** Concentric "savings dial" — dashed track + solid arc + tabular center. */
export function RingProgress({ value, size = 128, thickness = 10, color, trackColor, caption, centerValue }: RingProps) {
  const { colors } = useAppTheme();
  const stroke = color ?? colors.go;
  const track = trackColor ?? colors.line;
  const v = Math.max(0, Math.min(1, value));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - v);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={size / 2} originY={size / 2}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={track} strokeWidth={thickness} fill="none" strokeDasharray="2 5" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={stroke}
            strokeWidth={thickness}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
          />
        </G>
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        {centerValue ? <Money size="xl" tone="ink">{centerValue}</Money> : null}
        {caption ? <Eyebrow tone="mute" style={{ marginTop: 4 }}>{caption}</Eyebrow> : null}
      </View>
    </View>
  );
}

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  /** Highlighted slice. When set, that slice grows + thickens and others dim. */
  selectedIndex?: number | null;
  /** Called when a slice is tapped. Tap again on the same slice deselects. */
  onSlicePress?: (index: number) => void;
  /** Called when the empty center is tapped — used to clear the selection. */
  onClear?: () => void;
}

// Donut chart with optional tap-to-focus interaction. The selected slice
// grows by a few px and gains thickness; the rest fade back so the focus
// reads clearly. The center label/value is owned by the caller — it stays in
// sync by reading the same selectedIndex.
export function DonutChart({ data, size = 156, thickness = 22, centerLabel, centerValue, selectedIndex = null, onSlicePress, onClear }: DonutProps) {
  const { colors } = useAppTheme();
  // The active slice draws on a slightly larger radius so it sits proud of
  // the rest of the ring; padding leaves room for the extra thickness.
  const FOCUS_DR = 4;
  const FOCUS_THICK = 6;
  const padding = FOCUS_DR + FOCUS_THICK / 2 + 2;
  const radius = (size - thickness) / 2 - padding;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const total = data.reduce((sum, s) => sum + s.value, 0) || 1;
  const hasSelection = selectedIndex !== null && selectedIndex !== undefined;
  let acc = 0;

  // Dokunmayı açıdan hesapla: SVG transparent stroke'lar ScrollView içinde ilk
  // dokunuşu kaçırıyordu. Normal bir Pressable overlay'i ilk dokunuşta çalışır
  // ve dilimin tüm halka kalınlığı tıklanabilir olur (ince ark yerine).
  const handlePress = (e: GestureResponderEvent) => {
    if (!onSlicePress) return;
    const { locationX, locationY } = e.nativeEvent;
    const dx = locationX - cx;
    const dy = locationY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const reach = (thickness + FOCUS_THICK) / 2 + 12;
    if (dist < radius - reach) {
      onClear?.(); // merkez deliğe dokunmak seçimi temizler ("Tümü")
      return;
    }
    if (dist > radius + reach) return; // halka dışına basıldı
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90; // 0 = üst, saat yönü
    if (angle < 0) angle += 360;
    let sweep = 0;
    for (let i = 0; i < data.length; i++) {
      const frac = (data[i].value / total) * 360;
      if (angle >= sweep && angle < sweep + frac) {
        onSlicePress(i);
        return;
      }
      sweep += frac;
    }
  };

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <G rotation={-90} originX={cx} originY={cy}>
          <Circle cx={cx} cy={cy} r={radius} stroke={colors.line} strokeWidth={thickness} fill="none" />
          {data.map((slice, i) => {
            const fraction = slice.value / total;
            const dash = fraction * circumference;
            const gap = circumference - dash;
            const rotation = (acc / total) * 360;
            acc += slice.value;
            const isOn = hasSelection && selectedIndex === i;
            const r = isOn ? radius + FOCUS_DR : radius;
            const c = 2 * Math.PI * r;
            const d = fraction * c;
            const g = c - d;
            return (
              <G key={i} rotation={rotation} originX={cx} originY={cy}>
                <Circle
                  cx={cx}
                  cy={cy}
                  r={r}
                  stroke={slice.color}
                  strokeWidth={isOn ? thickness + FOCUS_THICK : thickness}
                  fill="none"
                  strokeDasharray={`${Math.max(0, d - 2)} ${g + 2}`}
                  strokeLinecap="butt"
                  opacity={hasSelection && !isOn ? 0.35 : 1}
                />
              </G>
            );
          })}
        </G>
      </Svg>
      {onSlicePress ? (
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={handlePress}
          accessibilityRole="button"
        />
      ) : null}
      <View pointerEvents="none" style={{ position: 'absolute', alignItems: 'center', width: size - thickness * 2 - 16 }}>
        {centerValue ? (
          <Money size="md" tone="ink" align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}>
            {centerValue}
          </Money>
        ) : null}
        {centerLabel ? <Eyebrow tone="mute" align="center" style={{ marginTop: 4 }} numberOfLines={1}>{centerLabel}</Eyebrow> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', marginTop: 4 },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: 18, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 999 },
});
