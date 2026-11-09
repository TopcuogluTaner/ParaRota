// Calm Ledger — ParaRota's mobile palette.
//
// Design intent: a quiet, professional finance app. Surfaces are neutral grays
// (faintly warm in light, near-black in dark) so the eye fixates on amounts and
// status, not decoration. Color is reserved for money + state — emerald for
// positive flow, crimson for negative, amber for warnings, indigo for info.
// No bronze, no parchment, no glass — those were the previous "Cartographic"
// direction and read as ornamental for a finance product.

export const palette = {
  light: {
    // Surfaces — slightly warm off-white so long sessions don't fatigue, but
    // still reads as neutral against accents. `paper` is the elevated card.
    bg: '#FAFAF7',
    bgAlt: '#F4F4EE',
    paper: '#FFFFFF',
    paper2: '#FAFAF7',
    // Üst uygulama çromu (header) — zeminin (#FAFAF7) AYNI sıcak-nötr hue'su, sadece
    // ~%5 koyusu. Aynı R−B=3 sıcaklık dengesi → sarımsı/muddy değil, uyumlu quiet
    // chrome. Dark'ta zeminle aynı (görünür değişiklik yok).
    headerBg: '#EDEDEA',
    // Text — near-black ink with two muted steps. Pure black would read harsh.
    ink: '#0E0E0C',
    inkSoft: '#525250',
    inkMute: '#8A8A87',
    // Borders — hairline for inline separation, strong for grouped containers.
    line: '#E8E8E2',
    lineStrong: '#D4D4CE',
    // Accents — surgical. Same hue family across light/dark so meaning is stable.
    // `*Soft` is the bright sibling used as a secondary fill (sparklines, hero
    // foreground, badge tints). MD3 container fills are derived separately in
    // AppThemeProvider so soft tokens stay readable on both light and dark beds.
    go: '#15803D',         // positive / primary action
    goSoft: '#22C55E',     // bright emerald — readable on light or dark surface
    goGlow: 'rgba(21,128,61,0.10)',
    halt: '#B91C1C',       // negative / destructive
    haltSoft: '#EF4444',
    way: '#B45309',        // pending / caution
    waySoft: '#F59E0B',
    sky: '#1D4ED8',        // info / link
    skySoft: '#3B82F6',
    onAccent: '#FFFFFF',
    // Hero surface — used for inverse panels (dashboard summary, snackbars).
    // Solid near-black, no decoration. Always paired with light foreground.
    heroBg: '#0E0E0C',
    heroFg: '#FAFAF7',
    heroFgSoft: 'rgba(250,250,247,0.78)',
    heroFgMute: 'rgba(250,250,247,0.55)',
    // Yumuşak yükseklik — kartı zemininin üstüne "kaldırır". Cam/parlak değil, sadece
    // çağdaş bir derinlik ipucu (Apple/Linear hissi). Çok düşük opaklık, calm paleti bozmaz.
    cardShadow: '0px 5px 18px rgba(14,14,12,0.085)',
  },
  dark: {
    // True-neutral dark — no blue tint (felt cold), no coffee tint (felt heavy).
    // Five steps of gray give clean elevation: bg < bgAlt < paper < paper2 < line.
    bg: '#0A0A0A',
    bgAlt: '#141414',
    paper: '#171717',
    paper2: '#1F1F1F',
    headerBg: '#0A0A0A',
    ink: '#F5F5F2',
    inkSoft: '#A3A39E',
    inkMute: '#737370',
    line: '#262626',
    lineStrong: '#3A3A3A',
    // Accents are nudged brighter for dark-mode contrast. `*Soft` is the
    // lighter sibling used as foreground on dark hero panels and as sparkline
    // tint — both readable on `paper` and `heroBg` here.
    go: '#22C55E',
    goSoft: '#4ADE80',
    goGlow: 'rgba(34,197,94,0.18)',
    halt: '#EF4444',
    haltSoft: '#FCA5A5',
    way: '#F59E0B',
    waySoft: '#FCD34D',
    sky: '#3B82F6',
    skySoft: '#93C5FD',
    onAccent: '#0A0A0A',
    // Hero in dark goes all the way to pure black so it visibly separates from
    // `paper2` (which it would otherwise match exactly) and reads as a true
    // inverse panel — used for snackbars and the dashboard summary card.
    heroBg: '#000000',
    heroFg: '#F5F5F2',
    heroFgSoft: 'rgba(245,245,242,0.78)',
    heroFgMute: 'rgba(245,245,242,0.55)',
    cardShadow: '0px 8px 22px rgba(0,0,0,0.5)',
  },
} as const;

export type PaletteMode = 'light' | 'dark';
export type PaletteTokens = (typeof palette)[PaletteMode];

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40, 9: 56, 10: 72 } as const;
export const fontFamily = {
  display: 'Fraunces_500Medium',
  displayItalic: 'Fraunces_500Medium_Italic',
  displayBold: 'Fraunces_600SemiBold',
  bodyLight: 'Geist_400Regular',
  body: 'Geist_500Medium',
  bodyBold: 'Geist_600SemiBold',
  mono: 'GeistMono_500Medium',
  monoBold: 'GeistMono_600SemiBold',
} as const;

export type ToneKey = 'go' | 'halt' | 'way' | 'sky' | 'ink';
