import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';

import trCommon from './locales/tr/common.json';
import trAuth from './locales/tr/auth.json';
import trNav from './locales/tr/navigation.json';
import trDashboard from './locales/tr/dashboard.json';
import trPages from './locales/tr/pages.json';
import trMocks from './locales/tr/mocks.json';
import trNotif from './locales/tr/notifications.json';
import trHousehold from './locales/tr/household.json';
import trDebts from './locales/tr/debts.json';
import trExports from './locales/tr/exports.json';
import trErrors from './locales/tr/errors.json';

import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enNav from './locales/en/navigation.json';
import enDashboard from './locales/en/dashboard.json';
import enPages from './locales/en/pages.json';
import enMocks from './locales/en/mocks.json';
import enNotif from './locales/en/notifications.json';
import enHousehold from './locales/en/household.json';
import enDebts from './locales/en/debts.json';
import enExports from './locales/en/exports.json';
import enErrors from './locales/en/errors.json';

import arCommon from './locales/ar/common.json';
import arAuth from './locales/ar/auth.json';
import arNav from './locales/ar/navigation.json';
import arDashboard from './locales/ar/dashboard.json';
import arPages from './locales/ar/pages.json';
import arMocks from './locales/ar/mocks.json';
import arNotif from './locales/ar/notifications.json';
import arHousehold from './locales/ar/household.json';
import arDebts from './locales/ar/debts.json';
import arExports from './locales/ar/exports.json';
import arErrors from './locales/ar/errors.json';

import esCommon from './locales/es/common.json';
import esAuth from './locales/es/auth.json';
import esNav from './locales/es/navigation.json';
import esDashboard from './locales/es/dashboard.json';
import esPages from './locales/es/pages.json';
import esMocks from './locales/es/mocks.json';
import esNotif from './locales/es/notifications.json';
import esHousehold from './locales/es/household.json';
import esDebts from './locales/es/debts.json';
import esExports from './locales/es/exports.json';
import esErrors from './locales/es/errors.json';

import deCommon from './locales/de/common.json';
import deAuth from './locales/de/auth.json';
import deNav from './locales/de/navigation.json';
import deDashboard from './locales/de/dashboard.json';
import dePages from './locales/de/pages.json';
import deMocks from './locales/de/mocks.json';
import deNotif from './locales/de/notifications.json';
import deHousehold from './locales/de/household.json';
import deDebts from './locales/de/debts.json';
import deExports from './locales/de/exports.json';
import deErrors from './locales/de/errors.json';

import trInvestments from './locales/tr/investments.json';
import enInvestments from './locales/en/investments.json';
import arInvestments from './locales/ar/investments.json';
import esInvestments from './locales/es/investments.json';
import deInvestments from './locales/de/investments.json';
import trPayroll from './locales/tr/payroll.json';
import enPayroll from './locales/en/payroll.json';
import arPayroll from './locales/ar/payroll.json';
import esPayroll from './locales/es/payroll.json';
import dePayroll from './locales/de/payroll.json';
import trInstallments from './locales/tr/installments.json';
import enInstallments from './locales/en/installments.json';
import arInstallments from './locales/ar/installments.json';
import esInstallments from './locales/es/installments.json';
import deInstallments from './locales/de/installments.json';
import trRent from './locales/tr/rent.json';
import enRent from './locales/en/rent.json';
import arRent from './locales/ar/rent.json';
import esRent from './locales/es/rent.json';
import deRent from './locales/de/rent.json';
import trPaywall from './locales/tr/paywall.json';
import enPaywall from './locales/en/paywall.json';
import arPaywall from './locales/ar/paywall.json';
import esPaywall from './locales/es/paywall.json';
import dePaywall from './locales/de/paywall.json';
import trInflation from './locales/tr/inflation.json';
import enInflation from './locales/en/inflation.json';
import arInflation from './locales/ar/inflation.json';
import esInflation from './locales/es/inflation.json';
import deInflation from './locales/de/inflation.json';
import trCalculators from './locales/tr/calculators.json';
import enCalculators from './locales/en/calculators.json';
import arCalculators from './locales/ar/calculators.json';
import esCalculators from './locales/es/calculators.json';
import deCalculators from './locales/de/calculators.json';
import trLoan from './locales/tr/loan.json';
import enLoan from './locales/en/loan.json';
import arLoan from './locales/ar/loan.json';
import esLoan from './locales/es/loan.json';
import deLoan from './locales/de/loan.json';
import trGoldDays from './locales/tr/goldDays.json';
import enGoldDays from './locales/en/goldDays.json';
import arGoldDays from './locales/ar/goldDays.json';
import esGoldDays from './locales/es/goldDays.json';
import deGoldDays from './locales/de/goldDays.json';
import trPriceAlarms from './locales/tr/priceAlarms.json';
import enPriceAlarms from './locales/en/priceAlarms.json';
import arPriceAlarms from './locales/ar/priceAlarms.json';
import esPriceAlarms from './locales/es/priceAlarms.json';
import dePriceAlarms from './locales/de/priceAlarms.json';
import trSharedPots from './locales/tr/sharedPots.json';
import enSharedPots from './locales/en/sharedPots.json';
import arSharedPots from './locales/ar/sharedPots.json';
import esSharedPots from './locales/es/sharedPots.json';
import deSharedPots from './locales/de/sharedPots.json';

export const SUPPORTED_LANGS = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
] as const;

export type LangCode = (typeof SUPPORTED_LANGS)[number]['code'];
export const RTL_LANGS: LangCode[] = ['ar'];

const LANG_STORAGE_KEY = 'pararota.lang';

