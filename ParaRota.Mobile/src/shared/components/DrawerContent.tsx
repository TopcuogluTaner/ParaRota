import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, Button } from 'react-native-paper';
import { useRouter, usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useDrawerStatus, type DrawerContentComponentProps } from '@react-navigation/drawer';
import { BrandMark } from './BrandMark';
import { Body, Display, Eyebrow } from './Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { parseAvatar } from '@features/profile/lib/avatar';
import { useThemeStore, type ThemeMode } from '@shared/store/useThemeStore';
import { isMenuTourSeen, markMenuTourSeen } from '@features/onboarding/pageTours';

interface Stop {
  icon: string;
  label: string;
  route: string;
  /** Sağda chevron göster — içinde alt menü (hub) olduğunu belirtir. */
  more?: boolean;
}

const THEME_OPTIONS: { value: ThemeMode; icon: string }[] = [
  { value: 'system', icon: 'theme-light-dark' },
  { value: 'light', icon: 'white-balance-sunny' },
  { value: 'dark', icon: 'weather-night' },
];

// Drawer ilk açıldığında bu ekranlar tek tek tanıtılır (Yatırımlar'dan başlayarak).
const TOUR_KEYS: Record<string, string> = {
  '/(app)/investments': 'onboarding.tour_inv',
  '/(app)/debts': 'onboarding.tour_debt',
  '/(app)/gold-days': 'onboarding.tour_golddays',
  '/(app)/price-alarms': 'onboarding.tour_pricealarms',
  '/(app)/shared-pots': 'onboarding.tour_sharedpots',
  '/(app)/calculators': 'onboarding.tour_calculators',
  '/(app)/installments': 'onboarding.tour_installments',
  '/(app)/categories': 'onboarding.tour_cat',
  '/(app)/recurring': 'onboarding.tour_rec',
  '/(app)/household': 'onboarding.tour_hh',
  '/(app)/exports': 'onboarding.tour_exp',
};

