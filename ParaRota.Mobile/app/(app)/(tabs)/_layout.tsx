import { Tabs } from 'expo-router';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { Icon, Portal } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View, Text, Pressable, Platform, BackHandler, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useState } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { fontFamily } from '@shared/theme/tokens';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { useQuickEntryStore, type QuickEntryMode } from '@shared/store/useQuickEntryStore';
import { QuickEntryModal } from '@features/transactions/components/QuickEntryModal';
import { useInstallmentModalStore } from '@shared/store/useInstallmentModalStore';
import { InstallmentFormModal } from '@features/installments/components/InstallmentFormModal';
import { CopilotProvider, CopilotStep } from 'react-native-copilot';
import { WalkView, TourController } from '@features/onboarding/tour';
import { TourTooltip } from '@features/onboarding/TourTooltip';

// Tab route adı → tur adımı (sıra + i18n metin anahtarı). Tab bar her ekranda
// görünür olduğundan bu adımlar güvenilir konumlanır (ekran-dışı ölçüm yok).
// Sıralar dashboard ana turuyla paylaşılır: 1 hero, 2 scope, 3 gizlilik (DashboardScreen/AppHeader), 8 menü.
const TAB_TOUR: Record<string, { order: number; key: string }> = {
  transactions: { order: 4, key: 'onboarding.tour_transactions' },
  budgets: { order: 6, key: 'onboarding.tour_budgets' },
  goals: { order: 7, key: 'onboarding.tour_goals' },
};

const BAR_HEIGHT = 49;
const INDICATOR_HEIGHT = 2;
// Plus slot is injected at visual index 2 (between Transactions and Budgets).
// Real tab routes after that index get their visual slot bumped by +1.
const PLUS_SLOT_INDEX = 2;

