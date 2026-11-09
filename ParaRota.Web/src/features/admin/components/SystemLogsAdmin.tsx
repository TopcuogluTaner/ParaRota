import { useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  MenuItem,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { DeleteModal } from '@shared/components/DeleteModal';
import { formatDateTime } from '@shared/lib/dateFormat';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import type { ErrorLogDto } from '@shared/api/types';
import { useSystemLogs, useClearSystemLogs } from '../api/useSystemLogs';

// Durum kodu rengi: 5xx kırmızı, 4xx turuncu, diğer nötr.
function statusTone(code: number): 'error' | 'warning' | 'info' {
  if (code >= 500) return 'error';
  if (code >= 400) return 'warning';
  return 'info';
}

const STATUS_FILTERS = [
  { value: 0, key: 'audit_filterAll' },
  { value: 400, key: 'audit_filter4xx' },
  { value: 500, key: 'audit_filter5xx' },
];

/**
 * Sistem logları — ExceptionMiddleware'in yazdığı ErrorLog kayıtları. Yalnız okuma +
 * topluca temizleme; arama (mesaj/path) + durum kodu filtresi + sayfalama. Satıra
 * tıklayınca stack trace + kaynak + kullanıcı açılır.
 */
export function SystemLogsAdmin() {
  const { t } = useTranslation(['pages', 'common']);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [minStatus, setMinStatus] = useState(0);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [clearOpen, setClearOpen] = useState(false);

  const { data, isLoading, isError, isFetching } = useSystemLogs(page, search, minStatus);
  const clearMutation = useClearSystemLogs();

  const applySearch = () => { setPage(1); setSearch(searchInput); };
  const changeFilter = (value: number) => { setPage(1); setMinStatus(value); };

  const handleClear = async () => {
    try {
      const deleted = await clearMutation.mutateAsync();
      toast.success(t('audit_toastCleared', { count: deleted }));
      setClearOpen(false);
      setPage(1);
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('common:errorGeneric')));
    }
  };

  const items = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;
  const hasNext = data?.hasNext ?? false;
  const hasPrevious = data?.hasPrevious ?? false;

  return (
    <SurfaceCard padding={2.6}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} spacing={1} useFlexGap flexWrap="wrap">
        <Box>
          <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: '1.1rem' }}>
            {t('admin.module_audit_title')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}>
            {t('audit_hint')}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          color="error"
          startIcon={<Icon icon="mdi:trash-can-outline" width={16} />}
          onClick={() => setClearOpen(true)}
          disabled={totalCount === 0}
        >
          {t('audit_clearButton')}
        </Button>
      </Stack>

      {/* Filtreler */}
      <Stack direction="row" spacing={1.2} sx={{ mb: 2 }} useFlexGap flexWrap="wrap">
        <TextField
          size="small"
          placeholder={t('audit_searchPlaceholder')}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }}
          sx={{ flex: 1, minWidth: 200 }}
          slotProps={{ input: { startAdornment: <Icon icon="mdi:magnify" width={18} style={{ marginRight: 6, opacity: 0.6 }} /> } }}
        />
        <TextField
          select
          size="small"
          value={minStatus}
          onChange={(e) => changeFilter(Number(e.target.value))}
          sx={{ width: 150 }}
        >
          {STATUS_FILTERS.map((f) => (
            <MenuItem key={f.value} value={f.value}>{t(f.key)}</MenuItem>
          ))}
        </TextField>
      </Stack>

      {isLoading ? (
        <Stack spacing={1}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} variant="rounded" height={56} />)}
        </Stack>
      ) : isError ? (
        <Box sx={{ py: 4, textAlign: 'center', color: 'warning.main' }}>
          <Icon icon="mdi:lock-alert-outline" width={32} />
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', maxWidth: 420, mx: 'auto' }}>
            {t('admin.loadError')}
          </Typography>
        </Box>
      ) : items.length === 0 ? (
        <Box sx={{ py: 5, textAlign: 'center', color: 'text.disabled' }}>
          <Icon icon="mdi:check-circle-outline" width={36} />
          <Typography variant="body2" sx={{ mt: 1 }}>{t('audit_empty')}</Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {items.map((log) => (
            <LogRow
              key={log.id}
              log={log}
              expanded={expanded === log.id}
              onToggle={() => setExpanded((cur) => (cur === log.id ? null : log.id))}
              t={t}
            />
          ))}
        </Stack>
      )}

      {/* Sayfalama */}
      {totalCount > 0 && (
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 2 }}>
          <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: '"Geist Mono", monospace' }}>
            {t('audit_pageInfo', { count: totalCount })}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconButton size="small" disabled={!hasPrevious || isFetching} onClick={() => setPage((p) => p - 1)} aria-label={t('common:previous', { defaultValue: 'Önceki' })}>
              <Icon icon="mdi:chevron-left" width={20} />
            </IconButton>
            <Typography variant="caption" sx={{ minWidth: 24, textAlign: 'center' }}>{page}</Typography>
            <IconButton size="small" disabled={!hasNext || isFetching} onClick={() => setPage((p) => p + 1)} aria-label={t('common:next', { defaultValue: 'Sonraki' })}>
              <Icon icon="mdi:chevron-right" width={20} />
            </IconButton>
          </Stack>
        </Stack>
      )}

      <DeleteModal
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={handleClear}
        title={t('audit_clearTitle')}
        description={t('audit_clearDescription')}
        loading={clearMutation.isPending}
      />
    </SurfaceCard>
  );
}

