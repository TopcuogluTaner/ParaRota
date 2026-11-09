import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Button, Dialog, Stack, Typography, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useOnboardingStore } from './onboardingStore';

// ──────────────────────────────────────────────────────────
// İlk girişte tam ekran hoş geldin slaytları — mobildeki IntroSlides'ın web
// karşılığı. 5 slayt: hoş geldin → hızlı ekleme → kişisel/aile → içgörüler →
// raporlar. Her slaytta mini canlı UI önizlemesi (statik, demo veri).
// "Başla" → dashboard'a dönüp ana spotlight turunu başlatır.
// "Atla" → mobil paritesi: ana turu da atlamış sayılır, "görüldü" yazılır
// (sayfa turları bundan etkilenmez, ilk ziyaretlerde yine gelir).
// ──────────────────────────────────────────────────────────

const SLIDE_COUNT = 5;

export function IntroSlides() {
  const { t } = useTranslation('onboarding');
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const startTour = useOnboardingStore((s) => s.startTour);
  const stop = useOnboardingStore((s) => s.stop);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const isRtl = theme.direction === 'rtl';

  const isLast = index === SLIDE_COUNT - 1;

  const goNext = () => {
    if (isLast) {
      // Ana tur dashboard hedeflerini ister — önce oraya dön.
      if (location.pathname !== '/') navigate('/');
      window.setTimeout(() => startTour('main'), location.pathname !== '/' ? 650 : 250);
      useOnboardingStore.setState({ phase: 'idle' }); // slaytları kapat (startTour phase'i tour yapar)
      return;
    }
    setDir(1);
    setIndex((i) => i + 1);
  };
  const goPrev = () => {
    setDir(-1);
    setIndex((i) => Math.max(0, i - 1));
  };
  const skipAll = () => stop(true);

  // Klavye: ←/→ slayt, Esc atla. RTL'de oklar aynalanır.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const forward = isRtl ? 'ArrowLeft' : 'ArrowRight';
      const backward = isRtl ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === 'Escape') skipAll();
      else if (e.key === forward || e.key === 'Enter') goNext();
      else if (e.key === backward) goPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isRtl]);

  const slideX = (dir > 0 ? 36 : -36) * (isRtl ? -1 : 1);

  return (
    <Dialog
      fullScreen
      open
      onClose={skipAll}
      slotProps={{ paper: { sx: { bgcolor: 'background.default', backgroundImage: 'none' } } }}
    >
      <Box
        sx={{
          minHeight: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 3,
          py: 5,
          position: 'relative',
        }}
      >
        {/* Atla — sağ üst */}
        <Button
          variant="text"
          color="inherit"
          onClick={skipAll}
          sx={{
            position: 'absolute',
            top: 18,
            insetInlineEnd: 22,
            color: 'text.secondary',
            fontSize: '0.85rem',
          }}
        >
          {t('skip')}
        </Button>

        {/* Slayt içeriği */}
        <Box sx={{ width: '100%', maxWidth: 480, flex: '0 1 auto' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={index}
              initial={{ opacity: 0, x: slideX }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -slideX }}
              transition={{ duration: 0.32, ease: [0.2, 0.7, 0.3, 1] }}
            >
              <Stack alignItems="center" spacing={3.5}>
                <SlidePreview index={index} />
                <Stack spacing={1.4} alignItems="center" sx={{ textAlign: 'center' }}>
                  <Typography
                    sx={{
                      fontFamily: '"Fraunces", serif',
                      fontSize: { xs: '1.7rem', md: '2rem' },
                      fontWeight: 600,
                      letterSpacing: '-0.02em',
                      color: 'text.primary',
                    }}
                  >
                    {t(`slide${index + 1}_title`)}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: '0.95rem',
                      lineHeight: 1.6,
                      color: 'text.secondary',
                      maxWidth: 420,
                    }}
                  >
                    {t(`slide${index + 1}_text`)}
                  </Typography>
                </Stack>
              </Stack>
            </motion.div>
          </AnimatePresence>
        </Box>

        {/* Alt bar: noktalar + Geri/İleri */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ width: '100%', maxWidth: 480, mt: 5 }}
        >
          {index > 0 ? (
            <Button
              variant="text"
              color="inherit"
              onClick={goPrev}
              sx={{ color: 'text.secondary', fontSize: '0.85rem', fontWeight: 600 }}
            >
              {t('back')}
            </Button>
          ) : (
            <Box sx={{ width: 64 }} />
          )}

          <Stack direction="row" spacing={0.9}>
            {Array.from({ length: SLIDE_COUNT }, (_, i) => (
              <Box
                key={i}
                sx={{
                  width: i === index ? 22 : 8,
                  height: 8,
                  borderRadius: 999,
                  bgcolor: (th) =>
                    i === index ? 'primary.main' : alpha(th.palette.text.primary, 0.16),
                  transition: 'width .25s cubic-bezier(.2,.7,.3,1), background-color .25s',
                }}
              />
            ))}
          </Stack>

          <Button
            variant="contained"
            color="primary"
            onClick={goNext}
            sx={{ borderRadius: 999, px: 2.8, fontSize: '0.85rem', fontWeight: 600 }}
          >
            {isLast ? t('start') : t('next')}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}

