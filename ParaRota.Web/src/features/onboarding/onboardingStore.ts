import { useEffect } from 'react';
import { create } from 'zustand';
import { authApi } from '@features/auth/api/authApi';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { resetAllPageTours, markPageTourSeen, type PageTourId } from './pageTours';

// Mevcut web onboarding (tanıtım) sürümü. Büyük yeni bir tur çıkınca bunu artır →
// herkes (eskiyi görmüş olanlar dahil) yeni turu bir kez daha görür.
// Mobildeki CURRENT_ONBOARDING_VERSION'dan bağımsız: web arayüzü farklı olduğundan
// backend'de ayrı alanda (WebOnboardingSeenVersion) tutulur.
export const WEB_ONBOARDING_VERSION = 1;

const LOCAL_KEY = 'pararota:webOnboardingSeenVersion';

export type TourId = 'main' | PageTourId;

type Phase = 'idle' | 'slides' | 'tour';

interface OnboardingState {
  phase: Phase;
  /** phase === 'tour' iken aktif turun kimliği. */
  activeTourId: TourId | null;
  startSlides: () => void;
  startTour: (tourId: TourId) => void;
  /** Profil'den manuel tekrar — sürüm/cache'i atlayıp slaytları yeniden gösterir. */
  replay: () => void;
  /**
   * Aktif akışı kapat.
   * - markSeen=true: kullanıcı Atla/Bitti dedi → kalıcı "görüldü" yaz
   *   (ana akışta localStorage + backend, sayfa turunda localStorage).
   * - markSeen=false: rota değişimi gibi yarıda kesilme → yazma, sonraki
   *   girişte yeniden denensin.
   */
  stop: (markSeen: boolean) => void;
}

function readLocalSeen(): number {
  try {
    return Number(localStorage.getItem(LOCAL_KEY) ?? 0);
  } catch {
    return 0;
  }
}

function persistMainSeen() {
  try {
    localStorage.setItem(LOCAL_KEY, String(WEB_ONBOARDING_VERSION));
  } catch {
    /* ignore */
  }
  // Optimistik güncelle — yeniden /auth/me beklenmesin.
  const user = useAuthStore.getState().user;
  if (user && user.webOnboardingSeenVersion < WEB_ONBOARDING_VERSION) {
    useAuthStore.setState({ user: { ...user, webOnboardingSeenVersion: WEB_ONBOARDING_VERSION } });
  }
  // Backend kullanıcı bazlı kaynak (çoklu cihaz): ateşle-unut.
  authApi.setOnboardingSeen(WEB_ONBOARDING_VERSION).catch(() => {});
}

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  phase: 'idle',
  activeTourId: null,
  startSlides: () => set({ phase: 'slides', activeTourId: null }),
  startTour: (tourId) => set({ phase: 'tour', activeTourId: tourId }),
  replay: () => {
    resetAllPageTours(); // sayfa turlarını da sıfırla → hepsi yeniden görünür
    set({ phase: 'slides', activeTourId: null });
  },
  stop: (markSeen) => {
    const { phase, activeTourId } = get();
    if (markSeen) {
      if (phase === 'slides' || activeTourId === 'main') persistMainSeen();
      else if (activeTourId) markPageTourSeen(activeTourId);
    }
    set({ phase: 'idle', activeTourId: null });
  },
}));

/** Ana onboarding (slaytlar + ana tur) bu cihazda/bu kullanıcıda görülmüş mü? */
export function hasSeenMainOnboarding(): boolean {
  const backendSeen = useAuthStore.getState().user?.webOnboardingSeenVersion ?? 0;
  return Math.max(backendSeen, readLocalSeen()) >= WEB_ONBOARDING_VERSION;
}

// Girişten sonra: kullanıcı bu sürümü görmediyse (ne backend ne local) slaytları
// başlat. Local cache anti-flash + offline; backend cihazlar arası kaynak.
export function useMaybeStartOnboarding() {
  const userId = useAuthStore((s) => s.user?.id);
  const seenVersion = useAuthStore((s) => s.user?.webOnboardingSeenVersion ?? 0);
  const phase = useOnboardingStore((s) => s.phase);
  const startSlides = useOnboardingStore((s) => s.startSlides);

  useEffect(() => {
    if (!userId || phase !== 'idle') return;
    if (seenVersion >= WEB_ONBOARDING_VERSION) return; // backend görmüş
    if (readLocalSeen() >= WEB_ONBOARDING_VERSION) return; // bu cihaz görmüş
    // Sayfa mount/animasyonları otursun diye küçük gecikme.
    const timer = window.setTimeout(startSlides, 600);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, seenVersion]);
}
