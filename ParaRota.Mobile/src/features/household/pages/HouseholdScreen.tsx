import { useMemo, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable } from 'react-native';
import { Button, IconButton, Menu, TextInput, ActivityIndicator, Icon, Divider, HelperText } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppHeader } from '@shared/components/AppHeader';
import { ToolbarAddButton } from '@shared/components/ToolbarAddButton';
import { PageTour } from '@features/onboarding/PageTour';
import { CopilotStep } from 'react-native-copilot';
import { WalkView } from '@features/onboarding/tour';
import { Screen } from '@shared/components/Screen';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { Body, Display, Eyebrow } from '@shared/components/Typography';
import { RouteLine } from '@shared/components/RouteLine';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { CreateHouseholdModal } from '@features/household/components/CreateHouseholdModal';
import {
  useMyHouseholdsQuery,
  useHouseholdMembersQuery,
  useHouseholdInvitesQuery,
  useInviteToHousehold,
  useCancelInvite,
  useResendInvite,
  useRemoveMember,
  useUpdateMemberRole,
  useLeaveHousehold,
} from '@features/household/api/useHouseholds';
import { useActiveHouseholdStore } from '@shared/store/useActiveHouseholdStore';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { formatDate } from '@shared/lib/dateFormat';
import type { HouseholdMemberDto } from '@shared/api/types';

