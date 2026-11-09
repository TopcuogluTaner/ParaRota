import { useState } from 'react';
import { Box, Button, CircularProgress, Skeleton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import { useEntitlement } from '@features/subscription/hooks/useEntitlement';
import { usePaywallStore } from '@features/subscription/store/usePaywallStore';
import { useMonthlyInsightsQuery } from '../api/useAi';
import type { InsightTone } from '@shared/api/types';

// ────────────────────────────────────────────────────────────────────────────
// Pano AI içgörü kartı (premium). Mobil AiInsightsCard portu:
// - Lazy: kullanıcı istemeden Gemini kotası yakılmaz — "içgörüleri getir"
//   tıklamasıyla yüklenir, 12 saat önbellekli (client + server).
// - Premium değilse: kilitli "redakte edilmiş sütun" teaser'ı → paywall('ai').
//   Sorgu HİÇ atılmaz (enabled = requested && isPremium); backend 403'ü yine
//   de yakalanır ve kilitli görünüme düşülür.
// - Rakamlar sunucuda hesaplanır; AI yalnız yorumlar.
// RTL-safe: yalnız Stack/flex + logical spacing; fiziksel left/right yok.
// ────────────────────────────────────────────────────────────────────────────

interface Props {
  month: number;
  year: number;
}

/** Mobil tone eşlemesi: positive→go(success), warning→way(warning), neutral→mute. */
const TONE_COLOR: Record<InsightTone, string> = {
  positive: 'success.main',
  warning: 'warning.main',
  neutral: 'text.disabled',
};

function isPremiumRequiredError(err: unknown): boolean {
  const e = err as { response?: { status?: number; data?: { errorCode?: string } } } | undefined;
  return e?.response?.data?.errorCode === 'PREMIUM_REQUIRED' || e?.response?.status === 403;
}

export function AiInsightsCard({ month, year }: Props) {
  const { t } = useTranslation(['ai', 'common']);
  const { isPremium } = useEntitlement();
  const showPaywall = usePaywallStore((s) => s.show);
  const [requested, setRequested] = useState(false);

  const q = useMonthlyInsightsQuery(month, year, requested && isPremium);

  // Premium değil ya da (savunma hattı) backend 403 dedi → kilitli teaser.
  const locked = !isPremium || (q.isError && isPremiumRequiredError(q.error));

  return (
    <SurfaceCard padding={3} sx={{ height: '100%', overflow: 'hidden' }}>
      {/* Header — panonun editoryal grameri: Geist Mono eyebrow + Fraunces başlık */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
        <Box>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.66rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              mb: 0.5,
            }}
          >
            {t('ai:insights_eyebrow')}
          </Typography>
          <Typography variant="h5" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
            {t('ai:insights_title')}
          </Typography>
        </Box>
        <Box
          aria-hidden
          sx={{
            width: 38,
            height: 38,
            borderRadius: 1.6,
            display: 'grid',
            placeItems: 'center',
            color: 'warning.main',
            bgcolor: (th) => alpha(th.palette.warning.main, 0.12),
            flexShrink: 0,
          }}
        >
          <Icon icon={locked ? 'mdi:lock-outline' : 'mdi:creation'} width={20} />
        </Box>
      </Stack>

      {locked ? (
        <LockedTeaser onOpen={() => showPaywall('ai')} />
      ) : !requested ? (
        <Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6, maxWidth: 560 }}>
            {t('ai:insights_hint')}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            color="warning"
            onClick={() => setRequested(true)}
            startIcon={<Icon icon="mdi:creation" width={16} />}
            sx={{ mt: 1.8, borderRadius: 999, px: 1.8 }}
          >
            {t('ai:insights_cta')}
          </Button>
        </Box>
      ) : q.isFetching && !q.data ? (
        <Box>
          <Stack spacing={1.4} sx={{ mb: 1.6 }}>
            {[82, 64, 73].map((w, i) => (
              <Stack key={i} direction="row" spacing={1.2} alignItems="center">
                <Skeleton variant="circular" width={8} height={8} />
                <Skeleton variant="text" width={`${w}%`} height={18} />
              </Stack>
            ))}
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'text.disabled' }}>
            <CircularProgress size={14} thickness={5} color="warning" />
            <Typography variant="caption">{t('ai:insights_loading')}</Typography>
          </Stack>
        </Box>
      ) : q.isError ? (
        <Box>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {resolveApiErrorWithFallback(q.error, t('common:error'))}
          </Typography>
          <Button
            variant="text"
            size="small"
            onClick={() => void q.refetch()}
            startIcon={<Icon icon="mdi:refresh" width={15} />}
            sx={{ mt: 0.8, fontSize: '0.8rem' }}
          >
            {t('common:retry')}
          </Button>
        </Box>
      ) : q.data && q.data.items.length > 0 ? (
        <Box>
          <Stack spacing={1.4}>
            {q.data.items.map((item, i) => (
              <Stack key={i} direction="row" spacing={1.2} alignItems="flex-start">
                <Box
                  aria-hidden
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    mt: '6px',
                    flexShrink: 0,
                    bgcolor: TONE_COLOR[item.tone] ?? TONE_COLOR.neutral,
                    boxShadow: (th) =>
                      `0 0 0 3px ${alpha(
                        item.tone === 'positive'
                          ? th.palette.success.main
                          : item.tone === 'warning'
                            ? th.palette.warning.main
                            : th.palette.text.disabled,
                        0.16,
                      )}`,
                  }}
                />
                <Typography variant="body2" sx={{ lineHeight: 1.55, minWidth: 0 }}>
                  {item.text}
                </Typography>
              </Stack>
            ))}
          </Stack>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.6rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              mt: 2,
            }}
          >
            {t('ai:insights_disclaimer')}
          </Typography>
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.disabled' }}>
          {t('ai:insights_empty')}
        </Typography>
      )}
    </SurfaceCard>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Kilitli teaser — "redakte edilmiş sütun": gerçek içgörü satırlarının ton
