import { useMaybeStartOnboarding, useOnboardingStore } from './onboardingStore';
import { IntroSlides } from './IntroSlides';
import { TourController } from './engine/TourController';

// Auth sonrası onboarding kapısı — MainLayout'a monte edilir.
// İlk girişte slaytları tetikler; aktif tur varsa spotlight motorunu boyar.
export function OnboardingGate() {
  useMaybeStartOnboarding();
  const phase = useOnboardingStore((s) => s.phase);

  return (
    <>
      {phase === 'slides' && <IntroSlides />}
      <TourController />
    </>
  );
}
