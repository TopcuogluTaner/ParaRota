import { Box, Stack, Typography, Button, Divider, Paper } from '@mui/material';
import { Icon } from '@iconify/react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CONTACT = 'info@pararotam.com';

// SSS metinleri "legal" namespace'inde numaralı key'lerde (support.faq1_q, support.faq1_a, ...).
const FAQ_COUNT = 6;

export function SupportPage() {
  const { t } = useTranslation('legal');
  const faqs = Array.from({ length: FAQ_COUNT }, (_, i) => ({
    q: t(`support.faq${i + 1}_q`),
    a: t(`support.faq${i + 1}_a`),
  }));
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 4, md: 7 } }}>
      <Box sx={{ maxWidth: 760, mx: 'auto', px: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 600, fontSize: '1.3rem' }}>ParaRotam</Typography>
          <Button component={RouterLink} to="/login" size="small" startIcon={<Icon icon="mdi:arrow-left" width={16} />}>
            {t('backToApp')}
          </Button>
        </Stack>

        <Typography variant="h4" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, mb: 1 }}>{t('support.title')}</Typography>
        <Typography sx={{ color: 'text.secondary', mt: 2, lineHeight: 1.6 }}>{t('support.intro')}</Typography>

        <Paper variant="outlined" sx={{ mt: 4, p: 3, borderRadius: 3 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1.2} alignItems="center">
              <Icon icon="mdi:email-outline" width={22} />
              <Typography sx={{ fontWeight: 600 }}>{t('support.contactTitle')}</Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>{t('support.contactBody')}</Typography>
            <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: '1.05rem' }}>{CONTACT}</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
              <Button
                variant="contained"
                size="small"
                href={`mailto:${CONTACT}`}
                startIcon={<Icon icon="mdi:send" width={16} />}
                sx={{ alignSelf: 'flex-start' }}
              >
                {t('support.emailButton')}
              </Button>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>{t('support.responseTime')}</Typography>
            </Stack>
          </Stack>
        </Paper>

        <Divider sx={{ my: 4 }} />

        <Typography variant="h6" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, mb: 2 }}>{t('support.faqTitle')}</Typography>
        <Stack spacing={3}>
          {faqs.map((f) => (
            <Box key={f.q}>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>{f.q}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>{f.a}</Typography>
            </Box>
          ))}
        </Stack>

        <Divider sx={{ my: 4 }} />
        <Stack direction="row" spacing={3}>
          <Button component={RouterLink} to="/privacy" size="small">{t('links.privacy')}</Button>
          <Button component={RouterLink} to="/terms" size="small">{t('links.terms')}</Button>
        </Stack>
      </Box>
    </Box>
  );
}
