import { useState } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { toast } from '@shared/lib/toast';
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from '@shared/lib/appConfig';

// Native Google Sign-In (iOS/Android OAuth client + SHA-1). Web-redirect akışındaki
// "secure policy / invalid_request" hatasını ortadan kaldırır.
//
// Native modül yalnız development/production build'de var. Expo Go'da statik import
// "RNGoogleSignin could not be found" ile ÇÖKERTİR → bu yüzden modülü yalnız build'de
// koşullu require ediyoruz; Expo Go'da buton hiç gösterilmez.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

type GoogleSigninModule = {
  configure: (o: { webClientId?: string; iosClientId?: string }) => void;
  hasPlayServices: (o?: { showPlayServicesUpdateDialog?: boolean }) => Promise<boolean>;
  signIn: () => Promise<{ data?: { idToken?: string }; idToken?: string }>;
};

let GoogleSignin: GoogleSigninModule | null = null;
if (!IS_EXPO_GO) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin as GoogleSigninModule;
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
    });
  } catch {
    GoogleSignin = null;
  }
}

// Buton her zaman gösterilir (Expo Go dahil). Expo Go'da native modül yokken tıklanınca
// çökmek yerine bilgilendirme toast'ı gösterilir; gerçek build'de normal akış çalışır.
export const GOOGLE_LOGIN_AVAILABLE = !!GOOGLE_WEB_CLIENT_ID;

export function GoogleSignInButton({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation('auth');
  const { colors } = useAppTheme();
  const googleLogin = useAuthStore((s) => s.googleLogin);
  const [busy, setBusy] = useState(false);

  const onPress = async () => {
    if (busy) return;
    if (!GoogleSignin) {
      toast.info(t('login.googleNeedsBuild'));
      return;
    }
    setBusy(true);
    try {
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      const res = await GoogleSignin.signIn();
      // v13+: { data: { idToken } } · eski sürüm: { idToken } — ikisini de destekle.
      const idToken = res.data?.idToken ?? res.idToken ?? null;
      if (idToken) {
        const ok = await googleLogin(idToken);
        if (ok) onSuccess();
      }
    } catch {
      // kullanıcı iptal etti / Play Services yok → sessiz
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      mode="outlined"
      icon="google"
      loading={busy}
      disabled={busy}
      onPress={onPress}
      textColor={colors.ink}
      contentStyle={{ paddingVertical: 6 }}
      style={{ borderRadius: 12, borderColor: colors.line, marginBottom: 20 }}
      accessibilityLabel={t('login.googleButton')}
    >
      {t('login.googleButton')}
    </Button>
  );
}
