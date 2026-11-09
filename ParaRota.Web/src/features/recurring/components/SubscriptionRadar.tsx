import { Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { Money } from '@shared/components/Money';
import { formatDate } from '@shared/lib/dateFormat';
import { useSubscriptionRadarQuery } from '../api/useRecurringRules';

/**
 * Abonelik Radarı — Tekrarlayanlar sayfasının başında maliyet özeti:
 * aylık/yıllık toplam + aktif adet + üretilen işlemlerden zam tespiti.
 * Hiç abonelik kuralı yoksa sessizce gizlenir (sayfayı bloklamaz).
 *
 * Dar ekran sözleşmesi: zam satırı `flexWrap` ile sarar — isim + tutar
 * geçişi + yüzde çipi tek satıra sığmadığında alt satıra düşer, taşmaz.
 */
export function SubscriptionRadar() {
  const { t } = useTranslation('pages');
  const { data } = useSubscriptionRadarQuery();

  if (!data || data.items.length === 0) return null;

  const primary = data.totals[0];
  const priceChanges = data.items.filter((x) => x.priceChange);

  // "0 duraklatılmış" bilgi taşımaz — yalnız varsa göster (mobil paritesi).
  const countText = [
    t('recurring.radarActive', { count: data.activeCount }),
    data.pausedCount > 0 ? t('recurring.radarPaused', { count: data.pausedCount }) : null,
  ].filter(Boolean).join(' · ');

  return (
    // Elle kart kurma — SurfaceCard tema/dark-mode düzeltmelerini merkezde taşır.
    <SurfaceCard padding={2} sx={{ mb: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.2, minWidth: 0 }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: 1.5,
            display: 'grid',
            placeItems: 'center',
            bgcolor: (th) => alpha(th.palette.info.main, 0.12),
            color: 'info.main',
            flexShrink: 0,
          }}
        >
          <Icon icon="mdi:radar" width={16} />
        </Box>
        <Typography
          noWrap
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: '0.64rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'text.disabled',
            minWidth: 0,
          }}
        >
          {t('recurring.radarTitle')}
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Typography variant="caption" color="text.secondary" noWrap>
          {countText}
        </Typography>
      </Stack>

      {primary ? (
        <Stack direction="row" alignItems="flex-end" spacing={3} useFlexGap flexWrap="wrap">
          <Stack spacing={0}>
            <Money value={primary.monthlyTotal} currency={primary.currency} size="xl" weight={700} tone="neutral" />
            <Typography variant="caption" color="text.disabled">{t('recurring.radarPerMonth')}</Typography>
          </Stack>
          <Stack spacing={0}>
            <Money value={primary.yearlyTotal} currency={primary.currency} size="lg" tone="mute" />
            <Typography variant="caption" color="text.disabled">{t('recurring.radarPerYear')}</Typography>
          </Stack>
        </Stack>
      ) : null}

      {priceChanges.length > 0 ? (
        <>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={1}>
            {priceChanges.map((item) => {
              const pc = item.priceChange!;
              const up = pc.percent > 0;
              return (
                <Stack
                  key={item.ruleId}
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  useFlexGap
                  flexWrap="wrap"
                  sx={{ rowGap: 0.4 }}
                >
                  <Box
                    sx={{
                      display: 'inline-flex',
                      color: up ? 'warning.main' : 'success.main',
                      flexShrink: 0,
                    }}
                  >
                    <Icon icon={up ? 'mdi:trending-up' : 'mdi:trending-down'} width={16} />
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 0, flex: '1 1 auto' }} noWrap>
                    {item.description}
                  </Typography>
                  <Stack direction="row" alignItems="center" spacing={0.6} sx={{ flexShrink: 0 }}>
                    <Money value={pc.previousAmount} currency={item.currency} size="sm" tone="mute" />
                    <Typography variant="caption" color="text.disabled">→</Typography>
                    <Money value={pc.currentAmount} currency={item.currency} size="sm" tone="mute" />
                  </Stack>
                  <Chip
                    size="small"
                    color={up ? 'warning' : 'success'}
                    variant="outlined"
                    label={`${up ? '+' : ''}${pc.percent}% · ${formatDate(pc.changedAt, 'MMM YYYY')}`}
                    sx={{ fontFamily: '"Geist Mono", monospace', fontSize: '0.68rem', flexShrink: 0 }}
                  />
                </Stack>
              );
            })}
          </Stack>
        </>
      ) : null}
    </SurfaceCard>
  );
}
