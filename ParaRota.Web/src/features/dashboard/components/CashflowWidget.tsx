import { Box, Divider, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { Money } from '@shared/components/Money';
import { dayjs, formatDate } from '@shared/lib/dateFormat';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { useCashflowQuery } from '../api/useDashboard';

/**
 * Ay sonu tahmini — Dashboard widget'ı. Bilinen gelecek akış yoksa render
 * edilmez (tahmin = mevcut net olurdu, özet kartları onu zaten gösteriyor).
 * Sol: tahmin kahraman + kırılım; sağ: gün gruplu yaklaşan akış listesi.
 * Dar ekranda iki sütun alt alta sarar (bilgi gizlenmez).
 */
export function CashflowWidget() {
  const { t } = useTranslation('dashboard');
  const fmt = useMoneyFmt();
  const { data } = useCashflowQuery();

  if (!data || data.items.length === 0) return null;

  // Gün gruplu liste (tarih sıralı geldiği varsayımıyla tek geçiş).
  const groups: { day: string; items: typeof data.items }[] = [];
  for (const item of data.items) {
    const day = dayjs(item.date).format('YYYY-MM-DD');
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(item);
    else groups.push({ day, items: [item] });
  }

  return (
    <SurfaceCard padding={3}>
      <Stack direction="row" spacing={3} useFlexGap flexWrap="wrap">
        {/* Sol: tahmin */}
        <Box sx={{ flex: '1 1 240px', minWidth: 0 }}>
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
            {t('cashflow_eyebrow')}
          </Typography>
          <Typography variant="h5" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, mb: 1.5 }}>
            {t('cashflow_title')}
          </Typography>
          <Stack direction="row" alignItems="baseline" spacing={0.8}>
            <Money value={data.projectedNet} signed size="display" weight={700} />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {t('cashflow_breakdown', {
              actual: fmt(data.actualNet),
              income: fmt(data.plannedIncome),
              expense: fmt(data.plannedExpense),
            })}
          </Typography>
        </Box>

        {/* Sağ: yaklaşan akışlar (gün gruplu, kompakt) */}
        <Box sx={{ flex: '1 1 300px', minWidth: 0, maxHeight: 280, overflowY: 'auto', pr: 0.5 }}>
          <Stack spacing={1.4}>
            {groups.map((g) => (
              <Box key={g.day}>
                <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: '"Geist Mono", monospace' }}>
                  {formatDate(g.day, 'D MMMM dddd')}
                </Typography>
                <Stack spacing={0.6} sx={{ mt: 0.4 }}>
                  {g.items.map((item, i) => {
                    const isIncome = item.type === 'income';
                    return (
                      <Stack key={`${item.ruleId}-${i}`} direction="row" alignItems="center" spacing={1}>
                        <Box
                          sx={{
                            width: 22,
                            height: 22,
                            borderRadius: 1,
                            display: 'grid',
                            placeItems: 'center',
                            bgcolor: (th) => alpha(isIncome ? th.palette.success.main : th.palette.error.main, 0.12),
                            color: isIncome ? 'success.main' : 'error.main',
                            flexShrink: 0,
                          }}
                        >
                          <Icon icon={isIncome ? 'mdi:arrow-bottom-left' : 'mdi:arrow-top-right'} width={13} />
                        </Box>
                        <Typography variant="body2" noWrap sx={{ minWidth: 0, flex: 1 }}>
                          {item.description}
                        </Typography>
                        <Money
                          value={isIncome ? item.amount : -item.amount}
                          currency={item.currency}
                          signed
                          size="sm"
                        />
                      </Stack>
                    );
                  })}
                </Stack>
                <Divider sx={{ mt: 1.2 }} />
              </Box>
            ))}
          </Stack>
        </Box>
      </Stack>
    </SurfaceCard>
  );
}
