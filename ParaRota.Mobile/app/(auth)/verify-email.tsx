import { useEffect, useRef, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable, type TextInput as RNTextInput } from 'react-native';
import { Button, TextInput, HelperText } from 'react-native-paper';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AuthFrame } from '@shared/components/AuthFrame';
import { Body, Eyebrow } from '@shared/components/Typography';
import { authApi } from '@features/auth/api/authApi';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { fontFamily } from '@shared/theme/tokens';

const RESEND_COOLDOWN = 30;

export default function VerifyEmailScreen() {
  const { t } = useTranslation('auth');
  const { colors } = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();

  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const codeRef = useRef<RNTextInput | null>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const emailError = attempted && !email.trim();
  const codeError = attempted && code.replace(/\D/g, '').length !== 6;
  const canSubmit = !loading && email.trim() && code.replace(/\D/g, '').length === 6;

  const submit = async () => {
    setAttempted(true);
    if (!email.trim()) {
      toast.error(t('verify.errorEmailRequired'));
      return;
    }
    if (code.replace(/\D/g, '').length !== 6) {
      toast.error(t('verify.errorCodeIncomplete'));
      return;
    }
    setLoading(true);
    try {
      const resp = await authApi.verifyEmail(email.trim(), code);
      if (resp.data.isSuccess) {
        toast.success(t('verify.successVerified'));
        router.replace('/(auth)/login');
      } else {
        toast.error(resp.data.message ?? t('verify.errorWrongCode'));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t('verify.errorFailed')));
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (!email.trim() || cooldown > 0) return;
    try {
      await authApi.resendVerificationCode(email.trim());
      toast.success(t('verify.infoResent'));
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      toast.error(getErrorMessage(err, t('verify.errorFailed')));
    }
  };

  const subtitle = email.trim()
    ? t('verify.subtitleWithEmail', { email: email.trim() }).replace(/<\/?strong>/g, '')
    : t('verify.subtitleNoEmail');

  return (
    <AuthFrame
      eyebrow={t('verify.eyebrow')}
      title={t('verify.title')}
      subtitle={subtitle}
      footer={
        <Link href="/(auth)/login" asChild>
          <Pressable accessibilityRole="link" hitSlop={8}>
            <Eyebrow tone="go">{t('verify.backToLogin')}</Eyebrow>
          </Pressable>
        </Link>
      }
    >
      <Animated.View entering={FadeInDown.duration(420)} style={styles.form}>
        <View>
          <TextInput
            mode="outlined"
            label={t('verify.emailLabel', { defaultValue: 'Email' })}
            placeholder={t('verify.emailPlaceholder')}
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
            {t('verify.errorEmailRequired')}
          </HelperText>
        </View>
        <View>
          <TextInput
            ref={codeRef}
            mode="outlined"
            label={t('verify.codeLabel', { defaultValue: '6 digit code' })}
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))}
            error={codeError}
            keyboardType="number-pad"
            maxLength={6}
            autoComplete="sms-otp"
            textContentType="oneTimeCode"
            returnKeyType="go"
            onSubmitEditing={submit}
            left={<TextInput.Icon icon="numeric" />}
            outlineStyle={{ borderRadius: 12 }}
            style={{ backgroundColor: colors.paper }}
            contentStyle={{ fontFamily: fontFamily.mono, letterSpacing: 8, textAlign: 'center' }}
          />
          <HelperText type="error" visible={codeError}>
            {t('verify.errorCodeIncomplete')}
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
          icon={loading ? undefined : 'check-decagram-outline'}
          accessibilityLabel={t('verify.submitButton')}
        >
          {loading ? t('verify.submitting') : t('verify.submitButton')}
        </Button>
        <View style={styles.resendRow}>
          <Body size="sm" tone="soft">{t('verify.notReceived')} </Body>
          <Pressable
            onPress={resend}
            disabled={!email.trim() || cooldown > 0}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Eyebrow tone={!email.trim() || cooldown > 0 ? 'mute' : 'go'}>
              {cooldown > 0 ? `${t('verify.resend')} (${cooldown}s)` : t('verify.resend')}
            </Eyebrow>
          </Pressable>
        </View>
      </Animated.View>
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  form: { gap: 8 },
  resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6 },
});
