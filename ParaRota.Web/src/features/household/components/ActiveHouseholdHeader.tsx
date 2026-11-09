import { useState } from 'react';
import { Box, Button, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import type { HouseholdDto } from '@shared/api/types';

interface Props {
  household: HouseholdDto;
  isOwner: boolean;
  onRename: (newName: string) => Promise<void>;
  isRenaming: boolean;
  onLeaveClick: () => void;
}

export function ActiveHouseholdHeader({ household, isOwner, onRename, isRenaming, onLeaveClick }: Props) {
  const { t } = useTranslation(['household', 'common']);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const openRename = () => {
    setRenameValue(household.name);
    setRenameOpen(true);
  };

  const submitRename = async () => {
    if (!renameValue.trim()) return;
    await onRename(renameValue.trim());
    setRenameOpen(false);
  };

  return (
    <SurfaceCard
      padding={0}
      sx={{ mb: { xs: 2, sm: 3 }, position: 'relative', overflow: 'hidden', p: { xs: 2.2, sm: 3, md: 3.5 } }}
    >
      <Box
        aria-hidden
        component="svg"
        viewBox="0 0 240 240"
        sx={{
          position: 'absolute',
          right: -56,
          bottom: -56,
          width: 280,
          height: 280,
          opacity: (th) => (th.palette.mode === 'dark' ? 0.07 : 0.05),
          color: 'primary.main',
          pointerEvents: 'none',
          display: { xs: 'none', sm: 'block' },
        }}
      >
        <circle cx="120" cy="120" r="100" stroke="currentColor" strokeWidth="0.6" fill="none" />
        <circle cx="120" cy="120" r="70" stroke="currentColor" strokeWidth="0.6" fill="none" />
        <line x1="120" y1="20" x2="120" y2="220" stroke="currentColor" strokeWidth="0.5" />
        <line x1="20" y1="120" x2="220" y2="120" stroke="currentColor" strokeWidth="0.5" />
      </Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={{ xs: 1.6, sm: 2 }}
        sx={{ position: 'relative' }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: { xs: '0.6rem', sm: '0.66rem' }, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'text.disabled', mb: 0.4 }}>
            {t('page_eyebrow')}
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: '"Fraunces", serif',
                fontWeight: 500,
                fontSize: { xs: '1.3rem', sm: '1.5rem', md: '1.7rem' },
                lineHeight: 1.15,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {household.name}
            </Typography>
            {isOwner && (
              <Tooltip title={t('rename_title')} arrow>
                <IconButton size="small" onClick={openRename} aria-label={t('rename_title')} sx={{ width: 26, height: 26, flexShrink: 0 }}>
                  <Icon icon="mdi:pencil-outline" width={14} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0, display: 'block', mt: 0.3 }}>
            {t('member_count', { count: household.memberCount })} · {t(`member_role_${household.myRole}`)}
            {household.myRole === 'owner' ? '' : ` · Owner: ${household.ownerName}`}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<Icon icon="mdi:exit-run" width={15} />}
          onClick={onLeaveClick}
          sx={{
            alignSelf: { xs: 'flex-start', sm: 'center' },
            flexShrink: 0,
            px: { xs: 1.2, sm: 1.6 },
            py: 0.55,
            fontSize: { xs: '0.74rem', sm: '0.78rem' },
            '& .MuiButton-startIcon': { mr: 0.7 },
          }}
        >
          {t('leave_button')}
        </Button>
      </Stack>

      {renameOpen && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2, position: 'relative' }}>
          <TextField
            size="small"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            fullWidth
            autoFocus
            inputProps={{ maxLength: 80 }}
          />
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
            <Button
              variant="contained"
              size="small"
              onClick={submitRename}
              disabled={isRenaming || !renameValue.trim()}
              sx={{ flex: { xs: 1, sm: 'unset' }, fontSize: '0.78rem' }}
            >
              {t('rename_submit')}
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={() => setRenameOpen(false)}
              sx={{ flex: { xs: 1, sm: 'unset' }, fontSize: '0.78rem' }}
            >
              {t('common:cancel')}
            </Button>
          </Stack>
        </Stack>
      )}

    </SurfaceCard>
  );
}
