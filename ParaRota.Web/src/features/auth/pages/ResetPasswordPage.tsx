import { useState } from 'react';
import { Box, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { SweetAlert } from '@shared/lib/sweetAlert';
import { authApi } from '../api/authApi';

export function ResetPasswordPage() {
  const { t } = useTranslation('auth');
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [email, setEmail] = useState(params.get('email') ?? '');
  const [code, setCode] = useState(params.get('code') ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!email) return SweetAlert.warning(t('reset.errorEmailRequired'));
    if (code.length !== 6) return SweetAlert.warning(t('reset.errorCodeRequired'));
    if (password !== confirm) return SweetAlert.warning(t('reset.errorPasswordMismatch'));
    if (password.length < 8) return SweetAlert.warning(t('reset.errorPasswordTooShort'));

    setLoading(true);
    try {
      const resp = await authApi.resetPassword({ email, code, newPassword: password });
      if (resp.data.isSuccess) {
        SweetAlert.success(t('reset.successUpdated'));
        navigate('/login');
      } else {
        SweetAlert.fromApi(resp.data);
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
          {t('reset.eyebrow')}
        </Typography>
        <Typography variant="h3" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
          {t('reset.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {t('reset.subtitle')}
        </Typography>
      </Stack>

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField
            label={t('reset.emailLabel')}
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
          <TextField
            label={t('reset.codeLabel')}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            required
            fullWidth
            placeholder="••••••"
            slotProps={{
              input: {
                startAdornment: (
                  <Box sx={{ display: 'flex', mr: 1, color: 'text.disabled' }}>
                    <Icon icon="mdi:numeric" width={18} />
                  </Box>
                ),
                sx: {
                  fontFamily: '"Geist Mono", monospace',
                  letterSpacing: '0.3em',
                  fontWeight: 600,
                },
              },
            }}
          />
          <TextField
            label={t('reset.newPasswordLabel')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            slotProps={{
              input: {
                startAdornment: (
                  <Box sx={{ display: 'flex', mr: 1, color: 'text.disabled' }}>
                    <Icon icon="mdi:lock-outline" width={18} />
                  </Box>
                ),
              },
            }}
          />
          <TextField
            label={t('reset.confirmLabel')}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            fullWidth
          />
          <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth sx={{ py: 1.4 }}>
            {loading ? t('reset.submitting') : t('reset.submitButton')}
          </Button>
        </Stack>
      </Box>

      <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mt: 3 }}>
        <Link component={RouterLink} to="/login" underline="hover" sx={{ color: 'text.secondary' }}>
          {t('reset.backToLogin')}
        </Link>
      </Typography>
    </motion.div>
  );
}
