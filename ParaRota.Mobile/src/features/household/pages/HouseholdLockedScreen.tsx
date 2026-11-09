import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { Screen } from '@shared/components/Screen';
import { AppHeader } from '@shared/components/AppHeader';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { Body, Display, Eyebrow } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { toast } from '@shared/lib/toast';
import { openPaywall } from '@features/subscription/lib/paywallNav';
import { useLeaveHousehold, useMyMembershipsQuery } from '@features/household/api/useHouseholds';
import { useActiveHouseholdStore } from '@shared/store/useActiveHouseholdStore';
import type { HouseholdDto } from '@shared/api/types';

/**
 * Premium'suz kullanıcı için aile ekranı: paywall CTA'sı + (varsa) üyelik listesi.
 * Premium'u biten üye aile VERİSİNİ göremez ama üyeliklerini görüp AYRILABİLİR —
 * aksi halde Leave akışına UI'dan ulaşmanın hiçbir yolu kalmıyordu.
 */
export function HouseholdLockedScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('paywall');
  const { t: tHh } = useTranslation('household');
  const memberships = useMyMembershipsQuery();
  const setActive = useActiveHouseholdStore((s) => s.setActive);
  const [leaveTarget, setLeaveTarget] = useState<HouseholdDto | null>(null);
  const leave = useLeaveHousehold(leaveTarget?.id ?? 0);

  const confirmLeave = async () => {
    if (!leaveTarget) return;
    try {
      await leave.mutateAsync({ mode: 'personal' });
      toast.success(tHh('leave_toastSuccess'));
      setActive(null);
    } catch (err) {
      toast.error(getErrorMessage(err, tHh('locked_leaveError')));
    } finally {
      setLeaveTarget(null);
    }
  };

  const items = memberships.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('locked.headerTitle')} back />
      <Screen contentStyle={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 }}>
        <View style={styles.center}>
          <View style={[styles.iconWrap, { borderColor: colors.line, backgroundColor: colorAlpha(colors.go, 0.08) }]}>
            <Icon source="lock-outline" size={36} color={colors.go} />
          </View>
          <Eyebrow tone="mute" style={{ marginTop: 18 }}>{t('locked.eyebrow')}</Eyebrow>
          <Display size="sm" align="center" style={{ marginTop: 8 }}>{t('features.household.title')}</Display>
          <Body size="sm" tone="soft" align="center" style={{ marginTop: 6, maxWidth: 320 }}>
            {t('features.household.desc')}
          </Body>
          <Button
            mode="contained"
            icon="crown-outline"
            buttonColor={colors.go}
            textColor={colors.onAccent}
            style={{ marginTop: 22, borderRadius: 14 }}
            contentStyle={{ height: 50, paddingHorizontal: 12 }}
            onPress={() => openPaywall('household')}
          >
            {t('cta.unlock')}
          </Button>
        </View>

        {items.length > 0 ? (
          <View style={{ marginTop: 36 }}>
            <Eyebrow tone="mute">{tHh('locked_membershipsTitle')}</Eyebrow>
            <Body size="xs" tone="mute" style={{ marginTop: 4, marginBottom: 10 }}>
              {tHh('locked_hint')}
            </Body>
            {items.map((h) => {
              const isOwner = h.myRole === 'owner';
              return (
                <View key={h.id} style={[styles.row, { backgroundColor: colors.paper, borderColor: colors.line }]}>
                  <Icon source="account-group-outline" size={20} color={colors.inkSoft} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Body weight="bold" numberOfLines={1}>{h.name}</Body>
                    {isOwner ? (
                      <Body size="xs" tone="mute">{tHh('locked_ownerNote')}</Body>
                    ) : null}
                  </View>
                  {!isOwner ? (
                    <Button mode="outlined" compact textColor={colors.halt} onPress={() => setLeaveTarget(h)}>
                      {tHh('leave_button')}
                    </Button>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

        <ConfirmDialog
          visible={leaveTarget != null}
          title={tHh('leave_modalTitle')}
          message={tHh('locked_leaveConfirm', { name: leaveTarget?.name ?? '' })}
          confirmLabel={tHh('leave_button')}
          destructive
          loading={leave.isPending}
          onConfirm={() => void confirmLeave()}
          onCancel={() => setLeaveTarget(null)}
        />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  iconWrap: {
    width: 84, height: 84, borderRadius: 24, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 8,
  },
});
