import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { Icon, Switch } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { AppHeader } from '@shared/components/AppHeader';
import { Screen } from '@shared/components/Screen';
import { Body, Display, Eyebrow } from '@shared/components/Typography';
import { RouteLine } from '@shared/components/RouteLine';
import { useThemeStore, type ThemeMode } from '@shared/store/useThemeStore';
import { SUPPORTED_LANGS, changeLanguage } from '@shared/i18n';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { authApi } from '@features/auth/api/authApi';
import { toast } from '@shared/lib/toast';

export function SettingsScreen() {
  const { colors } = useAppTheme();
  const { t, i18n } = useTranslation('pages');
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const [pdfSaving, setPdfSaving] = useState(false);

  const togglePdfEmail = async (enabled: boolean) => {
    setPdfSaving(true);
    try {
      await authApi.setMonthlyPdfEmail(enabled);
      await fetchUser(); // /auth/me yetkili kaynak — store oradan tazelenir
    } catch {
      toast.error(t('settings.monthlyPdfError'));
    } finally {
      setPdfSaving(false);
    }
  };

  const themes: { value: ThemeMode; labelKey: string; icon: string }[] = [
    { value: 'system', labelKey: 'settings.themeSystem', icon: 'theme-light-dark' },
    { value: 'light', labelKey: 'settings.themeLight', icon: 'white-balance-sunny' },
    { value: 'dark', labelKey: 'settings.themeDark', icon: 'weather-night' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader eyebrow={t('settings.eyebrow')} title={t('settings.title')} />
      <Screen contentStyle={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Body size="md" tone="soft" style={{ marginBottom: 18 }}>
          {t('settings.description')}
        </Body>

        <Eyebrow tone="mute">{t('settings.languageTitle')}</Eyebrow>
        <Display size="sm" style={{ marginTop: 6 }}>{t('settings.languageSubtitle')}</Display>
        <RouteLine style={{ marginTop: 8 }} />
        <View style={{ marginTop: 10 }}>
          {SUPPORTED_LANGS.map((l, idx) => {
            const active = i18n.language === l.code;
            return (
              <Animated.View key={l.code} entering={FadeIn.delay(40 + idx * 30).duration(280)}>
                <Pressable
                  onPress={() => void changeLanguage(l.code)}
                  style={({ pressed }) => [styles.row, { backgroundColor: active ? colors.paper2 : 'transparent', opacity: pressed ? 0.85 : 1 }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={l.label}
                >
                  <Body size="lg">{l.flag}</Body>
                  <View style={{ flex: 1 }}>
                    <Body weight="bold">{l.label}</Body>
                    <Eyebrow tone="mute">{l.code}</Eyebrow>
                  </View>
                  {active ? <Icon source="check-circle" size={20} color={colors.go} /> : null}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        <View style={{ height: 28 }} />

        <Eyebrow tone="mute">{t('settings.themeTitle')}</Eyebrow>
        <Display size="sm" style={{ marginTop: 6 }}>{t('settings.themeTitle')}</Display>
        <RouteLine style={{ marginTop: 8 }} />
        <View style={{ marginTop: 10 }}>
          {themes.map((th, idx) => {
            const active = mode === th.value;
            return (
              <Animated.View key={th.value} entering={FadeInDown.delay(60 + idx * 40).duration(300)}>
                <Pressable
                  onPress={() => setMode(th.value)}
                  style={({ pressed }) => [styles.row, { backgroundColor: active ? colors.paper2 : 'transparent', opacity: pressed ? 0.85 : 1 }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={t(th.labelKey)}
                >
                  <View style={[styles.themeIconBox, { backgroundColor: active ? colorAlpha(colors.go, 0.14) : colors.paper, borderColor: colors.line }]}>
                    <Icon source={th.icon} size={20} color={active ? colors.go : colors.inkSoft} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Body weight="bold">{t(th.labelKey)}</Body>
                    <Eyebrow tone="mute">{th.value}</Eyebrow>
                  </View>
                  {active ? <Icon source="check-circle" size={20} color={colors.go} /> : null}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        <View style={{ height: 28 }} />

        <Eyebrow tone="mute">{t('settings.emailTitle')}</Eyebrow>
        <Display size="sm" style={{ marginTop: 6 }}>{t('settings.monthlyPdfTitle')}</Display>
        <RouteLine style={{ marginTop: 8 }} />
        <View style={[styles.row, { marginTop: 10 }]}>
          <View style={[styles.themeIconBox, { backgroundColor: colors.paper, borderColor: colors.line }]}>
            <Icon source="email-newsletter" size={20} color={colors.inkSoft} />
          </View>
          <View style={{ flex: 1 }}>
            <Body weight="bold">{t('settings.monthlyPdfLabel')}</Body>
            <Body size="xs" tone="mute">{t('settings.monthlyPdfHelp')}</Body>
          </View>
          <Switch
            value={!!user?.sendMonthlyPdfEmail}
            disabled={pdfSaving}
            onValueChange={(v) => void togglePdfEmail(v)}
            accessibilityLabel={t('settings.monthlyPdfLabel')}
          />
        </View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 12, marginBottom: 4 },
  themeIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth },
});
