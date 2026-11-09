import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PrivacyState {
  /** Tutarlar maskeli mi (₺••••). Topbar'daki göz ikonuyla değişir; TÜM sayfaları etkiler. */
  hideAmounts: boolean;
  toggle: () => void;
}

// Gizlilik modu: omuz üstünden bakanlara karşı tek tıkla tüm para
// tutarlarını maskele. Tercih kalıcıdır (sayfa yenilenince korunur).
export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set) => ({
      hideAmounts: false,
      toggle: () => set((s) => ({ hideAmounts: !s.hideAmounts })),
    }),
    { name: 'pararota-privacy' },
  ),
);
