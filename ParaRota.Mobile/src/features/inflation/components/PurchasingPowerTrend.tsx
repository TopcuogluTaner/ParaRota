import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Circle } from 'react-native-svg';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { Eyebrow } from '@shared/components/Typography';
import type { InflationSeriesPointDto } from '@shared/api/types';

interface Props {
  series: InflationSeriesPointDto[];
  /** Yükselen mi (enflasyon, go) yoksa düşen mi (geriye gidiş, way) — eğri tonu. */
  rising: boolean;
  startLabel: string;
  endLabel: string;
  height?: number;
}

const PAD = { top: 12, right: 6, bottom: 6, left: 6 } as const;

/**
 * Alım gücü eğrisi — tutarın zaman içindeki eşdeğerini tek bakışta gösterir.
 * react-native-svg ile gradient dolgulu alan + çizgi + bitiş noktası. Gesture/scrub
 * yok (AreaTrend'in aksine sade): bu ekranda eğri bağlam, sayılar ana bilgi.
 */
export function PurchasingPowerTrend({ series, rising, startLabel, endLabel, height = 120 }: Props) {
  const { colors } = useAppTheme();
  const [width, setWidth] = useState(0);
  const tone = rising ? colors.go : colors.way;

  if (series.length < 2) return null;

  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const values = series.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const n = series.length;

  const xAt = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
  const yAt = (v: number) => PAD.top + innerH - ((v - min) / span) * innerH;

  const pts = series.map((p, i) => ({ x: xAt(i), y: yAt(p.value) }));
  const line = pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(2)} ${pt.y.toFixed(2)}`).join(' ');
  const baselineY = PAD.top + innerH;
  const area = `${line} L ${(PAD.left + innerW).toFixed(2)} ${baselineY.toFixed(2)} L ${PAD.left.toFixed(2)} ${baselineY.toFixed(2)} Z`;
  const last = pts[pts.length - 1];

  return (
    <Animated.View entering={FadeIn.duration(260)}>
      <View
        style={{ height }}
        onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
        accessible={false}
      >
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="ppFill" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={tone} stopOpacity={0.26} />
                <Stop offset="100%" stopColor={tone} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Path d={area} fill="url(#ppFill)" />
            <Path d={line} stroke={tone} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={last.x} cy={last.y} r={3.5} fill={tone} stroke={colors.paper} strokeWidth={1.5} />
          </Svg>
        ) : null}
      </View>
      <View style={styles.axis}>
        <Eyebrow tone="mute">{startLabel}</Eyebrow>
        <Eyebrow tone="mute">{endLabel}</Eyebrow>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 2 },
});