// Calm Ledger tab bar: opaque surface, hairline top border, and a thin moving
// indicator under the active tab. The center slot is a quick-entry "+" that
// opens QuickEntryModal — accessible from every tab screen.
function LedgerTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useAppTheme();
  const { t } = useTranslation('pages');
  const { t: tCommon } = useTranslation('common');
  const insets = useSafeAreaInsets();
  // Android'de sistem gezinme çubuğu sekmelerin üzerine binmesin → tam inset. iOS'ta home
  // indicator boşluğunu estetik için kıs.
  const bottomPad = Platform.OS === 'android'
    ? insets.bottom
    : (insets.bottom > 0 ? Math.max(insets.bottom - 14, 6) : 0);
  const openQuickEntry = useQuickEntryStore((s) => s.openModal);
  const [menuOpen, setMenuOpen] = useState(false);
  const [barWidth, setBarWidth] = useState(0);

  const chooseQuick = (mode: QuickEntryMode) => {
    setMenuOpen(false);
    openQuickEntry(mode);
  };

  // Android geri tuşu açık hızlı menüyü kapatsın — yoksa alttaki ekrandan çıkıyordu.
  useEffect(() => {
    if (!menuOpen || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setMenuOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [menuOpen]);
  const totalSlots = state.routes.length + 1; // +1 for the plus slot
  const slotWidth = barWidth > 0 ? barWidth / totalSlots : 0;
  const indicatorX = useSharedValue(0);

  // Map a route index → its visual slot (skipping the plus slot).
  const visualSlot = (routeIndex: number) =>
    routeIndex < PLUS_SLOT_INDEX ? routeIndex : routeIndex + 1;

  useEffect(() => {
    if (slotWidth <= 0) return;
    indicatorX.value = withTiming(visualSlot(state.index) * slotWidth, { duration: 180 });
  }, [state.index, slotWidth, indicatorX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: Math.max(0, slotWidth),
  }));

  // Build a flat list of "items" in visual order: routes 0..PLUS_SLOT_INDEX-1,
  // then the plus slot, then routes PLUS_SLOT_INDEX..end.
  const items = [
    ...state.routes.slice(0, PLUS_SLOT_INDEX).map((r, i) => ({ kind: 'route' as const, route: r, routeIndex: i })),
    { kind: 'plus' as const },
    ...state.routes.slice(PLUS_SLOT_INDEX).map((r, i) => ({ kind: 'route' as const, route: r, routeIndex: i + PLUS_SLOT_INDEX })),
  ];

  return (
    <>
      {menuOpen ? (
        <Portal>
          <Animated.View entering={FadeIn.duration(120)} style={styles.scrim}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
            <Animated.View
              entering={FadeInDown.duration(180).springify().damping(18)}
              style={[
                styles.quickMenu,
                {
                  marginBottom: BAR_HEIGHT + bottomPad + 12,
                  backgroundColor: colors.paper,
                  borderColor: colors.line,
                  boxShadow: colors.cardShadow,
                },
              ]}
            >
              <QuickMenuItem
                icon="camera-outline"
                tone={colors.go}
                title={t('transactions.quickMenu_scan')}
                hint={t('transactions.quickMenu_scanHint')}
                onPress={() => chooseQuick('scan')}
                colors={colors}
              />
              <View style={[styles.quickDivider, { backgroundColor: colors.line }]} />
              <QuickMenuItem
                icon="pencil-outline"
                tone={colors.ink}
                title={t('transactions.quickMenu_manual')}
                hint={t('transactions.quickMenu_manualHint')}
                onPress={() => chooseQuick('manual')}
                colors={colors}
              />
              <View style={[styles.quickDivider, { backgroundColor: colors.line }]} />
              <QuickMenuItem
                icon="credit-card-clock-outline"
                tone={colors.way}
                title={t('transactions.quickMenu_installment')}
                hint={t('transactions.quickMenu_installmentHint')}
                onPress={() => { setMenuOpen(false); useInstallmentModalStore.getState().openModal(); }}
                colors={colors}
              />
            </Animated.View>
          </Animated.View>
        </Portal>
      ) : null}
    <View
      onLayout={(e: LayoutChangeEvent) => setBarWidth(e.nativeEvent.layout.width)}
      style={[
        styles.bar,
        {
          // iOS: home-indicator boşluğunu kıs (estetik). Android: sistem gezinme çubuğu (geri/ana/
          // son ya da kaydırma çubuğu) sekmelerin üzerine binmesin diye TAM inset bırak.
          height: BAR_HEIGHT + bottomPad,
          paddingBottom: bottomPad,
          backgroundColor: colors.paper,
          borderTopColor: colors.line,
        },
      ]}
    >
      {barWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, indicatorStyle, { backgroundColor: colors.go }]}
        />
      ) : null}

      {items.map((item) => {
        if (item.kind === 'plus') {
          return (
            <Pressable
              key="quick-entry-plus"
              onPress={() => setMenuOpen((v) => !v)}
              android_ripple={{ color: colors.line, borderless: true }}
              accessibilityRole="button"
              accessibilityLabel="Quick entry"
              style={styles.tab}
              hitSlop={8}
            >
              <CopilotStep text={tCommon('onboarding.tour_add')} order={5} name="add">
                <WalkView
                  style={[
                    styles.plusBtn,
                    { backgroundColor: menuOpen ? colors.go : colors.ink, transform: [{ rotate: menuOpen ? '45deg' : '0deg' }] },
                  ]}
                >
                  <Icon source="plus" size={22} color={colors.paper} />
                </WalkView>
              </CopilotStep>
            </Pressable>
          );
        }

        const route = item.route;
        const routeIndex = item.routeIndex;
        const focused = state.index === routeIndex;
        const { options } = descriptors[route.key];
        const tone = focused ? colors.ink : colors.inkMute;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };
        const onLongPress = () => navigation.emit({ type: 'tabLongPress', target: route.key });
        const title = typeof options.title === 'string' ? options.title : route.name;
        const tour = TAB_TOUR[route.name];

        const inner = (
          <View style={styles.tabInner}>
            {options.tabBarIcon ? options.tabBarIcon({ focused, color: tone, size: 22 }) : null}
            <Animated.Text
              numberOfLines={1}
              style={[styles.label, { color: tone, fontFamily: fontFamily.body }]}
            >
              {title}
            </Animated.Text>
          </View>
        );

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            onLongPress={onLongPress}
            android_ripple={{ color: colors.line }}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={title}
            style={styles.tab}
            hitSlop={6}
          >
            {tour ? (
              <CopilotStep text={tCommon(tour.key)} order={tour.order} name={route.name}>
                <WalkView>{inner}</WalkView>
              </CopilotStep>
            ) : (
              inner
            )}
          </Pressable>
        );
      })}
    </View>
    </>
  );
}

