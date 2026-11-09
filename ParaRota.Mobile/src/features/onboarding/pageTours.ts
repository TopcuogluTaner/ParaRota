import AsyncStorage from '@react-native-async-storage/async-storage';

// Sayfa-bazlı mini öğreticiler (Hareketler / Bütçeler / Hedefler). Ana onboarding
// turundan bağımsız: her sayfaya ilk girişte bir kez kendiliğinden açılır.
// Sürümü artırınca tüm sayfa turları yeniden gösterilir.
// v2 (2026-06-10): metinler sadeleşti + Hareketler'e kaydırma, Tekrarlayanlar'a abonelik şeridi adımı.
export const PAGE_TOUR_VERSION = 2;

export const PAGE_TOUR_PAGES = ['transactions', 'budgets', 'goals', 'investments', 'debts', 'installments', 'recurring', 'categories', 'household', 'exports'] as const;
export type PageTourId = (typeof PAGE_TOUR_PAGES)[number];

const localKey = (page: string) => `pararota.pageTour.${page}`;

export async function isPageTourSeen(page: string): Promise<boolean> {
  const raw = await AsyncStorage.getItem(localKey(page));
  return Number(raw ?? 0) >= PAGE_TOUR_VERSION;
}

export function markPageTourSeen(page: string): void {
  void AsyncStorage.setItem(localKey(page), String(PAGE_TOUR_VERSION));
}

// Profil'den "tanıtımı tekrar göster" → sayfa turlarını da sıfırla.
export async function resetAllPageTours(): Promise<void> {
  await Promise.all([
    ...PAGE_TOUR_PAGES.map((p) => AsyncStorage.removeItem(localKey(p))),
    AsyncStorage.removeItem(MENU_TOUR_KEY),
  ]);
}

// Menü (drawer) içi tek-tek tanıtım turu — drawer ilk açıldığında bir kez.
// v2 (2026-06-10): metinler sadeleşti. v3: Taksitler eklendi. v4: Fiyat Alarmı eklendi. v5: Ortak Kasa eklendi.
export const MENU_TOUR_VERSION = 5;
const MENU_TOUR_KEY = 'pararota.menuTour';

export async function isMenuTourSeen(): Promise<boolean> {
  const raw = await AsyncStorage.getItem(MENU_TOUR_KEY);
  return Number(raw ?? 0) >= MENU_TOUR_VERSION;
}

export function markMenuTourSeen(): void {
  void AsyncStorage.setItem(MENU_TOUR_KEY, String(MENU_TOUR_VERSION));
}
