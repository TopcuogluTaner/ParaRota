import { useRef, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable, type TextInput as RNTextInput } from 'react-native';
import { Button, TextInput, Menu, HelperText } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { GoogleSignInButton, GOOGLE_LOGIN_AVAILABLE } from '@features/auth/components/GoogleSignInButton';
import { AppleSignInButton, APPLE_LOGIN_AVAILABLE } from '@features/auth/components/AppleSignInButton';
import { Body, Display, Eyebrow } from '@shared/components/Typography';
import { RouteLine } from '@shared/components/RouteLine';
import { BrandMark } from '@shared/components/BrandMark';
import { AuthGlass } from '@shared/components/AuthGlass';
import { SUPPORTED_LANGS, changeLanguage } from '@shared/i18n';
import { fontFamily } from '@shared/theme/tokens';
import { colorAlpha } from '@shared/lib/colorAlpha';

export default function LoginScreen() {
  const { t, i18n } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const router = useRouter();

  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [langMenu, setLangMenu] = useState(false);
  const [touched, setTouched] = useState<{ id: boolean; pw: boolean }>({ id: false, pw: false });
  const passwordRef = useRef<RNTextInput | null>(null);

  const currentLang = SUPPORTED_LANGS.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGS[0];
  const idError = touched.id && !identifier.trim();
  const pwError = touched.pw && !password;

  const submit = async () => {
    setTouched({ id: true, pw: true });
    if (!identifier.trim() || !password) return;
    const ok = await login({ emailOrUserName: identifier.trim(), password });
    if (ok) router.replace('/(app)/(tabs)');
  };

  const inputTheme = {
    colors: { background: colorAlpha(colors.paper, 0.92), onSurfaceVariant: colors.inkMute, primary: colors.go },
  };

  const topBar = (
    <>
      <View />
      <Menu
        visible={langMenu}
        onDismiss={() => setLangMenu(false)}
        anchor={
          <Pressable
            onPress={() => setLangMenu(true)}
            style={[styles.langChip, { borderColor: colorAlpha(colors.ink, 0.2), backgroundColor: colorAlpha(colors.paper, 0.5) }]}
            accessibilityRole="button"
            accessibilityLabel={currentLang.label}
          >
            <Body size="sm">{currentLang.flag}</Body>
            <Eyebrow tone="mute">{currentLang.code.toUpperCase()}</Eyebrow>
          </Pressable>
        }
        contentStyle={{ backgroundColor: colors.paper }}
      >
        {SUPPORTED_LANGS.map((l) => (
          <Menu.Item
            key={l.code}
            title={`${l.flag}  ${l.label}`}
            onPress={() => { void changeLanguage(l.code); setLangMenu(false); }}
          />
        ))}
      </Menu>
    </>
  );

  return (
    <AuthGlass topBar={topBar}>
      <BrandMark size={34} />
      <View style={styles.coordRow}>
        <View style={[styles.coordDot, { backgroundColor: colors.way }]} />
        <Eyebrow tone="mute">{t('login.eyebrow')}</Eyebrow>
      </View>
      <Display size="lg" italic style={{ marginTop: 8 }}>{t('login.title')}</Display>
      <Body size="md" tone="soft" style={{ marginTop: 6 }}>{t('login.subtitle')}</Body>

      <View style={{ gap: 4, marginTop: 22 }}>
        <TextInput
          mode="outlined"
          label={t('login.identifierLabel')}
          placeholder={t('login.identifierPlaceholder')}
          value={identifier}
          onChangeText={setIdentifier}
          onBlur={() => setTouched((s) => ({ ...s, id: true }))}
          error={idError}
          autoCapitalize="none"
          autoComplete="username"
          autoCorrect={false}
          textContentType="username"
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          left={<TextInput.Icon icon="account-outline" />}
          outlineStyle={styles.inputOutline}
          theme={inputTheme}
          contentStyle={{ fontFamily: fontFamily.body }}
        />
        <HelperText type="error" visible={idError}>{tCommon('required')}</HelperText>

        <TextInput
          ref={passwordRef}
          mode="outlined"
          label={t('login.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          onBlur={() => setTouched((s) => ({ ...s, pw: true }))}
          error={pwError}
          secureTextEntry={!showPassword}
          autoComplete="password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          left={<TextInput.Icon icon="lock-outline" />}
          right={
            <TextInput.Icon
              icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onPress={() => setShowPassword((p) => !p)}
              forceTextInputFocus={false}
            />
          }
          outlineStyle={styles.inputOutline}
          theme={inputTheme}
          contentStyle={{ fontFamily: fontFamily.body }}
        />
        <View style={styles.forgotRow}>
          <Link href="/(auth)/forgot-password" asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <Eyebrow tone="go">{t('login.forgotPassword')}</Eyebrow>
            </Pressable>
          </Link>
        </View>

        <Button
          mode="contained"
          loading={isLoading}
          disabled={isLoading}
          onPress={submit}
          buttonColor={colors.go}
          textColor={colors.onAccent}
          contentStyle={{ paddingVertical: 8 }}
          style={styles.cta}
          icon={isLoading ? undefined : 'arrow-right'}
          accessibilityLabel={t('login.submitButton')}
        >
          {isLoading ? t('login.submitting') : t('login.submitButton')}
        </Button>
      </View>

      <View style={styles.dividerRow}>
        <RouteLine style={{ flex: 1 }} color={colorAlpha(colors.ink, 0.18)} />
        <Eyebrow tone="mute" style={{ marginHorizontal: 12 }}>{t('login.orDivider')}</Eyebrow>
        <RouteLine style={{ flex: 1 }} color={colorAlpha(colors.ink, 0.18)} />
      </View>

      {APPLE_LOGIN_AVAILABLE && (
        <AppleSignInButton onSuccess={() => router.replace('/(app)/(tabs)')} />
      )}
      {GOOGLE_LOGIN_AVAILABLE && (
        <GoogleSignInButton onSuccess={() => router.replace('/(app)/(tabs)')} />
      )}

      <View style={styles.bottomRow}>
        <Body size="sm" tone="soft">{t('login.noAccount')} </Body>
        <Link href="/(auth)/register" asChild>
          <Pressable accessibilityRole="link" hitSlop={8}>
            <Eyebrow tone="go">{t('login.startRoute')}</Eyebrow>
          </Pressable>
        </Link>
      </View>
    </AuthGlass>
  );
}

const styles = StyleSheet.create({
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  coordRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  coordDot: { width: 7, height: 7, borderRadius: 4 },
  inputOutline: { borderRadius: 16 },
  forgotRow: { alignItems: 'flex-end', marginTop: 2, marginBottom: 10 },
  cta: { borderRadius: 999 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 22 },
  bottomRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
});
