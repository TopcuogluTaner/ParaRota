import { useMemo } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ZoomModal } from '@shared/components/ZoomModal';
import { Money } from '@shared/components/Money';
import { SignalBadge } from '@shared/components/SignalBadge';
import { EmptyState } from '@shared/components/EmptyState';
import { formatDate } from '@shared/lib/dateFormat';
import { buildDebtSchedule, type InstallmentState } from '../lib/debtSchedule';
import type { DebtDto } from '@shared/api/types/debts';

interface Props {
  open: boolean;
  onClose: () => void;
  debt: DebtDto;
}

const STATE_META: Record<
  InstallmentState,
  { tone: 'go' | 'way' | 'halt'; icon: string; labelKey: string }
> = {
  paid: { tone: 'go', icon: 'mdi:check', labelKey: 'schedule_paid' },
  upcoming: { tone: 'way', icon: 'mdi:clock-outline', labelKey: 'schedule_upcoming' },
  overdue: { tone: 'halt', icon: 'mdi:alert-outline', labelKey: 'schedule_overdue' },
};

const TONE_COLOR: Record<InstallmentState, 'success' | 'warning' | 'error'> = {
  paid: 'success',
  upcoming: 'warning',
  overdue: 'error',
};

export function DebtScheduleModal({ open, onClose, debt }: Props) {
  const { t } = useTranslation(['debts', 'common']);

  const schedule = useMemo(() => buildDebtSchedule(debt), [debt]);

  const summary = useMemo(() => {
    if (!schedule) return null;
    const paid = schedule.filter((s) => s.state === 'paid').length;
    const overdue = schedule.filter((s) => s.state === 'overdue').length;
    return { paid, overdue, total: schedule.length };
  }, [schedule]);

  return (
    <ZoomModal
      open={open}
      onClose={onClose}
      icon="mdi:calendar-clock"
      title={t('schedule_title')}
      subtitle={debt.title}
      maxWidth={480}
    >
      {/* Tek seferlik borç (taksitsiz): sade vade gösterimi */}
      {!schedule ? (
        debt.dueDate ? (
          <Stack spacing={2}>
            <Box
              sx={{
                p: 2.2,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: (th) => alpha(th.palette.primary.main, 0.04),
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: '0.62rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'text.disabled',
                }}
              >
                {t('schedule_singleDueLabel')}
              </Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mt: 0.6 }}>
                <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: '1.1rem' }}>
                  {formatDate(debt.dueDate)}
                </Typography>
                <Money value={debt.amount} currency={debt.currency} size="md" weight={600} />
              </Stack>
            </Box>
          </Stack>
        ) : (
          <EmptyState
            icon="mdi:calendar-blank-outline"
            title={t('schedule_noneTitle')}
            description={t('schedule_noneDescription')}
          />
        )
      ) : (
        <Stack spacing={2.4}>
          {/* Özet satırı */}
          {summary && (
            <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap' }}>
              <SignalBadge tone="go" size="sm" icon={<Icon icon="mdi:check" width={13} />}>
                {t('schedule_summaryPaid', { paid: summary.paid, total: summary.total })}
              </SignalBadge>
              {summary.overdue > 0 && (
                <SignalBadge tone="halt" size="sm" icon={<Icon icon="mdi:alert-outline" width={13} />}>
                  {t('schedule_summaryOverdue', { count: summary.overdue })}
                </SignalBadge>
              )}
            </Stack>
          )}

          {/* Dikey timeline */}
          <Box sx={{ position: 'relative' }}>
            {schedule.map((inst, i) => {
              const meta = STATE_META[inst.state];
              const color = TONE_COLOR[inst.state];
              const isLast = i === schedule.length - 1;
              return (
                <motion.div
                  key={inst.index}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.35) }}
                >
                  <Stack direction="row" spacing={1.8} sx={{ position: 'relative' }}>
                    {/* Nokta + çizgi rayı */}
                    <Box
                      sx={{
                        position: 'relative',
                        width: 28,
                        flexShrink: 0,
                        display: 'flex',
                        justifyContent: 'center',
                      }}
                    >
                      {/* dikey çizgi */}
                      {!isLast && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 28,
                            bottom: -8,
                            width: 2,
                            bgcolor: (th) => alpha(th.palette[color].main, 0.22),
                          }}
                        />
                      )}
                      {/* nokta */}
                      <Box
                        sx={{
                          zIndex: 1,
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: (th) =>
                            inst.state === 'paid'
                              ? th.palette[color].main
                              : alpha(th.palette[color].main, th.palette.mode === 'dark' ? 0.18 : 0.12),
                          color: (th) => (inst.state === 'paid' ? '#FBF5E5' : th.palette[color].main),
                          border: '2px solid',
                          borderColor: (th) => alpha(th.palette[color].main, 0.4),
                        }}
                      >
                        <Icon icon={meta.icon} width={15} />
                      </Box>
                    </Box>

                    {/* İçerik */}
                    <Box sx={{ flex: 1, minWidth: 0, pb: isLast ? 0 : 2.2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 500, fontSize: '0.9rem', lineHeight: 1.3 }}>
                            {t('schedule_installmentN', { n: inst.index, total: schedule.length })}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: 'text.secondary',
                              fontFamily: '"Geist Mono", monospace',
                              letterSpacing: 0,
                              textTransform: 'none',
                            }}
                          >
                            {formatDate(inst.dueDate)}
                          </Typography>
                        </Box>
                        <Stack alignItems="flex-end" spacing={0.5} sx={{ flexShrink: 0 }}>
                          <Money value={inst.amount} currency={debt.currency} size="sm" weight={600} />
                          <SignalBadge tone={meta.tone} size="xs">
                            {t(meta.labelKey)}
                          </SignalBadge>
                        </Stack>
                      </Stack>
                    </Box>
                  </Stack>
                </motion.div>
              );
            })}
          </Box>
        </Stack>
      )}
    </ZoomModal>
  );
}
