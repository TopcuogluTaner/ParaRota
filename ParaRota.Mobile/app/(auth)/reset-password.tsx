import { useRef, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable, type TextInput as RNTextInput } from 'react-native';
import { Button, TextInput, HelperText } from 'react-native-paper';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuthFrame } from '@shared/components/AuthFrame';
import { Eyebrow } from '@shared/components/Typography';
import { authApi } from '@features/auth/api/authApi';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { fontFamily } from '@shared/theme/tokens';

export default function ResetPasswordScreen() {
  const { t } = useTranslation('auth');
  const { colors } = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; code?: string; token?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState(params.code ?? params.token ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const codeRef = useRef<RNTextInput | null>(null);
  const passwordRef = useRef<RNTextInput | null>(null);
  const confirmRef = useRef<RNTextInput | null>(null);

  const emailError = attempted && !email.trim();
  const codeError = attempted && code.replace(/\D/g, '').length !== 6;
  const tooShortError = attempted && newPassword.length > 0 && newPassword.length < 8;
  const mismatchError = attempted && confirm.length > 0 && newPassword !== confirm;

  const canSubmit =
    !loading &&
    email.trim() &&
    code.replace(/\D/g, '').length === 6 &&
    newPassword.length >= 8 &&
    newPassword === confirm;

  const submit = async () => {
    setAttempted(true);
    if (!canSubmit) {
      if (!email.trim()) toast.error(t('reset.errorEmailRequired'));
      else if (code.replace(/\D/g, '').length !== 6) toast.error(t('reset.errorCodeRequired'));
      else if (newPassword.length < 8) toast.error(t('reset.errorPasswordTooShort'));
      else if (newPassword !== confirm) toast.error(t('reset.errorPasswordMismatch'));
      return;
    }
    setLoading(true);
    try {
      const resp = await authApi.resetPassword({ email: email.trim(), code, newPassword });
      if (resp.data.isSuccess) {
        toast.success(t('reset.successUpdated'));
        router.replace('/(auth)/login');
      } else {
        toast.error(resp.data.message ?? t('reset.errorFailed'));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t('reset.errorUnexpected')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      eyebrow={t('reset.eyebrow')}
      title={t('reset.title')}
      subtitle={t('reset.subtitle')}
      footer={
        <Link href="/(auth)/login" asChild>
          <Pressable accessibilityRole="link" hitSlop={8}>
            <Eyebrow tone="go">{t('reset.backToLogin')}</Eyebrow>
          </Pressable>
        </Link>
      }
    >
      <Animated.View entering={FadeInDown.duration(420)} style={styles.form}>
        <View>
          <TextInput
            mode="outlined"
            label={t('reset.emailLabel')}
            value={email}
            onChangeText={setEmail}
            error={emailError}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            textContentType="emailAddress"
            keyboardType="email-address"
            returnKeyType="next"
            onSubmitEditing={() => codeRef.current?.focus()}
            left={<TextInput.Icon icon="email-outline" />}
            outlineStyle={{ borderRadius: 12 }}
            style={{ backgroundColor: colors.paper }}
          />
          <HelperText type="error" visible={emailError}>
            {t('reset.errorEmailRequired')}
          </HelperText>
        </View>
        <View>
          <TextInput
            ref={codeRef}
            mode="outlined"
            label={t('reset.codeLabel')}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            error={codeError}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            left={<TextInput.Icon icon="numeric" />}
            outlineStyle={{ borderRadius: 12 }}
            style={{ backgroundColor: colors.paper }}
            contentStyle={{ fontFamily: fontFamily.mono, letterSpacing: 6 }}
          />
          <HelperText type="error" visible={codeError}>
            {t('reset.errorCodeRequired')}
          </HelperText>
        </View>
        <View>
          <TextInput
            ref={passwordRef}
            mode="outlined"
            label={t('reset.newPasswordLabel')}
            value={newPassword}
            onChangeText={setNewPassword}
            error={tooShortError}
            secureTextEntry={!show}
            autoComplete="password-new"
            textContentType="newPassword"
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
            outlineStyle={{ borderRadius: 12 }}
            style={{ backgroundColor: colors.paper }}
          />
          <HelperText type="error" visible={tooShortError}>
            {t('reset.errorPasswordTooShort')}
          </HelperText>
        </View>
        <View>
          <TextInput
            ref={confirmRef}
            mode="outlined"
            label={t('reset.confirmLabel')}
            value={confirm}
            onChangeText={setConfirm}
            error={mismatchError}
            secureTextEntry={!show}
            autoComplete="password-new"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={submit}
            left={<TextInput.Icon icon="lock-check-outline" />}
            outlineStyle={{ borderRadius: 12 }}
            style={{ backgroundColor: colors.paper }}
          />
          <HelperText type="error" visible={mismatchError}>
            {t('reset.errorPasswordMismatch')}
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
          style={{ borderRadius: 12, opacity: canSubmit ? 1 : 0.6 }}
          icon={loading ? undefined : 'lock-reset'}
          accessibilityLabel={t('reset.submitButton')}
        >
          {loading ? t('reset.submitting') : t('reset.submitButton')}
        </Button>
      </Animated.View>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  form: { gap: 8 },
});