export function DrawerContent(props: DrawerContentComponentProps) {
  const { colors } = useAppTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useTranslation('navigation');
  const { t: tCommon } = useTranslation('common');
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const drawerStatus = useDrawerStatus();

  const primary: Stop[] = [
    { icon: 'view-dashboard-outline', label: t('dashboard', { defaultValue: 'Dashboard' }), route: '/(app)/(tabs)' },
    { icon: 'swap-horizontal', label: t('transactions', { defaultValue: 'Transactions' }), route: '/(app)/(tabs)/transactions' },
    { icon: 'chart-arc', label: t('budgets', { defaultValue: 'Budgets' }), route: '/(app)/(tabs)/budgets' },
    { icon: 'flag-outline', label: t('goals', { defaultValue: 'Goals' }), route: '/(app)/(tabs)/goals' },
  ];

  const secondary: Stop[] = [
    { icon: 'chart-line-variant', label: t('investments', { defaultValue: 'Investments' }), route: '/(app)/investments' },
    { icon: 'cash-multiple', label: t('debts', { defaultValue: 'Debts' }), route: '/(app)/debts' },
    { icon: 'gold', label: t('goldDays', { defaultValue: 'Gold Day' }), route: '/(app)/gold-days' },
    { icon: 'bell-alert-outline', label: t('priceAlarms', { defaultValue: 'Price Alarms' }), route: '/(app)/price-alarms' },
    { icon: 'account-cash-outline', label: t('sharedPots', { defaultValue: 'Shared Pot' }), route: '/(app)/shared-pots' },
    { icon: 'credit-card-clock-outline', label: t('installments', { defaultValue: 'Installments' }), route: '/(app)/installments' },
    { icon: 'calculator-variant-outline', label: t('calculators', { defaultValue: 'Calculators' }), route: '/(app)/calculators', more: true },
    { icon: 'shape-outline', label: t('categories', { defaultValue: 'Categories' }), route: '/(app)/categories' },
    { icon: 'autorenew', label: t('recurring', { defaultValue: 'Recurring' }), route: '/(app)/recurring' },
    { icon: 'account-group-outline', label: t('household', { defaultValue: 'Household' }), route: '/(app)/household' },
    { icon: 'bell-outline', label: t('notifications', { defaultValue: 'Notifications' }), route: '/(app)/notifications' },
    { icon: 'file-download-outline', label: t('exports', { defaultValue: 'Exports' }), route: '/(app)/exports' },
    { icon: 'account-cog-outline', label: t('profile', { defaultValue: 'Profile' }), route: '/(app)/profile' },
  ];

  // ── Menü içi tek-tek tanıtım turu ──────────────────────────────────────
  const tourStops = secondary.filter((s) => TOUR_KEYS[s.route]);
  const [tourIdx, setTourIdx] = useState<number | null>(null);
  const startedRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const rowY = useRef<Record<string, number>>({});
  const touring = tourIdx != null;
  const currentRoute = touring ? tourStops[tourIdx].route : null;

  const finishTour = () => { markMenuTourSeen(); setTourIdx(null); };
  const nextTour = () => {
    setTourIdx((i) => {
      if (i == null) return null;
      if (i + 1 < tourStops.length) return i + 1;
      markMenuTourSeen();
      return null;
    });
  };

  // Drawer ilk kez açılınca turu başlat; kapanınca (turdaysa) bitir.
  useEffect(() => {
    if (drawerStatus === 'open') {
      if (startedRef.current) return;
      let cancelled = false;
      (async () => {
        if (await isMenuTourSeen()) return;
        if (cancelled) return;
        startedRef.current = true;
        setTourIdx(0);
      })();
      return () => { cancelled = true; };
    }
    // kapandı: turu sessizce bitir
    setTourIdx((i) => (i != null ? (markMenuTourSeen(), null) : null));
  }, [drawerStatus]);

  // Aktif tanıtım öğesini görünüre kaydır.
  useEffect(() => {
    if (currentRoute == null) return;
    const y = rowY.current[currentRoute];
    if (y != null) scrollRef.current?.scrollTo({ y: Math.max(0, y - 110), animated: true });
  }, [currentRoute]);

  const isActive = (route: string) => {
    if (route === '/(app)/(tabs)') return pathname === '/' || pathname === '/(app)/(tabs)';
    return pathname.endsWith(route.split('/').pop() ?? '');
  };

  const go = (route: string) => {
    props.navigation.closeDrawer();
    router.push(route as any);
  };

  const dimDuringTour = (extra?: object) => (touring ? [{ opacity: 0.32 }, extra] : extra);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, { backgroundColor: colors.paper }]}>
      <View pointerEvents="none" style={[styles.rightEdge, { backgroundColor: colors.line }]} />
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: touring ? 200 : 32 }} showsVerticalScrollIndicator={false}>
        <BrandMark size={36} />

        {user ? (
          <Pressable
            onPress={() => !touring && go('/(app)/profile')}
            style={[styles.userCard, { backgroundColor: colors.bgAlt }, dimDuringTour()]}
          >
            {/* Profil rozeti seçiliyse ikon+renk, değilse baş harfler (ProfileScreen ile aynı kural). */}
            {(() => {
              const avatar = parseAvatar(user.avatar);
              return (
                <View style={[styles.avatar, { backgroundColor: avatar?.color ?? colors.go }]}>
                  {avatar ? (
                    <Icon source={avatar.icon} size={18} color="#FFFFFF" />
                  ) : (
                    <Body style={{ color: colors.onAccent, fontSize: 14, fontWeight: '600' }}>
                      {((user.firstName?.[0] ?? '?') + (user.lastName?.[0] ?? '')).toUpperCase()}
                    </Body>
                  )}
                </View>
              );
            })()}
            <View style={{ flex: 1 }}>
              <Display size="xs" style={{ marginTop: 0 }}>{user.firstName}</Display>
              <Body size="xs" tone="mute" numberOfLines={1}>{user.email}</Body>
            </View>
          </Pressable>
        ) : null}

        <Eyebrow tone="mute" style={[styles.sectionLabel, dimDuringTour()]}>{t('primaryRoutes')}</Eyebrow>
        {primary.map((s) => {
          const isOn = isActive(s.route);
          return (
            <Pressable
              key={s.route}
              onPress={() => !touring && go(s.route)}
              style={({ pressed }) => [
                styles.row,
                { backgroundColor: isOn ? colors.bgAlt : 'transparent', opacity: pressed ? 0.7 : 1 },
                dimDuringTour(),
              ]}
            >
              <Icon source={s.icon} size={20} color={isOn ? colors.ink : colors.inkSoft} />
              <Body style={{ flex: 1, color: isOn ? colors.ink : colors.inkSoft, fontWeight: isOn ? '600' : '500' }}>
                {s.label}
              </Body>
              {isOn ? <View style={[styles.activeDot, { backgroundColor: colors.go }]} /> : null}
            </Pressable>
          );
        })}

        <Eyebrow tone="mute" style={[styles.sectionLabel, dimDuringTour()]}>{t('secondaryStops')}</Eyebrow>
        {secondary.map((s) => {
          const isOn = isActive(s.route);
          const isCurrent = currentRoute === s.route;
          const dim = touring && !isCurrent;
          return (
            <Pressable
              key={s.route}
              onLayout={(e) => { rowY.current[s.route] = e.nativeEvent.layout.y; }}
              onPress={() => {
                if (touring) { if (isCurrent) nextTour(); return; }
                go(s.route);
              }}
              style={({ pressed }) => [
                styles.row,
                isCurrent
                  ? { backgroundColor: colorAlpha(colors.go, 0.12), borderWidth: StyleSheet.hairlineWidth, borderColor: colors.go }
                  : { backgroundColor: isOn ? colors.bgAlt : 'transparent' },
                { opacity: dim ? 0.32 : pressed ? 0.7 : 1 },
              ]}
            >
              <Icon source={s.icon} size={20} color={isCurrent ? colors.go : isOn ? colors.ink : colors.inkSoft} />
              <Body style={{ flex: 1, color: isCurrent ? colors.go : isOn ? colors.ink : colors.inkSoft, fontWeight: isCurrent || isOn ? '600' : '500' }}>
                {s.label}
              </Body>
              {s.more ? <Icon source="chevron-right" size={18} color={isCurrent ? colors.go : colors.inkMute} /> : null}
            </Pressable>
          );
        })}

        <View style={[styles.themeRow, dimDuringTour()]}>
          <Icon source="theme-light-dark" size={20} color={colors.inkSoft} />
          <Body style={{ flex: 1, color: colors.inkSoft, fontWeight: '500' }}>{t('theme')}</Body>
          <View style={[styles.themeSwitch, { borderColor: colors.line, backgroundColor: colors.bgAlt }]}>
            {THEME_OPTIONS.map((opt) => {
              const active = mode === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => !touring && setMode(opt.value)}
                  style={[styles.themeSeg, active && { backgroundColor: colors.paper, borderColor: colors.line }]}
                  accessibilityRole="button"
                  accessibilityLabel={opt.value}
                  accessibilityState={{ selected: active }}
                >
                  <Icon source={opt.icon} size={17} color={active ? colors.go : colors.inkMute} />
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.line }]} />
        <Button
          mode="text"
          icon="logout"
          textColor={colors.halt}
          disabled={touring}
          onPress={() => { props.navigation.closeDrawer(); logout(); }}
          style={[{ alignSelf: 'flex-start', marginLeft: -8 }, dimDuringTour()]}
        >
          {t('logout')}
        </Button>
      </ScrollView>

      {/* Menü turu açıklama paneli (altta sabit) */}
      {touring && currentRoute ? (
        <View style={[styles.tourPanel, { backgroundColor: colors.paper, borderColor: colors.go, boxShadow: colors.cardShadow }]}>
          <View style={styles.tourHead}>
            <Eyebrow tone="go">{tCommon('onboarding.menuTourTitle')}</Eyebrow>
            <View style={{ flex: 1 }} />
            <Eyebrow tone="mute">{(tourIdx ?? 0) + 1} / {tourStops.length}</Eyebrow>
          </View>
          <Body weight="bold" style={{ marginTop: 4 }}>{tourStops[tourIdx!].label}</Body>
          <Body size="sm" tone="soft" style={{ marginTop: 4 }}>{tCommon(TOUR_KEYS[currentRoute])}</Body>
          <View style={styles.tourBtns}>
            <Button mode="text" textColor={colors.inkSoft} onPress={finishTour} compact>
              {tCommon('onboarding.skip')}
            </Button>
            <View style={{ flex: 1 }} />
            <Button mode="contained" buttonColor={colors.go} textColor={colors.onAccent} onPress={nextTour} style={{ borderRadius: 999 }}>
              {(tourIdx ?? 0) + 1 < tourStops.length ? tCommon('onboarding.next') : tCommon('onboarding.finish')}
            </Button>
          </View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  rightEdge: { position: 'absolute', top: 0, bottom: 0, right: 0, width: StyleSheet.hairlineWidth },
  userCard: { marginTop: 20, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { marginTop: 22, marginBottom: 6, marginLeft: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 10, marginBottom: 2 },
  activeDot: { width: 6, height: 6, borderRadius: 999 },
  divider: { height: StyleSheet.hairlineWidth, marginTop: 14, marginBottom: 4 },
  themeRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 8, marginTop: 10 },
  themeSwitch: { flexDirection: 'row', gap: 3, padding: 3, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth },
  themeSeg: { width: 38, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: 'transparent' },
  tourPanel: { position: 'absolute', left: 12, right: 16, bottom: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  tourHead: { flexDirection: 'row', alignItems: 'center' },
  tourBtns: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
});
