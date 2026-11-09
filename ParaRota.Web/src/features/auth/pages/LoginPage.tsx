import { useState } from 'react';
import { Box, Button, Checkbox, FormControlLabel, Link, Stack, TextField, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/useAuthStore';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { AppStoreQr } from '../components/AppStoreQr';

export function LoginPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/';
  const goHome = () => navigate(from, { replace: true });

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    const ok = await login({ emailOrUserName: identifier, password });
    if (ok) navigate(from, { replace: true });
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
          {t('login.eyebrow')}
        </Typography>
        <Typography variant="h3" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
          {t('login.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {t('login.subtitle')}
        </Typography>
      </Stack>

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <TextField
            label={t('login.identifierLabel')}
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            fullWidth
            autoComplete="username"
            placeholder={t('login.identifierPlaceholder')}
            slotProps={{
              input: {
                startAdornment: (
                  <Box sx={{ display: 'flex', mr: 1, color: 'text.disabled' }}>
                    <Icon icon="mdi:account-outline" width={18} />
                  </Box>
                ),
              },
            }}
          />
          <TextField
            label={t('login.passwordLabel')}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            autoComplete="current-password"
            slotProps={{
              input: {
                startAdornment: (
                  <Box sx={{ display: 'flex', mr: 1, color: 'text.disabled' }}>
                    <Icon icon="mdi:lock-outline" width={18} />
                  </Box>
                ),
                endAdornment: (
                  <Box
                    component="button"
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    sx={{
                      display: 'flex',
                      bgcolor: 'transparent',
                      border: 0,
                      cursor: 'pointer',
                      color: 'text.disabled',
                      p: 0.5,
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    <Icon icon={showPassword ? 'mdi:eye-off-outline' : 'mdi:eye-outline'} width={18} />
                  </Box>
                ),
              },
            }}
          />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {t('login.rememberMe')}
                </Typography>
              }
            />
            <Link component={RouterLink} to="/forgot-password" underline="hover" sx={{ fontSize: '0.85rem', color: 'primary.main', fontWeight: 500 }}>
              {t('login.forgotPassword')}
            </Link>
          </Stack>

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isLoading}
            fullWidth
            endIcon={
              <Icon
                icon="mdi:arrow-right"
                width={18}
                style={{ transition: 'transform .2s' }}
              />
            }
            sx={{
              py: 1.4,
              fontSize: '0.95rem',
              '&:hover .iconify': { transform: 'translateX(3px)' },
            }}
          >
            {isLoading ? t('login.submitting') : t('login.submitButton')}
          </Button>
        </Stack>
      </Box>

      {/* Google ile giriş */}
      <Stack alignItems="center" sx={{ mt: 2.5 }}>
        <GoogleSignInButton onSuccess={goHome} />
      </Stack>

      {/* Divider with dash route line */}
      <Box sx={{ display: 'flex', alignItems: 'center', my: 3, gap: 2 }}>
        <Box className="pr-route-line" sx={{ flex: 1 }} />
        <Typography
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: '0.65rem',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color: 'text.disabled',
          }}
        >
          {t('login.orDivider')}
        </Typography>
        <Box className="pr-route-line" sx={{ flex: 1 }} />
      </Box>

      <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
        {t('login.noAccount')}{' '}
        <Link
          component={RouterLink}
          to="/register"
          underline="hover"
          sx={{ fontWeight: 600, color: 'primary.main' }}
        >
          {t('login.startRoute')}
        </Link>
      </Typography>

      <AppStoreQr />

      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2.5 }}>
        <Link component={RouterLink} to="/privacy" underline="hover" sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>
          {t('login.privacy', { defaultValue: 'Gizlilik' })}
        </Link>
        <Link component={RouterLink} to="/terms" underline="hover" sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>
          {t('login.terms', { defaultValue: 'Şartlar' })}
        </Link>
      </Stack>
    </motion.div>
  );
}
