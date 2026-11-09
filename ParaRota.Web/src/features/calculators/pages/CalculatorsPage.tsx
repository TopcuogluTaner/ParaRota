import { Box, ButtonBase, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { SectionHeader } from '@shared/components/SectionHeader';

type Tone = 'success' | 'warning' | 'info' | 'error';

interface Calc {
  key: string;
  to: string;
  icon: string;
  tone: Tone;
}

// Mevcut rotalar korunur; hub yalnız bunlara yönlendirir.
const CALCS: Calc[] = [
  { key: 'payroll', to: '/payroll', icon: 'mdi:calculator-variant-outline', tone: 'success' },
  { key: 'severance', to: '/severance', icon: 'mdi:briefcase-clock-outline', tone: 'warning' },
  { key: 'rent', to: '/rent-increase', icon: 'mdi:home-percent-outline', tone: 'info' },
  { key: 'inflation', to: '/money-value', icon: 'mdi:cash-clock', tone: 'error' },
  { key: 'loan', to: '/loan-cost', icon: 'mdi:bank-outline', tone: 'warning' },
];

/**
 * Hesaplayıcılar hub'ı — Türkiye'ye özgü finansal hesaplayıcıları tek yerde toplar.
 * Drawer'daki ayrı girişlerin yerini alır; kartlar mevcut ekranlara yönlendirir.
 */
export function CalculatorsPage() {
  const { t } = useTranslation('calculators');
  const navigate = useNavigate();

  return (
    <Box sx={{ p: { xs: 2, sm: 2.6, md: 4 }, maxWidth: 1100, mx: 'auto' }}>
      <SectionHeader eyebrow={t('page_eyebrow')} title={t('page_title')} description={t('page_description')} />

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
          gap: { xs: 1.6, sm: 2 },
        }}
      >
        {CALCS.map((c, i) => (
          <motion.div
            key={c.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: i * 0.06 }}
          >
            <ButtonBase
              onClick={() => navigate(c.to)}
              sx={{
                width: '100%',
                textAlign: 'start',
                display: 'block',
                borderRadius: 2.5,
                '&:hover .calc-card': {
                  transform: 'translateY(-2px)',
                  borderColor: (th) => alpha(th.palette[c.tone].main, 0.5),
                },
              }}
            >
              <Box
                className="calc-card"
                sx={{
                  p: { xs: 2, sm: 2.4 },
                  height: '100%',
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2.5,
                  transition: 'transform .22s cubic-bezier(.2,.7,.3,1), border-color .22s',
                  boxShadow: (th) =>
                    th.palette.mode === 'dark' ? 'none' : '0 1px 2px rgba(43,30,14,0.04)',
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 1.5,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: (th) => alpha(th.palette[c.tone].main, 0.13),
                      color: `${c.tone}.main`,
                    }}
                  >
                    <Icon icon={c.icon} width={22} />
                  </Box>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: '0.62rem',
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      px: 1,
                      py: 0.4,
                      borderRadius: 999,
                      bgcolor: (th) => alpha(th.palette[c.tone].main, 0.1),
                      color: `${c.tone}.main`,
                    }}
                  >
                    {t(`${c.key}_tag`)}
                  </Typography>
                </Stack>

                <Typography
                  component="div"
                  sx={{
                    fontFamily: '"Fraunces", serif',
                    fontWeight: 500,
                    fontSize: '1.3rem',
                    letterSpacing: '-0.01em',
                    mt: 1.8,
                  }}
                >
                  {t(`${c.key}_title`)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, lineHeight: 1.5 }}>
                  {t(`${c.key}_sub`)}
                </Typography>

                <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 1.6, color: `${c.tone}.main` }}>
                  <Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    {t('open')}
                  </Typography>
                  <Box component="span" sx={{ display: 'inline-flex', transform: (th) => (th.direction === 'rtl' ? 'scaleX(-1)' : 'none') }}>
                    <Icon icon="mdi:arrow-right" width={16} />
                  </Box>
                </Stack>
              </Box>
            </ButtonBase>
          </motion.div>
        ))}
      </Box>
    </Box>
  );
}
