import { useState } from 'react';
import { Box, Button, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { SurfaceCard } from '@shared/components/SurfaceCard';

interface Props {
  onInvite: (email: string) => Promise<void>;
  isPending: boolean;
}

// Basit ama yeterli e-posta biçim kontrolü (boşluksuz, tek @, nokta içeren domain).
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function InviteForm({ onInvite, isPending }: Props) {
  const { t } = useTranslation(['household', 'common']);
  const [email, setEmail] = useState('');
  // İlk başarısız "Davet Et" denemesinden sonra alanı kırmızı + uyarıyla göster.
  const [attempted, setAttempted] = useState(false);

  const trimmed = email.trim();
  const emailInvalid = !EMAIL_RE.test(trimmed);

  const submit = async () => {
    if (isPending) return;
    // Geçersiz e-posta varsa: tıklamayı engelleme — net uyarı + kırmızı alan göster.
    if (emailInvalid) {
      setAttempted(true);
      toast.error(t('invite_toastError'), { id: 'invite-validate' });
      return;
    }
    await onInvite(trimmed);
    setEmail('');
    setAttempted(false);
  };

  return (
    <SurfaceCard padding={0} sx={{ mb: { xs: 2, sm: 3 }, p: { xs: 2, sm: 2.6, md: 3 } }}>
      <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: { xs: '0.58rem', sm: '0.62rem' }, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'text.disabled', mb: { xs: 1.1, sm: 1.4 } }}>
        {t('invite_eyebrow')}
      </Typography>
      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        noValidate
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'flex-start' }}>
          <TextField
            size="small"
            type="email"
            label={t('invite_emailLabel')}
            placeholder={t('invite_emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={attempted && emailInvalid}
            helperText={attempted && emailInvalid ? t('invite_toastError') : undefined}
            fullWidth
          />
          <Button
            type="submit"
            variant="contained"
            size="small"
            disabled={isPending}
            startIcon={
              isPending ? (
                <CircularProgress size={16} thickness={5} />
              ) : (
                <Icon icon="mdi:email-fast-outline" width={16} />
              )
            }
            sx={{
              flexShrink: 0,
              px: { xs: 1.6, sm: 2 },
              py: { xs: 0.9, sm: 0.85 },
              fontSize: { xs: '0.78rem', sm: '0.82rem' },
              minWidth: { sm: 130 },
              '& .MuiButton-startIcon': { mr: 0.8 },
            }}
          >
            {t('invite_send')}
          </Button>
        </Stack>
      </Box>
    </SurfaceCard>
  );
}