// noktaları görünür, metin yerinde buğulu mürekkep şeritleri. Satılan şeyin
// şekli belli, içeriği premium'da. Tamamı tek erişilebilir buton.
// ────────────────────────────────────────────────────────────────────────────

const REDACTED_ROWS: { tone: InsightTone; width: string }[] = [
  { tone: 'positive', width: '84%' },
  { tone: 'warning', width: '62%' },
  { tone: 'neutral', width: '74%' },
];

function LockedTeaser({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation('ai');

  return (
    <Box
      component="button"
      type="button"
      onClick={onOpen}
      aria-label={t('locked_title')}
      sx={{
        display: 'block',
        width: '100%',
        p: 0,
        m: 0,
        border: 0,
        bgcolor: 'transparent',
        textAlign: 'start',
        cursor: 'pointer',
        borderRadius: 1.5,
        outline: 'none',
        '&:focus-visible': {
          boxShadow: (th) => `0 0 0 3px ${alpha(th.palette.warning.main, 0.35)}`,
        },
        '&:hover .pr-ai-cta': {
          bgcolor: (th) => alpha(th.palette.warning.main, 0.16),
        },
      }}
    >
      {/* Redakte satırlar — dekoratif, ekran okuyucuya kapalı */}
      <Stack spacing={1.4} aria-hidden sx={{ mb: 2.2 }}>
        {REDACTED_ROWS.map((row, i) => (
          <Stack key={i} direction="row" spacing={1.2} alignItems="center">
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                flexShrink: 0,
                bgcolor: TONE_COLOR[row.tone],
                opacity: 0.85,
              }}
            />
            <Box
              sx={{
                height: 11,
                width: row.width,
                borderRadius: 999,
                filter: 'blur(2.5px)',
                background: (th) =>
                  `linear-gradient(90deg, ${alpha(th.palette.text.primary, 0.22)} 0%, ${alpha(
                    th.palette.text.primary,
                    0.08,
                  )} 55%, ${alpha(th.palette.text.primary, 0.18)} 100%)`,
              }}
            />
          </Stack>
        ))}
      </Stack>

      {/* Satış satırı: rozet + kopya + CTA çipi */}
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1.2 }}>
        <Box sx={{ minWidth: 0, flex: '1 1 240px' }}>
          <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mb: 0.4 }}>
            <Box sx={{ display: 'inline-flex', color: 'warning.main', lineHeight: 0 }}>
              <Icon icon="mdi:crown-outline" width={14} />
            </Box>
            <Typography
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.6rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'warning.main',
                fontWeight: 600,
              }}
            >
              {t('locked_badge')}
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1.4 }}>
            {t('locked_title')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.2 }}>
            {t('locked_desc')}
          </Typography>
        </Box>
        <Box
          className="pr-ai-cta"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.7,
            px: 1.6,
            py: 0.7,
            borderRadius: 999,
            flexShrink: 0,
            color: 'warning.main',
            bgcolor: (th) => alpha(th.palette.warning.main, 0.1),
            border: (th) => `1px solid ${alpha(th.palette.warning.main, 0.4)}`,
            fontSize: '0.78rem',
            fontWeight: 600,
            transition: 'background-color .18s ease',
          }}
        >
          <Icon icon="mdi:creation" width={15} />
          {t('locked_cta')}
        </Box>
      </Stack>
    </Box>
  );
}