interface QuickMenuItemProps {
  icon: string;
  tone: string;
  title: string;
  hint: string;
  onPress: () => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
}

function QuickMenuItem({ icon, tone, title, hint, onPress, colors }: QuickMenuItemProps) {
  return (
    <Pressable onPress={onPress} android_ripple={{ color: colors.line }} style={styles.quickItem}>
      <View style={[styles.quickIcon, { backgroundColor: colorAlpha(tone, 0.12) }]}>
        <Icon source={icon} size={22} color={tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.quickTitle, { color: colors.ink, fontFamily: fontFamily.bodyBold }]}>{title}</Text>
        <Text style={[styles.quickHint, { color: colors.inkMute, fontFamily: fontFamily.body }]}>{hint}</Text>
      </View>
    </Pressable>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation('navigation');
  const { t: tc } = useTranslation('common');
  const { colors } = useAppTheme();

  return (
    <CopilotProvider
      labels={{
        next: tc('onboarding.next'),
        previous: tc('onboarding.back'),
        skip: tc('onboarding.skip'),
        finish: tc('onboarding.finish'),
      }}
      tooltipComponent={TourTooltip}
      tooltipStyle={{ backgroundColor: colors.paper, borderRadius: 16, paddingBottom: 16, boxShadow: colors.cardShadow }}
      arrowColor={colors.paper}
      backdropColor="rgba(0,0,0,0.72)"
      margin={14}
      androidStatusBarVisible
    >
      <Tabs
        screenOptions={{ headerShown: false, tabBarShowLabel: false }}
        tabBar={(props) => <LedgerTabBar {...props} />}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('dashboard', { defaultValue: 'Dashboard' }),
            tabBarIcon: ({ color, focused }) => (
              <Icon source={focused ? 'view-dashboard' : 'view-dashboard-outline'} color={color} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="transactions"
          options={{
            title: t('transactions', { defaultValue: 'Transactions' }),
            tabBarIcon: ({ color, focused }) => (
              <Icon source={focused ? 'swap-horizontal-bold' : 'swap-horizontal'} color={color} size={22} />
            ),
          }}
        />
        <Tabs.Screen
          name="budgets"
          options={{
            title: t('budgets', { defaultValue: 'Budgets' }),
            tabBarIcon: ({ color }) => <Icon source="chart-arc" color={color} size={22} />,
          }}
        />
        <Tabs.Screen
          name="goals"
          options={{
            title: t('goals', { defaultValue: 'Goals' }),
            tabBarIcon: ({ color, focused }) => (
              <Icon source={focused ? 'flag' : 'flag-outline'} color={color} size={22} />
            ),
          }}
        />
      </Tabs>
      <QuickEntryModal />
      <GlobalInstallmentModal />
      <TourController />
    </CopilotProvider>
  );
}

// '+' menüsünden açılan global taksit modal'ı (store-bağlı). Taksitler ekranındaki
// instance local state kullanır — çift mount aynı anda iki modal açmasın diye ayrı.
function GlobalInstallmentModal() {
  const open = useInstallmentModalStore((s) => s.open);
  const close = useInstallmentModalStore((s) => s.closeModal);
  return <InstallmentFormModal visible={open} onDismiss={close} />;
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: INDICATOR_HEIGHT,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  label: {
    fontSize: 11,
    letterSpacing: 0.2,
  },
  plusBtn: {
    width: 44,
    height: 44,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  quickMenu: {
    width: '86%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  quickItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: {
    fontSize: 15,
    letterSpacing: 0.1,
  },
  quickHint: {
    fontSize: 12,
    marginTop: 1,
  },
  quickDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 70,
  },
});
