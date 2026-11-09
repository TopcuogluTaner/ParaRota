import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { Money } from '@shared/components/Money';
import { useSubscriptionRadarQuery } from '@features/recurring/api/useRecurringRules';

/**
 * Dashboard mini widget'ı: aylık abonelik toplamı + aktif adet + zam sayısı.
 * Hiç abonelik kuralı yoksa render edilmez; "Tümü" → Tekrarlayanlar sayfası.
 *
 * Dar ekran sözleşmesi: bilgi gizlenmez — sayaç/zam bloğu `flexWrap` ile
 * xs'te tutarın altına sarar (display:none ile içerik kaybı yasak).
 */
export function SubscriptionRadarWidget() {
  const { t } = useTranslation(['pages', 'common']);
  const { data } = useSubscriptionRadarQuery();

  if (!data || data.items.length === 0 || data.totals.length === 0) return null;

  const primary = data.totals[0];
  const raises = data.items.filter((x) => x.priceChange && x.priceChange.percent > 0).length;

  return (
    <SurfaceCard padding={3}>
      <Stack direction="row" alignItems="center" spacing={2} useFlexGap flexWrap="wrap" sx={{ rowGap: 1.2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: (th) => alpha(th.palette.info.main, 0.12),
            color: 'info.main',
            flexShrink: 0,
          }}
        >
          <Icon icon="mdi:radar" width={22} />
        </Box>
        <Box sx={{ minWidth: 0, flex: '1 1 160px' }}>
          <Typography
            noWrap
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.64rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'text.disabled',
            }}
          >
            {t('pages:recurring.radarTitle')}
          </Typography>
          <Stack direction="row" alignItems="baseline" spacing={0.8}>
            <Money value={primary.monthlyTotal} currency={primary.currency} size="lg" weight={700} tone="neutral" />
            <Typography variant="caption" color="text.disabled">{t('pages:recurring.radarPerMonth')}</Typography>
          </Stack>
        </Box>
        <Stack
          alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
          spacing={0.3}
          sx={{ minWidth: 0, flex: '0 1 auto' }}
        >
          <Typography variant="caption" color="text.secondary" noWrap>
            {[
              t('pages:recurring.radarActive', { count: data.activeCount }),
              data.pausedCount > 0 ? t('pages:recurring.radarPaused', { count: data.pausedCount }) : null,
            ].filter(Boolean).join(' · ')}
          </Typography>
          {raises > 0 ? (
            <Typography variant="caption" sx={{ color: 'warning.main' }} noWrap>
              {t('pages:recurring.radarRaises', { count: raises })}
            </Typography>
          ) : null}
        </Stack>
        <Button
          component={RouterLink}
          to="/recurring"
          variant="text"
          size="small"
          endIcon={<Icon icon="mdi:arrow-right" width={16} />}
          sx={{ fontSize: '0.82rem', flexShrink: 0, ml: { sm: 'auto' } }}
        >
          {t('common:all')}
        </Button>
      </Stack>
    </SurfaceCard>
  );
}
