import { useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable } from 'react-native';
import { Button, TextInput, HelperText } from 'react-native-paper';
import { Link, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { AuthFrame } from '@shared/components/AuthFrame';
import { Body, Eyebrow } from '@shared/components/Typography';
import { RouteLine } from '@shared/components/RouteLine';
import { authApi } from '@features/auth/api/authApi';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { fontFamily } from '@shared/theme/tokens';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);

  const emailInvalid = touched && !EMAIL_RE.test(email.trim());
  const canSubmit = !loading && EMAIL_RE.test(email.trim());

  const submit = async () => {
    setTouched(true);
    if (!canSubmit) return;
    setLoading(true);
    try {
      const resp = await authApi.forgotPassword(email.trim());
      if (resp.data.isSuccess) {
        setSent(true);
      } else {
        toast.error(resp.data.message ?? t('forgot.errorFailed'));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t('forgot.errorUnexpected')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFrame
      eyebrow={t('forgot.eyebrow')}
      title={sent ? t('forgot.sentTitle') : t('forgot.title')}
      subtitle={sent ? undefined : t('forgot.subtitle')}
      footer={
        <Link href="/(auth)/login" asChild>
          <Pressable accessibilityRole="link" hitSlop={8}>
            <Eyebrow tone="go">{t('forgot.backToLogin')}</Eyebrow>
          </Pressable>
        </Link>
      }
    >
      {sent ? (
        <Animated.View entering={FadeIn.duration(420)} style={styles.successCard}>
          <View style={[styles.successInner, { borderColor: colors.lineStrong, backgroundColor: colors.paper2 }]}>
            <Eyebrow tone="go" style={{ marginBottom: 6 }}>✓</Eyebrow>
            <Body size="md" tone="ink">
              {t('forgot.sentSubtitle', { email: email.trim() }).replace(/<\/?strong>/g, '')}
            </Body>
            <RouteLine style={{ marginVertical: 18 }} />
            <Body size="sm" tone="soft" style={{ fontFamily: fontFamily.mono }}>
              {email.trim()}
            </Body>
          </View>
          <Button
            mode="contained"
            onPress={() => router.replace({ pathname: '/(auth)/reset-password', params: { email: email.trim() } })}
            buttonColor={colors.go}
            textColor={colors.onAccent}
            contentStyle={{ paddingVertical: 6 }}
            style={{ borderRadius: 12, marginTop: 18 }}
            icon="arrow-right"
          >
            {t('reset.submitButton')}
          </Button>
          <Button
            mode="text"
            onPress={() => { setSent(false); setTouched(false); }}
            textColor={colors.inkSoft}
            style={{ marginTop: 6 }}
          >
            {t('forgot.emailLabel')}
          </Button>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInDown.duration(420)} style={styles.form}>
          <View>
            <TextInput
              mode="outlined"
              label={t('forgot.emailLabel')}
              value={email}
              onChangeText={setEmail}
              onBlur={() => setTouched(true)}
              error={emailInvalid}
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              textContentType="emailAddress"
              keyboardType="email-address"
              returnKeyType="send"
              onSubmitEditing={submit}
              left={<TextInput.Icon icon="email-outline" />}
              outlineStyle={{ borderRadius: 12 }}
              style={{ backgroundColor: colors.paper }}
            />
            <HelperText type="error" visible={emailInvalid}>
              {tCommon('required')}
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
            icon={loading ? undefined : 'email-fast-outline'}
            accessibilityLabel={t('forgot.submitButton')}
          >
            {loading ? t('forgot.submitting') : t('forgot.submitButton')}
          </Button>
        </Animated.View>
      )}
    </AuthFrame>
  );
}

const styles = StyleSheet.create({
  form: { gap: 8 },
  successCard: { gap: 4 },
  successInner: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    padding: 18,
  },
});
