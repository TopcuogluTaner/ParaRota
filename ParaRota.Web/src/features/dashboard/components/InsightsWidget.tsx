import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { useInsightsQuery } from '../api/useDashboard';

// İçgörü anahtarı → ikon. Renk anlamdan (severity) gelir, süsten değil.
const ICONS: Record<string, string> = {
  categorySpike: 'mdi:trending-up',
  budgetPace: 'mdi:gauge',
  savingsRate: 'mdi:piggy-bank-outline',
  overspend: 'mdi:alert-circle-outline',
  upcomingWeek: 'mdi:calendar-clock',
};

// InsightSeverity değerleri MUI palet anahtarlarıyla birebir aynı; bilinmeyen
// backend değerine karşı yalnız 'info' fallback'i gerekir.
const KNOWN_SEVERITIES = new Set(['warning', 'success', 'info']);

/**
 * Kural bazlı içgörüler — Dashboard widget'ı (ücretsiz; premium AI kartından ayrı).
 * Backend key+params döner, metin burada kullanıcının dilinde kurulur
 * (bildirim sözleşmesinin aynısı). Hiç içgörü yoksa widget gizlenir.
 */
export function InsightsWidget() {
  const { t } = useTranslation('dashboard');
  const fmt = useMoneyFmt();
  const { data } = useInsightsQuery();

  if (!data || data.length === 0) return null;

  return (
    <SurfaceCard padding={3} sx={{ height: '100%' }}>
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
        {t('insights_eyebrow')}
      </Typography>
      <Typography variant="h5" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, mb: 2 }}>
        {t('insights_title')}
      </Typography>

      <Stack spacing={1.6}>
        {data.map((insight) => {
          const palette = KNOWN_SEVERITIES.has(insight.severity) ? insight.severity : 'info';
          const text = t(`insight_${insight.key}`, {
            ...insight.params,
            amount: typeof insight.params.amount === 'number' ? fmt(insight.params.amount) : insight.params.amount,
            defaultValue: '',
          });
          if (!text) return null;
          return (
            <Stack key={insight.key} direction="row" spacing={1.3} alignItems="flex-start">
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: 1.2,
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: (th) => alpha(th.palette[palette].main, 0.12),
                  color: `${palette}.main`,
                  flexShrink: 0,
                  mt: '1px',
                }}
              >
                <Icon icon={ICONS[insight.key] ?? 'mdi:information-outline'} width={16} />
              </Box>
              <Typography variant="body2" sx={{ pt: 0.4 }}>{text}</Typography>
            </Stack>
          );
        })}
      </Stack>
    </SurfaceCard>
  );
}
