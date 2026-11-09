import { createTheme, type Theme, alpha } from '@mui/material/styles';
import type { ThemeMode } from '@shared/store/useThemeStore';

// ──────────────────────────────────────────────────────────
// "Cartographic Finance" palette — parchment & ink + route signals.
// Mirrors CSS variables in src/index.css so non-MUI styling stays in sync.
// ──────────────────────────────────────────────────────────
const tokens = {
  light: {
    bg: '#F4ECDA',
    bgAlt: '#ECE2C9',
    paper: '#FBF5E5',
    paper2: '#F8EFD8',
    ink: '#1B130A',
    inkSoft: '#4F4537',
    inkMute: '#8A7D67',
    line: '#DCCFB0',
    lineStrong: '#C9B98F',
    go: '#0F8B6C',
    goSoft: '#1FB585',
    way: '#B7651C',
    waySoft: '#D58A36',
    halt: '#B0341E',
    haltSoft: '#D8543B',
    sky: '#1E5F8A',
  },
  dark: {
    bg: '#08090F',
    bgAlt: '#0C0E16',
    paper: '#11141E',
    paper2: '#161A26',
    ink: '#F2E7CC',
    inkSoft: '#C2B496',
    inkMute: '#7B7158',
    line: '#1E2231',
    lineStrong: '#2A2F44',
    go: '#2EC998',
    goSoft: '#5BDFB4',
    way: '#E0A246',
    waySoft: '#F1B96A',
    halt: '#EF6B4F',
    haltSoft: '#F58E76',
    sky: '#5BA3D0',
  },
} as const;

declare module '@mui/material/styles' {
  interface Palette {
    go: Palette['primary'];
    way: Palette['primary'];
    halt: Palette['primary'];
    surface: { paper: string; paperElevated: string; line: string; lineStrong: string };
  }
  interface PaletteOptions {
    go?: PaletteOptions['primary'];
    way?: PaletteOptions['primary'];
    halt?: PaletteOptions['primary'];
    surface?: { paper: string; paperElevated: string; line: string; lineStrong: string };
  }
}

