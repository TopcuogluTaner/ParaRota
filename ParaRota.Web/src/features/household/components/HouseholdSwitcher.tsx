import { useState } from 'react';
import { Box, Menu, MenuItem, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMyHouseholdsQuery } from '../api/useHousehold';
import { useActiveHouseholdStore } from '../store/useActiveHouseholdStore';

/**
 * Topbar'da aktif household göstergesi. Tıklayınca menü; member olduğu
 * household'lar + "Kişisel" + "Yeni Aile" link.
 */
export function HouseholdSwitcher() {
  const { t } = useTranslation('household');
  const navigate = useNavigate();
  const householdsQ = useMyHouseholdsQuery();
  const activeId = useActiveHouseholdStore((s) => s.activeId);
  const setActive = useActiveHouseholdStore((s) => s.setActive);

  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const households = householdsQ.data ?? [];
  const active = households.find((h) => h.id === activeId);

  // Hiç household yoksa switcher gizli — sadece /household sayfasından
  // create edilir. Topbar minimal kalsın.
  if (households.length === 0) return null;

  const label = active ? active.name : t('switcher_personal');

  return (
    <>
      <Tooltip title={t('switcher_eyebrow')} arrow>
        <Box
          component="button"
          type="button"
          aria-haspopup="menu"
          aria-expanded={Boolean(anchor)}
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{
            all: 'unset',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.7,
            px: 1.2,
            py: 0.55,
            borderRadius: 1.4,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            transition: 'border-color .15s, background-color .15s',
            maxWidth: 200,
            '&:hover': {
              borderColor: 'text.disabled',
              bgcolor: (th) => alpha(th.palette.text.primary, 0.02),
            },
          }}
        >
          <Icon icon={active ? 'mdi:account-group-outline' : 'mdi:account-outline'} width={15} style={{ flexShrink: 0, color: active ? 'var(--pr-go)' : 'var(--pr-ink-mute)' }} />
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.74rem',
              fontWeight: 600,
              letterSpacing: '0.02em',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              minWidth: 0,
            }}
          >
            {label}
          </Typography>
          <Icon icon="mdi:chevron-down" width={14} style={{ flexShrink: 0, color: 'var(--pr-ink-mute)' }} />
        </Box>
      </Tooltip>

      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: { minWidth: 240, mt: 0.6, border: '1px solid', borderColor: 'divider' },
          },
        }}
      >
        <Box sx={{ px: 1.6, pt: 1, pb: 0.6 }}>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.6rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              fontWeight: 600,
            }}
          >
            {t('switcher_eyebrow')}
          </Typography>
        </Box>

        <MenuItem
          selected={activeId === null}
          onClick={() => {
            setActive(null);
            setAnchor(null);
          }}
          sx={{ gap: 1.2 }}
        >
          <Icon icon="mdi:account-outline" width={16} />
          <Typography sx={{ fontSize: '0.86rem' }}>{t('switcher_personal')}</Typography>
        </MenuItem>

        {households.map((h) => (
          <MenuItem
            key={h.id}
            selected={activeId === h.id}
            onClick={() => {
              setActive(h.id);
              setAnchor(null);
            }}
            sx={{ gap: 1.2 }}
          >
            <Icon icon="mdi:account-group-outline" width={16} style={{ color: 'var(--pr-go)' }} />
            <Stack sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontSize: '0.86rem', fontWeight: 500 }} noWrap>{h.name}</Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'none', letterSpacing: 0 }}>
                {t('member_count', { count: h.memberCount })} · {t(`member_role_${h.myRole}`)}
              </Typography>
            </Stack>
          </MenuItem>
        ))}

        <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mt: 0.4 }} />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            navigate('/household');
          }}
          sx={{ gap: 1.2 }}
        >
          <Icon icon="mdi:account-multiple-plus-outline" width={16} style={{ color: 'var(--pr-go)' }} />
          <Typography sx={{ fontSize: '0.86rem', color: 'primary.main', fontWeight: 600 }}>
            {t('switcher_create')}
          </Typography>
        </MenuItem>
      </Menu>
    </>
  );
}
