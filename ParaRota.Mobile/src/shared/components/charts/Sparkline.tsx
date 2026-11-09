import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface Props {
  values: number[];
  color: string;
  /** Logical viewBox width — etkilemez görsel boyutu; path matematiği için. SVG 100% genişlikte çizilir. */
  width?: number;
  height?: number;
}

/**
 * Minimal inline sparkline — smooth area under a monotone-cubic curve.
 * SVG, kapsayıcı genişliğin %100'ünde çizilir; `width` propsu yalnızca
 * viewBox/path matematiği için kullanılır (preserveAspectRatio="none"
 * ile yatay olarak esnetilir). Bu sayede dar StatCard'larda taşma olmaz.
 */
export function Sparkline({ values, color, width = 120, height = 36 }: Props) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = Math.max(1, max - min);
  const xAt = (i: number) => (i / (values.length - 1)) * width;
  const yAt = (v: number) => height - ((v - min) / range) * (height - 4) - 2;

  let path = `M ${xAt(0).toFixed(2)} ${yAt(values[0]).toFixed(2)}`;
  for (let i = 0; i < values.length - 1; i++) {
    const p0 = { x: xAt(Math.max(0, i - 1)), y: yAt(values[Math.max(0, i - 1)]) };
    const p1 = { x: xAt(i), y: yAt(values[i]) };
    const p2 = { x: xAt(i + 1), y: yAt(values[i + 1]) };
    const p3 = { x: xAt(Math.min(values.length - 1, i + 2)), y: yAt(values[Math.min(values.length - 1, i + 2)]) };
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    path += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  const area = `${path} L ${width} ${height} L 0 ${height} Z`;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <Defs>
        <LinearGradient id={`sparkFill-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <Stop offset="100%" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill={`url(#sparkFill-${color.replace('#', '')})`} />
      <Path d={path} stroke={color} strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
