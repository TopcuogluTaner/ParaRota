import { useState, type ReactNode } from 'react';
import { Box, Collapse, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'motion/react';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { Money } from '@shared/components/Money';
import { formatNumber } from '@shared/lib/dateFormat';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import type { LoanCostResultDto } from '@shared/api/types';

interface Props {
  data: LoanCostResultDto;
  isFetching?: boolean;
}

/**
 * Kredi maliyeti sonucu — hero aylık taksit, "gerçek yıllık maliyet" alarmı (kırmızı),
 * reklam/gerçek kıyası, anapara↔faiz↔vergi kırılımı ve açılabilir ödeme planı.
 */
export function LoanResultCard({ data, isFetching = false }: Props) {
  const { t } = useTranslation('loan');
  const fmtMoney = useMoneyFmt();
  const reduce = useReducedMotion();
  const [planOpen, setPlanOpen] = useState(false);

  const fade = (delay: number) => ({
    initial: reduce ? { opacity: 0 } : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.18 : 0.32, delay: reduce ? 0 : delay },
  });

  // Kırılım barı: anapara / faiz / vergi (toplam geri ödemenin payları).
  const total = Math.max(data.totalPayment, 1);
  const seg = (v: number) => (v / total) * 100;
  const hasTax = data.totalTax > 0;

  return (
    <Box sx={{ opacity: isFetching ? 0.65 : 1, transition: 'opacity .2s' }}>
      <motion.div {...fade(0)}>
        <SurfaceCard padding={0} sx={{ overflow: 'hidden' }}>
          {/* Hero — aylık taksit (nötr) + gerçek yıllık maliyet alarmı (kırmızı) */}
          <Box sx={{ p: { xs: 2.2, sm: 2.8 } }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box sx={{ width: 28, height: 28, borderRadius: 1, display: 'grid', placeItems: 'center', bgcolor: 'text.primary', color: 'background.paper' }}>
                  <Icon icon="mdi:bank-outline" width={16} />
                </Box>
                <Typography sx={eyebrow}>{t('result_eyebrow')}</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ px: 1.2, py: 0.5, borderRadius: 999, bgcolor: (th) => alpha(th.palette.error.main, 0.13), color: 'error.main' }}>
                <Icon icon="mdi:alert-decagram-outline" width={14} />
                <Typography component="span" sx={{ fontSize: '0.78rem', fontWeight: 700 }} className="pr-num">
                  {t('result_annualChip', { rate: formatNumber(data.annualCostRatePercent) })}
                </Typography>
              </Stack>
            </Stack>

            <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mt: 1.2, minWidth: 0 }}>
              <Typography component="div" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: { xs: '2.1rem', sm: '2.7rem' }, letterSpacing: '-0.02em', lineHeight: 1.05, wordBreak: 'break-word' }}>
                {fmtMoney(data.monthlyPayment)}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('perMonth')}</Typography>
            </Stack>

            {/* Reklam vs gerçek */}
            <Stack direction="row" spacing={1} sx={{ mt: 1.2, flexWrap: 'wrap' }}>
              <CompareTag label={t('nominalAnnual')} value={`%${formatNumber(data.nominalAnnualRatePercent)}`} tone="text.disabled" />
              <Box component="span" sx={{ display: 'inline-flex', color: 'text.disabled', transform: (th) => (th.direction === 'rtl' ? 'scaleX(-1)' : 'none') }}>
                <Icon icon="mdi:arrow-right-thin" width={18} />
              </Box>
              <CompareTag label={t('realAnnual')} value={`%${formatNumber(data.annualCostRatePercent)}`} tone="error.main" strong />
            </Stack>
          </Box>

          {/* Kırılım + satırlar */}
          <Box sx={{ px: { xs: 2.2, sm: 2.8 }, pt: 2, pb: 1.4, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box aria-hidden sx={{ display: 'flex', gap: '3px', height: 8, borderRadius: 999, overflow: 'hidden', mb: 1.6 }}>
              <Box component={motion.div} initial={{ width: 0 }} animate={{ width: `${seg(data.amount)}%` }} transition={{ duration: reduce ? 0 : 0.6, delay: 0.2, ease: 'easeOut' }} sx={{ borderRadius: 999, bgcolor: 'text.disabled' }} />
              <Box component={motion.div} initial={{ width: 0 }} animate={{ width: `${seg(data.totalInterest)}%` }} transition={{ duration: reduce ? 0 : 0.6, delay: 0.32, ease: 'easeOut' }} sx={{ borderRadius: 999, bgcolor: 'warning.main' }} />
              {hasTax && (
                <Box component={motion.div} initial={{ width: 0 }} animate={{ width: `${seg(data.totalTax)}%` }} transition={{ duration: reduce ? 0 : 0.6, delay: 0.44, ease: 'easeOut' }} sx={{ borderRadius: 999, bgcolor: 'error.main' }} />
              )}
            </Box>

            <ResultRow dotColor="text.disabled" label={t('result_principal')}><Money value={data.amount} size="sm" weight={600} tone="neutral" /></ResultRow>
            <ResultRow dotColor="warning.main" label={t('result_interest')}><Money value={data.totalInterest} size="sm" weight={600} sx={{ color: 'warning.main' }} /></ResultRow>
            {hasTax && (
              <ResultRow dotColor="error.main" label={t('result_tax', { kkdf: formatNumber(data.kkdfPercent), bsmv: formatNumber(data.bsmvPercent) })}>
                <Money value={data.totalTax} size="sm" weight={600} sx={{ color: 'error.main' }} />
              </ResultRow>
            )}
            {data.dosyaMasrafi > 0 && (
              <ResultRow dotColor="text.disabled" label={t('result_fee')}><Money value={data.dosyaMasrafi} size="sm" weight={600} tone="neutral" /></ResultRow>
            )}

            <Box aria-hidden sx={{ my: 0.8, height: '1px', backgroundImage: (th) => `linear-gradient(to right, transparent 0, transparent 3px, ${th.palette.divider} 3px, ${th.palette.divider} 7px)`, backgroundSize: '7px 1px', backgroundRepeat: 'repeat-x' }} />

            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('result_totalPayment')}</Typography>
              <Money value={data.totalPayment} size="sm" weight={700} />
            </Stack>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{t('result_totalCost')}</Typography>
              <Money value={data.totalCost} size="sm" weight={700} sx={{ color: 'error.main' }} />
            </Stack>
          </Box>
        </SurfaceCard>
      </motion.div>

      {/* Açılabilir ödeme planı */}
      <motion.div {...fade(0.1)}>
        <SurfaceCard sx={{ mt: 1.6 }} padding={0}>
          <Box
            component="button"
            onClick={() => setPlanOpen((o) => !o)}
            aria-expanded={planOpen}
            sx={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', px: 2.2, py: 1.6, boxSizing: 'border-box' }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <Icon icon="mdi:table-clock" width={18} />
              <Typography sx={{ fontSize: '0.9rem', fontWeight: 600 }}>{t('schedule_title')}</Typography>
            </Stack>
            <Icon icon={planOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={20} />
          </Box>
          <Collapse in={planOpen}>
            <Box sx={{ px: 2.2, pb: 2 }}>
              <ScheduleTable data={data} />
            </Box>
          </Collapse>
        </SurfaceCard>
      </motion.div>

      {/* Yasal not */}
      <motion.div {...fade(0.16)}>
        <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mt: 1.6, p: 1.6, borderRadius: 2, border: '1px solid', borderColor: (th) => alpha(th.palette.info.main, 0.28), bgcolor: (th) => alpha(th.palette.info.main, 0.08) }}>
          <Box sx={{ color: 'info.main', display: 'flex', pt: '1px', flexShrink: 0 }}><Icon icon="mdi:scale-balance" width={16} /></Box>
          <Typography sx={{ fontSize: '0.78rem', lineHeight: 1.55, color: 'text.secondary' }}>{t('note')}</Typography>
        </Stack>
      </motion.div>
    </Box>
  );
}

