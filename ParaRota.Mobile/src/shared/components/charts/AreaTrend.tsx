import { useMemo, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Path, Line, G, Circle, Text as SvgText } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, runOnJS } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { usePrivacyStore } from '@shared/store/usePrivacyStore';
import { Eyebrow, Money } from '@shared/components/Typography';
import { fontFamily } from '@shared/theme/tokens';

interface Point {
  monthKey: string;
  income: number;
  expense: number;
}

interface Props {
  data: Point[];
  height?: number;
}

const PAD = { top: 14, right: 14, bottom: 30, left: 10 } as const;

// Y ekseni tavanı "nice" sayıya yuvarlanır ki gridline etiketleri ₺13.742
// gibi anlamsız ara değerler yerine yuvarlak okunsun. Merdiven sık tutuldu
// (1/1.5/2/2.5/3/4/5/6/8/10) — tepe değer tavanın en az ~%62'sine ulaşır,
// eğri grafiğin üst yarısını boş bırakmaz.
const NICE_STEPS = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10] as const;
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nf = NICE_STEPS.find((s) => f <= s) ?? 10;
  return nf * exp;
}

// Gridline etiketleri için kompakt ₺ — K/M kısaltması evrensel finans dili
// (TR "B"=bin EN kullanıcıda billion okunurdu). Ondalık virgülle, .0 atılır.
function compactTRY(v: number): string {
  const fmt = (x: number) => {
    const r = Math.round(x * 10) / 10;
    return (Number.isInteger(r) ? String(r) : r.toFixed(1).replace('.', ','));
  };
  if (v >= 1_000_000) return `₺${fmt(v / 1_000_000)}M`;
  if (v >= 1_000) return `₺${fmt(v / 1_000)}K`;
  return `₺${Math.round(v)}`;
}

// Readout tutarları: akış bağlamında kuruş gürültüdür, tam TL yeter.
const wholeTRY = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 });

