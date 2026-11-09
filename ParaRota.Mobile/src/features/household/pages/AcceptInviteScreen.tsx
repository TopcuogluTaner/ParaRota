import { useEffect, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet } from 'react-native';
import { Button, TextInput, HelperText } from 'react-native-paper';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppHeader } from '@shared/components/AppHeader';
import { Screen } from '@shared/components/Screen';
import { Body, Display, Eyebrow } from '@shared/components/Typography';
import { RouteLine } from '@shared/components/RouteLine';
import { useAcceptInvite } from '@features/household/api/useHouseholds';
import { useActiveHouseholdStore } from '@shared/store/useActiveHouseholdStore';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';

export function AcceptInviteScreen() {
  const { t } = useTranslation('household');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const accept = useAcceptInvite();
  const setActive = useActiveHouseholdStore((s) => s.setActive);

  const [token, setToken] = useState(params.token ?? '');
  const [attempted, setAttempted] = useState(false);

  const tokenError = !token.trim();

  useEffect(() => {
    if (params.token) setToken(params.token);
  }, [params.token]);

  const submit = async () => {
    if (tokenError) {
      setAttempted(true);
      toast.error(tCommon('fillRequired'));
      return;
    }
    try {
      const res = await accept.mutateAsync(token.trim());
      toast.success(t('accept_toastSuccess', { name: res.householdName }));
      setActive(res.householdId);
      router.replace('/(app)/(tabs)');
    } catch (err) {
      toast.error(getErrorMessage(err, t('invite_toastError')));
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('accept_pageTitle')} back />
      <Screen edges={['bottom']} contentStyle={{ paddingHorizontal: 16, paddingTop: 14 }}>
        <Animated.View entering={FadeInDown.duration(360)}>
          <Eyebrow tone="mute">{t('invite_eyebrow')}</Eyebrow>
          <Display size="md" style={{ marginTop: 6 }}>{t('accept_pageSubtitle')}</Display>
          <RouteLine style={{ marginVertical: 16 }} />

          <TextInput
            mode="outlined"
            label={t('invite_emailPlaceholder')}
            value={token}
            onChangeText={setToken}
            error={attempted && tokenError}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="go"
            onSubmitEditing={submit}
            outlineStyle={{ borderRadius: 12 }}
            style={{ backgroundColor: colors.paper }}
          />
          <HelperText type="error" visible={attempted && tokenError}>{tCommon('required')}</HelperText>
          <Button
            mode="contained"
            style={{ marginTop: 16, borderRadius: 12 }}
            loading={accept.isPending}
            disabled={accept.isPending}
            onPress={submit}
            buttonColor={colors.go}
            textColor={colors.onAccent}
            icon={accept.isPending ? undefined : 'arrow-right'}
            contentStyle={{ paddingVertical: 6 }}
            accessibilityLabel={t('accept_button')}
          >
            {accept.isPending ? t('accept_loading') : t('accept_button')}
          </Button>
        </Animated.View>
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({});
