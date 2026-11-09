import { Outlet } from 'react-router-dom';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@shared/components/BrandMark';
import { LanguageSwitcher } from './LanguageSwitcher';

export function AuthLayout() {
  const { t } = useTranslation('auth');
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.05fr 1fr' },
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >
      {/* Left: editorial side — story + brand */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          position: 'relative',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: { md: 5, lg: 7 },
          color: 'common.white',
          background: (t) =>
            t.palette.mode === 'dark'
              ? 'linear-gradient(155deg, #0A1F18 0%, #0C2A1F 40%, #08130E 100%)'
              : 'linear-gradient(155deg, #0F4F3D 0%, #0A6A52 45%, #073D2F 100%)',
        }}
      >
        {/* Cartographic overlay */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/topographic.svg)',
            backgroundSize: '780px',
            opacity: 0.18,
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          }}
        />
        {/* Soft glows */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: '-20%',
            right: '-15%',
            width: 520,
            height: 520,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(213,138,54,0.32) 0%, transparent 60%)',
            filter: 'blur(20px)',
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            bottom: '-25%',
            left: '-10%',
            width: 580,
            height: 580,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(31,181,133,0.32) 0%, transparent 60%)',
            filter: 'blur(20px)',
          }}
        />

        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <BrandMark size={64} />
        </Box>

        <Stack spacing={3} sx={{ position: 'relative', zIndex: 1, maxWidth: 540 }}>
          <Typography
            component={motion.h1}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            sx={{
              fontFamily: '"Fraunces", serif',
              fontWeight: 400,
              fontSize: { md: '3.2rem', lg: '4rem' },
              lineHeight: 1.02,
              letterSpacing: '-0.03em',
              color: '#FBF5E5',
              fontStyle: 'italic',
            }}
          >
            {t('layout.taglineLine1')}
            <br />
            <Box component="span" sx={{ fontStyle: 'normal', color: '#F1B96A' }}>
              {t('layout.taglineLine2')}
            </Box>
          </Typography>

          <Typography
            component={motion.p}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
            sx={{ fontSize: '1.05rem', lineHeight: 1.55, color: alpha('#FBF5E5', 0.78), maxWidth: 460 }}
          >
            {t('layout.description')}
          </Typography>

          {/* Mini stat row — anchors the brand promise */}
          <Stack
            direction="row"
            spacing={3}
            component={motion.div}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            sx={{ pt: 2, mt: 2, borderTop: '1px solid', borderColor: alpha('#FBF5E5', 0.16) }}
          >
            {[
              { v: t('layout.stat1Value'), l: t('layout.stat1Label') },
              { v: t('layout.stat2Value'), l: t('layout.stat2Label') },
              { v: t('layout.stat3Value'), l: t('layout.stat3Label') },
            ].map((s) => (
              <Box key={s.l}>
                <Typography
                  className="pr-num"
                  sx={{ fontSize: '1.6rem', fontWeight: 600, color: '#FBF5E5', lineHeight: 1 }}
                >
                  {s.v}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: '0.66rem',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    color: alpha('#FBF5E5', 0.6),
                    mt: 0.5,
                  }}
                >
                  {s.l}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Stack>

        {/* Footer note */}
        <Typography
          sx={{
            position: 'relative',
            zIndex: 1,
            fontFamily: '"Geist Mono", monospace',
            fontSize: '0.68rem',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: alpha('#FBF5E5', 0.42),
          }}
        >
          {t('layout.footer')}
        </Typography>
      </Box>

      {/* Right: form column */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          p: { xs: 3, md: 5 },
          position: 'relative',
        }}
      >
        {/* Language switcher — pinned top-right on every auth screen */}
        <Box sx={{ position: 'absolute', top: 20, right: 20, zIndex: 2 }}>
          <LanguageSwitcher />
        </Box>

        {/* Mobile-only brand — sol panel görünmediğinde marka formun üstünde, büyük ve ortada */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 4.5 }}>
          <BrandMark size={56} />
        </Box>

        <Box sx={{ width: '100%', maxWidth: 440 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
