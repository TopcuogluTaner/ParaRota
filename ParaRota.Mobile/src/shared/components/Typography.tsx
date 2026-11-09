import type { ReactNode } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { Text as RNText, type StyleProp, type TextStyle } from 'react-native';
import { } from 'react-native-paper';
import { fontFamily } from '@shared/theme/tokens';
import { usePrivacyStore } from '@shared/store/usePrivacyStore';
import { maskMoney } from '@shared/lib/maskMoney';

type Tone = 'ink' | 'soft' | 'mute' | 'go' | 'halt' | 'way' | 'sky' | 'onAccent';

function colorFor(tone: Tone | undefined, c: ReturnType<typeof useAppTheme>['colors']): string {
  switch (tone) {
    case 'soft':
      return c.inkSoft;
    case 'mute':
      return c.inkMute;
    case 'go':
      return c.go;
    case 'halt':
      return c.halt;
    case 'way':
      return c.way;
    case 'sky':
      return c.sky;
    case 'onAccent':
      return c.onAccent;
    case 'ink':
    default:
      return c.ink;
  }
}

interface DisplayProps {
  children: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  italic?: boolean;
  bold?: boolean;
  tone?: Tone;
  align?: TextStyle['textAlign'];
  numberOfLines?: number;
  /** Native auto-shrink — uzun başlıklar (ör. büyük tutarlar) dar ekranda taşmaz. */
  adjustsFontSizeToFit?: boolean;
  /** Auto-shrink alt sınırı (0..1, default 0.6). */
  minimumFontScale?: number;
  style?: StyleProp<TextStyle>;
}

const DISPLAY_SIZES = {
  xs: { fontSize: 17, lineHeight: 22 },
  sm: { fontSize: 21, lineHeight: 26 },
  md: { fontSize: 27, lineHeight: 32 },
  lg: { fontSize: 34, lineHeight: 38 },
  xl: { fontSize: 44, lineHeight: 46 },
} as const;

/** Fraunces serif display — for editorial headings. */
export function Display({ children, size = 'md', italic, bold, tone, align, numberOfLines, adjustsFontSizeToFit, minimumFontScale, style }: DisplayProps) {
  const { colors } = useAppTheme();
  const family = italic
    ? fontFamily.displayItalic
    : bold
      ? fontFamily.displayBold
      : fontFamily.display;
  return (
    <RNText
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale ?? (adjustsFontSizeToFit ? 0.6 : undefined)}
      style={[
        {
          fontFamily: family,
          color: colorFor(tone, colors),
          letterSpacing: -0.5,
          textAlign: align,
          ...DISPLAY_SIZES[size],
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

interface EyebrowProps {
  children: ReactNode;
  tone?: Tone;
  align?: TextStyle['textAlign'];
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}

/** Geist Mono uppercase + wide tracking — chapter eyebrow. */
export function Eyebrow({ children, tone = 'mute', align, numberOfLines, style }: EyebrowProps) {
  const { colors } = useAppTheme();
  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: fontFamily.mono,
          color: colorFor(tone, colors),
          fontSize: 10.5,
          letterSpacing: 2.2,
          textTransform: 'uppercase',
          textAlign: align,
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

interface MoneyProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  tone?: Tone;
  align?: TextStyle['textAlign'];
  /** Single-line clipping; pair with `adjustsFontSizeToFit` for auto-shrink. */
  numberOfLines?: number;
  /** Native auto-shrink — uzun bakiye string'leri dar kartlarda taşmaz. */
  adjustsFontSizeToFit?: boolean;
  /** Auto-shrink alt sınırı (0..1, default 0.6). */
  minimumFontScale?: number;
  style?: StyleProp<TextStyle>;
}

const MONEY_SIZES = {
  sm: { fontSize: 13, lineHeight: 18 },
  md: { fontSize: 16, lineHeight: 22 },
  lg: { fontSize: 24, lineHeight: 30 },
  xl: { fontSize: 34, lineHeight: 38 },
} as const;

/** Geist Mono tabular — for money values. Gizlilik modunda (göz ikonu)
    içerik otomatik maskelenir (₺••••) — tüm Money kullanan ekranlar kapsanır. */
export function Money({
  children,
  size = 'md',
  tone,
  align,
  numberOfLines,
  adjustsFontSizeToFit,
  minimumFontScale,
  style,
}: MoneyProps) {
  const { colors } = useAppTheme();
  const hideAmounts = usePrivacyStore((s) => s.hideAmounts);
  const content = !hideAmounts
    ? children
    : typeof children === 'string' || typeof children === 'number'
      ? maskMoney(String(children))
      : '••••';
  return (
    <RNText
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
      minimumFontScale={minimumFontScale ?? (adjustsFontSizeToFit ? 0.6 : undefined)}
      style={[
        {
          fontFamily: fontFamily.monoBold,
          color: colorFor(tone, colors),
          letterSpacing: -0.2,
          textAlign: align,
          ...MONEY_SIZES[size],
        },
        style,
      ]}
    >
      {content}
    </RNText>
  );
}

interface BodyProps {
  children: ReactNode;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  weight?: 'light' | 'medium' | 'bold';
  tone?: Tone;
  align?: TextStyle['textAlign'];
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}

const BODY_SIZES = {
  xs: { fontSize: 11, lineHeight: 16 },
  sm: { fontSize: 13, lineHeight: 18 },
  md: { fontSize: 15, lineHeight: 22 },
  lg: { fontSize: 17, lineHeight: 24 },
} as const;

/** Geist sans body — default reading text. */
export function Body({ children, size = 'md', weight = 'medium', tone, align, numberOfLines, style }: BodyProps) {
  const { colors } = useAppTheme();
  const family = weight === 'light' ? fontFamily.bodyLight : weight === 'bold' ? fontFamily.bodyBold : fontFamily.body;
  return (
    <RNText
      numberOfLines={numberOfLines}
      style={[
        {
          fontFamily: family,
          color: colorFor(tone, colors),
          textAlign: align,
          ...BODY_SIZES[size],
        },
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