// Monotonik kübik interpolasyon (Fritsch–Carlson). Catmull-Rom sert
// düşüşlerde taban çizgisinin ALTINA taşıyordu → gelir negatifmiş gibi
// görünüyordu. Monotonik tanjantlar eğriyi her segmentte uç değerlerin
// arasında tutar; veri ≥ 0 olduğundan eğri asla 0'ın altına inemez.
function smoothPath(pts: { x: number; y: number }[]): string {
  const n = pts.length;
  let path = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1].x - pts[i].x;
    slope[i] = (pts[i + 1].y - pts[i].y) / dx[i];
  }

  // Tanjantlar: uçlarda secant eğimi, içte komşu eğimlerin ortalaması;
  // yerel tepe/dip varsa (işaret değişimi) 0 → overshoot olmaz.
  const m: number[] = new Array(n);
  m[0] = slope[0];
  m[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    m[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const h = a * a + b * b;
    if (h > 9) {
      const tau = 3 / Math.sqrt(h);
      m[i] = tau * a * slope[i];
      m[i + 1] = tau * b * slope[i];
    }
  }

  for (let i = 0; i < n - 1; i++) {
    const c1x = pts[i].x + dx[i] / 3;
    const c1y = pts[i].y + (m[i] * dx[i]) / 3;
    const c2x = pts[i + 1].x - dx[i] / 3;
    const c2y = pts[i + 1].y - (m[i + 1] * dx[i]) / 3;
    path += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${pts[i + 1].x.toFixed(2)} ${pts[i + 1].y.toFixed(2)}`;
  }
  return path;
}

// İki katmanlı akış grafiği: gelir + gider eğrisi, üstte canlı readout.
// Basılı tutup sürükleyince (scrub) imleç aya kilitlenir, readout o ayın
// gelir/gider/net değerlerini gösterir; bırakınca son aya döner (Stocks/
// Health deseni — bayat seçim durumu kalmaz). Dikey scroll'u bozmamak için
// pan yalnızca yatay harekette veya 140ms basılı tutunca aktifleşir.
export function AreaTrend({ data, height = 200 }: Props) {
  const { colors } = useAppTheme();
  // monthKey backend'den çeviri anahtarı gelir (ör. "month_short_jun"); t() ile dile çevrilir.
  const { t } = useTranslation(['common', 'dashboard']);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  // Gizlilik modu: readout'taki Money'ler otomatik maskelenir; Y ekseni ölçek
  // etiketleri ve erişilebilirlik özeti de tutar sızdırmasın diye burada gizlenir.
  const hideAmounts = usePrivacyStore((s) => s.hideAmounts);

  // Tek aylık veri: düz çizgi olarak çizilir (nokta ortada) — boş ekran yerine
  // ilk ayında da kullanıcı bir şey görür.
  const single = data.length === 1;
  const drawn = single ? [data[0], data[0]] : data;
  const n = drawn.length;

  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const rawMax = Math.max(1, ...drawn.flatMap((d) => [d.income, d.expense]));
  const niceMax = niceCeil(rawMax);

  const xDrawn = (i: number) => PAD.left + (n > 1 ? (i / (n - 1)) * innerW : innerW / 2);
  const yAt = (v: number) => PAD.top + innerH - (v / niceMax) * innerH;
  // Veri index'i → ekran x'i (tek ay özel durumunda nokta ortalanır).
  const dataX = (i: number) => (single ? PAD.left + innerW / 2 : xDrawn(i));

  const stepX = n > 1 ? innerW / (n - 1) : innerW;
  const count = data.length;

  const gesture = useMemo(() => {
    const select = (x: number) => {
      if (count < 2 || stepX <= 0) return;
      const i = Math.min(count - 1, Math.max(0, Math.round((x - PAD.left) / stepX)));
      setActive(i);
    };
    const clear = () => setActive(null);
    return Gesture.Pan()
      .maxPointers(1)
      .activateAfterLongPress(140)
      .activeOffsetX([-10, 10])
      .failOffsetY([-16, 16])
      .shouldCancelWhenOutside(false)
      .onStart((e) => {
        runOnJS(select)(e.x);
      })
      .onUpdate((e) => {
        runOnJS(select)(e.x);
      })
      .onFinalize(() => {
        runOnJS(clear)();
      });
  }, [count, stepX]);

  if (count === 0) return null;

  // Aralık 6→3 ay değişince eski index taşabilir; clamp ile güvene al.
  const shownIdx = Math.min(active ?? count - 1, count - 1);
  const shown = data[shownIdx];
  const monthLabel = t(shown.monthKey);

  const incomePts = drawn.map((d, i) => ({ x: xDrawn(i), y: yAt(d.income) }));
  const expensePts = drawn.map((d, i) => ({ x: xDrawn(i), y: yAt(d.expense) }));
  const incomeLine = width > 0 ? smoothPath(incomePts) : '';
  const expenseLine = width > 0 ? smoothPath(expensePts) : '';
  const baselineY = PAD.top + innerH;
  const closeArea = (line: string) =>
    `${line} L ${(PAD.left + innerW).toFixed(2)} ${baselineY.toFixed(2)} L ${PAD.left.toFixed(2)} ${baselineY.toFixed(2)} Z`;

  const a11ySummary = t('dashboard:flow_a11y', {
    month: monthLabel,
    income: hideAmounts ? '••••' : wholeTRY.format(shown.income),
    expense: hideAmounts ? '••••' : wholeTRY.format(shown.expense),
  });

  return (
    <Animated.View entering={FadeIn.duration(220)}>
      {/* Canlı readout — tek satır: solda seçili (yoksa son) ay, sağda o ayın
          gelir/gider değerleri. Net bakiye burada YOK: hemen üstteki hero kart
          zaten gösteriyor, kopyası göz yorardı. Renk noktaları hem açıklama
          hem değer taşır (eski statik legend'ın yerine). */}
      <View style={styles.readout}>
        <Eyebrow tone="mute" numberOfLines={1} style={{ flexShrink: 1 }}>
          {monthLabel}
        </Eyebrow>
        <View style={styles.readoutRows}>
          <View style={styles.readRow}>
            <View style={[styles.readDot, { backgroundColor: colors.go }]} />
            <Eyebrow tone="mute">{t('dashboard:stat_income')}</Eyebrow>
            <Money size="sm">{wholeTRY.format(shown.income)}</Money>
          </View>
          <View style={styles.readRow}>
            <View style={[styles.readDot, { backgroundColor: colors.halt }]} />
            <Eyebrow tone="mute">{t('dashboard:stat_expense')}</Eyebrow>
            <Money size="sm">{wholeTRY.format(shown.expense)}</Money>
          </View>
        </View>
      </View>

      <GestureDetector gesture={gesture}>
        <View
          collapsable={false}
          style={{ height }}
          onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}
          accessible
          accessibilityLabel={a11ySummary}
        >
          {width > 0 ? (
            <Svg width={width} height={height}>
              <Defs>
                <LinearGradient id="atIncomeFill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor={colors.goSoft} stopOpacity={0.5} />
                  <Stop offset="100%" stopColor={colors.goSoft} stopOpacity={0} />
                </LinearGradient>
                <LinearGradient id="atExpenseFill" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor={colors.haltSoft} stopOpacity={0.38} />
                  <Stop offset="100%" stopColor={colors.haltSoft} stopOpacity={0} />
                </LinearGradient>
              </Defs>

              {/* Grid + ölçek etiketleri — büyüklük artık okunur (₺15K, ₺30K…). */}
              {[0.25, 0.5, 0.75].map((p) => {
                const y = PAD.top + innerH * (1 - p);
                return (
                  <G key={p}>
                    <Line
                      x1={PAD.left}
                      x2={width - PAD.right}
                      y1={y}
                      y2={y}
                      stroke={colors.line}
                      strokeWidth={0.6}
                      strokeDasharray="2 4"
                      opacity={0.7}
                    />
                    <SvgText
                      x={PAD.left}
                      y={y - 4}
                      fill={colors.inkMute}
                      fontSize={8.5}
                      fontFamily={fontFamily.mono}
                      opacity={0.85}
                    >
                      {hideAmounts ? '₺•••' : compactTRY(niceMax * p)}
                    </SvgText>
                  </G>
                );
              })}

              {/* Fills + strokes */}
              <Path d={closeArea(expenseLine)} fill="url(#atExpenseFill)" />
              <Path d={closeArea(incomeLine)} fill="url(#atIncomeFill)" />
              <Path d={expenseLine} stroke={colors.halt} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <Path d={incomeLine} stroke={colors.go} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />

              {/* Scrub imleci — yalnızca parmak grafikteyken. */}
              {active !== null ? (
                <Line
                  x1={dataX(shownIdx)}
                  x2={dataX(shownIdx)}
                  y1={PAD.top}
                  y2={baselineY}
                  stroke={colors.lineStrong}
                  strokeWidth={1}
                  opacity={0.9}
                />
              ) : null}

              {/* Ay noktaları — seçili (scrub) ya da boştayken son ay vurgulu:
                  halo + büyük nokta; göz "şu an"a oradan başlar. */}
              {data.map((d, i) => {
                const isShown = i === shownIdx;
                const r = isShown ? 4.5 : 2.75;
                return (
                  <G key={i}>
                    {isShown ? (
                      <>
                        <Circle cx={dataX(i)} cy={yAt(d.income)} r={9} fill={colors.go} opacity={0.16} />
                        <Circle cx={dataX(i)} cy={yAt(d.expense)} r={9} fill={colors.halt} opacity={0.16} />
                      </>
                    ) : null}
                    <Circle cx={dataX(i)} cy={yAt(d.income)} r={r} fill={colors.go} stroke={colors.paper} strokeWidth={isShown ? 1.5 : 1} />
                    <Circle cx={dataX(i)} cy={yAt(d.expense)} r={r} fill={colors.halt} stroke={colors.paper} strokeWidth={isShown ? 1.5 : 1} />
                  </G>
                );
              })}

              {/* Baseline */}
              <Line
                x1={PAD.left}
                y1={baselineY + 0.5}
                x2={width - PAD.right}
                y2={baselineY + 0.5}
                stroke={colors.lineStrong}
                strokeWidth={0.8}
              />

              {/* X ekseni — seçili/son ay koyu+kalın; açık veren aylar (gider >
                  gelir) kırmızı etiketle işaretlenir: renk burada durum anlatır. */}
              {data.map((d, i) => {
                const isShown = i === shownIdx;
                const deficit = d.expense > d.income;
                return (
                  <SvgText
                    key={`x${i}`}
                    x={dataX(i)}
                    y={height - 6}
                    fill={isShown ? (deficit ? colors.halt : colors.ink) : deficit ? colors.halt : colors.inkMute}
                    fontSize={9}
                    fontFamily={isShown ? fontFamily.monoBold : fontFamily.mono}
                    textAnchor="middle"
                    letterSpacing="1.2"
                  >
                    {t(d.monthKey).toLocaleUpperCase('tr-TR')}
                  </SvgText>
                );
              })}
            </Svg>
          ) : null}
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Tek satır; çok uzun tutarlarda (milyonlar) satır kibarca alta kırılır.
  readout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10, paddingHorizontal: 2 },
  readoutRows: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  readRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  readDot: { width: 7, height: 7, borderRadius: 999 },
});
