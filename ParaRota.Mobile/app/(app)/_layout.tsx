import { Redirect } from 'expo-router';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { Drawer } from 'expo-router/drawer';
import { } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { DrawerContent } from '@shared/components/DrawerContent';
import { OnboardingGate } from '@features/onboarding/OnboardingGate';
import { fontFamily } from '@shared/theme/tokens';

export default function AppGroupLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { colors } = useAppTheme();
  const { t } = useTranslation('navigation');

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;

  return (
    <>
    <Drawer
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: 'rgba(0,0,0,0.42)',
        drawerStyle: {
          backgroundColor: 'transparent',
          width: 296,
        },
        sceneStyle: { backgroundColor: colors.bg },
        drawerActiveTintColor: colors.go,
        drawerInactiveTintColor: colors.inkSoft,
        drawerLabelStyle: { fontFamily: fontFamily.body, fontSize: 14 },
      }}
    >
      <Drawer.Screen name="(tabs)" options={{ title: t('atlas', { defaultValue: 'Atlas' }), drawerLabel: t('atlas', { defaultValue: 'Atlas' }) }} />
      <Drawer.Screen name="categories" options={{ title: t('categories', { defaultValue: 'Categories' }) }} />
      <Drawer.Screen name="recurring" options={{ title: t('recurring', { defaultValue: 'Recurring' }) }} />
      <Drawer.Screen name="calculators" options={{ title: t('calculators', { defaultValue: 'Calculators' }) }} />
      <Drawer.Screen name="loan-cost" options={{ title: t('calculators', { defaultValue: 'Calculators' }) }} />
      <Drawer.Screen name="payroll" options={{ title: t('payroll', { defaultValue: 'Salary Calculator' }) }} />
      <Drawer.Screen name="rent" options={{ title: t('rent', { defaultValue: 'Rent Increase' }) }} />
      <Drawer.Screen name="money-value" options={{ title: t('moneyValue', { defaultValue: "Money's Value" }) }} />
      <Drawer.Screen name="installments" options={{ title: t('installments', { defaultValue: 'Installments' }) }} />
      <Drawer.Screen name="debts" options={{ title: t('debts', { defaultValue: 'Debts' }) }} />
      <Drawer.Screen name="gold-days" options={{ title: t('goldDays', { defaultValue: 'Gold Day' }) }} />
      <Drawer.Screen name="gold-day-detail" options={{ title: t('goldDays', { defaultValue: 'Gold Day' }), drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="price-alarms" options={{ title: t('priceAlarms', { defaultValue: 'Price Alarms' }) }} />
      <Drawer.Screen name="shared-pots" options={{ title: t('sharedPots', { defaultValue: 'Shared Pot' }) }} />
      <Drawer.Screen name="shared-pot-detail" options={{ title: t('sharedPots', { defaultValue: 'Shared Pot' }), drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="household" options={{ title: t('household', { defaultValue: 'Household' }) }} />
      <Drawer.Screen name="notifications" options={{ title: t('notifications', { defaultValue: 'Notifications' }) }} />
      <Drawer.Screen name="exports" options={{ title: t('exports', { defaultValue: 'Exports' }) }} />
      <Drawer.Screen name="profile" options={{ title: t('profile', { defaultValue: 'Profile' }) }} />
      <Drawer.Screen name="settings" options={{ title: t('settings', { defaultValue: 'Settings' }) }} />
      <Drawer.Screen name="accept-invite" options={{ title: t('acceptInvite', { defaultValue: 'Join household' }), drawerItemStyle: { display: 'none' } }} />
      <Drawer.Screen name="paywall" options={{ title: t('premium', { defaultValue: 'Premium' }), drawerItemStyle: { display: 'none' } }} />
    </Drawer>
    <OnboardingGate />
    </>
  );
}
