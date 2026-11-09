import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PrivacyState {
  /** Tutarlar maskeli mi (₺••••). Dashboard'daki göz ikonuyla değişir; TÜM ekranları etkiler. */
  hideAmounts: boolean;
  toggle: () => void;
}

// Gizlilik modu: omuz üstünden bakanlara karşı tek dokunuşla tüm para
// tutarlarını maskele. Tercih kalıcıdır (uygulama yeniden açılınca korunur).
export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set) => ({
      hideAmounts: false,
      toggle: () => set((s) => ({ hideAmounts: !s.hideAmounts })),
    }),
    {
      name: 'pararota.privacy',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    },
  ),
);
