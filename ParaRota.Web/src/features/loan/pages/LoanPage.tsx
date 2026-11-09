import { useState } from 'react';
import { Box, Button, ButtonBase, InputAdornment, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { SectionHeader } from '@shared/components/SectionHeader';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { EmptyState } from '@shared/components/EmptyState';
import { parseAmount } from '@shared/lib/parseAmount';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import type { LoanType } from '@shared/api/types';
import { useLoanQuery, type LoanParams } from '../api/useLoan';
import { LoanResultCard } from '../components/LoanResultCard';

const TERMS = [12, 24, 36, 48, 60, 120] as const;
const TYPES: LoanType[] = ['Ihtiyac', 'Konut', 'Tasit'];

/**
 * Kredi Gerçek Maliyeti — aylık faiz + KKDF + BSMV dahil gerçek maliyet. Konut'ta vergi istisnası.
 * İlk hesaptan sonra seçiciler canlı kontrole döner: değiştir → sonuç anında tazelenir.
 */
export function LoanPage() {
  const { t } = useTranslation('loan');

  const [amountInput, setAmountInput] = useState('');
  const [rateInput, setRateInput] = useState('');
  const [term, setTerm] = useState(36);
  const [loanType, setLoanType] = useState<LoanType>('Ihtiyac');
  const [feeInput, setFeeInput] = useState('');
  const [params, setParams] = useState<LoanParams | null>(null);

  const { data, isFetching, isError, error, refetch } = useLoanQuery(params);

  const amount = parseAmount(amountInput);
  // Faiz küçük bir ondalık — binlik grouping anlamsız ("3.500" → 3500 tuzağı). parseFloat güvenli.
  const rate = rateInput.trim() ? parseFloat(rateInput.replace(',', '.')) : NaN;
  const fee = feeInput.trim() ? parseAmount(feeInput) : 0;
  const valid = Number.isFinite(amount) && amount > 0 && Number.isFinite(rate) && rate >= 0 && term > 0;

  const build = (over?: Partial<LoanParams>): LoanParams => ({
    amount, monthlyRatePercent: rate, termMonths: term, loanType, dosyaMasrafi: Number.isFinite(fee) ? fee : 0, ...over,
  });
  const compute = () => { if (valid) setParams(build()); };
  const live = (over: Partial<LoanParams>) => { if (params) setParams({ ...params, ...over }); };

  const setT = (v: number) => { setTerm(v); live({ termMonths: v }); };
  const setType = (v: LoanType) => { setLoanType(v); live({ loanType: v }); };

  return (
    <Box sx={{ p: { xs: 2, sm: 2.6, md: 4 }, maxWidth: 1100, mx: 'auto' }}>
      <SectionHeader eyebrow={t('page_eyebrow')} title={t('page_title')} description={t('page_description')} />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 3 }} alignItems="flex-start">
          {/* Giriş kartı */}
          <SurfaceCard edge sx={{ width: { xs: '100%', md: 400 }, flexShrink: 0, pt: 3.2 }}>
            <TextField
              fullWidth
              label={t('amountLabel')}
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value.replace(/[^\d.,]/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') compute(); }}
              placeholder="100000"
              slotProps={{ htmlInput: { inputMode: 'decimal', 'aria-label': t('amountLabel') }, input: { startAdornment: <InputAdornment position="start">₺</InputAdornment>, sx: { fontWeight: 700, fontSize: '1.05rem' } } }}
            />

            <TextField
              fullWidth
              label={t('rateLabel')}
              value={rateInput}
              onChange={(e) => setRateInput(e.target.value.replace(/[^\d.,]/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') compute(); }}
              placeholder="3.5"
              sx={{ mt: 2 }}
              slotProps={{ htmlInput: { inputMode: 'decimal', 'aria-label': t('rateLabel') }, input: { endAdornment: <InputAdornment position="end">% / {t('month')}</InputAdornment> } }}
            />

            {/* Vade */}
            <Typography sx={{ ...eyebrowLabel, mt: 2.4, mb: 1 }}>{t('termLabel')}</Typography>
            <Box role="group" aria-label={t('termLabel')} sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {TERMS.map((v) => {
                const on = term === v;
                return (
                  <ButtonBase key={v} onClick={() => setT(v)} aria-pressed={on} className="pr-num"
                    sx={{ px: 1.4, py: 0.7, borderRadius: 999, border: '1px solid', borderColor: on ? 'primary.main' : 'divider', bgcolor: on ? (th) => alpha(th.palette.primary.main, 0.12) : 'transparent', color: on ? 'primary.main' : 'text.secondary', fontSize: '0.8rem', fontWeight: on ? 700 : 500, fontFamily: 'inherit', transition: 'all .15s', '&:hover': { borderColor: 'primary.main' } }}>
                    {v} {t('mo')}
                  </ButtonBase>
                );
              })}
              <TextField
                value={term === 0 ? '' : String(term)}
                onChange={(e) => { const v = parseInt(e.target.value.replace(/\D/g, ''), 10); setT(Number.isNaN(v) ? 0 : Math.min(v, 360)); }}
                size="small"
                placeholder={t('mo')}
                aria-label={t('termLabel')}
                slotProps={{ htmlInput: { inputMode: 'numeric', 'aria-label': t('termLabel') } }}
                sx={{ width: 92, '& .MuiInputBase-input': { fontFamily: '"Geist Mono", monospace', fontWeight: 700, py: 0.7, textAlign: 'center' } }}
              />
            </Box>

            {/* Kredi türü */}
            <Typography sx={{ ...eyebrowLabel, mt: 2.4, mb: 1 }}>{t('typeLabel')}</Typography>
            <Box role="group" aria-label={t('typeLabel')} sx={{ display: 'flex', p: 0.4, borderRadius: 999, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
              {TYPES.map((tp) => {
                const on = loanType === tp;
                return (
                  <ButtonBase key={tp} onClick={() => setType(tp)} aria-pressed={on}
                    sx={{ flex: 1, py: 0.9, borderRadius: 999, fontSize: '0.82rem', fontWeight: on ? 700 : 500, fontFamily: 'inherit', bgcolor: on ? 'text.primary' : 'transparent', color: on ? 'background.paper' : 'text.secondary', transition: 'all .15s' }}>
                    {t(`type_${tp.toLowerCase()}`)}
                  </ButtonBase>
                );
              })}
            </Box>

            <TextField
              fullWidth
              label={t('feeLabel')}
              value={feeInput}
              onChange={(e) => setFeeInput(e.target.value.replace(/[^\d.,]/g, ''))}
              onKeyDown={(e) => { if (e.key === 'Enter') compute(); }}
              placeholder="0"
              sx={{ mt: 2.4 }}
              slotProps={{ htmlInput: { inputMode: 'decimal', 'aria-label': t('feeLabel') }, input: { startAdornment: <InputAdornment position="start">₺</InputAdornment> } }}
            />

            <Button fullWidth variant="contained" onClick={compute} disabled={!valid} startIcon={<Icon icon="mdi:calculator-variant-outline" width={18} />} sx={{ mt: 2.4, py: 1.1, borderRadius: 999, fontWeight: 700 }}>
              {t('calculate')}
            </Button>

            {params != null && (
              <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 1.4, color: 'text.disabled' }}>
                <Icon icon="mdi:cursor-default-click-outline" width={14} />
                <Typography sx={{ fontSize: '0.74rem' }}>{t('liveHint')}</Typography>
              </Stack>
            )}
          </SurfaceCard>

          {/* Sonuç alanı */}
          <Box sx={{ flex: 1, width: '100%', minWidth: 0 }}>
            {params == null ? (
              <EmptyState icon="mdi:bank-outline" title={t('emptyTitle')} description={t('emptyHint')} />
            ) : isFetching && !data ? (
              <SurfaceCard padding={0} sx={{ overflow: 'hidden' }}>
                <Box sx={{ p: { xs: 2.2, sm: 2.8 } }}>
                  <Skeleton variant="text" width="45%" height={20} />
                  <Skeleton variant="text" width="60%" height={56} />
                </Box>
                <Box sx={{ px: { xs: 2.2, sm: 2.8 }, pb: 2.4, borderTop: '1px solid', borderColor: 'divider', pt: 2 }}>
                  <Skeleton variant="rounded" height={8} sx={{ borderRadius: 999, mb: 1.6 }} />
                  <Skeleton variant="text" width="80%" height={24} />
                  <Skeleton variant="text" width="70%" height={24} />
                  <Skeleton variant="text" width="75%" height={24} />
                </Box>
              </SurfaceCard>
            ) : isError && !data ? (
              <EmptyState icon="mdi:alert-circle-outline" title={t('error_title')} description={getErrorMessage(error, t('error_title'))} action={<Button variant="contained" onClick={() => void refetch()} startIcon={<Icon icon="mdi:refresh" width={18} />}>{t('error_retry')}</Button>} />
            ) : data ? (
              <LoanResultCard key={`res-${data.amount}-${data.monthlyRatePercent}-${data.termMonths}-${data.kkdfPercent}`} data={data} isFetching={isFetching} />
            ) : null}
          </Box>
        </Stack>
      </motion.div>
    </Box>
  );
}

const eyebrowLabel = {
  fontFamily: '"Geist Mono", monospace',
  fontSize: '0.68rem',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  color: 'text.disabled',
};
