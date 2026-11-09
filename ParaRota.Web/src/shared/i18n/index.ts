import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

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
import trPaywall from './locales/tr/paywall.json';
import enPaywall from './locales/en/paywall.json';
import arPaywall from './locales/ar/paywall.json';
import esPaywall from './locales/es/paywall.json';
import dePaywall from './locales/de/paywall.json';
import trOnboarding from './locales/tr/onboarding.json';
import enOnboarding from './locales/en/onboarding.json';
import arOnboarding from './locales/ar/onboarding.json';
import esOnboarding from './locales/es/onboarding.json';
import deOnboarding from './locales/de/onboarding.json';
import trInstallments from './locales/tr/installments.json';
import enInstallments from './locales/en/installments.json';
import arInstallments from './locales/ar/installments.json';
import esInstallments from './locales/es/installments.json';
import deInstallments from './locales/de/installments.json';
import trPayroll from './locales/tr/payroll.json';
import enPayroll from './locales/en/payroll.json';
import arPayroll from './locales/ar/payroll.json';
import esPayroll from './locales/es/payroll.json';
import dePayroll from './locales/de/payroll.json';
import trRent from './locales/tr/rent.json';
import enRent from './locales/en/rent.json';
import arRent from './locales/ar/rent.json';
import esRent from './locales/es/rent.json';
import deRent from './locales/de/rent.json';
import trAi from './locales/tr/ai.json';
import enAi from './locales/en/ai.json';
import arAi from './locales/ar/ai.json';
import esAi from './locales/es/ai.json';
import deAi from './locales/de/ai.json';
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
import trLegal from './locales/tr/legal.json';
import enLegal from './locales/en/legal.json';
import arLegal from './locales/ar/legal.json';
import esLegal from './locales/es/legal.json';
import deLegal from './locales/de/legal.json';

// flag → Iconify ikon adı (circle-flags koleksiyonu). Emoji bayraklar Windows'ta
// glyph eksikliğinden "TR"/kutu olarak render oluyordu; SVG ikon her platformda çalışır.
export const SUPPORTED_LANGS = [
  { code: 'tr', label: 'Türkçe', flag: 'circle-flags:tr' },
  { code: 'en', label: 'English', flag: 'circle-flags:gb' },
  { code: 'ar', label: 'العربية', flag: 'circle-flags:sa' },
  { code: 'es', label: 'Español', flag: 'circle-flags:es' },
  { code: 'de', label: 'Deutsch', flag: 'circle-flags:de' },
] as const;

export type LangCode = (typeof SUPPORTED_LANGS)[number]['code'];

export const RTL_LANGS: LangCode[] = ['ar'];

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'tr',
    supportedLngs: SUPPORTED_LANGS.map((l) => l.code),
    defaultNS: 'common',
    ns: ['common', 'auth', 'navigation', 'dashboard', 'pages', 'mocks', 'notifications', 'household', 'debts', 'exports', 'investments', 'paywall', 'errors', 'onboarding', 'installments', 'payroll', 'rent', 'ai', 'inflation', 'calculators', 'loan', 'goldDays', 'priceAlarms', 'sharedPots', 'legal'],
    resources: {
      tr: { common: trCommon, auth: trAuth, navigation: trNav, dashboard: trDashboard, pages: trPages, mocks: trMocks, notifications: trNotif, household: trHousehold, debts: trDebts, exports: trExports, investments: trInvestments, paywall: trPaywall, errors: trErrors, onboarding: trOnboarding, installments: trInstallments, payroll: trPayroll, rent: trRent, ai: trAi, inflation: trInflation, calculators: trCalculators, loan: trLoan, goldDays: trGoldDays, priceAlarms: trPriceAlarms, sharedPots: trSharedPots, legal: trLegal },
      en: { common: enCommon, auth: enAuth, navigation: enNav, dashboard: enDashboard, pages: enPages, mocks: enMocks, notifications: enNotif, household: enHousehold, debts: enDebts, exports: enExports, investments: enInvestments, paywall: enPaywall, errors: enErrors, onboarding: enOnboarding, installments: enInstallments, payroll: enPayroll, rent: enRent, ai: enAi, inflation: enInflation, calculators: enCalculators, loan: enLoan, goldDays: enGoldDays, priceAlarms: enPriceAlarms, sharedPots: enSharedPots, legal: enLegal },
      ar: { common: arCommon, auth: arAuth, navigation: arNav, dashboard: arDashboard, pages: arPages, mocks: arMocks, notifications: arNotif, household: arHousehold, debts: arDebts, exports: arExports, investments: arInvestments, paywall: arPaywall, errors: arErrors, onboarding: arOnboarding, installments: arInstallments, payroll: arPayroll, rent: arRent, ai: arAi, inflation: arInflation, calculators: arCalculators, loan: arLoan, goldDays: arGoldDays, priceAlarms: arPriceAlarms, sharedPots: arSharedPots, legal: arLegal },
      es: { common: esCommon, auth: esAuth, navigation: esNav, dashboard: esDashboard, pages: esPages, mocks: esMocks, notifications: esNotif, household: esHousehold, debts: esDebts, exports: esExports, investments: esInvestments, paywall: esPaywall, errors: esErrors, onboarding: esOnboarding, installments: esInstallments, payroll: esPayroll, rent: esRent, ai: esAi, inflation: esInflation, calculators: esCalculators, loan: esLoan, goldDays: esGoldDays, priceAlarms: esPriceAlarms, sharedPots: esSharedPots, legal: esLegal },
      de: { common: deCommon, auth: deAuth, navigation: deNav, dashboard: deDashboard, pages: dePages, mocks: deMocks, notifications: deNotif, household: deHousehold, debts: deDebts, exports: deExports, investments: deInvestments, paywall: dePaywall, errors: deErrors, onboarding: deOnboarding, installments: deInstallments, payroll: dePayroll, rent: deRent, ai: deAi, inflation: deInflation, calculators: deCalculators, loan: deLoan, goldDays: deGoldDays, priceAlarms: dePriceAlarms, sharedPots: deSharedPots, legal: deLegal },
    },
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'pararota-lang',
    },
  });

export default i18n;
