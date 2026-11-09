import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useActiveHouseholdStore } from '@features/household/store/useActiveHouseholdStore';
import { useMyHouseholdsQuery } from '@features/household/api/useHousehold';

/**
 * Create/edit form'larda aktif scope'u net göstermek için ince bir indicator.
 * Kişisel modda nötr; household modda primary tone + household ismi.
 */
export function ScopeIndicator() {
  const { t } = useTranslation('common');
  const activeId = useActiveHouseholdStore((s) => s.activeId);
  const householdsQ = useMyHouseholdsQuery();

  // Household scope ama isim henüz yüklenmediyse skeleton göster — boş chip yerine
  // belirsizlik sinyalı ver (data sonra dolacak).
  if (activeId != null && householdsQ.isLoading) {
    return (
      <Skeleton
        variant="rounded"
        width={140}
        height={22}
        sx={{ alignSelf: 'flex-start', borderRadius: 1 }}
      />
    );
  }

  const household = activeId != null
    ? householdsQ.data?.find((h) => h.id === activeId)
    : null;

  const isHousehold = Boolean(household);

  return (
    <Stack
      direction="row"
      spacing={0.7}
      alignItems="center"
      sx={{
        alignSelf: 'flex-start',
        px: 1,
        py: 0.4,
        borderRadius: 1,
        bgcolor: (th) =>
          isHousehold
            ? alpha(th.palette.primary.main, th.palette.mode === 'dark' ? 0.14 : 0.08)
            : alpha(th.palette.text.primary, th.palette.mode === 'dark' ? 0.06 : 0.04),
        color: isHousehold ? 'primary.main' : 'text.secondary',
      }}
    >
      <Icon icon={isHousehold ? 'mdi:account-group-outline' : 'mdi:account-outline'} width={13} />
      <Typography
        sx={{
          fontFamily: '"Geist Mono", monospace',
          fontSize: '0.66rem',
          fontWeight: 600,
          letterSpacing: '0.02em',
          textTransform: 'none',
        }}
      >
        {isHousehold ? `${t('scope_household')}: ` : t('scope_personal')}
        {isHousehold && (
          <Box component="span" sx={{ fontFamily: '"Geist", sans-serif', fontWeight: 600, color: 'inherit' }}>
            {household?.name}
          </Box>
        )}
      </Typography>
    </Stack>
  );
}
