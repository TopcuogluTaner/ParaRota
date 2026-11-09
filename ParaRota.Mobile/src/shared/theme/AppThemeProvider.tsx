import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider, MD3LightTheme, MD3DarkTheme, configureFonts, useTheme, type MD3Theme } from 'react-native-paper';
import { useThemeStore } from '@shared/store/useThemeStore';
import { palette, fontFamily, type PaletteMode, type PaletteTokens } from './tokens';

const baseFont = {
  fontFamily: fontFamily.body,
  fontWeight: '500' as const,
  letterSpacing: 0,
  lineHeight: 22,
  fontSize: 14,
};

const fonts = configureFonts({
  config: {
    displaySmall: { ...baseFont, fontFamily: fontFamily.display, fontSize: 28, lineHeight: 34, fontWeight: '500' },
    displayMedium: { ...baseFont, fontFamily: fontFamily.display, fontSize: 34, lineHeight: 40, fontWeight: '500' },
    displayLarge: { ...baseFont, fontFamily: fontFamily.displayBold, fontSize: 44, lineHeight: 48, fontWeight: '600' },
    headlineSmall: { ...baseFont, fontFamily: fontFamily.display, fontSize: 22, lineHeight: 28, fontWeight: '500' },
    headlineMedium: { ...baseFont, fontFamily: fontFamily.display, fontSize: 24, lineHeight: 30, fontWeight: '500' },
    headlineLarge: { ...baseFont, fontFamily: fontFamily.display, fontSize: 28, lineHeight: 34, fontWeight: '500' },
    titleSmall: { ...baseFont, fontFamily: fontFamily.bodyBold, fontSize: 13, lineHeight: 18, fontWeight: '600' },
    titleMedium: { ...baseFont, fontFamily: fontFamily.bodyBold, fontSize: 15, lineHeight: 20, fontWeight: '600' },
    titleLarge: { ...baseFont, fontFamily: fontFamily.display, fontSize: 19, lineHeight: 26, fontWeight: '500' },
    labelSmall: {
      ...baseFont,
      fontFamily: fontFamily.mono,
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 1.6,
      fontWeight: '500',
    },
    labelMedium: { ...baseFont, fontFamily: fontFamily.body, fontSize: 12, lineHeight: 16, fontWeight: '500' },
    labelLarge: { ...baseFont, fontFamily: fontFamily.bodyBold, fontSize: 13, lineHeight: 18, fontWeight: '600' },
    bodySmall: { ...baseFont, fontFamily: fontFamily.bodyLight, fontSize: 12, lineHeight: 16, fontWeight: '400' },
    bodyMedium: { ...baseFont, fontFamily: fontFamily.body, fontSize: 14, lineHeight: 20, fontWeight: '500' },
    bodyLarge: { ...baseFont, fontFamily: fontFamily.body, fontSize: 16, lineHeight: 22, fontWeight: '500' },
  },
});

export interface AppColors {
  // Standard MD3 colors
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  inverseSurface: string;
  inverseOnSurface: string;
  shadow: string;
  scrim: string;
  elevation: { level0: string; level1: string; level2: string; level3: string; level4: string; level5: string };
  backdrop: string;
  // ParaRota extended tokens
  bg: string;
  bgAlt: string;
  paper: string;
  paper2: string;
  ink: string;
  inkSoft: string;
  inkMute: string;
  line: string;
  lineStrong: string;
  go: string;
  goSoft: string;
  goGlow: string;
  way: string;
  waySoft: string;
  halt: string;
  haltSoft: string;
  sky: string;
  skySoft: string;
  onAccent: string;
  headerBg: string;
  heroBg: string;
  heroFg: string;
  heroFgSoft: string;
  heroFgMute: string;
  cardShadow: string;
}

export interface AppTheme extends Omit<MD3Theme, 'colors'> {
  colors: AppColors;
}

export function useAppTheme(): AppTheme {
  return useTheme() as unknown as AppTheme;
}

function buildPaperTheme(mode: PaletteMode): MD3Theme {
  const base = mode === 'dark' ? MD3DarkTheme : MD3LightTheme;
  const t: PaletteTokens = palette[mode];
  return {
    ...base,
    fonts,
    roundness: 16,
    colors: {
      ...base.colors,
      // Containers map to a tinted, near-paper surface so MD3 components
      // (Chip, Button mode="elevated", etc.) read calmly instead of shouting
      // with saturated parchment fills. Light = soft tint of the accent on
      // paper; dark = subtle bg-tint slightly above paper2.
      primary: t.go,
      onPrimary: t.onAccent,
      primaryContainer: mode === 'dark' ? t.paper2 : '#DCFCE7',
      onPrimaryContainer: mode === 'dark' ? t.go : t.go,
      secondary: t.way,
      onSecondary: t.onAccent,
      // SegmentedButtons'ın seçili segment dolgusu burayı kullanır. Eski açık-sarı (#FEF3C7)
      // muddy görünüyordu; iOS tarzı SAKİN NÖTR dolgu + ink metin (gelir/gider gibi semantik
      // seçeneklerle çakışmaz). Dark zaten nötr paper2'ydi.
      secondaryContainer: mode === 'dark' ? t.paper2 : '#EAE8E0',
      onSecondaryContainer: t.ink,
      tertiary: t.sky,
      onTertiary: t.onAccent,
      tertiaryContainer: mode === 'dark' ? t.paper2 : '#DBEAFE',
      onTertiaryContainer: mode === 'dark' ? t.sky : t.sky,
      error: t.halt,
      onError: t.onAccent,
      errorContainer: mode === 'dark' ? t.paper2 : '#FEE2E2',
      onErrorContainer: mode === 'dark' ? t.halt : t.halt,
      background: t.bg,
      onBackground: t.ink,
      surface: t.paper,
      onSurface: t.ink,
      surfaceVariant: t.paper2,
      onSurfaceVariant: t.inkSoft,
      outline: t.line,
      outlineVariant: t.line,
      inverseSurface: t.ink,
      inverseOnSurface: t.paper,
      shadow: '#000000',
      scrim: '#000000',
      elevation: {
        level0: 'transparent',
        level1: t.paper,
        level2: t.paper2,
        level3: t.paper2,
        level4: t.paper2,
        level5: t.paper2,
      },
      backdrop: 'rgba(8,9,15,0.45)',
      // Extended Calm Ledger tokens — typed via AppColors / useAppTheme.
      ...({
        bg: t.bg,
        bgAlt: t.bgAlt,
        paper: t.paper,
        paper2: t.paper2,
        ink: t.ink,
        inkSoft: t.inkSoft,
        inkMute: t.inkMute,
        line: t.line,
        lineStrong: t.lineStrong,
        go: t.go,
        goSoft: t.goSoft,
        goGlow: t.goGlow,
        way: t.way,
        waySoft: t.waySoft,
        halt: t.halt,
        haltSoft: t.haltSoft,
        sky: t.sky,
        skySoft: t.skySoft,
        onAccent: t.onAccent,
        headerBg: t.headerBg,
        heroBg: t.heroBg,
        heroFg: t.heroFg,
        heroFgSoft: t.heroFgSoft,
        heroFgMute: t.heroFgMute,
        cardShadow: t.cardShadow,
      } as Record<string, string>),
    },
  } as MD3Theme;
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const mode = useThemeStore((s) => s.mode);
  const effective: PaletteMode = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const theme = useMemo(() => buildPaperTheme(effective), [effective]);
  return <PaperProvider theme={theme}>{children}</PaperProvider>;
}