function LogRow({
  log,
  expanded,
  onToggle,
  t,
}: {
  log: ErrorLogDto;
  expanded: boolean;
  onToggle: () => void;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const tone = statusTone(log.statusCode);
  return (
    <Box sx={{ borderRadius: 1.6, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.2}
        sx={{ p: 1.2, cursor: 'pointer', '&:hover': { bgcolor: (th) => alpha(th.palette.text.primary, 0.03) } }}
        onClick={onToggle}
      >
        <Chip
          label={log.statusCode || '—'}
          size="small"
          color={tone}
          variant="outlined"
          sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 600, minWidth: 52, flexShrink: 0 }}
        />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {log.message}
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.disabled', fontFamily: '"Geist Mono", monospace', textTransform: 'none', letterSpacing: 0 }}
            noWrap
          >
            {log.requestMethod ? `${log.requestMethod} ` : ''}{log.requestPath ?? '—'} · {formatDateTime(log.createdDate)}
          </Typography>
        </Box>
        <Icon icon={expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={18} style={{ flexShrink: 0, opacity: 0.6 }} />
      </Stack>
      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ px: 1.4, pb: 1.4, pt: 0.4 }}>
          <Stack spacing={0.8}>
            {log.source && <Meta label={t('audit_field_source')} value={log.source} />}
            {log.userId && <Meta label={t('audit_field_user')} value={log.userId} />}
            <Meta label={t('audit_field_time')} value={formatDateTime(log.createdDate, 'DD.MM.YYYY HH:mm:ss')} />
          </Stack>
          {log.stackTrace && (
            <Box
              component="pre"
              sx={{
                mt: 1.2,
                p: 1.2,
                borderRadius: 1.2,
                bgcolor: (th) => alpha(th.palette.text.primary, 0.04),
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.72rem',
                lineHeight: 1.5,
                color: 'text.secondary',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 280,
                m: 0,
              }}
            >
              {log.stackTrace}
            </Box>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" spacing={1} alignItems="baseline">
      <Typography variant="caption" sx={{ color: 'text.disabled', minWidth: 78, flexShrink: 0 }}>{label}</Typography>
      <Typography variant="caption" sx={{ fontFamily: '"Geist Mono", monospace', wordBreak: 'break-all' }}>{value}</Typography>
    </Stack>
  );
}
