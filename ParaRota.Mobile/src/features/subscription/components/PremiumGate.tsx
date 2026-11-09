import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { Screen } from '@shared/components/Screen';
import { AppHeader } from '@shared/components/AppHeader';
import { Body, Display, Eyebrow } from '@shared/components/Typography';
import { RouteLine } from '@shared/components/RouteLine';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { useEntitlement } from '../hooks/useEntitlement';
import { openPaywall, type PremiumFeature } from '../lib/paywallNav';

interface Props {
  feature: PremiumFeature;
  /** Kilitli ekranın başlığı (AppHeader). */
  title?: string;
  back?: boolean;
  children: ReactNode;
}

/**
 * Premium değilse içeriği gizler, kilitli bir tanıtım ekranı + "Premium'a Geç"
 * CTA'sı gösterir. UI gizleme YETMEZ — backend de [RequirePremium] ile korur.
 */
export function PremiumGate({ feature, title, back, children }: Props) {
  const { isPremium } = useEntitlement();
  if (isPremium) return <>{children}</>;
  return <LockedView feature={feature} title={title} back={back} />;
}

function LockedView({ feature, title, back }: { feature: PremiumFeature; title?: string; back?: boolean }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation('paywall');
  const { isInTrial, trialDaysLeft } = useEntitlement();

  return (
    <Screen>
      <AppHeader title={title ?? t('locked.headerTitle')} back={back} />
      <View style={styles.wrap}>
        <View style={[styles.iconWrap, { borderColor: colors.line, backgroundColor: colorAlpha(colors.go, 0.08) }]}>
          <Icon source="lock-outline" size={36} color={colors.go} />
        </View>

        <Eyebrow tone="mute" style={{ marginTop: 18 }}>{t('locked.eyebrow')}</Eyebrow>
        <Display size="sm" align="center" style={{ marginTop: 8 }}>
          {t(`features.${feature}.title`)}
        </Display>
        <Body size="sm" tone="soft" align="center" style={{ marginTop: 6, maxWidth: 320 }}>
          {t(`features.${feature}.desc`)}
        </Body>

        {isInTrial && trialDaysLeft != null ? (
          <Body size="xs" tone="mute" align="center" style={{ marginTop: 10 }}>
            {t('trial.daysLeft', { count: trialDaysLeft })}
          </Body>
        ) : null}

        <RouteLine style={{ marginTop: 20, width: 120 }} />

        <Button
          mode="contained"
          icon="crown-outline"
          buttonColor={colors.go}
          textColor={colors.onAccent}
          style={{ marginTop: 22, borderRadius: 14 }}
          contentStyle={{ height: 50, paddingHorizontal: 12 }}
          onPress={() => openPaywall(feature)}
        >
          {t('cta.unlock')}
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 40 },
  iconWrap: {
    width: 84, height: 84, borderRadius: 24, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
