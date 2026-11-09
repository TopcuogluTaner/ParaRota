import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMediaQuery, useTheme } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLayoutStore } from '@app/layouts/useLayoutStore';
import { useOnboardingStore, type TourId } from '../onboardingStore';
import { TOURS, type TourStep } from '../tours';
import { SpotlightOverlay } from './SpotlightOverlay';
import { TourTooltip } from './TourTooltip';
import { isTargetVisible, useTargetRect } from './useTargetRect';

// ──────────────────────────────────────────────────────────
// Aktif turu yürüten beyin: adım listesini çözer (responsive + DOM'da var mı),
// spotlight + tooltip'i boyar, klavye/rota değişimini yönetir.
//
// Kurallar:
// - Eksik/görünmez hedefli adımlar sessizce atlanır (premium kilidi, admin,
//   responsive görünürlük, household yokken boş switcher).
// - Hiç hedefli adım kalmazsa tur iptal edilir ve "görüldü" YAZILMAZ.
// - Rota değişirse tur yarıda kesilir, "görüldü" yazılmaz (Atla yazardı).
// ──────────────────────────────────────────────────────────

export function TourController() {
  const phase = useOnboardingStore((s) => s.phase);
  const activeTourId = useOnboardingStore((s) => s.activeTourId);

  if (phase !== 'tour' || !activeTourId) return null;
  // key: tur değişince state sıfırdan kurulsun.
  return <ActiveTour key={activeTourId} tourId={activeTourId} />;
}

function ActiveTour({ tourId }: { tourId: TourId }) {
  const { t } = useTranslation('onboarding');
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const stop = useOnboardingStore((s) => s.stop);
  const setCollapsed = useLayoutStore((s) => s.setCollapsed);
  const location = useLocation();

  // Responsive eleme — kalan adımların DOM görünürlüğü "hazır" olunca çözülür.
  const candidateSteps = useMemo(
    () =>
      TOURS[tourId].filter(
        (s) => !(s.desktopOnly && !isDesktop) && !(s.mobileOnly && isDesktop)
      ),
    [tourId, isDesktop]
  );

  const [steps, setSteps] = useState<TourStep[] | null>(null);
  const [index, setIndex] = useState(0);

  // Hazırlık: sidebar adımı varsa genişlet, transition otursun, sonra DOM'da
  // gerçekten görünür hedefleri ele.
  useEffect(() => {
    const needsSidebar = candidateSteps.some((s) => s.preAction === 'expandSidebar');
    if (needsSidebar && isDesktop) setCollapsed(false);

    const timer = window.setTimeout(() => {
      const resolved = candidateSteps.filter((s) => s.target === null || isTargetVisible(s.target));
      // Yalnız hedefsiz (outro) adım kaldıysa gösterilecek bir şey yok.
      if (!resolved.some((s) => s.target !== null)) {
        stop(false);
        return;
      }
      setSteps(resolved);
    }, needsSidebar ? 420 : 250);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rota değişirse turu yarıda kes (seen yazma) — ilk render hariç.
  const initialPath = useRef(location.pathname);
  useEffect(() => {
    if (location.pathname !== initialPath.current) stop(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const current = steps?.[index] ?? null;

  // Adım sırasında hedef DOM'dan kaybolursa (re-render, koşullu görünürlük)
  // o adımı listeden düş — index korunur, sıradaki adım gelir.
  useEffect(() => {
    if (!steps || !current?.target) return;
    const check = window.setInterval(() => {
      if (!isTargetVisible(current.target!)) {
        const remaining = steps.filter((s) => s !== current);
        if (!remaining.some((s) => s.target !== null)) {
          stop(true); // turun ortasındaydı; kalan yoksa tamamlanmış say
          return;
        }
        setSteps(remaining);
        setIndex((i) => Math.min(i, remaining.length - 1));
      }
    }, 500);
    return () => window.clearInterval(check);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, current]);

  const isLast = steps ? index >= steps.length - 1 : false;

  const next = () => {
    if (isLast) stop(true);
    else setIndex((i) => i + 1);
  };
  const prev = () => setIndex((i) => Math.max(0, i - 1));
  const skip = () => stop(true);

  // Klavye: →/Enter ileri, ← geri, Esc atla.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        skip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLast, steps]);

  const rect = useTargetRect(current?.target ?? null);

  if (!steps || !current) return null;
  // Hedefli adımda ölçüm gelmeden boyama — delik yanlış yerde açılmasın.
  if (current.target && !rect) return null;

  const zIndex = theme.zIndex.modal + 10;

  return createPortal(
    <>
      <SpotlightOverlay rect={rect} zIndex={zIndex} />
      <TourTooltip
        rect={rect}
        text={t(current.textKey)}
        stepNumber={index + 1}
        totalSteps={steps.length}
        isFirst={index === 0}
        isLast={isLast}
        zIndex={zIndex + 1}
        onNext={next}
        onPrev={prev}
        onSkip={skip}
      />
    </>,
    document.body
  );
}
