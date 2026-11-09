import { useEffect, useMemo, useState } from 'react';
import { Box, Button, Chip, Skeleton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Navigate } from 'react-router-dom';
import { SectionHeader } from '@shared/components/SectionHeader';
import { PageTourTrigger } from '@features/onboarding';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { EmptyState } from '@shared/components/EmptyState';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import type { HouseholdInviteDto, HouseholdMemberDto } from '@shared/api/types';
import {
  useCancelInvite,
  useHouseholdInvitesQuery,
  useHouseholdMembersQuery,
  useInviteToHousehold,
  useMyHouseholdsQuery,
  useRemoveMember,
  useResendInvite,
  useTransferOwnership,
  useUpdateHousehold,
  useUpdateMemberRole,
} from '../api/useHousehold';
import { useActiveHouseholdStore } from '../store/useActiveHouseholdStore';
import { CreateHouseholdModal } from '../components/CreateHouseholdModal';
import { LeaveHouseholdModal } from '../components/LeaveHouseholdModal';
import { ActiveHouseholdHeader } from '../components/ActiveHouseholdHeader';
import { InviteForm } from '../components/InviteForm';
import { PendingInvitesList } from '../components/PendingInvitesList';
import { MembersList } from '../components/MembersList';

export function HouseholdPage() {
  const { t } = useTranslation(['household', 'common']);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const currentUser = useAuthStore((s) => s.user);
  const activeId = useActiveHouseholdStore((s) => s.activeId);
  const setActive = useActiveHouseholdStore((s) => s.setActive);

  const householdsQ = useMyHouseholdsQuery();
  const households = useMemo(() => householdsQ.data ?? [], [householdsQ.data]);

  // activeId === null → kişisel mod (geçerli seçim, override etme)
  // activeId bir household.id → o household
  // activeId artık üye olmadığımız bir household'u gösteriyorsa → kişisele düş
  const active = useMemo(
    () => (activeId === null ? null : households.find((h) => h.id === activeId) ?? null),
    [households, activeId]
  );

  // Stale activeId düzeltmesi: persisted id artık üyelikte değilse kişisele dön
  useEffect(() => {
    if (
      activeId !== null &&
      households.length > 0 &&
      !households.some((h) => h.id === activeId)
    ) {
      setActive(null);
    }
  }, [activeId, households, setActive]);

  const membersQ = useHouseholdMembersQuery(active?.id ?? null);
  const invitesQ = useHouseholdInvitesQuery(active?.id ?? null);
  const members = useMemo(() => membersQ.data ?? [], [membersQ.data]);
  const invites = useMemo(() => invitesQ.data ?? [], [invitesQ.data]);

  const update = useUpdateHousehold(active?.id ?? 0);
  const invite = useInviteToHousehold(active?.id ?? 0);
  const cancelInvite = useCancelInvite(active?.id ?? 0);
  const resendInvite = useResendInvite(active?.id ?? 0);
  const removeMember = useRemoveMember(active?.id ?? 0);
  const updateRole = useUpdateMemberRole(active?.id ?? 0);
  const transferOwnership = useTransferOwnership(active?.id ?? 0);

  const [createOpen, setCreateOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [confirm, setConfirm] = useState<
    | { kind: 'remove'; member: HouseholdMemberDto }
    | { kind: 'transfer'; member: HouseholdMemberDto }
    | { kind: 'cancelInvite'; invite: HouseholdInviteDto }
    | null
  >(null);

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const isOwner = active?.myRole === 'owner';
  const isOwnerOrAdmin = isOwner || active?.myRole === 'admin';

  const handleInvite = async (email: string) => {
    try {
      await invite.mutateAsync({ email });
      toast.success(t('invite_toastSuccess'));
    } catch (err) {
      toast.error(getErrorMessage(err, t('invite_toastError')));
    }
  };

  const handleRename = async (name: string) => {
    try {
      await update.mutateAsync({ name });
      toast.success(t('rename_toastSuccess'));
    } catch (err) {
      toast.error(getErrorMessage(err, t('common:errorGeneric')));
    }
  };

  const handleChangeRole = async (member: HouseholdMemberDto, newRole: 'admin' | 'member') => {
    try {
      await updateRole.mutateAsync({ memberUserId: member.userId, body: { role: newRole } });
      const name = `${member.firstName} ${member.lastName}`.trim();
      toast.success(t(newRole === 'admin' ? 'member_promote_success' : 'member_demote_success', { name }));
    } catch (err) {
      toast.error(getErrorMessage(err, t('common:errorGeneric')));
    }
  };

  const handleConfirmAction = async () => {
    if (!confirm) return;
    try {
      if (confirm.kind === 'cancelInvite') {
        await cancelInvite.mutateAsync(confirm.invite.id);
        toast.success(t('common:successGeneric'));
      } else if (confirm.kind === 'transfer') {
        const name = `${confirm.member.firstName} ${confirm.member.lastName}`.trim();
        await transferOwnership.mutateAsync({ newOwnerUserId: confirm.member.userId });
        toast.success(t('member_transferOwnership_success', { name }));
      } else {
        await removeMember.mutateAsync(confirm.member.userId);
        toast.success(t('remove_toastSuccess'));
      }
      setConfirm(null);
    } catch (err) {
      toast.error(getErrorMessage(err, t('common:errorGeneric')));
    }
  };

  const handleResendInvite = async (inviteId: number) => {
    try {
      await resendInvite.mutateAsync(inviteId);
      toast.success(t('invite_resend_success'));
    } catch (err) {
      toast.error(getErrorMessage(err, t('common:errorGeneric')));
    }
  };

  const handleCopyInviteLink = async (token: string) => {
    const url = `${window.location.origin}/accept-invite?token=${encodeURIComponent(token)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('invite_copy_success'));
    } catch {
      toast.error(t('common:errorGeneric'));
    }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 2.6, md: 4 }, maxWidth: 1100, mx: 'auto' }}>
      <SectionHeader
        eyebrow={t('page_eyebrow')}
        title={t('page_title')}
        description={t('page_description')}
        action={
          <Button
            variant="contained"
            size="small"
            startIcon={<Icon icon="mdi:account-multiple-plus-outline" width={16} />}
            onClick={() => setCreateOpen(true)}
            data-tour="household-invite"
            sx={{
              px: { xs: 1.4, sm: 1.8 },
              py: { xs: 0.7, sm: 0.85 },
              fontSize: { xs: '0.78rem', sm: '0.82rem' },
              '& .MuiButton-startIcon': { mr: { xs: 0.6, sm: 1 } },
            }}
          >
            {t('list_create')}
          </Button>
        }
      />

      <PageTourTrigger page="household" />

      {/* Household switcher chips */}
      {households.length > 0 && (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.8, mb: { xs: 2.2, sm: 3 } }}>
          <Chip
            size="small"
            label={t('switcher_personal')}
            icon={<Icon icon="mdi:account-outline" width={13} />}
            onClick={() => setActive(null)}
            variant={activeId === null ? 'filled' : 'outlined'}
            color={activeId === null ? 'primary' : 'default'}
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: { xs: '0.7rem', sm: '0.76rem' },
              height: { xs: 24, sm: 28 },
              maxWidth: { xs: 160, sm: 'unset' },
              '& .MuiChip-label': { px: { xs: 0.9, sm: 1.2 } },
            }}
          />
          {households.map((h) => (
            <Chip
              key={h.id}
              size="small"
              label={h.name}
              icon={<Icon icon="mdi:account-group-outline" width={13} />}
              onClick={() => setActive(h.id)}
              variant={activeId === h.id ? 'filled' : 'outlined'}
              color={activeId === h.id ? 'primary' : 'default'}
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: { xs: '0.7rem', sm: '0.76rem' },
                height: { xs: 24, sm: 28 },
                maxWidth: { xs: 160, sm: 240 },
                '& .MuiChip-label': { px: { xs: 0.9, sm: 1.2 } },
              }}
            />
          ))}
        </Stack>
      )}

      {householdsQ.isLoading ? (
        <Skeleton variant="rounded" width="100%" height={320} />
      ) : households.length === 0 ? (
        <EmptyState
          icon="mdi:account-search-outline"
          title={t('list_empty_title')}
          description={t('list_empty_description')}
          action={
            <Button
              variant="contained"
              size="small"
              startIcon={<Icon icon="mdi:account-multiple-plus-outline" width={16} />}
              onClick={() => setCreateOpen(true)}
              sx={{ px: 2, py: 0.85, fontSize: '0.82rem' }}
            >
              {t('list_create')}
            </Button>
          }
        />
      ) : !active ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <SurfaceCard
            padding={0}
            sx={{
              p: { xs: 3, sm: 4 },
              textAlign: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                width: { xs: 52, sm: 60 },
                height: { xs: 52, sm: 60 },
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                mx: 'auto',
                mb: 1.6,
                bgcolor: (th) => alpha(th.palette.text.primary, th.palette.mode === 'dark' ? 0.06 : 0.04),
                color: 'text.secondary',
              }}
            >
              <Icon icon="mdi:account-outline" width={26} />
            </Box>
            <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: '0.62rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'text.disabled', mb: 0.6 }}>
              {t('switcher_personal')}
            </Typography>
            <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: { xs: '1.2rem', sm: '1.4rem' }, lineHeight: 1.2, mb: 1 }}>
              {t('personal_mode_title')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 420, mx: 'auto' }}>
              {t('personal_mode_hint')}
            </Typography>
          </SurfaceCard>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <ActiveHouseholdHeader
            household={active}
            isOwner={Boolean(isOwner)}
            onRename={handleRename}
            isRenaming={update.isPending}
            onLeaveClick={() => setLeaveOpen(true)}
          />

          {isOwnerOrAdmin && (
            <InviteForm onInvite={handleInvite} isPending={invite.isPending} />
          )}

          {membersQ.isLoading || invitesQ.isLoading ? (
            <Stack spacing={{ xs: 2, sm: 3 }}>
              <Skeleton variant="rounded" width="100%" height={120} />
              <Skeleton variant="rounded" width="100%" height={200} />
            </Stack>
          ) : membersQ.isError || invitesQ.isError ? (
            <EmptyState
              icon="mdi:alert-circle-outline"
              title={t('common:error')}
              description={t('common:errorGeneric')}
              action={
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Icon icon="mdi:refresh" width={16} />}
                  onClick={() => {
                    void membersQ.refetch();
                    void invitesQ.refetch();
                  }}
                  sx={{ px: 2, py: 0.85, fontSize: '0.82rem' }}
                >
                  {t('common:retry')}
                </Button>
              }
            />
          ) : (
            <>
              {isOwnerOrAdmin && (
                <PendingInvitesList
                  invites={invites}
                  householdName={active.name}
                  resendingId={resendInvite.isPending ? resendInvite.variables ?? null : null}
                  cancelingId={cancelInvite.isPending ? cancelInvite.variables ?? null : null}
                  onResend={handleResendInvite}
                  onCancel={(id) => {
                    const inv = invites.find((i) => i.id === id);
                    if (inv) setConfirm({ kind: 'cancelInvite', invite: inv });
                  }}
                  onCopyLink={handleCopyInviteLink}
                />
              )}

              <MembersList
                members={members}
                currentUserId={currentUser?.id ?? null}
                isOwner={Boolean(isOwner)}
                isOwnerOrAdmin={Boolean(isOwnerOrAdmin)}
                onPromote={(m) => handleChangeRole(m, 'admin')}
                onDemote={(m) => handleChangeRole(m, 'member')}
                onTransferOwnership={(m) => setConfirm({ kind: 'transfer', member: m })}
                onRemove={(m) => setConfirm({ kind: 'remove', member: m })}
              />
            </>
          )}
        </motion.div>
      )}

      <CreateHouseholdModal open={createOpen} onClose={() => setCreateOpen(false)} />

      {active && (
        <LeaveHouseholdModal
          open={leaveOpen}
          onClose={() => setLeaveOpen(false)}
          household={active}
          members={members}
          currentUserId={currentUser?.id ?? 0}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirmAction}
        tone={confirm?.kind === 'transfer' ? 'warning' : 'error'}
        icon={
          confirm?.kind === 'remove'
            ? 'mdi:account-remove-outline'
            : confirm?.kind === 'cancelInvite'
              ? 'mdi:email-remove-outline'
              : 'mdi:crown-outline'
        }
        title={
          confirm?.kind === 'remove'
            ? t('remove_confirmTitle')
            : confirm?.kind === 'cancelInvite'
              ? t('invite_cancel')
              : t('transfer_modalTitle')
        }
        body={
          confirm
            ? confirm.kind === 'remove'
              ? t('remove_confirmBody', { name: `${confirm.member.firstName} ${confirm.member.lastName}`.trim() })
              : confirm.kind === 'cancelInvite'
                ? confirm.invite.email
                : t('member_transferOwnership_confirm', { name: `${confirm.member.firstName} ${confirm.member.lastName}`.trim() })
            : ''
        }
        confirmLabel={
          confirm?.kind === 'remove'
            ? t('member_remove')
            : confirm?.kind === 'cancelInvite'
              ? t('invite_cancel')
              : t('transfer_submit')
        }
        isPending={transferOwnership.isPending || removeMember.isPending || cancelInvite.isPending}
      />
    </Box>
  );
}