// ──────────────────────────────────────────────────────────
// Mini önizlemeler — slayt başına bir "canlı UI" kartı (statik demo veri).
// ──────────────────────────────────────────────────────────

function SlidePreview({ index }: { index: number }) {
  switch (index) {
    case 0:
      return <PreviewHero />;
    case 1:
      return <PreviewAdd />;
    case 2:
      return <PreviewScope />;
    case 3:
      return <PreviewDonut />;
    default:
      return <PreviewExport />;
  }
}

function PreviewFrame({ children }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 380,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: 2.6,
        boxShadow: (th) =>
          th.palette.mode === 'dark'
            ? '0 24px 60px rgba(0,0,0,0.45)'
            : '0 24px 60px rgba(43,30,14,0.12)',
      }}
    >
      {children}
    </Box>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      sx={{
        fontFamily: '"Geist Mono", monospace',
        fontSize: '0.6rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'text.disabled',
        fontWeight: 600,
      }}
    >
      {children}
    </Typography>
  );
}

function PreviewHero() {
  const theme = useTheme();
  return (
    <PreviewFrame>
      <Stack spacing={1.6}>
        <Eyebrow>2026 · 06</Eyebrow>
        <Typography
          sx={{
            fontFamily: '"Fraunces", serif',
            fontSize: '2rem',
            fontWeight: 600,
            color: 'go.main',
            letterSpacing: '-0.02em',
            lineHeight: 1,
          }}
        >
          +12.450
        </Typography>
        <Stack direction="row" spacing={1}>
          <MiniChip icon="mdi:arrow-down-thin" color={theme.palette.go.main} label="86.200" />
          <MiniChip icon="mdi:arrow-up-thin" color={theme.palette.halt.main} label="73.750" />
        </Stack>
      </Stack>
    </PreviewFrame>
  );
}

function MiniChip({ icon, color, label }: { icon: string; color: string; label: string }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 1.1,
        py: 0.4,
        borderRadius: 999,
        bgcolor: alpha(color, 0.12),
        color,
        fontFamily: '"Geist Mono", monospace',
        fontSize: '0.72rem',
        fontWeight: 600,
      }}
    >
      <Icon icon={icon} width={14} />
      {label}
    </Box>
  );
}

function PreviewAdd() {
  return (
    <PreviewFrame>
      <Stack spacing={1.4}>
        <Box
          sx={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.7,
            px: 1.6,
            py: 0.8,
            borderRadius: 1.4,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontSize: '0.82rem',
            fontWeight: 600,
          }}
        >
          <Icon icon="mdi:plus" width={16} />
          <QuickAddLabel />
        </Box>
        {/* Fiş satırları — OCR doldurma hissi */}
        <Stack spacing={0.8} sx={{ pt: 0.4 }}>
          {[0.9, 0.65, 0.78].map((w, i) => (
            <Box
              key={i}
              sx={{
                height: 9,
                width: `${w * 100}%`,
                borderRadius: 999,
                bgcolor: (th) => alpha(th.palette.text.primary, i === 0 ? 0.14 : 0.08),
              }}
            />
          ))}
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.7} sx={{ color: 'text.secondary' }}>
          <Icon icon="mdi:receipt-text-outline" width={16} />
          <Typography sx={{ fontSize: '0.74rem' }}>OCR</Typography>
          <Icon icon="mdi:arrow-right-thin" width={16} style={{ transform: 'var(--pr-flip, none)' }} />
          <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: '0.74rem', color: 'go.main', fontWeight: 600 }}>
            -249,90
          </Typography>
        </Stack>
      </Stack>
    </PreviewFrame>
  );
}

