import { useEffect, useRef, useState } from 'react';
import { Box, Button, Link, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Trans, useTranslation } from 'react-i18next';
import { SweetAlert } from '@shared/lib/sweetAlert';
import { authApi } from '../api/authApi';

const LENGTH = 6;

export function VerifyEmailPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromState = (location.state as { email?: string })?.email;
  const [email, setEmail] = useState(emailFromState ?? '');
  const [digits, setDigits] = useState<string[]>(Array.from({ length: LENGTH }, () => ''));
  const [loading, setLoading] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  const handleChange = (idx: number, raw: string) => {
    const val = raw.replace(/\D/g, '').slice(0, 1);
    setDigits((d) => {
      const next = [...d];
      next[idx] = val;
      return next;
    });
    if (val && idx < LENGTH - 1) refs.current[idx + 1]?.focus();
  };

  const handleKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array.from({ length: LENGTH }, (_, i) => pasted[i] ?? '');
    setDigits(next);
    refs.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
  };

  const handleVerify = async () => {
    const code = digits.join('');
    if (code.length !== LENGTH) {
      SweetAlert.warning(t('verify.errorCodeIncomplete'));
      return;
    }
    if (!email) {
      SweetAlert.warning(t('verify.errorEmailRequired'));
      return;
    }
    setLoading(true);
    try {
      const resp = await authApi.verifyEmail(email, code);
      if (resp.data.isSuccess) {
        SweetAlert.success(t('verify.successVerified'));
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
          {t('verify.eyebrow')}
        </Typography>
        <Typography variant="h3" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
          {t('verify.title')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {email ? (
            <Trans
              i18nKey="verify.subtitleWithEmail"
              ns="auth"
              values={{ email }}
              components={{ strong: <strong /> }}
            />
          ) : (
            t('verify.subtitleNoEmail')
          )}
        </Typography>
      </Stack>

      <Stack spacing={3}>
        {!emailFromState && (
          <Box
            component="input"
            type="email"
            placeholder={t('verify.emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{
              width: '100%',
              p: 1.5,
              fontFamily: '"Geist", sans-serif',
              fontSize: '0.95rem',
              borderRadius: 1.5,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              outline: 'none',
              '&:focus': { borderColor: 'primary.main' },
            }}
          />
        )}

        <Stack direction="row" spacing={1.2} justifyContent="center" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <Box
              key={i}
              component="input"
              inputMode="numeric"
              ref={(el: HTMLInputElement | null) => {
                refs.current[i] = el;
              }}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => handleKey(i, e)}
              sx={{
                width: 52,
                height: 64,
                textAlign: 'center',
                fontFamily: '"Geist Mono", monospace',
                fontSize: '1.6rem',
                fontWeight: 500,
                color: 'text.primary',
                borderRadius: 1.5,
                border: '1.5px solid',
                borderColor: d ? 'primary.main' : 'divider',
                bgcolor: 'background.paper',
                boxShadow: (th) => (d ? `0 0 0 4px ${alpha(th.palette.primary.main, 0.14)}` : 'none'),
                outline: 'none',
                transition: 'all .2s',
                '&:focus': { borderColor: 'primary.main', boxShadow: (th) => `0 0 0 4px ${alpha(th.palette.primary.main, 0.18)}` },
              }}
            />
          ))}
        </Stack>

        <Button variant="contained" size="large" onClick={handleVerify} disabled={loading} fullWidth sx={{ py: 1.4 }}>
          {loading ? t('verify.submitting') : t('verify.submitButton')}
        </Button>

        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.secondary' }}>
          {t('verify.notReceived')}{' '}
          <Link
            component="button"
            onClick={async () => {
              if (!email) return SweetAlert.warning(t('verify.errorEmailRequired'));
              await authApi.resendVerificationCode(email).catch(() => null);
              SweetAlert.info(t('verify.infoResent'));
            }}
            sx={{ fontWeight: 600, color: 'primary.main' }}
          >
            {t('verify.resend')}
          </Link>
        </Typography>

        <Typography variant="body2" sx={{ textAlign: 'center', color: 'text.disabled' }}>
          <Link component={RouterLink} to="/login" underline="hover" sx={{ color: 'text.secondary' }}>
            {t('verify.backToLogin')}
          </Link>
        </Typography>
      </Stack>
    </motion.div>
  );
}
