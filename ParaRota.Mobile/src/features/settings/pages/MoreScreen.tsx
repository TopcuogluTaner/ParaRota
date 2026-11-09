import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { List, Divider, Button } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@shared/components/AppHeader';
import { ScreenContainer } from '@shared/components/ScreenContainer';
import { useAuthStore } from '@features/auth/store/useAuthStore';

export function MoreScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const { t } = useTranslation('navigation');
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const items: { icon: string; label: string; route: string }[] = [
    { icon: 'shape-outline', label: t('categories'), route: '/(app)/categories' },
    { icon: 'autorenew', label: t('recurring'), route: '/(app)/recurring' },
    { icon: 'calculator-variant-outline', label: t('payroll'), route: '/(app)/payroll' },
    { icon: 'flag-outline', label: t('goals'), route: '/(app)/goals' },
    { icon: 'cash-multiple', label: t('debts'), route: '/(app)/debts' },
    { icon: 'account-group-outline', label: t('household'), route: '/(app)/household' },
    { icon: 'bell-outline', label: t('notifications'), route: '/(app)/notifications' },
    { icon: 'file-download-outline', label: t('exports'), route: '/(app)/exports' },
    { icon: 'account-outline', label: t('profile'), route: '/(app)/profile' },
    { icon: 'cog-outline', label: t('settings'), route: '/(app)/settings' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title={t('more', { defaultValue: 'More' })} />
      <ScreenContainer>
        {user ? (
          <List.Item
            title={`${user.firstName} ${user.lastName}`}
            description={user.email}
            left={(props) => <List.Icon {...props} icon="account-circle-outline" />}
            onPress={() => router.push('/(app)/profile')}
            style={styles.userRow}
          />
        ) : null}
        <Divider />
        {items.map((it) => (
          <List.Item
            key={it.route}
            title={it.label}
            left={(props) => <List.Icon {...props} icon={it.icon} />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => router.push(it.route as any)}
          />
        ))}
        <View style={{ padding: 16 }}>
          <Button mode="outlined" icon="logout" onPress={() => logout()}>
            {t('logout', { defaultValue: 'Logout' })}
          </Button>
        </View>
      </ScreenContainer>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    backgroundColor: 'transparent',
  },
});
