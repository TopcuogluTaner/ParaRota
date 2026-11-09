import { useState } from 'react';
import { Box, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { SweetAlert } from '@shared/lib/sweetAlert';
import { authApi } from '../api/authApi';

export function RegisterPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [userNameTouched, setUserNameTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  // Kullanıcı adı manuel düzenlenmediyse e-postanın @ öncesinden otomatik öner.
  const handleEmailChange = (v: string) => {
    setEmail(v);
    if (!userNameTouched) {
      const suggested = v.split('@')[0]?.toLowerCase().replace(/[^a-z0-9._-]/g, '') ?? '';
      setUserName(suggested);
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (password !== confirm) {
      SweetAlert.warning(t('register.errorPasswordMismatch'));
      return;
    }
    if (password.length < 8) {
      SweetAlert.warning(t('register.errorPasswordTooShort'));
      return;
    }
    if (userName.length < 3) {
      SweetAlert.warning(t('register.errorUserNameTooShort'));
      return;
    }
    setLoading(true);
    try {
      const resp = await authApi.register({ firstName, lastName, email, userName, password });
      if (resp.data.isSuccess) {
        SweetAlert.success(t('register.successCreated'));
        navigate('/verify-email', { state: { email } });
      } else {
        SweetAlert.apiError({ response: { data: resp.data } });
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
          {t('register.eyebrow')}
        </Typography>
        <Typography variant="h3" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
          {t('register.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('register.subtitle')}
        </Typography>
      </Stack>

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.5}>
            <TextField
              label={t('register.firstNameLabel')}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              fullWidth
            />
            <TextField
              label={t('register.lastNameLabel')}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              fullWidth
            />
          </Stack>
          <TextField
            label={t('register.emailLabel')}
            type="email"
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            required
            fullWidth
            autoComplete="email"
          />
          <TextField
            label={t('register.userNameLabel')}
            value={userName}
            onChange={(e) => {
              setUserName(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''));
              setUserNameTouched(true);
            }}
            required
            fullWidth
            autoComplete="username"
            helperText={t('register.userNameHelper')}
          />
          <TextField
            label={t('register.passwordLabel')}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            fullWidth
            helperText={t('register.passwordHelper')}
          />
          <TextField
            label={t('register.confirmLabel')}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            fullWidth
          />

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            fullWidth
            endIcon={<Icon icon="mdi:arrow-right" width={18} />}
            sx={{ py: 1.4, fontSize: '0.95rem' }}
          >
            {loading ? t('register.submitting') : t('register.submitButton')}
          </Button>
        </Stack>
      </Box>

      <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary', mt: 3 }}>
        {t('register.haveAccount')}{' '}
        <Link
          component={RouterLink}
          to="/login"
          underline="hover"
          sx={{ fontWeight: 600, color: 'primary.main' }}
        >
          {t('register.loginLink')}
        </Link>
      </Typography>
    </motion.div>
  );
}
