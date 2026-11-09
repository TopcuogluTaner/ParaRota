import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Divider, Grid, Stack, TextField, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SectionHeader } from '@shared/components/SectionHeader';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { Money } from '@shared/components/Money';
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { resolveApiError } from '@shared/lib/apiError';
import { useRecurringRulesQuery } from '@features/recurring/api/useRecurringRules';
import { useSeveranceQuery } from '../api/usePayroll';

// Bugün — hireDate input'unun gelecek tarih seçmesini engellemek için max.
const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Kıdem & İhbar Tazminatı (mobil paritesi) — SADE anlatım sözleşmesi:
 * sonuç tek kahraman rakamla başlar ("işten çıkarılırsan eline geçecek"),
 * altında istifa/çıkarılma ayrımı uyarısı; her kalemin altında düz-dil
 * tek cümlelik açıklama. Teknik detay (brüt/damga/tavan) ikincil satırlarda.
 */
export function SeverancePage() {
  const { t } = useTranslation(['payroll', 'common']);
  const fmt = useMoneyFmt();

  const [hireDate, setHireDate] = useState('');
  const [grossInput, setGrossInput] = useState('');
  const [vacationInput, setVacationInput] = useState('');
  const [params, setParams] = useState<{ hire: string; gross: number; vacation: number } | null>(null);

  // Maaş otomatiği kuruluysa brütü oradan öner (tek sefer tohumlanır; mobil paritesi).
  const rulesQuery = useRecurringRulesQuery(true);
  const salaryGross = (rulesQuery.data ?? []).find((r) => r.payrollGrossMonthly != null)?.payrollGrossMonthly;
  const seededRef = useRef(false);
  useEffect(() => {
    if (!seededRef.current && !grossInput && salaryGross) {
      seededRef.current = true;
      setGrossInput(formatAmountInput(String(salaryGross)));
    }
  }, [salaryGross, grossInput]);
  const grossIsSeeded = !!salaryGross && grossInput === formatAmountInput(String(salaryGross));

  const { data, isFetching, error } = useSeveranceQuery(params?.hire ?? null, params?.gross ?? 0, params?.vacation ?? 0);

  const compute = () => {
    const g = parseAmount(grossInput);
    const v = parseInt(vacationInput, 10);
    if (!hireDate || !Number.isFinite(g) || g <= 0) return;
    setParams({ hire: hireDate, gross: g, vacation: Number.isFinite(v) && v > 0 ? v : 0 });
  };

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 980, mx: 'auto' }}>
      <SectionHeader
        eyebrow={t('severance.eyebrow')}
        title={t('severance.title')}
        description={t('severance.intro')}
      />

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 5 }}>
          <SurfaceCard padding={3}>
            <Stack spacing={2}>
              <TextField
                type="date"
                label={t('severance.hireDate')}
                value={hireDate}
                onChange={(e) => setHireDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: TODAY } }}
                fullWidth
              />
              <TextField
                label={t('severance.grossLabel')}
                value={grossInput}
                onChange={(e) => setGrossInput(formatAmountInput(e.target.value))}
                helperText={grossIsSeeded ? t('severance.grossFromSalary') : undefined}
                fullWidth
              />
              <TextField
                label={t('severance.vacationLabel')}
                value={vacationInput}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^0-9]/g, '');
                  const n = parseInt(digits, 10);
                  setVacationInput(Number.isFinite(n) && n > 366 ? '366' : digits);
                }}
                helperText={t('severance.vacationHelp')}
                fullWidth
              />
              <Button
                variant="contained"
                size="large"
                onClick={compute}
                disabled={!hireDate || parseAmount(grossInput) <= 0 || isFetching}
                startIcon={<Icon icon="mdi:calculator-variant-outline" width={18} />}
              >
                {t('severance.compute')}
              </Button>
            </Stack>
          </SurfaceCard>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          {error ? (
            <Alert severity="error" sx={{ borderRadius: 2, mb: 2 }}>
              {resolveApiError(error)}
            </Alert>
          ) : null}
          {data ? (
            <Stack spacing={2.5}>
              {/* 1) KAHRAMAN: toplam + istifa/çıkarılma ayrımı */}
              <SurfaceCard padding={3}>
                <Typography variant="overline" color="text.disabled">{t('severance.heroEyebrow')}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>{t('severance.heroTitle')}</Typography>
                <Money value={data.totalEstimated} size="display" weight={700} tone="go" />
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {t('severance.serviceLine', { years: data.serviceYears, months: data.serviceMonths, days: data.serviceDays })}
                </Typography>
                <Alert severity="info" icon={<Icon icon="mdi:information-outline" width={20} />} sx={{ mt: 1.5, borderRadius: 2 }}>
                  {t('severance.heroNote')}
                </Alert>
              </SurfaceCard>

              {/* 2) Kıdem */}
              <SurfaceCard padding={3}>
                <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={2} useFlexGap flexWrap="wrap">
                  <Typography variant="subtitle1" fontWeight={700}>{t('severance.sevTitle')}</Typography>
                  <Money value={data.severanceNet} size="lg" weight={700} />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t('severance.sevExplain')}
                </Typography>
                {data.eligibleForSeverance ? (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Typography variant="caption" color="text.disabled">{t('severance.sevNet')}</Typography>
                    <Stack spacing={0.8} sx={{ mt: 0.5 }}>
                      <Row label={t('severance.sevGrossRow')} value={fmt(data.severanceGross)} />
                      <Row label={t('severance.sevStampRow')} value={`−${fmt(data.severanceStamp)}`} />
                    </Stack>
                    {data.ceilingApplied ? (
                      <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2 }}>
                        {t('severance.ceilingApplied', { ceiling: fmt(data.severanceCeiling) })}
                      </Alert>
                    ) : null}
                  </>
                ) : (
                  <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2 }}>{t('severance.notEligible')}</Alert>
                )}
              </SurfaceCard>

              {/* 3) İhbar + izin */}
              <SurfaceCard padding={3}>
                <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={2} useFlexGap flexWrap="wrap">
                  <Typography variant="subtitle1" fontWeight={700}>{t('severance.noticeTitle')}</Typography>
                  <Money value={data.noticeGross} size="lg" weight={700} />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {t('severance.noticeExplain', { weeks: data.noticeWeeks })}
                </Typography>
                {data.vacationGross > 0 ? (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    <Stack direction="row" alignItems="baseline" justifyContent="space-between" spacing={2} useFlexGap flexWrap="wrap">
                      <Typography variant="subtitle1" fontWeight={700}>{t('severance.vacationTitle')}</Typography>
                      <Money value={data.vacationGross} size="lg" weight={700} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {t('severance.vacationExplain', { days: params?.vacation ?? 0 })}
                    </Typography>
                  </>
                ) : null}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
                  {t('severance.taxNote')} {t('severance.disclaimer')}
                </Typography>
              </SurfaceCard>
            </Stack>
          ) : (
            <SurfaceCard padding={4} sx={{ display: 'grid', placeItems: 'center', minHeight: 220 }}>
              <Stack alignItems="center" spacing={1}>
                <Icon icon="mdi:briefcase-clock-outline" width={36} style={{ opacity: 0.35 }} />
                <Typography variant="body2" color="text.secondary" align="center">
                  {t('severance.emptyHint')}
                </Typography>
              </Stack>
            </SurfaceCard>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" className="pr-num" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
        {value}
      </Typography>
    </Stack>
  );
}
