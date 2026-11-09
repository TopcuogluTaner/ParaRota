import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { AppHeader } from '@shared/components/AppHeader';
import { Screen } from '@shared/components/Screen';
import { Body, Display, Eyebrow } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';

type ToneKey = 'go' | 'way' | 'sky' | 'halt';

interface Calc {
  key: string;
  route: string;
  icon: string;
  tone: ToneKey;
}

// Mevcut rotalar korunur; hub yalnız bunlara yönlendirir.
const CALCS: Calc[] = [
  { key: 'payroll', route: '/(app)/payroll', icon: 'calculator-variant-outline', tone: 'go' },
  { key: 'severance', route: '/(app)/severance', icon: 'briefcase-clock-outline', tone: 'way' },
  { key: 'rent', route: '/(app)/rent', icon: 'home-percent-outline', tone: 'sky' },
  { key: 'inflation', route: '/(app)/money-value', icon: 'cash-clock', tone: 'halt' },
  { key: 'loan', route: '/(app)/loan-cost', icon: 'bank-outline', tone: 'way' },
];

/**
 * Hesaplayıcılar hub'ı — TR-özgü finansal hesaplayıcıları tek ekranda toplar.
 * Drawer'daki ayrı girişlerin yerini alır; kartlar mevcut ekranlara yönlendirir.
 */
export function CalculatorsScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('calculators');
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('page_title')} />
      <Screen edges={['bottom']} contentStyle={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <Eyebrow tone="mute" style={{ marginBottom: 6 }}>{t('page_eyebrow')}</Eyebrow>
        <Body tone="soft" style={{ marginBottom: 16, lineHeight: 20 }}>{t('page_description')}</Body>

        {CALCS.map((c, i) => {
          const tone = colors[c.tone];
          return (
            <Animated.View key={c.key} entering={FadeInDown.duration(300).delay(i * 60)}>
              <Pressable
                onPress={() => router.push(c.route as never)}
                accessibilityRole="button"
                accessibilityLabel={t(`${c.key}_title`)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.iconChip, { backgroundColor: colorAlpha(tone, 0.13) }]}>
                    <Icon source={c.icon} size={22} color={tone} />
                  </View>
                  <View style={[styles.tag, { backgroundColor: colorAlpha(tone, 0.1) }]}>
                    <Eyebrow style={{ color: tone }}>{t(`${c.key}_tag`)}</Eyebrow>
                  </View>
                </View>
                <Display size="sm" style={{ marginTop: 12 }}>{t(`${c.key}_title`)}</Display>
                <Body size="sm" tone="soft" style={{ marginTop: 4, lineHeight: 19 }}>{t(`${c.key}_sub`)}</Body>
                <View style={styles.cta}>
                  <Body size="sm" weight="bold" style={{ color: tone }}>{t('open')}</Body>
                  <Icon source="arrow-right" size={16} color={tone} />
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
        <View style={{ height: 24 }} />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 18, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconChip: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 14 },
});
