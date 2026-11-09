import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { toast } from '@shared/lib/toast';

// Apple Sign In yalnız iOS'ta. Native modül dev build'de bulunur; Expo Go'da
// isAvailableAsync false → buton render edilmez (crash yok).
export const APPLE_LOGIN_AVAILABLE = Platform.OS === 'ios';

export function AppleSignInButton({ onSuccess }: { onSuccess: () => void }) {
  const { dark, colors } = useAppTheme();
  const { t } = useTranslation('auth');
  const appleLogin = useAuthStore((s) => s.appleLogin);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let active = true;
    AppleAuthentication.isAvailableAsync()
      .then((v) => active && setAvailable(v))
      .catch(() => active && setAvailable(false));
    return () => {
      active = false;
    };
  }, []);

  const onPress = async () => {
    try {
      const cred = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!cred.identityToken) return;
      const ok = await appleLogin({
        identityToken: cred.identityToken,
        firstName: cred.fullName?.givenName ?? undefined,
        lastName: cred.fullName?.familyName ?? undefined,
      });
      if (ok) onSuccess();
    } catch {
      // kullanıcı iptal etti / hata → sessiz
    }
  };

  // Expo Go'da Apple native akışı bu uygulamanın bundle'ıyla çalışmaz → buton kaybolmasın
  // diye yer tutucu gösterip bilgilendiriyoruz. Gerçek build'de native buton + tam akış gelir.
  if (!available) {
    return (
      <Button
        mode="outlined"
        icon="apple"
        onPress={() => toast.info(t('login.appleNeedsBuild'))}
        textColor={colors.ink}
        contentStyle={{ paddingVertical: 6 }}
        style={{ borderRadius: 12, borderColor: colors.line, marginBottom: 12 }}
        accessibilityLabel={t('login.appleButton')}
      >
        {t('login.appleButton')}
      </Button>
    );
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      // Koyu zeminde beyaz buton, açık zeminde siyah buton (Apple HIG).
      buttonStyle={
        dark
          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
      }
      cornerRadius={999}
      style={{ height: 48, marginBottom: 12 }}
      onPress={onPress}
    />
  );
}
