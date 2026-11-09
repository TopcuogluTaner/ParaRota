import { useRef, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable, type TextInput as RNTextInput } from 'react-native';
import { Button, TextInput, HelperText } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuthFrame } from '@shared/components/AuthFrame';
import { Body, Eyebrow } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { authApi } from '@features/auth/api/authApi';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';

const USERNAME_RE = /^[a-z0-9._-]+$/i;

export default function RegisterScreen() {
  const { t } = useTranslation('auth');
  const { colors } = useAppTheme();
  const router = useRouter();

  const inputTheme = {
    colors: { background: colorAlpha(colors.paper, 0.92), onSurfaceVariant: colors.inkMute, primary: colors.go },
  };

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const lastNameRef = useRef<RNTextInput | null>(null);
  const emailRef = useRef<RNTextInput | null>(null);
  const userNameRef = useRef<RNTextInput | null>(null);
  const passwordRef = useRef<RNTextInput | null>(null);
  const confirmRef = useRef<RNTextInput | null>(null);

  const userNameError = attempted && userName.length > 0 && (userName.length < 3 || !USERNAME_RE.test(userName));
  const passwordTooShortError = attempted && password.length > 0 && password.length < 8;
  const mismatchError = attempted && confirm.length > 0 && password !== confirm;

  const canSubmit =
    firstName.trim() &&
    lastName.trim() &&
    email.trim() &&
    userName.trim().length >= 3 &&
    USERNAME_RE.test(userName) &&
    password.length >= 8 &&
    password === confirm &&
    !loading;

  const submit = async () => {
    setAttempted(true);
    if (!canSubmit) return;
    setLoading(true);
    try {
      const resp = await authApi.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        userName: userName.trim(),
        password,
      });
      if (!resp.data.isSuccess) {
        toast.error(resp.data.message ?? t('register.errorFailed'));
        return;
      }
      toast.success(t('register.successCreated'));
      router.replace({ pathname: '/(auth)/verify-email', params: { email: email.trim() } });
    } catch (err) {
      toast.error(getErrorMessage(err, t('register.errorUnexpected')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      eyebrow={t('register.eyebrow')}
      title={t('register.title')}
      subtitle={t('register.subtitle')}
      footer={
        <View style={styles.footerRow}>
          <Body size="sm" tone="soft">{t('register.haveAccount')} </Body>
          <Link href="/(auth)/login" asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <Eyebrow tone="go">{t('register.loginLink')} →</Eyebrow>
            </Pressable>
          </Link>
        </View>
      }
    >
      <Animated.View entering={FadeInDown.duration(420)} style={styles.form}>
        <View style={styles.row}>
          <TextInput
            mode="outlined"
            label={t('register.firstNameLabel')}
            value={firstName}
            onChangeText={setFirstName}
            autoComplete="name-given"
            textContentType="givenName"
            returnKeyType="next"
            onSubmitEditing={() => lastNameRef.current?.focus()}
            outlineStyle={{ borderRadius: 16 }}
            style={{ flex: 1 }}
            theme={inputTheme}
          />
          <TextInput
            ref={lastNameRef}
            mode="outlined"
            label={t('register.lastNameLabel')}
            value={lastName}
            onChangeText={setLastName}
            autoComplete="name-family"
            textContentType="familyName"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            outlineStyle={{ borderRadius: 16 }}
            style={{ flex: 1 }}
            theme={inputTheme}
          />
        </View>
        <TextInput
          ref={emailRef}
          mode="outlined"
          label={t('register.emailLabel')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          textContentType="emailAddress"
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={() => userNameRef.current?.focus()}
          left={<TextInput.Icon icon="email-outline" />}
          outlineStyle={{ borderRadius: 16 }}
          theme={inputTheme}
        />
        <View>
          <TextInput
            ref={userNameRef}
            mode="outlined"
            label={t('register.userNameLabel')}
            value={userName}
            onChangeText={setUserName}
            autoCapitalize="none"
            autoComplete="username-new"
            autoCorrect={false}
            textContentType="username"
            error={userNameError}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            left={<TextInput.Icon icon="account-outline" />}
            outlineStyle={{ borderRadius: 16 }}
            theme={inputTheme}
          />
          <HelperText type={userNameError ? 'error' : 'info'} visible>
            {userNameError ? t('register.errorUserNameTooShort') : t('register.userNameHelper')}
          </HelperText>
        </View>
        <View>
          <TextInput
            ref={passwordRef}
            mode="outlined"
            label={t('register.passwordLabel')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!show}
            autoComplete="password-new"
            textContentType="newPassword"
            error={passwordTooShortError}
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            left={<TextInput.Icon icon="lock-outline" />}
            right={
              <TextInput.Icon
                icon={show ? 'eye-off-outline' : 'eye-outline'}
                onPress={() => setShow((s) => !s)}
                forceTextInputFocus={false}
              />
            }
            outlineStyle={{ borderRadius: 16 }}
            theme={inputTheme}
          />
          <HelperText type={passwordTooShortError ? 'error' : 'info'} visible>
            {passwordTooShortError ? t('register.errorPasswordTooShort') : t('register.passwordHelper')}
          </HelperText>
        </View>
        <View>
          <TextInput
            ref={confirmRef}
            mode="outlined"
            label={t('register.confirmLabel')}
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!show}
            autoComplete="password-new"
            textContentType="newPassword"
            error={mismatchError}
            returnKeyType="go"
            onSubmitEditing={submit}
            left={<TextInput.Icon icon="lock-check-outline" />}
            outlineStyle={{ borderRadius: 16 }}
            theme={inputTheme}
          />
          <HelperText type="error" visible={mismatchError}>
            {t('register.errorPasswordMismatch')}
          </HelperText>
        </View>
        <Button
          mode="contained"
          loading={loading}
          disabled={loading}
          onPress={submit}
          buttonColor={colors.go}
          textColor={colors.onAccent}
          contentStyle={{ paddingVertical: 6 }}
          style={{ borderRadius: 999, opacity: canSubmit ? 1 : 0.6 }}
          icon={loading ? undefined : 'arrow-right'}
          accessibilityLabel={t('register.submitButton')}
        >
          {loading ? t('register.submitting') : t('register.submitButton')}
        </Button>
      </Animated.View>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  form: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
