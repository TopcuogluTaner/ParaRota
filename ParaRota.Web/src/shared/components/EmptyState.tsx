import { Box, Stack, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import type { ReactNode } from 'react';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = 'mdi:map-marker-off-outline', title, description, action }: Props) {
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={2}
      sx={{
        py: 8,
        px: 3,
        textAlign: 'center',
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: 3,
        bgcolor: 'background.paper',
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          bgcolor: (t) => (t.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,139,108,0.06)'),
          color: 'primary.main',
        }}
      >
        <Icon icon={icon} width={32} />
      </Box>
      <Box>
        <Typography variant="h6" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, maxWidth: 380 }}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}