export function HouseholdScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('household');
  const { t: tCommon } = useTranslation('common');

  const householdsQ = useMyHouseholdsQuery();
  const activeId = useActiveHouseholdStore((s) => s.activeId);
  const setActive = useActiveHouseholdStore((s) => s.setActive);

  const list = householdsQ.data ?? [];
  const current = useMemo(() => (activeId ? list.find((h) => h.id === activeId) : list[0]), [list, activeId]);

  const membersQ = useHouseholdMembersQuery(current?.id ?? null);
  const invitesQ = useHouseholdInvitesQuery(current?.id ?? null);
  const invite = useInviteToHousehold(current?.id ?? 0);
  const cancelInvite = useCancelInvite(current?.id ?? 0);
  const resendInvite = useResendInvite(current?.id ?? 0);
  const removeMember = useRemoveMember(current?.id ?? 0);
  const updateRole = useUpdateMemberRole(current?.id ?? 0);
  const leave = useLeaveHousehold(current?.id ?? 0);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteAttempted, setInviteAttempted] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [memberMenu, setMemberMenu] = useState<HouseholdMemberDto | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<{ id: number; email: string } | null>(null);

  const inviteEmailError = !inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail.trim());

  // Daveti tekrar gönder — başarı/hata toast'ı (kullanıcı işlemin sonucunu görsün).
  const handleResend = async (id: number) => {
    try {
      await resendInvite.mutateAsync(id);
      toast.success(t('invite_resend_success'));
    } catch (err) {
      toast.error(getErrorMessage(err, t('invite_toastError')));
    }
  };

  // Daveti iptal — önce onay sor, sonra iptal + toast.
  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;
    try {
      await cancelInvite.mutateAsync(cancelTarget.id);
      toast.success(t('invite_cancel_success'));
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    } finally {
      setCancelTarget(null);
    }
  };

  const sendInvite = async () => {
    if (!current) return;
    if (inviteEmailError) {
      setInviteAttempted(true);
      toast.error(tCommon('fillRequired'));
      return;
    }
    try {
      await invite.mutateAsync({ email: inviteEmail.trim() });
      toast.success(t('invite_toastSuccess'));
      setInviteEmail('');
      setInviteAttempted(false);
    } catch (err) {
      toast.error(getErrorMessage(err, t('invite_toastError')));
    }
  };

  const canInvite = current ? (current.myRole === 'owner' || current.myRole === 'admin') : false;
  const visibleMembers = (membersQ.data ?? []).filter((m) => m.status !== 'removed');

  return (
    <PageTour page="household">
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('page_eyebrow')} />
      <Screen edges={['bottom']} contentStyle={{ paddingHorizontal: 16, paddingTop: 8 }}>
        {/* Aile switcher başlığı + 'Yeni aile' butonu aynı satırda — dikey yer tasarrufu */}
        <View style={styles.familiesHead}>
          <Eyebrow tone="mute" style={{ flex: 1 }} numberOfLines={1}>
            {list.length > 0 ? t('switcher_eyebrow') : t('page_eyebrow')}
          </Eyebrow>
          <CopilotStep text={tCommon('onboarding.tour_hh')} order={1} name="hh-add">
            <WalkView>
              <ToolbarAddButton label={t('list_create')} onPress={() => setCreateOpen(true)} />
            </WalkView>
          </CopilotStep>
        </View>

        {list.length > 1 ? (
          <View style={[styles.chips, { marginBottom: 14 }]}>
            {list.map((h) => {
              const active = current?.id === h.id;
              return (
                <Pressable
                  key={h.id}
                  onPress={() => setActive(h.id)}
                  style={[styles.chip, active
                    ? { backgroundColor: colorAlpha(colors.go, 0.12), borderColor: colorAlpha(colors.go, 0.45) }
                    : { backgroundColor: colors.paper, borderColor: colors.line }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={h.name}
                >
                  <Icon source={active ? 'account-group' : 'account-group-outline'} size={13} color={active ? colors.go : colors.inkSoft} />
                  <Body size="sm" weight={active ? 'bold' : 'medium'} style={{ color: active ? colors.go : colors.ink }}>{h.name}</Body>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {householdsQ.isLoading ? (
          <ActivityIndicator color={colors.go} style={{ marginTop: 12 }} />
        ) : householdsQ.isError && list.length === 0 ? (
          <ErrorState
            message={getErrorMessage(householdsQ.error, tCommon('error'))}
            onRetry={() => householdsQ.refetch()}
          />
        ) : list.length === 0 ? (
          <EmptyState
            eyebrow={t('page_eyebrow')}
            icon="account-group-outline"
            title={t('list_empty_title')}
            message={t('list_empty_description')}
          />
        ) : (
          <>

            {current ? (
              <>
                <Animated.View
                  entering={FadeIn.duration(380)}
                  style={[styles.heroCard, { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow }]}
                >
                  <View style={styles.heroTop}>
                    <View style={[styles.familyAvatar, { backgroundColor: colorAlpha(colors.go, 0.14) }]}>
                      <Icon source="account-group" size={24} color={colors.go} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Display size="md" numberOfLines={1}>{current.name}</Display>
                      <Body size="xs" tone="soft" numberOfLines={1} style={{ marginTop: 2 }}>
                        {t('member_role_owner')} · {current.ownerName}
                      </Body>
                    </View>
                    <View style={[styles.roleBadge, { backgroundColor: colorAlpha(colors.sky, 0.12), borderColor: colorAlpha(colors.sky, 0.38) }]}>
                      <Eyebrow style={{ color: colors.sky }}>
                        {t(`member_role_${current.myRole}`, { defaultValue: current.myRole })}
                      </Eyebrow>
                    </View>
                  </View>
                  <View style={[styles.heroDivider, { backgroundColor: colors.line }]} />
                  <View style={styles.heroStats}>
                    <View style={styles.heroStat}>
                      <Display size="sm">{current.memberCount}</Display>
                      <Eyebrow tone="mute" style={{ marginTop: 3 }}>{t('section_members')}</Eyebrow>
                    </View>
                    <View style={[styles.heroVDiv, { backgroundColor: colors.line }]} />
                    <View style={styles.heroStat}>
                      <Display size="sm">{current.currency}</Display>
                      <Eyebrow tone="mute" style={{ marginTop: 3 }}>{t('currencyLabel')}</Eyebrow>
                    </View>
                  </View>
                </Animated.View>

                {canInvite ? (
                  <View style={{ marginTop: 20 }}>
                    <Display size="sm">{t('invite_send')}</Display>
                    <RouteLine style={{ marginTop: 8, marginBottom: 12 }} />
                    <TextInput
                      mode="outlined"
                      label={t('invite_emailLabel')}
                      placeholder={t('invite_emailPlaceholder')}
                      value={inviteEmail}
                      onChangeText={setInviteEmail}
                      error={inviteAttempted && inviteEmailError}
                      autoCapitalize="none"
                      autoComplete="email"
                      autoCorrect={false}
                      keyboardType="email-address"
                      left={<TextInput.Icon icon="email-outline" />}
                      style={{ backgroundColor: colors.paper }}
                      outlineStyle={{ borderRadius: 12 }}
                    />
                    <HelperText type="error" visible={inviteAttempted && inviteEmailError} style={{ marginTop: -4 }}>
                      {tCommon('required')}
                    </HelperText>
                    <Button
                      mode="contained"
                      loading={invite.isPending}
                      disabled={invite.isPending}
                      onPress={sendInvite}
                      buttonColor={colors.go}
                      textColor={colors.onAccent}
                      icon={invite.isPending ? undefined : 'email-fast-outline'}
                      style={{ borderRadius: 12, marginTop: 2 }}
                      contentStyle={{ paddingVertical: 6 }}
                      accessibilityLabel={t('invite_send')}
                    >
                      {t('invite_send')}
                    </Button>
                  </View>
                ) : null}

                {canInvite && invitesQ.isLoading && !invitesQ.data ? (
                  <View style={{ marginTop: 18 }}>
                    <ActivityIndicator color={colors.go} />
                  </View>
                ) : canInvite && invitesQ.isError && !invitesQ.data ? (
                  <View style={{ marginTop: 18 }}>
                    <ErrorState
                      message={getErrorMessage(invitesQ.error, tCommon('error'))}
                      onRetry={() => invitesQ.refetch()}
                    />
                  </View>
                ) : null}

                {invitesQ.data && invitesQ.data.filter((i) => i.status === 'pending').length > 0 ? (
                  <View style={{ marginTop: 18 }}>
                    <Display size="sm">{t('section_invites')}</Display>
                    <RouteLine style={{ marginTop: 8 }} />
                    {invitesQ.data.filter((i) => i.status === 'pending').map((inv, idx) => (
                      <Animated.View key={inv.id} entering={FadeIn.delay(40 + idx * 30).duration(260)} style={[styles.inviteCard, { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow }]}>
                        <View style={{ flex: 1 }}>
                          <Body weight="bold">{inv.email}</Body>
                          <Eyebrow tone="mute">{t('invite_expiresAt')} · {formatDate(inv.expiresAt).toUpperCase()}</Eyebrow>
                        </View>
                        <IconButton
                          icon="reload"
                          onPress={() => handleResend(inv.id)}
                          loading={resendInvite.isPending}
                          disabled={resendInvite.isPending}
                          iconColor={colors.go}
                          accessibilityLabel={t('invite_resend')}
                        />
                        <IconButton
                          icon="close"
                          onPress={() => setCancelTarget({ id: inv.id, email: inv.email })}
                          iconColor={colors.halt}
                          accessibilityLabel={t('invite_cancel')}
                        />
                      </Animated.View>
                    ))}
                  </View>
                ) : null}

                <View style={{ marginTop: 18 }}>
                  <Display size="sm">{t('section_members')}</Display>
                  <RouteLine style={{ marginTop: 8, marginBottom: 12 }} />
                  {membersQ.isLoading && !membersQ.data ? (
                    <ActivityIndicator color={colors.go} style={{ marginTop: 8 }} />
                  ) : membersQ.isError && !membersQ.data ? (
                    <ErrorState
                      message={getErrorMessage(membersQ.error, tCommon('error'))}
                      onRetry={() => membersQ.refetch()}
                    />
                  ) : null}
                  <View style={[styles.memberCard, { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow }]}>
                  {visibleMembers.map((m, i, arr) => (
                    <View key={m.id} style={[styles.memberRow, i === arr.length - 1 ? null : { borderBottomColor: colors.line, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                      <View style={[styles.avatar, { backgroundColor: colors.way }]}>
                        <Eyebrow style={{ color: colors.onAccent, fontSize: 11, letterSpacing: 1 }}>
                          {(m.firstName?.[0] ?? '?') + (m.lastName?.[0] ?? '')}
                        </Eyebrow>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Body weight="bold">{m.firstName} {m.lastName}</Body>
                        <Eyebrow tone="mute" numberOfLines={1}>{t(`member_role_${m.role}`, { defaultValue: m.role }).toUpperCase()} · {m.email}</Eyebrow>
                      </View>
                      {current.myRole === 'owner' && m.userId !== 0 ? (
                        <Menu
                          visible={memberMenu?.id === m.id}
                          onDismiss={() => setMemberMenu(null)}
                          anchor={
                            <IconButton
                              icon="dots-vertical"
                              onPress={() => setMemberMenu(m)}
                              accessibilityLabel={t('member_actions')}
                            />
                          }
                          contentStyle={{ backgroundColor: colors.paper }}
                        >
                          <Menu.Item title={t('member_promoteToAdmin')} onPress={async () => {
                            try { await updateRole.mutateAsync({ memberUserId: m.userId, body: { role: 'admin' } }); toast.success(t('member_promote_success', { name: `${m.firstName} ${m.lastName}` })); }
                            catch (err) { toast.error(getErrorMessage(err, t('invite_toastError'))); }
                            setMemberMenu(null);
                          }} />
                          <Menu.Item title={t('member_demoteToMember')} onPress={async () => {
                            try { await updateRole.mutateAsync({ memberUserId: m.userId, body: { role: 'member' } }); toast.success(t('member_demote_success', { name: `${m.firstName} ${m.lastName}` })); }
                            catch (err) { toast.error(getErrorMessage(err, t('invite_toastError'))); }
                            setMemberMenu(null);
                          }} />
                          <Divider />
                          <Menu.Item title={t('member_remove')} leadingIcon="delete-outline" onPress={async () => {
                            try { await removeMember.mutateAsync(m.userId); toast.success(t('remove_toastSuccess')); }
                            catch (err) { toast.error(getErrorMessage(err, t('invite_toastError'))); }
                            setMemberMenu(null);
                          }} />
                        </Menu>
                      ) : null}
                    </View>
                  ))}
                  </View>
                </View>

                {current.myRole !== 'owner' ? (
                  <Button
                    mode="outlined"
                    icon="logout"
                    onPress={() => setConfirmLeave(true)}
                    textColor={colors.halt}
                    style={{ borderColor: colors.halt, borderRadius: 12, marginTop: 22 }}
                    accessibilityLabel={t('leave_button')}
                  >
                    {t('leave_button')}
                  </Button>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </Screen>

      <CreateHouseholdModal visible={createOpen} onDismiss={() => setCreateOpen(false)} />

      <ConfirmDialog
        visible={confirmLeave}
        title={t('leave_modalTitle')}
        message={t('leave_modalSubtitle')}
        destructive
        loading={leave.isPending}
        onConfirm={async () => {
          try { await leave.mutateAsync({ mode: 'personal' }); toast.success(t('leave_toastSuccess')); setActive(null); }
          catch (err) { toast.error(getErrorMessage(err, t('invite_toastError'))); }
          finally { setConfirmLeave(false); }
        }}
        onCancel={() => setConfirmLeave(false)}
      />
      <ConfirmDialog
        visible={!!cancelTarget}
        title={t('invite_cancel_confirmTitle')}
        message={cancelTarget ? t('invite_cancel_confirmBody', { email: cancelTarget.email }) : undefined}
        destructive
        loading={cancelInvite.isPending}
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelTarget(null)}
      />
    </View>
    </PageTour>
  );
}

const styles = StyleSheet.create({
  familiesHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  heroCard: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 18 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  familyAvatar: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  roleBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  heroDivider: { height: StyleSheet.hairlineWidth, marginTop: 16, marginBottom: 14 },
  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroVDiv: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 2 },
  inviteCard: { flexDirection: 'row', alignItems: 'center', padding: 10, paddingLeft: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, marginTop: 8 },
  memberCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  avatar: { width: 36, height: 36, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
