import type { TourId } from './onboardingStore';

// ──────────────────────────────────────────────────────────
// Tur tanımları — hangi turda hangi adımlar, hangi elementler hedef.
// target: DOM'daki [data-tour="..."] attribute değeri; null = hedefsiz
// (tooltip ekran ortasında, spotlight deliği yok).
//
// Görünmeyen/yok hedefler çalışma anında sessizce atlanır (premium kilidi,
// admin, responsive görünürlük, household yokken boş switcher). Turda hiç
// gösterilebilir adım kalmazsa tur hiç başlamaz ve "görüldü" YAZILMAZ —
// eleman geldiğinde (örn. premium olunca) yeniden denenir.
// ──────────────────────────────────────────────────────────

export interface TourStep {
  /** data-tour attribute değeri; null → ortalanmış, hedefsiz adım. */
  target: string | null;
  /** `onboarding` namespace'indeki metin anahtarı. */
  textKey: string;
  /** Adım gösterilmeden önce yapılacak hazırlık (örn. sidebar'ı genişlet). */
  preAction?: 'expandSidebar';
  /** Yalnız masaüstü (md+) — mobil tarayıcıda atla. */
  desktopOnly?: boolean;
  /** Yalnız mobil tarayıcı (md altı) — masaüstünde atla. */
  mobileOnly?: boolean;
}

const NAV_PAGES = [
  'transactions',
  'categories',
  'budgets',
  'recurring',
  'goals',
  'investments',
  'debts',
  'household',
  'exports',
] as const;

// Ana tur: dashboard özeti → ekleme yolları → topbar → sidebar menüleri → kapanış.
// Mobil tarayıcıda sidebar Drawer içinde (kapalıyken DOM'da yok) → nav adımları
// yerine tek hamburger adımı gösterilir.
const MAIN_TOUR: TourStep[] = [
  { target: 'dash-summary', textKey: 'tour_hero' },
  { target: 'dash-month', textKey: 'tour_month' },
  { target: 'topbar-quick-add', textKey: 'tour_quick_add' },
  { target: 'quick-dock', textKey: 'tour_dock' },
  { target: 'topbar-household', textKey: 'tour_scope', desktopOnly: true },
  { target: 'topbar-search', textKey: 'tour_search', desktopOnly: true },
  { target: 'topbar-notifications', textKey: 'tour_bell' },
  ...NAV_PAGES.map<TourStep>((page) => ({
    target: `nav-${page}`,
    textKey: `tour_nav_${page}`,
    preAction: 'expandSidebar',
    desktopOnly: true,
  })),
  { target: 'topbar-menu', textKey: 'tour_menu', mobileOnly: true },
  { target: null, textKey: 'tour_outro' },
];

export const TOURS: Record<TourId, TourStep[]> = {
  main: MAIN_TOUR,
  transactions: [
    { target: 'tx-filters', textKey: 'tour_tx_filter' },
    { target: 'tx-new', textKey: 'tour_tx_add' },
    { target: 'tx-list', textKey: 'tour_tx_hover', desktopOnly: true },
  ],
  categories: [{ target: 'categories-new', textKey: 'tour_cat_add' }],
  budgets: [{ target: 'budgets-new', textKey: 'tour_bg_add' }],
  recurring: [
    { target: 'recurring-popular', textKey: 'tour_rec_popular' },
    { target: 'recurring-new', textKey: 'tour_rec_add' },
  ],
  goals: [{ target: 'goals-new', textKey: 'tour_gl_add' }],
  investments: [{ target: 'investments-new', textKey: 'tour_inv_add' }],
  debts: [{ target: 'debts-new', textKey: 'tour_debt_add' }],
  household: [{ target: 'household-invite', textKey: 'tour_hh_invite' }],
  exports: [
    { target: 'exports-pdf', textKey: 'tour_exp_pdf' },
    { target: 'exports-xlsx', textKey: 'tour_exp_xlsx' },
  ],
};
