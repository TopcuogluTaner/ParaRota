import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import 'dayjs/locale/tr';
import 'dayjs/locale/en';
import 'dayjs/locale/ar';
import 'dayjs/locale/es';
import 'dayjs/locale/de';
import { RTL_LANGS, type LangCode } from './index';

const FALLBACK: LangCode = 'tr';

function normalize(lng: string | undefined): LangCode {
  if (!lng) return FALLBACK;
  const short = lng.toLowerCase().split(/[-_]/)[0];
  return (['tr', 'en', 'ar', 'es', 'de'].includes(short) ? short : FALLBACK) as LangCode;
}

/**
 * Side-effects that follow the active i18n language:
 *   - dayjs locale (date formatting in the user's language)
 *   - document.dir = 'rtl' for Arabic; 'ltr' otherwise
 *   - document.documentElement.lang
 */
export function useLocaleSync() {
  const { i18n } = useTranslation();

  useEffect(() => {
    const code = normalize(i18n.language);
    dayjs.locale(code);
    document.documentElement.lang = code;
    document.documentElement.dir = (RTL_LANGS as string[]).includes(code) ? 'rtl' : 'ltr';
  }, [i18n.language]);
}
