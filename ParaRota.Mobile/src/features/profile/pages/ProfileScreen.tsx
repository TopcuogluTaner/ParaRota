import { useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable, Linking } from 'react-native';
import { Button, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { AppHeader } from '@shared/components/AppHeader';
import { Screen } from '@shared/components/Screen';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { Body, Display, Eyebrow } from '@shared/components/Typography';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { authApi } from '@features/auth/api/authApi';
import { AvatarPickerModal } from '@features/profile/components/AvatarPickerModal';
import { parseAvatar } from '@features/profile/lib/avatar';
import { useEntitlement } from '@features/subscription/hooks/useEntitlement';
import { openPaywall } from '@features/subscription/lib/paywallNav';
import { useThemeStore, type ThemeMode } from '@shared/store/useThemeStore';
import { useOnboardingStore } from '@features/onboarding/onboardingStore';
import { SUPPORTED_LANGS, changeLanguage } from '@shared/i18n';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';

const THEMES: { value: ThemeMode; labelKey: string; icon: string }[] = [
  { value: 'system', labelKey: 'settings.themeSystem', icon: 'theme-light-dark' },
  { value: 'light', labelKey: 'settings.themeLight', icon: 'white-balance-sunny' },
  { value: 'dark', labelKey: 'settings.themeDark', icon: 'weather-night' },
];

export function ProfileScreen() {
  const { t } = useTranslation('pages');
  const { t: tCommon } = useTranslation('common');
  const { t: tPaywall } = useTranslation('paywall');
  const { colors } = useAppTheme();
  const router = useRouter();
  const { i18n } = useTranslation();
  const replayTour = useOnboardingStore((s) => s.replay);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const resp = await authApi.deleteAccount();
      if (!resp.data.isSuccess) {
        toast.error(resp.data.message ?? tCommon('errorGeneric'));
        return;
      }
      setConfirmDelete(false);
      toast.success(t('profile.deleteAccountDone', { defaultValue: 'Hesabın silindi.' }));
      await logout();
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    } finally {
      setDeleting(false);
    }
  };

  const initials = (user?.firstName?.[0] ?? '?') + (user?.lastName?.[0] ?? '');
  // Rozet seçiliyse ikon+renk; değilse baş harfler (görsel YOK — DB'de küçük metin).
  const avatar = parseAvatar(user?.avatar);

  // Premium giriş noktası — deneme sürerken paywall'a ulaşmanın TEK yolu burası
  // (gate'ler trial'da açık, karşılama ekranı tek seferlik).
  const { isPremium, isInTrial, trialDaysLeft, plan } = useEntitlement();
  const hasPaidPlan = plan != null && plan !== 'trial';
  const premiumSubtitle = hasPaidPlan
    ? `${tPaywall('entry.active')} · ${plan === 'yearly' ? tPaywall('plan.yearly') : tPaywall('plan.monthly')}`
    : isInTrial && trialDaysLeft != null
      ? tPaywall('trial.daysLeft', { count: trialDaysLeft })
      : tPaywall('entry.expired');

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('profile.eyebrow')} />
      <Screen edges={['bottom']} contentStyle={{ paddingHorizontal: 16, paddingTop: 14 }}>
        {/* Tema-uyumlu profil kartı (eski hep-koyu hero yerine paper yüzey) */}
        <Animated.View
          entering={FadeIn.duration(360)}
          style={[styles.card, { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow }]}
        >
          <Pressable
            onPress={() => setAvatarOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('profile.avatarTitle', { defaultValue: 'Profil Rozeti' })}
          >
            <View style={[styles.avatar, { backgroundColor: avatar?.color ?? colors.go }]}>
              {avatar ? (
                <Icon source={avatar.icon} size={26} color="#FFFFFF" />
              ) : (
                <Eyebrow style={{ color: colors.onAccent, fontSize: 17, letterSpacing: 1 }}>{initials.toUpperCase()}</Eyebrow>
              )}
            </View>
            <View style={[styles.avatarBadge, { backgroundColor: colors.paper, borderColor: colors.line }]}>
              <Icon source="pencil" size={11} color={colors.ink} />
            </View>
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Display size="sm" numberOfLines={1}>{user?.firstName} {user?.lastName}</Display>
            <Body size="sm" tone="soft" numberOfLines={1} style={{ marginTop: 2 }}>{user?.email}</Body>
            <Eyebrow tone="mute" numberOfLines={1} style={{ marginTop: 3 }}>@{user?.userName}</Eyebrow>
          </View>
        </Animated.View>

        {/* Premium — durum + paywall girişi */}
        <Eyebrow tone="mute" style={styles.section}>{tPaywall('eyebrow')}</Eyebrow>
        <View style={[styles.group, { backgroundColor: colors.paper, borderColor: colors.line }]}>
          <Pressable
            onPress={() => openPaywall('generic')}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
            accessibilityRole="button"
          >
            <View style={[styles.rowIcon, { backgroundColor: colorAlpha(colors.go, 0.14) }]}>
              <Icon source="crown-outline" size={19} color={colors.go} />
            </View>
            <View style={{ flex: 1 }}>
              <Body weight="bold">{tPaywall('title')}</Body>
              <Body size="xs" tone={!isPremium ? 'mute' : 'soft'} style={{ marginTop: 1 }}>
                {premiumSubtitle}
              </Body>
            </View>
            <Icon source="chevron-right" size={20} color={colors.inkMute} />
          </Pressable>
        </View>

        {/* Hesap */}
        <Eyebrow tone="mute" style={styles.section}>{t('profile.sectionAccount')}</Eyebrow>
        <View style={[styles.group, { backgroundColor: colors.paper, borderColor: colors.line }]}>
          <Pressable
            onPress={() => router.push('/(app)/change-password')}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}
            accessibilityRole="button"
          >
            <View style={[styles.rowIcon, { backgroundColor: colorAlpha(colors.way, 0.14) }]}>
              <Icon source="lock-reset" size={19} color={colors.way} />
            </View>
            <Body weight="bold" style={{ flex: 1 }}>{t('profile.changePasswordTitle')}</Body>
            <Icon source="chevron-right" size={20} color={colors.inkMute} />
          </Pressable>
          <Pressable
            onPress={() => {
              router.push('/(app)/(tabs)');
              setTimeout(() => replayTour(), 350);
            }}
            style={({ pressed }) => [styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, opacity: pressed ? 0.7 : 1 }]}
            accessibilityRole="button"
          >
            <View style={[styles.rowIcon, { backgroundColor: colorAlpha(colors.sky, 0.14) }]}>
              <Icon source="compass-outline" size={19} color={colors.sky} />
            </View>
            <Body weight="bold" style={{ flex: 1 }}>{tCommon('onboarding.replay')}</Body>
            <Icon source="chevron-right" size={20} color={colors.inkMute} />
          </Pressable>
        </View>

        {/* Tema */}
        <Eyebrow tone="mute" style={styles.section}>{t('settings.themeTitle')}</Eyebrow>
        <View style={[styles.group, { backgroundColor: colors.paper, borderColor: colors.line }]}>
          {THEMES.map((th, i) => {
            const active = mode === th.value;
            return (
              <Animated.View key={th.value} entering={FadeInDown.delay(40 + i * 40).duration(280)}>
                <Pressable
                  onPress={() => setMode(th.value)}
                  style={({ pressed }) => [styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }, { opacity: pressed ? 0.7 : 1 }]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                >
                  <View style={[styles.rowIcon, { backgroundColor: active ? colorAlpha(colors.go, 0.14) : colors.bgAlt }]}>
                    <Icon source={th.icon} size={19} color={active ? colors.go : colors.inkSoft} />
                  </View>
                  <Body weight={active ? 'bold' : 'medium'} style={{ flex: 1 }}>{t(th.labelKey)}</Body>
                  {active ? <Icon source="check-circle" size={20} color={colors.go} /> : null}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* Dil */}
        <Eyebrow tone="mute" style={styles.section}>{t('settings.languageTitle')}</Eyebrow>
        <View style={[styles.group, { backgroundColor: colors.paper, borderColor: colors.line }]}>
          {SUPPORTED_LANGS.map((l, i) => {
            const active = i18n.language === l.code;
            return (
              <Pressable
                key={l.code}
                onPress={() => void changeLanguage(l.code)}
                style={({ pressed }) => [styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }, { opacity: pressed ? 0.7 : 1 }]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={l.label}
              >
                <Body size="lg">{l.flag}</Body>
                <Body weight={active ? 'bold' : 'medium'} style={{ flex: 1 }}>{l.label}</Body>
                {active ? <Icon source="check-circle" size={20} color={colors.go} /> : null}
              </Pressable>
            );
          })}
        </View>

        {/* Yasal */}
        <Eyebrow tone="mute" style={styles.section}>{t('profile.legal', { defaultValue: 'Yasal' })}</Eyebrow>
        <View style={[styles.group, { borderColor: colors.line }]}>
          <Pressable
            onPress={() => void Linking.openURL('https://pararotam.com/privacy')}
            style={[styles.legalRow, { borderBottomColor: colors.line }]}
            accessibilityRole="link"
          >
            <Icon source="shield-lock-outline" size={20} color={colors.inkMute} />
            <Body weight="bold" style={{ flex: 1 }}>{t('profile.privacy', { defaultValue: 'Gizlilik Politikası' })}</Body>
            <Icon source="open-in-new" size={16} color={colors.inkMute} />
          </Pressable>
          <Pressable
            onPress={() => void Linking.openURL('https://pararotam.com/terms')}
            style={[styles.legalRow, { borderBottomWidth: 0 }]}
            accessibilityRole="link"
          >
            <Icon source="file-document-outline" size={20} color={colors.inkMute} />
            <Body weight="bold" style={{ flex: 1 }}>{t('profile.terms', { defaultValue: 'Kullanım Şartları' })}</Body>
            <Icon source="open-in-new" size={16} color={colors.inkMute} />
          </Pressable>
        </View>

        <View style={{ height: 24 }} />
        <Button
          mode="outlined"
          icon="logout"
          textColor={colors.halt}
          onPress={() => logout()}
          style={{ borderColor: colorAlpha(colors.halt, 0.4), borderRadius: 12 }}
        >
          {t('userMenu.logout', { defaultValue: 'Çıkış yap' })}
        </Button>

        {/* Tehlikeli bölge — hesap silme */}
        <Eyebrow tone="mute" style={styles.section}>{t('profile.dangerZone', { defaultValue: 'Tehlikeli bölge' })}</Eyebrow>
        <Pressable
          onPress={() => setConfirmDelete(true)}
          accessibilityRole="button"
          style={[styles.deleteRow, { borderColor: colorAlpha(colors.halt, 0.35) }]}
        >
          <Icon source="trash-can-outline" size={20} color={colors.halt} />
          <View style={{ flex: 1 }}>
            <Body weight="bold" style={{ color: colors.halt }}>
              {t('profile.deleteAccountTitle', { defaultValue: 'Hesabımı sil' })}
            </Body>
            <Body size="xs" tone="mute">
              {t('profile.deleteAccountSubtitle', { defaultValue: 'Hesabın ve tüm verilerin kalıcı olarak silinir.' })}
            </Body>
          </View>
        </Pressable>
        <View style={{ height: 24 }} />
      </Screen>

      <AvatarPickerModal visible={avatarOpen} onDismiss={() => setAvatarOpen(false)} />

      <ConfirmDialog
        visible={confirmDelete}
        destructive
        loading={deleting}
        title={t('profile.deleteAccountTitle', { defaultValue: 'Hesabımı sil' })}
        message={t('profile.deleteAccountConfirm', {
          defaultValue: 'Hesabın ve TÜM verilerin (işlemler, bütçeler, hedefler, yatırımlar…) kalıcı olarak silinecek. Bu işlem geri alınamaz.',
        })}
        confirmLabel={t('profile.deleteAccountConfirmBtn', { defaultValue: 'Evet, sil' })}
        onConfirm={() => void deleteAccount()}
        onCancel={() => setConfirmDelete(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
  },
  avatar: { width: 54, height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  avatarBadge: {
    position: 'absolute',
    right: -3,
    bottom: -3,
    width: 20,
    height: 20,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { marginTop: 26, marginBottom: 8, marginLeft: 4 },
  group: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  deleteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  legalRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 14, paddingVertical: 13 },
  rowIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
