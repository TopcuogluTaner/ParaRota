import { Box, Divider, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { UserAvatar } from '@features/profile/components/UserAvatar';

export function UserMenu() {
  const navigate = useNavigate();
  const { t } = useTranslation('pages');
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const fullName = user
    ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email
    : t('userMenu.guest');

  return (
    <>
      <IconButton onClick={(e) => setAnchor(e.currentTarget)} aria-label={fullName} sx={{ p: 0.5, borderRadius: 2 }}>
        <UserAvatar
          user={user}
          size={34}
          sx={{
            fontSize: '0.82rem',
            boxShadow: (t) =>
              t.palette.mode === 'dark'
                ? '0 0 0 2px rgba(46,201,152,0.18)'
                : '0 0 0 2px rgba(15,139,108,0.16)',
          }}
        />
      </IconButton>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.8,
              minWidth: 240,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: (t) =>
                t.palette.mode === 'dark' ? '0 16px 40px rgba(0,0,0,0.5)' : '0 16px 40px rgba(43,30,14,0.12)',
            },
          },
        }}
      >
        <Box sx={{ px: 2, pt: 1.5, pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <UserAvatar user={user} size={40} sx={{ fontSize: '0.9rem' }} />
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }} noWrap>
                {fullName}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.78rem' }} noWrap>
                {user?.email ?? ''}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Divider sx={{ my: 1 }} />

        <MenuItem
          onClick={() => {
            navigate('/profile');
            setAnchor(null);
          }}
          sx={{ gap: 1.4, fontSize: '0.88rem' }}
        >
          <Icon icon="mdi:account-circle-outline" width={18} />
          {t('userMenu.myProfile')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            navigate('/settings');
            setAnchor(null);
          }}
          sx={{ gap: 1.4, fontSize: '0.88rem' }}
        >
          <Icon icon="mdi:tune-variant" width={18} />
          {t('userMenu.mySettings')}
        </MenuItem>

        <Divider sx={{ my: 1 }} />

        <MenuItem
          onClick={() => {
            logout();
            navigate('/login');
          }}
          sx={{ gap: 1.4, fontSize: '0.88rem', color: 'error.main' }}
        >
          <Icon icon="mdi:logout" width={18} />
          {t('userMenu.logout')}
        </MenuItem>
      </Menu>
    </>
  );
}
