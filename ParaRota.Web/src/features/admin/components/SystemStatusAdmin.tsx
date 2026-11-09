import type { ReactNode } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { formatDateTime } from '@shared/lib/dateFormat';
import type { RecurringJobStatusDto } from '@shared/api/types';
import { useSystemStatus } from '../api/useSystemStatus';

function jobStateTone(state?: string | null): 'success' | 'error' | 'info' | 'default' {
  if (!state) return 'default';
  if (state === 'Succeeded') return 'success';
  if (state === 'Failed') return 'error';
  if (state === 'Processing' || state === 'Enqueued' || state === 'Scheduled') return 'info';
  return 'default';
}

export function SystemStatusAdmin() {
  const { t } = useTranslation(['pages', 'common']);
  const { data, isLoading, isError, isFetching, refetch } = useSystemStatus();

  const uptime = (() => {
    const s = data?.uptimeSeconds ?? 0;
    return {
      d: Math.floor(s / 86400),
      h: Math.floor((s % 86400) / 3600),
      m: Math.floor((s % 3600) / 60),
    };
  })();

  return (
    <SurfaceCard padding={2.6}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} spacing={1} useFlexGap flexWrap="wrap">
        <Box>
          <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: '1.1rem' }}>
            {t('admin.module_system_title')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}>
            {t('system_hint')}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={isFetching ? <CircularProgress size={14} /> : <Icon icon="mdi:refresh" width={16} />}
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          {t('system_refresh')}
        </Button>
      </Stack>

      {isLoading ? (
        <Stack spacing={1.2}>
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rounded" height={90} />)}
        </Stack>
      ) : isError || !data ? (
        <Box sx={{ py: 4, textAlign: 'center', color: 'warning.main' }}>
          <Icon icon="mdi:lock-alert-outline" width={32} />
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', maxWidth: 420, mx: 'auto' }}>
            {t('admin.loadError')}
          </Typography>
        </Box>
      ) : (
        <Stack spacing={2.4}>
          {/* Çalışma zamanı */}
          <Section title={t('system_section_runtime')}>
            <Grid container spacing={1.4}>
              <Tile label={t('system_serverTime')} value={formatDateTime(data.serverTime, 'DD.MM.YYYY HH:mm:ss')} icon="mdi:clock-outline" />
              <Tile label={t('system_timeZone')} value={data.timeZone} icon="mdi:earth" />
              <Tile label={t('system_environment')} value={data.environment} icon="mdi:tune-variant" />
              <Tile label={t('system_uptime')} value={t('system_uptimeValue', uptime)} icon="mdi:timer-sand" />
              <Tile label={t('system_appVersion')} value={data.appVersion} icon="mdi:tag-outline" />
              <Tile label={t('system_dotnetVersion')} value={data.dotnetVersion} icon="mdi:dot-net" />
            </Grid>
          </Section>

          {/* Veritabanı */}
          <Section title={t('system_section_database')}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.4 }}>
              <Chip
                size="small"
                color={data.databaseConnected ? 'success' : 'error'}
                variant="outlined"
                icon={<Icon icon={data.databaseConnected ? 'mdi:database-check-outline' : 'mdi:database-alert-outline'} width={15} />}
                label={data.databaseConnected ? t('system_dbConnected') : t('system_dbDisconnected')}
              />
            </Stack>
            <Grid container spacing={1.4}>
              <Tile label={t('system_count_users')} value={String(data.counts.users)} icon="mdi:account-multiple-outline" />
              <Tile label={t('system_count_transactions')} value={String(data.counts.transactions)} icon="mdi:swap-horizontal" />
              <Tile label={t('system_count_households')} value={String(data.counts.households)} icon="mdi:home-group" />
            </Grid>
          </Section>

          {/* Hangfire */}
          <Section title={t('system_section_jobs')}>
            <Stack direction="row" spacing={0.8} sx={{ mb: 1.6 }} useFlexGap flexWrap="wrap">
              <StatChip label={t('system_hf_succeeded')} value={data.hangfire.succeeded} tone="success" />
              <StatChip label={t('system_hf_failed')} value={data.hangfire.failed} tone={data.hangfire.failed > 0 ? 'error' : 'default'} />
              <StatChip label={t('system_hf_processing')} value={data.hangfire.processing} tone="info" />
              <StatChip label={t('system_hf_scheduled')} value={data.hangfire.scheduled} tone="default" />
              <StatChip label={t('system_hf_enqueued')} value={data.hangfire.enqueued} tone="default" />
              <StatChip label={t('system_hf_servers')} value={data.hangfire.servers} tone={data.hangfire.servers > 0 ? 'success' : 'error'} />
            </Stack>

            <Stack spacing={0.8}>
              {data.hangfire.jobs.length === 0 ? (
                <Typography variant="caption" sx={{ color: 'text.disabled' }}>{t('system_noJobs')}</Typography>
              ) : (
                data.hangfire.jobs.map((job) => <JobRow key={job.id} job={job} t={t} />)
              )}
            </Stack>
          </Section>
        </Stack>
      )}
    </SurfaceCard>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography
        sx={{ fontFamily: '"Geist Mono", monospace', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'text.disabled', mb: 1.2 }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function Tile({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <Grid size={{ xs: 6, sm: 4 }}>
      <Box sx={{ p: 1.3, borderRadius: 1.6, border: '1px solid', borderColor: 'divider', height: '100%' }}>
        <Stack direction="row" alignItems="center" spacing={0.6} sx={{ color: 'text.disabled', mb: 0.4 }}>
          <Icon icon={icon} width={14} />
          <Typography variant="caption" sx={{ textTransform: 'none', letterSpacing: 0 }}>{label}</Typography>
        </Stack>
        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"Geist Mono", monospace', wordBreak: 'break-word' }}>
          {value}
        </Typography>
      </Box>
    </Grid>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number; tone: 'success' | 'error' | 'info' | 'default' }) {
  return (
    <Chip
      size="small"
      variant="outlined"
      color={tone === 'default' ? undefined : tone}
      label={
        <Box component="span" sx={{ fontFamily: '"Geist Mono", monospace', fontSize: '0.72rem' }}>
          {label}: <b>{value}</b>
        </Box>
      }
    />
  );
}

function JobRow({
  job,
  t,
}: {
  job: RecurringJobStatusDto;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.2}
      sx={{ p: 1.1, borderRadius: 1.4, border: '1px solid', borderColor: 'divider' }}
      useFlexGap
      flexWrap="wrap"
    >
      <Box sx={{ flex: 1, minWidth: 160 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"Geist Mono", monospace' }} noWrap>
          {job.id}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: '"Geist Mono", monospace' }}>
          {job.cron ?? '—'}
        </Typography>
      </Box>
      <Box sx={{ minWidth: 130 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>{t('system_job_last')}</Typography>
        <Typography variant="caption" sx={{ fontFamily: '"Geist Mono", monospace' }}>
          {job.lastExecution ? formatDateTime(job.lastExecution, 'DD.MM HH:mm') : t('system_job_never')}
        </Typography>
      </Box>
      <Box sx={{ minWidth: 130 }}>
        <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>{t('system_job_next')}</Typography>
        <Typography variant="caption" sx={{ fontFamily: '"Geist Mono", monospace' }}>
          {job.nextExecution ? formatDateTime(job.nextExecution, 'DD.MM HH:mm') : '—'}
        </Typography>
      </Box>
      <Chip
        size="small"
        variant="outlined"
        color={jobStateTone(job.lastState) === 'default' ? undefined : jobStateTone(job.lastState)}
        label={job.lastState ?? '—'}
        sx={{ fontFamily: '"Geist Mono", monospace', fontSize: '0.66rem', flexShrink: 0, ...(jobStateTone(job.lastState) === 'default' ? { bgcolor: (th) => alpha(th.palette.text.primary, 0.05) } : {}) }}
      />
    </Stack>
  );
}