function detectInitialLang(): LangCode {
  try {
    const locales = Localization.getLocales();
    const codes = locales.map((l) => (l.languageCode ?? '').toLowerCase());
    for (const c of codes) {
      if (SUPPORTED_LANGS.some((s) => s.code === c)) return c as LangCode;
    }
  } catch {
    /* noop */
  }
  return 'tr';
}

// initReactI18next'i import anında (senkron) bağla — böylece i18next instance'ı
// ilk render'dan önce React'e kayıtlı olur ve "NO_I18NEXT_INSTANCE" uyarısı çıkmaz.
// Kayıtlı dil tercihi (AsyncStorage) sonradan initI18n() içinde uygulanır.
i18n
  .use(initReactI18next)
  .init({
    lng: detectInitialLang(),
    fallbackLng: 'tr',
    supportedLngs: SUPPORTED_LANGS.map((l) => l.code),
    defaultNS: 'common',
    ns: ['common', 'auth', 'navigation', 'dashboard', 'pages', 'mocks', 'notifications', 'household', 'debts', 'exports', 'investments', 'payroll', 'rent', 'installments', 'paywall', 'errors', 'inflation', 'calculators', 'loan', 'goldDays', 'priceAlarms', 'sharedPots'],
    resources: {
      tr: { common: trCommon, auth: trAuth, navigation: trNav, dashboard: trDashboard, pages: trPages, mocks: trMocks, notifications: trNotif, household: trHousehold, debts: trDebts, exports: trExports, investments: trInvestments, payroll: trPayroll, rent: trRent, installments: trInstallments, paywall: trPaywall, errors: trErrors, inflation: trInflation, calculators: trCalculators, loan: trLoan, goldDays: trGoldDays, priceAlarms: trPriceAlarms, sharedPots: trSharedPots },
      en: { common: enCommon, auth: enAuth, navigation: enNav, dashboard: enDashboard, pages: enPages, mocks: enMocks, notifications: enNotif, household: enHousehold, debts: enDebts, exports: enExports, investments: enInvestments, payroll: enPayroll, rent: enRent, installments: enInstallments, paywall: enPaywall, errors: enErrors, inflation: enInflation, calculators: enCalculators, loan: enLoan, goldDays: enGoldDays, priceAlarms: enPriceAlarms, sharedPots: enSharedPots },
      ar: { common: arCommon, auth: arAuth, navigation: arNav, dashboard: arDashboard, pages: arPages, mocks: arMocks, notifications: arNotif, household: arHousehold, debts: arDebts, exports: arExports, investments: arInvestments, payroll: arPayroll, rent: arRent, installments: arInstallments, paywall: arPaywall, errors: arErrors, inflation: arInflation, calculators: arCalculators, loan: arLoan, goldDays: arGoldDays, priceAlarms: arPriceAlarms, sharedPots: arSharedPots },
      es: { common: esCommon, auth: esAuth, navigation: esNav, dashboard: esDashboard, pages: esPages, mocks: esMocks, notifications: esNotif, household: esHousehold, debts: esDebts, exports: esExports, investments: esInvestments, payroll: esPayroll, rent: esRent, installments: esInstallments, paywall: esPaywall, errors: esErrors, inflation: esInflation, calculators: esCalculators, loan: esLoan, goldDays: esGoldDays, priceAlarms: esPriceAlarms, sharedPots: esSharedPots },
      de: { common: deCommon, auth: deAuth, navigation: deNav, dashboard: deDashboard, pages: dePages, mocks: deMocks, notifications: deNotif, household: deHousehold, debts: deDebts, exports: deExports, investments: deInvestments, payroll: dePayroll, rent: deRent, installments: deInstallments, paywall: dePaywall, errors: deErrors, inflation: deInflation, calculators: deCalculators, loan: deLoan, goldDays: deGoldDays, priceAlarms: dePriceAlarms, sharedPots: deSharedPots },
    },
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  })
  .catch(() => undefined);

// RN layout yönü ancak uygulama yeniden başlayınca değişir. Boot'ta yalnız bayraklar
// senkronlanır (reload YOK — Expo Go'da forceRTL kalıcı olmayabilir, reload döngüsü
// riski var); kullanıcı dili elle değiştirdiğinde ise reload beklenen bir davranıştır.
function syncRtlFlags(lng: LangCode): boolean {
  const shouldBeRTL = RTL_LANGS.includes(lng);
  if (I18nManager.isRTL === shouldBeRTL) return false;
  I18nManager.allowRTL(shouldBeRTL);
  I18nManager.forceRTL(shouldBeRTL);
  return true; // yön değişti → uygulanması için restart gerekir
}

export async function initI18n(): Promise<void> {
  let stored: string | null = null;
  try {
    stored = await AsyncStorage.getItem(LANG_STORAGE_KEY);
  } catch {
    /* noop */
  }
  if (stored && SUPPORTED_LANGS.some((s) => s.code === stored) && stored !== i18n.language) {
    await i18n.changeLanguage(stored);
  }
  syncRtlFlags(i18n.language as LangCode);
}

export async function changeLanguage(lng: LangCode): Promise<void> {
  await i18n.changeLanguage(lng);
  try {
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lng);
  } catch {
    /* noop */
  }
  if (syncRtlFlags(lng)) {
    // Arapça ↔ LTR geçişinde arayüz yönü ancak yeniden başlatmayla uygulanır.
    try {
      await Updates.reloadAsync();
    } catch {
      /* dev ortamında reload desteklenmeyebilir — bir sonraki açılışta uygulanır */
    }
  }
}

export default i18n;