function QuickAddLabel() {
  const { t } = useTranslation('common');
  return <span>{t('quickAdd')}</span>;
}

function PreviewScope() {
  const { t } = useTranslation(['household', 'navigation']);
  return (
    <PreviewFrame>
      <Stack direction="row" spacing={1}>
        <ScopeChip active icon="mdi:account-outline" label={t('household:switcher_personal')} />
        <ScopeChip icon="mdi:account-group-outline" label={t('navigation:household')} />
      </Stack>
      <Stack direction="row" spacing={-0.6} sx={{ mt: 1.8 }}>
        {['go', 'way', 'info'].map((k) => (
          <Box
            key={k}
            sx={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: '2px solid',
              borderColor: 'background.paper',
              bgcolor: `${k}.main`,
              display: 'grid',
              placeItems: 'center',
              color: '#FBF5E5',
            }}
          >
            <Icon icon="mdi:account" width={15} />
          </Box>
        ))}
      </Stack>
    </PreviewFrame>
  );
}

function ScopeChip({ active, icon, label }: { active?: boolean; icon: string; label: string }) {
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.6,
        px: 1.4,
        py: 0.6,
        borderRadius: 999,
        border: '1px solid',
        borderColor: active ? 'primary.main' : 'divider',
        bgcolor: (th) => (active ? alpha(th.palette.primary.main, 0.1) : 'transparent'),
        color: active ? 'primary.main' : 'text.secondary',
        fontSize: '0.8rem',
        fontWeight: 600,
      }}
    >
      <Icon icon={icon} width={15} />
      {label}
    </Box>
  );
}

function PreviewDonut() {
  const { t } = useTranslation('onboarding');
  const theme = useTheme();
  // Basit SVG donut — 4 demo kategori (MUI X-Charts'a gerek yok).
  const segments = [
    { key: 'demoCat_market', value: 38, color: theme.palette.go.main },
    { key: 'demoCat_rent', value: 30, color: theme.palette.way.main },
    { key: 'demoCat_transport', value: 18, color: theme.palette.info.main },
    { key: 'demoCat_fun', value: 14, color: theme.palette.halt.main },
  ];
  const r = 40;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <PreviewFrame>
      <Stack direction="row" spacing={2.4} alignItems="center">
        <svg width={110} height={110} viewBox="0 0 110 110" role="img" aria-hidden>
          <g transform="rotate(-90 55 55)">
            {segments.map((s) => {
              const dash = (s.value / 100) * c;
              const el = (
                <circle
                  key={s.key}
                  cx="55"
                  cy="55"
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="14"
                  strokeDasharray={`${dash - 2.5} ${c - dash + 2.5}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += dash;
              return el;
            })}
          </g>
        </svg>
        <Stack spacing={0.7}>
          {segments.map((s) => (
            <Stack key={s.key} direction="row" alignItems="center" spacing={0.8}>
              <Box sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: s.color }} />
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                {t(s.key)}
              </Typography>
              <Typography
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: '0.72rem',
                  color: 'text.disabled',
                  fontWeight: 600,
                }}
              >
                %{s.value}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>
    </PreviewFrame>
  );
}

function PreviewExport() {
  const theme = useTheme();
  return (
    <PreviewFrame>
      <Stack direction="row" spacing={1.4}>
        <ExportMiniCard icon="mdi:file-pdf-box" label="PDF" color={theme.palette.halt.main} />
        <ExportMiniCard icon="mdi:file-excel-box" label="XLSX" color={theme.palette.go.main} />
      </Stack>
    </PreviewFrame>
  );
}

function ExportMiniCard({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.8,
        py: 2,
        borderRadius: 2,
        border: '1px dashed',
        borderColor: 'divider',
        bgcolor: alpha(color, 0.06),
      }}
    >
      <Icon icon={icon} width={34} style={{ color }} />
      <Typography
        sx={{
          fontFamily: '"Geist Mono", monospace',
          fontSize: '0.7rem',
          letterSpacing: '0.14em',
          color: 'text.secondary',
          fontWeight: 600,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
