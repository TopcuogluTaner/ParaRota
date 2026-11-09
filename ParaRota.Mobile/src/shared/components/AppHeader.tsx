import { useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Badge, Icon, Menu} from 'react-native-paper';
import { useRouter, useNavigation } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DrawerActions } from '@react-navigation/native';
import { useNotificationUnreadCountQuery } from '@features/notifications/api/useNotifications';
import { useMyHouseholdsQuery } from '@features/household/api/useHouseholds';
import { useActiveHouseholdStore } from '@shared/store/useActiveHouseholdStore';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { CopilotStep } from 'react-native-copilot';
import { WalkView } from '@features/onboarding/tour';
import { Body, Display, Eyebrow } from './Typography';
import { BrandMark } from './BrandMark';

interface Props {
  title?: string;
  eyebrow?: string;
  back?: boolean;
  /** Geri butonuna özel davranış (ör. detaydan listeye dön, ana menüye değil). Verilmezse router.back(). */
  onBack?: () => void;
  /** Başlık yerine "Para Rotam" wordmark'ı göster (dashboard). */
  brand?: boolean;
  /** Verilirse hamburger butonu onboarding turunun SON adımı olarak tanıtılır (yalnız dashboard). */
  menuTourText?: string;
  /** Verilirse kişisel/aile defter seçici turda 2. adım olarak tanıtılır (yalnız dashboard). */
  scopeTourText?: string;
}

export function AppHeader({ title, eyebrow, back, onBack, brand, menuTourText, scopeTourText }: Props) {
  const router = useRouter();
  const nav = useNavigation();
  const { colors } = useAppTheme();
  const { t } = useTranslation('common');
  const [scopeMenu, setScopeMenu] = useState(false);

  const householdsQ = useMyHouseholdsQuery();
  const unreadQ = useNotificationUnreadCountQuery();
  const activeId = useActiveHouseholdStore((s) => s.activeId);
  const setActive = useActiveHouseholdStore((s) => s.setActive);

  const unread = unreadQ.data ?? 0;
  const active = activeId != null ? householdsQ.data?.find((h) => h.id === activeId) : null;

  const openDrawer = () => nav.dispatch(DrawerActions.openDrawer());

  const menuButton = (
    <Pressable onPress={openDrawer} hitSlop={10} style={[styles.iconBtn, { borderColor: colors.line }]} accessibilityRole="button" accessibilityLabel={t('menu', { defaultValue: 'Menu' })}>
      <View style={styles.hamburger}>
        <View style={[styles.bar, { backgroundColor: colors.ink, width: 16 }]} />
        <View style={[styles.bar, { backgroundColor: colors.ink, width: 11, marginTop: 4 }]} />
        <View style={[styles.bar, { backgroundColor: colors.ink, width: 14, marginTop: 4 }]} />
      </View>
    </Pressable>
  );

  return (
    <View style={[{ backgroundColor: colors.headerBg, borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth, zIndex: 1 }]}>
      <SafeAreaView edges={['top']}>
        <View style={styles.row}>
          {back ? (
            <Pressable onPress={onBack ?? (() => router.back())} hitSlop={10} style={[styles.iconBtn, { borderColor: colors.line }]} accessibilityRole="button" accessibilityLabel={t('back', { defaultValue: 'Back' })}>
              <Icon source="chevron-left" size={20} color={colors.ink} />
            </Pressable>
          ) : menuTourText ? (
            <CopilotStep text={menuTourText} order={8} name="menu">
              <WalkView>{menuButton}</WalkView>
            </CopilotStep>
          ) : (
            menuButton
          )}

          <View style={styles.titleCol}>
            {brand ? (
              <BrandMark size={26} />
            ) : (
              <>
                {eyebrow ? <Eyebrow numberOfLines={1}>{eyebrow}</Eyebrow> : null}
                {title ? (
                  <Display size="sm" numberOfLines={1} style={{ marginTop: eyebrow ? 1 : 0 }}>
                    {title}
                  </Display>
                ) : null}
              </>
            )}
          </View>

          <View style={styles.actions}>
            <Menu
              visible={scopeMenu}
              onDismiss={() => setScopeMenu(false)}
              anchor={(() => {
                const chip = (
                  <Pressable
                    onPress={() => setScopeMenu(true)}
                    style={[
                      styles.scopeChip,
                      active
                        ? { backgroundColor: colorAlpha(colors.go, 0.12), borderColor: colorAlpha(colors.go, 0.45) }
                        : { backgroundColor: colors.paper, borderColor: colors.lineStrong },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={active ? active.name : t('scope_personal', { defaultValue: 'Personal' })}
                  >
                    <Icon source={active ? 'account-group' : 'account'} size={13} color={active ? colors.go : colors.inkSoft} />
                    <Body size="xs" weight="bold" numberOfLines={1} style={[styles.scopeText, { color: active ? colors.go : colors.inkSoft }]}>
                      {active ? active.name : t('scope_personal', { defaultValue: 'Personal' })}
                    </Body>
                    <Icon source="menu-down" size={15} color={active ? colors.go : colors.inkMute} />
                  </Pressable>
                );
                return scopeTourText ? (
                  <CopilotStep text={scopeTourText} order={2} name="scope">
                    <WalkView>{chip}</WalkView>
                  </CopilotStep>
                ) : (
                  chip
                );
              })()}
              contentStyle={{ backgroundColor: colors.paper, borderRadius: 12 }}
            >
              <Menu.Item
                onPress={() => {
                  setActive(null);
                  setScopeMenu(false);
                }}
                title={t('scope_personal', { defaultValue: 'Personal' })}
                leadingIcon="account-outline"
                trailingIcon={activeId == null ? 'check' : undefined}
              />
              {/* Çok aile olduğunda ekrana sığması için sınırlı, kaydırılabilir liste. */}
              <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {(householdsQ.data ?? []).map((h) => (
                  <Menu.Item
                    key={h.id}
                    title={h.name}
                    leadingIcon="account-group-outline"
                    trailingIcon={activeId === h.id ? 'check' : undefined}
                    onPress={() => {
                      setActive(h.id);
                      setScopeMenu(false);
                    }}
                  />
                ))}
              </ScrollView>
            </Menu>

            <Pressable
              onPress={() => router.push('/(app)/notifications')}
              style={[styles.iconBtn, { borderColor: colors.line }]}
            >
              <Icon source="bell-outline" size={18} color={colors.ink} />
              {unread > 0 ? (
                <Badge style={[styles.badge, { backgroundColor: colors.halt }]} size={14}>
                  {unread > 9 ? '9+' : unread}
                </Badge>
              ) : null}
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: 'transparent',
  },
  hamburger: { alignItems: 'flex-start', justifyContent: 'center' },
  bar: { height: 1.4, borderRadius: 1 },
  titleCol: { flex: 1, paddingHorizontal: 2 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingLeft: 10,
    paddingRight: 5,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 140,
  },
  scopeText: { fontSize: 11, maxWidth: 78 },
  badge: { position: 'absolute', top: -2, right: -2 },
});
