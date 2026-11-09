import { useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable } from 'react-native';
import { Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppHeader } from '@shared/components/AppHeader';
import { Screen } from '@shared/components/Screen';
import { PageTour } from '@features/onboarding/PageTour';
import { CopilotStep } from 'react-native-copilot';
import { WalkView } from '@features/onboarding/tour';
import { Body, Display, Eyebrow } from '@shared/components/Typography';
import { RouteLine } from '@shared/components/RouteLine';
import { MonthlyPdfModal } from '@features/exports/components/MonthlyPdfModal';
import { TransactionsXlsxModal } from '@features/exports/components/TransactionsXlsxModal';
import { colorAlpha } from '@shared/lib/colorAlpha';

export function ExportsScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('exports');
  const [pdfOpen, setPdfOpen] = useState(false);
  const [xlsxOpen, setXlsxOpen] = useState(false);

  return (
    <PageTour page="exports">
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('page_title')} />
      <Screen edges={['bottom']} contentStyle={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Body size="md" tone="soft" style={{ marginBottom: 18 }}>
          {t('page_description')}
        </Body>

        <CopilotStep text={t('common:onboarding.tour_exp')} order={1} name="exp-pdf">
        <WalkView>
        <Animated.View entering={FadeInDown.delay(80).duration(320)}>
          <Pressable
            onPress={() => setPdfOpen(true)}
            style={({ pressed }) => [styles.card, { backgroundColor: colors.paper, borderColor: colors.line, opacity: pressed ? 0.92 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={t('card_monthlyPdf_title')}
          >
            <View style={[styles.iconBox, { backgroundColor: colorAlpha(colors.halt, 0.12) }]}>
              <Icon source="file-pdf-box" size={26} color={colors.halt} />
            </View>
            <View style={{ flex: 1 }}>
              <Eyebrow tone="halt">{t('page_eyebrow')}</Eyebrow>
              <Display size="sm" style={{ marginTop: 4 }}>{t('card_monthlyPdf_title')}</Display>
              <Body size="sm" tone="soft" style={{ marginTop: 4 }}>{t('card_monthlyPdf_description')}</Body>
              <RouteLine style={{ marginTop: 10 }} />
              <Eyebrow tone="go" style={{ marginTop: 8 }}>{t('card_action')} ▸</Eyebrow>
            </View>
          </Pressable>
        </Animated.View>
        </WalkView>
        </CopilotStep>

        <View style={{ height: 14 }} />

        <Animated.View entering={FadeInDown.delay(160).duration(320)}>
          <Pressable
            onPress={() => setXlsxOpen(true)}
            style={({ pressed }) => [styles.card, { backgroundColor: colors.paper, borderColor: colors.line, opacity: pressed ? 0.92 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={t('card_transactionsXlsx_title')}
          >
            <View style={[styles.iconBox, { backgroundColor: colorAlpha(colors.go, 0.12) }]}>
              <Icon source="file-excel-box" size={26} color={colors.go} />
            </View>
            <View style={{ flex: 1 }}>
              <Eyebrow tone="go">{t('page_eyebrow')}</Eyebrow>
              <Display size="sm" style={{ marginTop: 4 }}>{t('card_transactionsXlsx_title')}</Display>
              <Body size="sm" tone="soft" style={{ marginTop: 4 }}>{t('card_transactionsXlsx_description')}</Body>
              <RouteLine style={{ marginTop: 10 }} />
              <Eyebrow tone="go" style={{ marginTop: 8 }}>{t('card_action')} ▸</Eyebrow>
            </View>
          </Pressable>
        </Animated.View>
      </Screen>
      <MonthlyPdfModal visible={pdfOpen} onDismiss={() => setPdfOpen(false)} />
      <TransactionsXlsxModal visible={xlsxOpen} onDismiss={() => setXlsxOpen(false)} />
    </View>
    </PageTour>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 14, padding: 16, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  iconBox: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
