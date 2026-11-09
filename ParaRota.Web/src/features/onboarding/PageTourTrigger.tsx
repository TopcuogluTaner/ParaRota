import { useEffect } from 'react';
import { hasSeenMainOnboarding, useOnboardingStore } from './onboardingStore';
import { isPageTourSeen, type PageTourId } from './pageTours';

// Sayfaya ilk girişte o sayfanın mini turunu tetikleyen görünmez bileşen.
// Sayfa bileşeninin return bloğuna eklenir: <PageTourTrigger page="transactions" />
// Ana onboarding bitmeden/atlanmadan hiçbir sayfa turu başlamaz.
export function PageTourTrigger({ page }: { page: PageTourId }) {
  const phase = useOnboardingStore((s) => s.phase);
  const startTour = useOnboardingStore((s) => s.startTour);

  useEffect(() => {
    if (phase !== 'idle') return;
    if (!hasSeenMainOnboarding()) return;
    if (isPageTourSeen(page)) return;
    // Sayfa mount/reveal animasyonları otursun.
    const timer = window.setTimeout(() => startTour(page), 700);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, phase]);

  return null;
}
