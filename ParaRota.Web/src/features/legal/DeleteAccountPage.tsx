import { Box, Stack, Typography, Button, Divider, Paper } from '@mui/material';
import { Icon } from '@iconify/react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CONTACT = 'info@pararotam.com';

// Metinler "legal" namespace'inde numaralı key'lerde (deleteAccount.step1..3, item1..4).
const STEP_COUNT = 3;
const ITEM_COUNT = 4;

export function DeleteAccountPage() {
  const { t } = useTranslation('legal');
  const steps = Array.from({ length: STEP_COUNT }, (_, i) => t(`deleteAccount.step${i + 1}`));
  const items = Array.from({ length: ITEM_COUNT }, (_, i) => t(`deleteAccount.item${i + 1}`));
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 4, md: 7 } }}>
      <Box sx={{ maxWidth: 760, mx: 'auto', px: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 600, fontSize: '1.3rem' }}>ParaRotam</Typography>
          <Button component={RouterLink} to="/login" size="small" startIcon={<Icon icon="mdi:arrow-left" width={16} />}>
            {t('backToApp')}
          </Button>
        </Stack>

        <Typography variant="h4" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, mb: 1 }}>{t('deleteAccount.title')}</Typography>
        <Typography sx={{ color: 'text.secondary', mt: 2, lineHeight: 1.6 }}>{t('deleteAccount.intro')}</Typography>

        <Paper variant="outlined" sx={{ mt: 4, p: 3, borderRadius: 3 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1.2} alignItems="center">
              <Icon icon="mdi:cellphone" width={22} />
              <Typography sx={{ fontWeight: 600 }}>{t('deleteAccount.inAppTitle')}</Typography>
            </Stack>
            <Stack component="ol" spacing={0.5} sx={{ pl: 2.5, m: 0 }}>
              {steps.map((s) => (
                <Typography key={s} component="li" variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
                  {s}
                </Typography>
              ))}
            </Stack>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ mt: 2.5, p: 3, borderRadius: 3 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1.2} alignItems="center">
              <Icon icon="mdi:email-outline" width={22} />
              <Typography sx={{ fontWeight: 600 }}>{t('deleteAccount.emailTitle')}</Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>{t('deleteAccount.emailBody')}</Typography>
            <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: '1.05rem' }}>{CONTACT}</Typography>
            <Button
              variant="contained"
              size="small"
              href={`mailto:${CONTACT}?subject=${encodeURIComponent(t('deleteAccount.emailSubject'))}`}
              startIcon={<Icon icon="mdi:send" width={16} />}
              sx={{ alignSelf: 'flex-start' }}
            >
              {t('deleteAccount.emailButton')}
            </Button>
          </Stack>
        </Paper>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, mb: 2 }}>{t('deleteAccount.whatTitle')}</Typography>
        <Stack component="ul" spacing={0.5} sx={{ pl: 2.5, m: 0 }}>
          {items.map((s) => (
            <Typography key={s} component="li" variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>
              {s}
            </Typography>
          ))}
        </Stack>

        <Paper variant="outlined" sx={{ mt: 3, p: 2.5, borderRadius: 3, bgcolor: 'action.hover' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>{t('deleteAccount.subscriptionNote')}</Typography>
        </Paper>

        <Divider sx={{ my: 4 }} />
        <Stack direction="row" spacing={3}>
          <Button component={RouterLink} to="/privacy" size="small">{t('links.privacy')}</Button>
          <Button component={RouterLink} to="/terms" size="small">{t('links.terms')}</Button>
          <Button component={RouterLink} to="/support" size="small">{t('links.support')}</Button>
        </Stack>
      </Box>
    </Box>
  );
}
