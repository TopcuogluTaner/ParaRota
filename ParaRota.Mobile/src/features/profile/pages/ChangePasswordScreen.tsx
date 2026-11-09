import { useRef, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, type TextInput as RNTextInput } from 'react-native';
import { Button, TextInput, HelperText, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppHeader } from '@shared/components/AppHeader';
import { Screen } from '@shared/components/Screen';
import { Body, Eyebrow } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { authApi } from '@features/auth/api/authApi';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';

export function ChangePasswordScreen() {
  const { t } = useTranslation('pages');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const newRef = useRef<RNTextInput | null>(null);

  const currentError = attempted && !currentPassword;
  const newError = attempted && !newPassword;

  const submit = async () => {
    setAttempted(true);
    if (!currentPassword || !newPassword) {
      toast.error(tCommon('fillRequired'));
      return;
    }
    setLoading(true);
    try {
      const resp = await authApi.changePassword(currentPassword, newPassword);
      if (resp.data.isSuccess) {
        toast.success(t('profile.changePasswordSuccess'));
        setCurrent('');
        setNew('');
        setAttempted(false);
      } else {
        toast.error(resp.data.message ?? tCommon('errorGeneric'));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader back title={t('profile.changePasswordTitle')} />
      <Screen edges={['bottom']} contentStyle={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Animated.View entering={FadeInDown.duration(360)} style={styles.form}>
          <View style={[styles.hintRow, { backgroundColor: colorAlpha(colors.way, 0.12), borderColor: colorAlpha(colors.way, 0.3) }]}>
            <Icon source="shield-key-outline" size={18} color={colors.way} />
            <Body size="sm" tone="soft" style={{ flex: 1 }}>{t('profile.changePasswordSubtitle')}</Body>
          </View>

          <View>
            <Eyebrow tone="mute" style={{ marginBottom: 6 }}>{t('profile.currentPasswordLabel')}</Eyebrow>
            <TextInput
              mode="outlined"
              value={currentPassword}
              onChangeText={setCurrent}
              error={currentError}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              returnKeyType="next"
              onSubmitEditing={() => newRef.current?.focus()}
              outlineStyle={{ borderRadius: 12 }}
              style={{ backgroundColor: colors.paper }}
              left={<TextInput.Icon icon="lock-outline" />}
            />
            <HelperText type="error" visible={currentError}>{tCommon('required')}</HelperText>
          </View>

          <View>
            <Eyebrow tone="mute" style={{ marginBottom: 6 }}>{t('profile.newPasswordLabel')}</Eyebrow>
            <TextInput
              ref={newRef}
              mode="outlined"
              value={newPassword}
              onChangeText={setNew}
              error={newError}
              secureTextEntry
              autoComplete="password-new"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={submit}
              outlineStyle={{ borderRadius: 12 }}
              style={{ backgroundColor: colors.paper }}
              left={<TextInput.Icon icon="lock-plus-outline" />}
            />
            <HelperText type="error" visible={newError}>{tCommon('required')}</HelperText>
          </View>

          <Button
            mode="contained"
            loading={loading}
            disabled={loading}
            onPress={submit}
            buttonColor={colors.go}
            textColor={colors.onAccent}
            style={{ borderRadius: 12, marginTop: 4 }}
            contentStyle={{ paddingVertical: 6 }}
            icon={loading ? undefined : 'lock-reset'}
          >
            {t('profile.changePasswordSubmit')}
          </Button>
        </Animated.View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 8 },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
});
