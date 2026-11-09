// Sayfa-bazlı mini öğreticiler — her sayfaya ilk girişte bir kez kendiliğinden
// açılır; ana onboarding turundan bağımsız. Mobil paritesi: sayfa turları cihaz
// bazlı localStorage'da tutulur (backend'e taşımak küçük bir UX detayı için
// orantısız maliyet; yeni tarayıcıda bir kez daha görünmesi kabul edilebilir).
// Sürümü artırınca tüm sayfa turları yeniden gösterilir.
export const PAGE_TOUR_VERSION = 1;

export const PAGE_TOUR_PAGES = [
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

export type PageTourId = (typeof PAGE_TOUR_PAGES)[number];

const localKey = (page: string) => `pararota:pageTour:${page}`;

export function isPageTourSeen(page: PageTourId): boolean {
  try {
    return Number(localStorage.getItem(localKey(page)) ?? 0) >= PAGE_TOUR_VERSION;
  } catch {
    return true; // localStorage yoksa turu zorlama
  }
}

export function markPageTourSeen(page: PageTourId): void {
  try {
    localStorage.setItem(localKey(page), String(PAGE_TOUR_VERSION));
  } catch {
    /* ignore */
  }
}

// Profil'den "tanıtımı tekrar göster" → sayfa turlarını da sıfırla.
export function resetAllPageTours(): void {
  try {
    PAGE_TOUR_PAGES.forEach((p) => localStorage.removeItem(localKey(p)));
  } catch {
    /* ignore */
  }
}
