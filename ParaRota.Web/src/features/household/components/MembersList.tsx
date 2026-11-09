import { useState } from 'react';
import { Box, Chip, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import type { HouseholdMemberDto, HouseholdMemberRole } from '@shared/api/types';

const ROLE_TONE: Record<HouseholdMemberRole, 'success' | 'warning' | 'primary'> = {
  owner: 'warning',
  admin: 'primary',
  member: 'success',
};

interface Props {
  members: HouseholdMemberDto[];
  currentUserId: number | null;
  isOwner: boolean;
  isOwnerOrAdmin: boolean;
  onPromote: (member: HouseholdMemberDto) => Promise<void> | void;
  onDemote: (member: HouseholdMemberDto) => Promise<void> | void;
  onTransferOwnership: (member: HouseholdMemberDto) => void;
  onRemove: (member: HouseholdMemberDto) => void;
}

export function MembersList({
  members,
  currentUserId,
  isOwner,
  isOwnerOrAdmin,
  onPromote,
  onDemote,
  onTransferOwnership,
  onRemove,
}: Props) {
  const { t } = useTranslation(['household', 'common']);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; member: HouseholdMemberDto } | null>(null);
  const closeMenu = () => setMenu(null);
  // Çıkarılan üyeler roster'da görünmemeli (LeaveHouseholdModal ile aynı kural).
  const visibleMembers = members.filter((m) => m.status !== 'removed');

  return (
    <>
      <SurfaceCard padding={0} sx={{ overflow: 'hidden' }}>
        <Box sx={{ px: { xs: 1.8, sm: 2.4 }, py: { xs: 1.2, sm: 1.6 }, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: { xs: '0.58rem', sm: '0.62rem' }, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'text.disabled' }}>
            {t('section_members')} ({visibleMembers.length})
          </Typography>
        </Box>
        <Stack divider={<Box sx={{ height: 1, bgcolor: 'divider' }} />}>
          {visibleMembers.map((m) => {
            const tone = ROLE_TONE[m.role];
            const isCurrentUser = m.userId === currentUserId;
            // Owner: tüm non-self non-owner üyelere işlem yapabilir
            // Admin: sadece member rolündeki kullanıcıları çıkarabilir
            const canRemove = isOwnerOrAdmin && !isCurrentUser && m.role !== 'owner';
            const canManage = isOwner && !isCurrentUser && m.role !== 'owner';
            const hasActions = canManage || canRemove;
            return (
              <Stack
                key={m.id}
                direction="row"
                alignItems="center"
                spacing={{ xs: 1.1, sm: 1.4 }}
                sx={{ px: { xs: 1.8, sm: 2.4 }, py: { xs: 1.2, sm: 1.6 } }}
              >
                <Box
                  sx={{
                    width: { xs: 32, sm: 36 },
                    height: { xs: 32, sm: 36 },
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    bgcolor: (th) => alpha(th.palette[tone].main, 0.14),
                    color: `${tone}.main`,
                    fontWeight: 600,
                    fontSize: { xs: '0.78rem', sm: '0.86rem' },
                  }}
                >
                  {(m.firstName?.[0] ?? '?') + (m.lastName?.[0] ?? '')}
                </Box>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={0.7} alignItems="center" sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 500, fontSize: { xs: '0.84rem', sm: '0.92rem' }, minWidth: 0 }} noWrap>
                      {m.firstName} {m.lastName}
                    </Typography>
                    {isCurrentUser && (
                      <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'none', letterSpacing: 0, flexShrink: 0, fontSize: { xs: '0.66rem', sm: '0.72rem' } }}>
                        {t('member_you')}
                      </Typography>
                    )}
                  </Stack>
                  <Tooltip title={m.email} arrow placement="top-start">
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0, fontSize: { xs: '0.68rem', sm: '0.72rem' }, display: 'block' }} noWrap>
                      {m.email}
                    </Typography>
                  </Tooltip>
                </Box>
                <Chip
                  label={t(`member_role_${m.role}`)}
                  size="small"
                  color={tone}
                  variant="outlined"
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: { xs: '0.62rem', sm: '0.7rem' },
                    height: { xs: 20, sm: 22 },
                    flexShrink: 0,
                    '& .MuiChip-label': { px: { xs: 0.8, sm: 1 } },
                  }}
                />
                {hasActions && (
                  <Tooltip title={t('member_actions')} arrow>
                    <IconButton
                      size="small"
                      onClick={(e) => setMenu({ anchor: e.currentTarget, member: m })}
                      aria-label={t('member_actions')}
                      sx={{ width: 26, height: 26, flexShrink: 0 }}
                    >
                      <Icon icon="mdi:dots-vertical" width={14} />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            );
          })}
        </Stack>
      </SurfaceCard>

      <Menu
        anchorEl={menu?.anchor ?? null}
        open={Boolean(menu)}
        onClose={closeMenu}
        slotProps={{ paper: { sx: { minWidth: 200, border: '1px solid', borderColor: 'divider' } } }}
      >
        {menu && isOwner && menu.member.role === 'member' && (
          <MenuItem
            onClick={() => {
              const m = menu.member;
              closeMenu();
              void onPromote(m);
            }}
          >
            <ListItemIcon><Icon icon="mdi:shield-star-outline" width={18} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.86rem' }}>{t('member_promoteToAdmin')}</ListItemText>
          </MenuItem>
        )}
        {menu && isOwner && menu.member.role === 'admin' && (
          <MenuItem
            onClick={() => {
              const m = menu.member;
              closeMenu();
              void onDemote(m);
            }}
          >
            <ListItemIcon><Icon icon="mdi:shield-off-outline" width={18} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.86rem' }}>{t('member_demoteToMember')}</ListItemText>
          </MenuItem>
        )}
        {menu && isOwner && (
          <MenuItem
            onClick={() => {
              const m = menu.member;
              closeMenu();
              onTransferOwnership(m);
            }}
          >
            <ListItemIcon><Icon icon="mdi:crown-outline" width={18} style={{ color: 'var(--pr-way)' }} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.86rem' }}>{t('member_transferOwnership')}</ListItemText>
          </MenuItem>
        )}
        {menu && isOwnerOrAdmin && menu.member.role !== 'owner' && (
          <MenuItem
            onClick={() => {
              const m = menu.member;
              closeMenu();
              onRemove(m);
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon><Icon icon="mdi:account-remove-outline" width={18} style={{ color: 'currentColor' }} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.86rem' }}>{t('member_remove')}</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
