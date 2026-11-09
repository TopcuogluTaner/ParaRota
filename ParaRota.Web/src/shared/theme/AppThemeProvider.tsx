import type { ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { prefixer } from 'stylis';
import rtlPlugin from 'stylis-plugin-rtl';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@shared/store/useThemeStore';
import { RTL_LANGS, type LangCode } from '@shared/i18n';
import { getTheme } from './theme';

// RTL emotion cache: stylis-plugin-rtl fiziksel CSS'i (margin/padding-left↔right, left/right,
// text-align, float, translateX) Arapça'da AYNALAR. MUI'da yalnız theme.direction='rtl' yetmez —
// fiziksel sx/styled kuralları bu plugin olmadan çevrilmez. prepend:true → MUI stilleri head'in
// başına. SADECE RTL'de sarmalıyoruz: LTR (tr/en/es/de) varsayılan emotion cache'iyle aynen kalır
// (birincil dil Türkçe'ye sıfır risk).
const rtlCache = createCache({ key: 'mui-rtl', prepend: true, stylisPlugins: [prefixer, rtlPlugin] });

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const mode = useThemeStore((s) => s.mode);
  const { i18n } = useTranslation();
  const lang = (i18n.language?.split(/[-_]/)[0] ?? 'tr') as LangCode;
  const direction: 'ltr' | 'rtl' = (RTL_LANGS as string[]).includes(lang) ? 'rtl' : 'ltr';

  const theme = useMemo(() => getTheme(mode, direction), [mode, direction]);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
  }, [mode]);

  const content = <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>;

  return direction === 'rtl'
    ? <CacheProvider value={rtlCache}>{content}</CacheProvider>
    : content;
}
