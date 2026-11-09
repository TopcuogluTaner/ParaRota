import { Box, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SUPPORTED_LANGS } from '@shared/i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const current =
    SUPPORTED_LANGS.find((l) => i18n.language?.startsWith(l.code)) ?? SUPPORTED_LANGS[0];

  return (
    <>
      <IconButton onClick={(e) => setAnchor(e.currentTarget)} size="small" sx={{ borderRadius: 2 }}>
        <Stack direction="row" spacing={0.6} alignItems="center">
          <Box sx={{ display: 'flex', borderRadius: '50%', overflow: 'hidden' }}>
            <Icon icon={current.flag} width={18} height={18} />
          </Box>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {current.code}
          </Typography>
          <Icon icon="mdi:chevron-down" width={14} />
        </Stack>
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
              minWidth: 160,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: (t) =>
                t.palette.mode === 'dark' ? '0 16px 40px rgba(0,0,0,0.5)' : '0 16px 40px rgba(43,30,14,0.12)',
            },
          },
        }}
      >
        {SUPPORTED_LANGS.map((l) => (
          <MenuItem
            key={l.code}
            selected={current.code === l.code}
            onClick={() => {
              void i18n.changeLanguage(l.code);
              setAnchor(null);
            }}
            sx={{ fontSize: '0.88rem', gap: 1.2 }}
          >
            <Box sx={{ display: 'flex', borderRadius: '50%', overflow: 'hidden' }}>
              <Icon icon={l.flag} width={20} height={20} />
            </Box>
            {l.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