export function getTheme(mode: ThemeMode, direction: 'ltr' | 'rtl' = 'ltr'): Theme {
  const t = mode === 'dark' ? tokens.dark : tokens.light;

  return createTheme({
    direction,
    palette: {
      mode,
      primary: { main: t.go, light: t.goSoft, contrastText: '#FBF5E5' },
      secondary: { main: t.way, light: t.waySoft, contrastText: '#1B130A' },
      success: { main: t.go, light: t.goSoft, contrastText: '#FBF5E5' },
      error: { main: t.halt, light: t.haltSoft, contrastText: '#FBF5E5' },
      warning: { main: t.way, light: t.waySoft, contrastText: '#1B130A' },
      info: { main: t.sky },
      background: { default: t.bg, paper: t.paper },
      text: { primary: t.ink, secondary: t.inkSoft, disabled: t.inkMute },
      divider: t.line,
      go: { main: t.go, light: t.goSoft, contrastText: '#FBF5E5' },
      way: { main: t.way, light: t.waySoft, contrastText: '#1B130A' },
      halt: { main: t.halt, light: t.haltSoft, contrastText: '#FBF5E5' },
      surface: {
        paper: t.paper,
        paperElevated: t.paper2,
        line: t.line,
        lineStrong: t.lineStrong,
      },
    },
    typography: {
      fontFamily: '"Geist", "Inter", system-ui, sans-serif',
      h1: {
        fontFamily: '"Fraunces", "Iowan Old Style", Georgia, serif',
        fontWeight: 600,
        fontSize: '3.2rem',
        letterSpacing: '-0.025em',
        lineHeight: 1.05,
      },
      h2: {
        fontFamily: '"Fraunces", serif',
        fontWeight: 500,
        fontSize: '2.4rem',
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
      },
      h3: {
        fontFamily: '"Fraunces", serif',
        fontWeight: 500,
        fontSize: '1.9rem',
        letterSpacing: '-0.02em',
        lineHeight: 1.15,
      },
      h4: {
        fontFamily: '"Fraunces", serif',
        fontWeight: 500,
        fontSize: '1.5rem',
        letterSpacing: '-0.015em',
        lineHeight: 1.2,
      },
      h5: {
        fontFamily: '"Fraunces", serif',
        fontWeight: 500,
        fontSize: '1.2rem',
        letterSpacing: '-0.01em',
        lineHeight: 1.25,
      },
      h6: {
        fontFamily: '"Geist", sans-serif',
        fontWeight: 600,
        fontSize: '0.95rem',
        letterSpacing: '-0.01em',
      },
      subtitle1: { fontWeight: 600, letterSpacing: '-0.005em' },
      subtitle2: { fontWeight: 600, fontSize: '0.825rem' },
      body1: { fontSize: '0.95rem', lineHeight: 1.55 },
      body2: { fontSize: '0.85rem', lineHeight: 1.5, color: t.inkSoft },
      button: { textTransform: 'none', fontWeight: 600, letterSpacing: 0, fontSize: '0.875rem' },
      caption: {
        fontFamily: '"Geist Mono", ui-monospace, monospace',
        fontSize: '0.72rem',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: t.inkMute,
      },
      overline: {
        fontFamily: '"Geist Mono", ui-monospace, monospace',
        fontSize: '0.7rem',
        letterSpacing: '0.18em',
        fontWeight: 500,
      },
    },
    shape: { borderRadius: 14 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          'html, body': { backgroundColor: t.bg },
          '*::-webkit-scrollbar': { width: 10, height: 10 },
          '*::-webkit-scrollbar-track': { background: 'transparent' },
          '*::-webkit-scrollbar-thumb': {
            background: alpha(t.inkMute, 0.32),
            borderRadius: 999,
            border: '2px solid transparent',
            backgroundClip: 'content-box',
          },
          '*::-webkit-scrollbar-thumb:hover': {
            background: alpha(t.inkMute, 0.55),
            backgroundClip: 'content-box',
          },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            borderRadius: 14,
            border: `1px solid ${t.line}`,
          },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 10,
            paddingInline: 16,
            paddingBlock: 8,
          },
          containedPrimary: {
            background: `linear-gradient(180deg, ${t.goSoft} 0%, ${t.go} 100%)`,
            boxShadow: `inset 0 0 0 1px ${alpha('#000', 0.06)}, 0 1px 1px ${alpha(t.go, 0.5)}`,
            '&:hover': {
              background: `linear-gradient(180deg, ${t.goSoft} 0%, ${t.go} 100%)`,
              filter: 'brightness(1.05)',
            },
          },
          outlined: {
            borderColor: t.lineStrong,
            color: t.ink,
            '&:hover': {
              borderColor: t.go,
              background: alpha(t.go, 0.06),
            },
          },
          text: { color: t.inkSoft, '&:hover': { background: alpha(t.go, 0.06) } },
        },
      },
      MuiTextField: { defaultProps: { variant: 'outlined', size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: alpha(t.paper, 0.6),
            borderRadius: 10,
            '& fieldset': { borderColor: t.line },
            '&:hover fieldset': { borderColor: t.lineStrong },
            '&.Mui-focused fieldset': { borderColor: t.go, borderWidth: 1.5 },
          },
          input: { fontFamily: '"Geist", sans-serif' },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
            fontSize: '0.74rem',
            letterSpacing: 0,
            height: 24,
          },
          // Outlined: parşömen zemin + ince çizgi. Filled chip'lerin kendi
          // renk paletine (primary/success/warning/error) dokunma — aksi halde
          // contrastText üst üste düşüp görünmez kalıyor.
          outlined: {
            border: `1px solid ${t.line}`,
            backgroundColor: alpha(t.paper2, 0.6),
          },
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            color: t.inkSoft,
            borderRadius: 10,
            '&:hover': {
              backgroundColor: alpha(t.go, 0.08),
              color: t.go,
            },
          },
        },
      },
      MuiDivider: { styleOverrides: { root: { borderColor: t.line } } },
      MuiTabs: { styleOverrides: { indicator: { backgroundColor: t.go, height: 2 } } },
      MuiTab: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            color: t.inkSoft,
            '&.Mui-selected': { color: t.ink, fontWeight: 600 },
          },
        },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { backgroundColor: alpha(t.lineStrong, 0.4), borderRadius: 999, height: 6 },
          bar: { borderRadius: 999 },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: t.ink,
            color: t.paper,
            fontSize: '0.74rem',
            fontWeight: 500,
            borderRadius: 6,
            padding: '6px 10px',
          },
          arrow: { color: t.ink },
        },
      },
    },
  });
}