function ScheduleTable({ data }: { data: LoanCostResultDto }) {
  const { t } = useTranslation('loan');
  const fmtMoney = useMoneyFmt();
  const hasTax = data.totalTax > 0;
  const cols = hasTax ? '0.5fr 1fr 1fr 1fr 1fr' : '0.6fr 1fr 1fr 1.2fr';
  const headers = [t('schedule_month'), t('schedule_principal'), t('schedule_interest'), ...(hasTax ? [t('schedule_tax')] : []), t('schedule_balance')];
  return (
    // Dar ekranda kırpmak yerine yatay kaydır (minWidth iç sarmalayıcıda).
    <Box role="table" sx={{ maxHeight: 360, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <Box sx={{ minWidth: hasTax ? 440 : 360 }}>
        <Box role="row" sx={{ display: 'grid', gridTemplateColumns: cols, gap: 1, px: 1.4, py: 1, position: 'sticky', top: 0, bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', zIndex: 1 }}>
          {headers.map((h) => (
            <Typography role="columnheader" key={h} sx={{ ...cell, fontWeight: 700, color: 'text.secondary' }}>{h}</Typography>
          ))}
        </Box>
        {data.schedule.map((r) => (
          <Box role="row" key={r.month} sx={{ display: 'grid', gridTemplateColumns: cols, gap: 1, px: 1.4, py: 0.7, borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 0 } }}>
            <Typography role="cell" sx={cell} className="pr-num">{r.month}</Typography>
            <Typography role="cell" sx={cell} className="pr-num">{fmtMoney(r.principal)}</Typography>
            <Typography role="cell" sx={cell} className="pr-num">{fmtMoney(r.interest)}</Typography>
            {hasTax && <Typography role="cell" sx={cell} className="pr-num">{fmtMoney(r.tax)}</Typography>}
            <Typography role="cell" sx={cell} className="pr-num">{fmtMoney(r.balance)}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function CompareTag({ label, value, tone, strong }: { label: string; value: string; tone: string; strong?: boolean }) {
  return (
    <Stack direction="row" alignItems="baseline" spacing={0.6}>
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>{label}</Typography>
      <Typography component="span" className="pr-num" sx={{ fontSize: strong ? '0.92rem' : '0.82rem', fontWeight: strong ? 800 : 600, color: tone }}>{value}</Typography>
    </Stack>
  );
}

function ResultRow({ dotColor, label, children }: { dotColor: string; label: string; children: ReactNode }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1.2} sx={{ py: 0.9 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: dotColor, flexShrink: 0 }} />
      <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1, minWidth: 0 }}>{label}</Typography>
      {children}
    </Stack>
  );
}

const eyebrow = {
  fontFamily: '"Geist Mono", monospace',
  fontSize: '0.68rem',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: 'text.secondary',
};
const cell = { fontFamily: '"Geist Mono", monospace', fontSize: '0.72rem', color: 'text.primary', whiteSpace: 'nowrap' as const };
