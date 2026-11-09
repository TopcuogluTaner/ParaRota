import { IntroSlides } from './IntroSlides';
import { useMaybeStartOnboarding, useOnboardingStore } from './onboardingStore';

// Auth'lu alanın köküne yerleşir: ilk girişte slaytları gösterir, "Başla" →
// copilot turunu tetikler (tur, (tabs) layout'taki CopilotProvider altında çalışır).
export function OnboardingGate() {
  useMaybeStartOnboarding();
  const phase = useOnboardingStore((s) => s.phase);
  const startTour = useOnboardingStore((s) => s.startTour);

  return <IntroSlides visible={phase === 'slides'} onDone={startTour} />;
}
