import { Redirect } from 'expo-router';

// Ayarlar profile birleştirildi — eski /settings bağlantıları profile yönlenir.
export default function SettingsRedirect() {
  return <Redirect href="/(app)/profile" />;
}
