import { useCallback, useRef, type ReactNode } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { CopilotProvider, useCopilot } from 'react-native-copilot';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { TourTooltip } from './TourTooltip';
import { useOnboardingStore } from './onboardingStore';
import { isPageTourSeen, markPageTourSeen, PAGE_TOUR_VERSION } from './pageTours';

// Bu sayfaya ilk odaklanışta turu bir kez başlatır; durunca "görüldü" yazar.
function PageTourRunner({ page }: { page: string }) {
  const { start, copilotEvents } = useCopilot();
  const onboardingPhase = useOnboardingStore((s) => s.phase);
  const handled = useRef(false);

  // Tur durunca (bitir/atla) bu sayfayı görülmüş işaretle.
  useFocusEffect(
    useCallback(() => {
      const onStop = () => markPageTourSeen(page);
      copilotEvents.on('stop', onStop);
      return () => copilotEvents.off('stop', onStop);
    }, [copilotEvents, page]),
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      (async () => {
        if (handled.current) return;
        // Ana onboarding (slaytlar/dashboard turu) sürerken sayfa turunu açma.
        if (useOnboardingStore.getState().phase !== 'idle') return;
        if (await isPageTourSeen(page)) return;
        if (cancelled) return;
        handled.current = true;
        // Sayfa öğelerinin mount/measure olması için kısa gecikme.
        timer = setTimeout(() => {
          Promise.resolve()
            .then(() => start())
            .catch(() => markPageTourSeen(page));
        }, 650);
      })();
      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
      // onboardingPhase değişimi (tur bitince idle'a düşer) yeniden denemeyi tetikler.
    }, [page, start, onboardingPhase]),
  );

  return null;
}

interface Props {
  page: string;
  children: ReactNode;
}

// Bir sekme ekranını sarmalar: kendi CopilotProvider'ı (temalı tooltip) + tek
// seferlik otomatik başlatıcı. İçindeki CopilotStep'ler bu sağlayıcıya kaydolur,
// böylece sayfa turu ana onboarding turundan tamamen bağımsız çalışır.
export function PageTour({ page, children }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation('common');
  return (
    <CopilotProvider
      labels={{
        next: t('onboarding.next'),
        previous: t('onboarding.back'),
        skip: t('onboarding.skip'),
        finish: t('onboarding.finish'),
      }}
      tooltipComponent={TourTooltip}
      tooltipStyle={{ backgroundColor: colors.paper, borderRadius: 16, paddingBottom: 16, boxShadow: colors.cardShadow }}
      arrowColor={colors.paper}
      backdropColor="rgba(0,0,0,0.72)"
      margin={14}
      androidStatusBarVisible
    >
      {children}
      <PageTourRunner page={page} key={`pt-${PAGE_TOUR_VERSION}`} />
    </CopilotProvider>
  );
}
