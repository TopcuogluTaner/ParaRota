import { useState } from 'react';
import { Box, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trans, useTranslation } from 'react-i18next';
import { SweetAlert } from '@shared/lib/sweetAlert';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import { authApi } from '../api/authApi';

export function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await authApi.forgotPassword(email);
      if (resp.data.isSuccess) {
        setSent(true);
      } else {
        SweetAlert.error(resolveApiErrorWithFallback({ response: { data: resp.data } }, t('forgot.errorFailed')));
      }
    } catch (err) {
      SweetAlert.apiError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Stack spacing={0.6} sx={{ mb: 4 }}>
        <Typography
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: '0.7rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'text.disabled',
          }}
        >
          {t('forgot.eyebrow')}
        </Typography>
        <Typography variant="h3" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
          {t('forgot.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('forgot.subtitle')}
        </Typography>
      </Stack>

      {sent ? (
        <Stack spacing={3} alignItems="center" sx={{ textAlign: 'center', py: 2 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'success.main',
              color: 'success.contrastText',
            }}
          >
            <Icon icon="mdi:email-check-outline" width={32} />
          </Box>
          <Stack spacing={1}>
            <Typography variant="h5" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
              {t('forgot.sentTitle')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              <Trans
                i18nKey="forgot.sentSubtitle"
                ns="auth"
                values={{ email }}
                components={{ strong: <strong /> }}
              />
            </Typography>
          </Stack>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}
            sx={{ py: 1.4 }}
          >
            {t('forgot.continueToReset')}
          </Button>
          <Link component={RouterLink} to="/login" underline="hover" sx={{ color: 'text.secondary' }}>
            {t('forgot.backToLogin')}
          </Link>
        </Stack>
      ) : (
        <>
          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2}>
              <TextField
                label={t('forgot.emailLabel')}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                fullWidth
                autoComplete="email"
                slotProps={{
                  input: {
                    startAdornment: (
                      <Box sx={{ display: 'flex', mr: 1, color: 'text.disabled' }}>
                        <Icon icon="mdi:email-outline" width={18} />
                      </Box>
                    ),
                  },
                }}
              />
              <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth sx={{ py: 1.4 }}>
                {loading ? t('forgot.submitting') : t('forgot.submitButton')}
              </Button>
            </Stack>
          </Box>

          <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mt: 3 }}>
            <Link component={RouterLink} to="/login" underline="hover" sx={{ color: 'text.secondary' }}>
              {t('forgot.backToLogin')}
            </Link>
          </Typography>
        </>
      )}
    </motion.div>
  );
}
