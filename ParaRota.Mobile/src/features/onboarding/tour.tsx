import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import { walkthroughable, useCopilot } from 'react-native-copilot';
import { useOnboardingStore } from './onboardingStore';

/** CopilotStep içinde kullanılacak ölçülebilir sarmalayıcı. */
export const WalkView = walkthroughable(View);

// Store'u izler: phase 'tour' olunca copilot turunu başlatır; tur durunca
// (bitir/atla/dışarı) onboarding'i tamamlar (backend + local).
export function TourController() {
  const { start, copilotEvents } = useCopilot();
  const phase = useOnboardingStore((s) => s.phase);
  const finish = useOnboardingStore((s) => s.finish);
  const started = useRef(false);

  useEffect(() => {
    const onStop = () => finish();
    copilotEvents.on('stop', onStop);
    return () => copilotEvents.off('stop', onStop);
  }, [copilotEvents, finish]);

  useEffect(() => {
    if (phase === 'tour' && !started.current) {
      started.current = true;
      // Dashboard'ın mount/measure olması için küçük gecikme.
      const id = setTimeout(() => {
        try {
          start();
        } catch {
          finish();
        }
      }, 450);
      return () => clearTimeout(id);
    }
    if (phase !== 'tour') started.current = false;
  }, [phase, start, finish]);

  return null;
}
