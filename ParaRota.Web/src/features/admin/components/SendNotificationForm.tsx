import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useAdminDispatchNotification } from '../api/useAdminDispatch';
import { useSendNotificationFormState } from './useSendNotificationFormState';
import { SendNotificationFormFields } from './SendNotificationFormFields';

export function SendNotificationForm() {
  const { t } = useTranslation(['pages', 'common']);
  const theme = useTheme();
  const mutation = useAdminDispatchNotification();
  const { form, set, errors, canSubmit, validate, resetAfterSubmit } = useSendNotificationFormState(
    mutation.isPending,
  );

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) return;

    try {
      const res = await mutation.mutateAsync({
        targetUserId: form.mode === 'single' ? Number(form.userId) : undefined,
        targetRole: form.mode === 'role' ? form.role : undefined,
        title: form.title.trim(),
        message: form.message.trim(),
        severity: form.severity,
        url: form.url.trim() || undefined,
      });
      toast.success(t('admin.sendNotif_toastSuccess', { count: res ?? 0 }));
      resetAfterSubmit();
    } catch (err) {
      toast.error(getErrorMessage(err, t('admin.sendNotif_toastError')));
    }
  };

  return (
    <SurfaceCard padding={3.5} sx={{ position: 'relative', overflow: 'hidden' }}>
      {/* Decorative compass arc — bottom-right */}
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
          opacity: theme.palette.mode === 'dark' ? 0.07 : 0.05,
          color: 'primary.main',
          pointerEvents: 'none',
        }}
      >
        <circle cx="120" cy="120" r="100" stroke="currentColor" strokeWidth="0.6" fill="none" />
        <circle cx="120" cy="120" r="70" stroke="currentColor" strokeWidth="0.6" fill="none" />
        <circle cx="120" cy="120" r="40" stroke="currentColor" strokeWidth="0.6" fill="none" />
        <line x1="120" y1="20" x2="120" y2="220" stroke="currentColor" strokeWidth="0.6" />
        <line x1="20" y1="120" x2="220" y2="120" stroke="currentColor" strokeWidth="0.6" />
        <line x1="49" y1="49" x2="191" y2="191" stroke="currentColor" strokeWidth="0.4" />
        <line x1="191" y1="49" x2="49" y2="191" stroke="currentColor" strokeWidth="0.4" />
      </Box>

      <Box sx={{ position: 'relative' }}>
        <Stack direction="row" alignItems="flex-end" justifyContent="space-between" sx={{ mb: 2.5 }}>
          <Box>
            <Typography
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.66rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.5,
              }}
            >
              {t('admin.sendNotif_eyebrow')}
            </Typography>
            <Typography variant="h5" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, lineHeight: 1.1 }}>
              {t('admin.sendNotif_title')}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0, display: 'block', mt: 0.4 }}
            >
              {t('admin.sendNotif_description')}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.6,
              display: 'grid',
              placeItems: 'center',
              bgcolor: (th) => alpha(th.palette.primary.main, 0.12),
              color: 'primary.main',
            }}
          >
            <Icon icon="mdi:radio-tower" width={22} />
          </Box>
        </Stack>

        <SendNotificationFormFields form={form} set={set} errors={errors} />

        <motion.div whileTap={{ scale: 0.985 }} style={{ marginTop: 24 }}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={handleSubmit}
            disabled={!canSubmit}
            startIcon={<Icon icon="mdi:send-outline" width={18} />}
            sx={{
              fontFamily: '"Fraunces", serif',
              fontSize: '0.98rem',
              fontWeight: 500,
              letterSpacing: '-0.005em',
              py: 1.3,
              background: (th) => `linear-gradient(135deg, ${th.palette.primary.light}, ${th.palette.primary.main})`,
              '&:hover': {
                background: (th) => `linear-gradient(135deg, ${th.palette.primary.light}, ${th.palette.primary.main})`,
                filter: 'brightness(1.05)',
              },
            }}
          >
            {t('admin.sendNotif_send')}
          </Button>
        </motion.div>
      </Box>
    </SurfaceCard>
  );
}
