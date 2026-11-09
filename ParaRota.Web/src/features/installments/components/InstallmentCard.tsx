import { Box, Chip, IconButton, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { Money } from '@shared/components/Money';
import { planState, MONTH_SHORT_KEYS } from '../lib/installmentMath';
import type { RecurringRuleDto } from '@shared/api/types';

interface Props {
  plan: RecurringRuleDto;
  index: number;
  onMenu: (anchor: HTMLElement) => void;
}

/**
 * Tek taksit planı kartı: kategori ikonu + isim + durum, k/n ilerleme barı,
 * aylık tutar ve kebab menü. Durum: aktif → "Eyl 2026 bitiyor", done/closed → rozet.
 */
export function InstallmentCard({ plan, index, onMenu }: Props) {
  const { t } = useTranslation(['installments', 'common']);

  const state = planState(plan);
  const count = plan.installmentCount ?? 1;
  const paid = Math.min(plan.paidInstallments, count);
  const pct = Math.min(100, Math.max(0, (paid / count) * 100));
  const catColor = plan.category?.color ?? '#5A6E7C';
  const barColor =
    state === 'done' ? 'success.main' : state === 'closed' ? 'text.disabled' : catColor;

  const endLabel = (() => {
    if (!plan.endDate) return '';
    const d = new Date(plan.endDate);
    return `${t(`common:${MONTH_SHORT_KEYS[d.getMonth()]}`)} ${d.getFullYear()}`;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
    >
      <SurfaceCard
        padding={0}
        sx={{
          p: { xs: 2, sm: 2.4 },
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '3px solid',
          borderLeftColor: state === 'closed' ? 'divider' : catColor,
          opacity: state === 'closed' ? 0.78 : 1,
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.6, sm: 2 }} alignItems={{ sm: 'center' }}>
          {/* Sol: kategori ikonu + isim + durum */}
          <Stack direction="row" spacing={1.4} alignItems="center" sx={{ flex: 1.4, minWidth: 0 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: 1.4,
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                bgcolor: alpha(catColor, 0.13),
                color: catColor,
                fontSize: '1.2rem',
              }}
            >
              {plan.category?.emoji ? (
                plan.category.emoji
              ) : (
                <Icon icon={plan.category?.icon ?? 'mdi:credit-card-clock-outline'} width={22} />
              )}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: '1.05rem', lineHeight: 1.2 }}
                noWrap
              >
                {plan.description}
              </Typography>
              {state === 'active' ? (
                <Typography
                  variant="caption"
                  sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}
                  noWrap
                >
                  {t('state_ends', { date: endLabel })}
                </Typography>
              ) : (
                <Chip
                  size="small"
                  label={state === 'done' ? t('state_done') : t('state_closed')}
                  icon={
                    <Icon
                      icon={state === 'done' ? 'mdi:check-circle-outline' : 'mdi:stop-circle-outline'}
                      width={13}
                    />
                  }
                  color={state === 'done' ? 'success' : 'default'}
                  variant="outlined"
                  sx={{ mt: 0.4, height: 21, fontSize: '0.68rem', '& .MuiChip-icon': { ml: 0.6 } }}
                />
              )}
            </Box>
          </Stack>

          {/* Orta: k/n ilerleme — taksitin tek bakışta okunan kimliği */}
          <Stack sx={{ flex: 1.2, minWidth: 0 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="baseline" spacing={1}>
              <Typography
                variant="caption"
                className="pr-num"
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: 'text.secondary',
                }}
              >
                {paid}/{count}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="baseline">
                <Money
                  value={plan.amount}
                  currency={plan.currency}
                  size="md"
                  weight={600}
                  tone={state === 'active' ? 'halt' : 'neutral'}
                />
                <Typography variant="caption" sx={{ color: 'text.disabled', textTransform: 'none', letterSpacing: 0 }}>
                  {t('perMonth')}
                </Typography>
              </Stack>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={pct}
              sx={{
                mt: 0.7,
                height: 6,
                borderRadius: 99,
                bgcolor: (th) =>
                  alpha(
                    state === 'done' ? th.palette.success.main : state === 'closed' ? th.palette.text.disabled : catColor,
                    0.12,
                  ),
                '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 99 },
              }}
            />
          </Stack>

          {/* Aksiyonlar: kebab menü (düzenle / kalanını kapat / sil) */}
          <Stack direction="row" sx={{ alignSelf: { xs: 'flex-end', sm: 'center' } }}>
            <Tooltip title={t('common:edit')} arrow>
              <IconButton
                size="small"
                onClick={(e) => onMenu(e.currentTarget)}
                aria-label={t('common:edit')}
              >
                <Icon icon="mdi:dots-vertical" width={16} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      </SurfaceCard>
    </motion.div>
  );
}
