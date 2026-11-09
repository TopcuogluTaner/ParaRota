import { useEffect } from 'react';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '@features/auth/api/authApi';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { resetAllPageTours } from './pageTours';

// Mevcut onboarding (tanıtım) sürümü. Büyük yeni bir tur çıkınca bunu artır →
// herkes (eskiyi görmüş olanlar dahil) yeni turu bir kez daha görür.
// v3 (2026-06-10): dashboard turuna defter seçici + gizlilik gözü adımları, metinler sadeleşti.
export const CURRENT_ONBOARDING_VERSION = 3;

const LOCAL_KEY = 'pararota.onboardingSeenVersion';

type Phase = 'idle' | 'slides' | 'tour';

interface OnboardingState {
  phase: Phase;
  startSlides: () => void;
  startTour: () => void;
  /** Profil'den manuel tekrar — sürüm/cache'i atlayıp slaytları yeniden gösterir. */
  replay: () => void;
  /** Tamamla: local cache + backend'e yaz, phase'i kapat. */
  finish: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  phase: 'idle',
  startSlides: () => set({ phase: 'slides' }),
  startTour: () => set({ phase: 'tour' }),
  replay: () => {
    void resetAllPageTours(); // sayfa turlarını da sıfırla → hepsi yeniden görünür
    set({ phase: 'slides' });
  },
  finish: () => {
    set({ phase: 'idle' });
    void AsyncStorage.setItem(LOCAL_KEY, String(CURRENT_ONBOARDING_VERSION));
    // Backend kullanıcı bazlı kaynak (çoklu cihaz / reinstall): ateşle-unut.
    authApi.setOnboardingSeen(CURRENT_ONBOARDING_VERSION).catch(() => {});
  },
}));

// Girişten sonra: kullanıcı bu sürümü görmediyse (ne backend ne local) slaytları
// başlat. Local cache anti-flash + offline; backend cihazlar arası kaynak.
export function useMaybeStartOnboarding() {
  const userId = useAuthStore((s) => s.user?.id);
  const seenVersion = useAuthStore((s) => s.user?.onboardingSeenVersion ?? 0);
  const phase = useOnboardingStore((s) => s.phase);
  const startSlides = useOnboardingStore((s) => s.startSlides);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!userId || phase !== 'idle') return;
      if (seenVersion >= CURRENT_ONBOARDING_VERSION) return; // backend görmüş
      const localRaw = await AsyncStorage.getItem(LOCAL_KEY);
      if (!cancelled && Number(localRaw ?? 0) < CURRENT_ONBOARDING_VERSION) {
        startSlides();
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, seenVersion]);
}
