import { useEffect, useMemo, useState } from 'react';
import { Box, CircularProgress, IconButton, InputBase, Stack, TextField, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

interface Props {
  value: string;
  onChange: (icon: string) => void;
}

const PAGE_SIZE = 48;

// Popular MDI icons shown when search is empty — finance-flavored handpicks.
const POPULAR_ICONS = [
  'mdi:cash-multiple', 'mdi:wallet-outline', 'mdi:credit-card-outline', 'mdi:bank-outline',
  'mdi:gift-outline', 'mdi:chart-line', 'mdi:hand-coin-outline', 'mdi:piggy-bank-outline',
  'mdi:home-outline', 'mdi:cart-outline', 'mdi:car-outline', 'mdi:silverware-fork-knife',
  'mdi:lightning-bolt-outline', 'mdi:autorenew', 'mdi:movie-outline', 'mdi:heart-pulse',
  'mdi:gas-station', 'mdi:basketball', 'mdi:paw', 'mdi:book-outline',
  'mdi:airplane', 'mdi:train-car', 'mdi:dumbbell', 'mdi:coffee-outline',
  'mdi:school-outline', 'mdi:briefcase-outline', 'mdi:laptop', 'mdi:cellphone',
  'mdi:home-city-outline', 'mdi:bus', 'mdi:bike', 'mdi:taxi',
  'mdi:tools', 'mdi:tshirt-crew-outline', 'mdi:cake-variant-outline', 'mdi:beer-outline',
  'mdi:music-note', 'mdi:camera-outline', 'mdi:gamepad-variant-outline', 'mdi:dog-side',
  'mdi:flower-outline', 'mdi:palette-outline', 'mdi:medical-bag', 'mdi:pill',
  'mdi:wrench-outline', 'mdi:wallet-travel', 'mdi:tag-outline', 'mdi:star-outline',
];

interface SearchResult {
  icons: string[];
  total: number;
}

// Iconify free public search API — returns icon names matching the query.
async function searchIcons(query: string, page: number, signal: AbortSignal): Promise<SearchResult> {
  const start = page * PAGE_SIZE;
  const url = `https://api.iconify.design/search?query=${encodeURIComponent(query)}&prefix=mdi&limit=${PAGE_SIZE}&start=${start}`;
  const resp = await fetch(url, { signal });
  if (!resp.ok) throw new Error(`Iconify search failed (${resp.status})`);
  const json = (await resp.json()) as { icons?: string[]; total?: number };
  return {
    icons: json.icons ?? [],
    total: json.total ?? 0,
  };
}

export function IconPicker({ value, onChange }: Props) {
  const { t } = useTranslation(['pages', 'common']);
  const [rawQuery, setRawQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(0);

  // Debounce 250ms — avoid hammering the API on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedQuery(rawQuery.trim());
      setPage(0);
    }, 250);
    return () => clearTimeout(id);
  }, [rawQuery]);

  const hasQuery = debouncedQuery.length > 0;

  const search = useQuery<SearchResult>({
    queryKey: ['iconify-search', debouncedQuery, page],
    queryFn: ({ signal }) => searchIcons(debouncedQuery, page, signal),
    enabled: hasQuery,
    staleTime: 5 * 60_000,
  });

  const displayIcons = hasQuery ? search.data?.icons ?? [] : POPULAR_ICONS;
  const total = hasQuery ? search.data?.total ?? 0 : POPULAR_ICONS.length;
  const totalPages = hasQuery ? Math.max(1, Math.ceil(total / PAGE_SIZE)) : 1;

  const showingFrom = useMemo(() => (hasQuery ? page * PAGE_SIZE + 1 : 1), [hasQuery, page]);
  const showingTo = useMemo(
    () => (hasQuery ? Math.min((page + 1) * PAGE_SIZE, total) : POPULAR_ICONS.length),
    [hasQuery, page, total],
  );

  return (
    <Stack spacing={1.2}>
      {/* Search bar — Cartographic Finance style: dashed underline rail */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 1.4,
          py: 0.6,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
          transition: 'border-color .2s',
          '&:focus-within': { borderColor: 'primary.main' },
        }}
      >
        <Icon icon="mdi:magnify" width={16} style={{ opacity: 0.5 }} />
        <InputBase
          fullWidth
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          placeholder={t('categories.iconPicker_searchPlaceholder')}
          sx={{
            fontSize: '0.88rem',
            '& input::placeholder': { color: 'text.disabled', opacity: 1 },
          }}
        />
        {rawQuery && (
          <IconButton size="small" onClick={() => setRawQuery('')} sx={{ width: 22, height: 22 }}>
            <Icon icon="mdi:close" width={14} />
          </IconButton>
        )}
        {search.isFetching && hasQuery && (
          <CircularProgress size={14} thickness={6} sx={{ color: 'text.disabled' }} />
        )}
      </Box>

      {/* Result meta */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          fontFamily: '"Geist Mono", monospace',
          fontSize: '0.66rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'text.disabled',
          px: 0.4,
        }}
      >
        <span>
          {hasQuery
            ? t('categories.iconPicker_resultsMeta', {
                from: showingFrom,
                to: showingTo,
                total,
              })
            : t('categories.iconPicker_popularLabel')}
        </span>
        {hasQuery && totalPages > 1 && (
          <span>
            {t('categories.iconPicker_pageMeta', { page: page + 1, total: totalPages })}
          </span>
        )}
      </Stack>

      {/* Grid */}
      <Box
        sx={{
          minHeight: 232,
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 0.6,
          p: 1,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
          alignContent: 'flex-start',
        }}
      >
        {search.isLoading && hasQuery && Array.from({ length: 16 }).map((_, i) => (
          <Box
            key={`sk-${i}`}
            sx={{
              aspectRatio: '1 / 1',
              borderRadius: 1.2,
              bgcolor: (th) => alpha(th.palette.text.primary, 0.04),
              animation: 'pulse 1.4s ease-in-out infinite',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 0.4 },
                '50%': { opacity: 0.8 },
              },
            }}
          />
        ))}

        {!search.isLoading && displayIcons.length === 0 && hasQuery && (
          <Box
            sx={{
              gridColumn: '1 / -1',
              minHeight: 200,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
              color: 'text.disabled',
            }}
          >
            <Icon icon="mdi:magnify-close" width={32} />
            <Typography variant="caption" sx={{ textTransform: 'none', letterSpacing: 0 }}>
              {t('categories.iconPicker_noResults')}
            </Typography>
          </Box>
        )}

        {displayIcons.map((ic) => {
          const active = value === ic;
          return (
            <Tooltip key={ic} title={ic.replace('mdi:', '')} arrow placement="top" enterDelay={400}>
              <Box
                component="button"
                type="button"
                onClick={() => onChange(ic)}
                aria-pressed={active}
                aria-label={ic}
                sx={{
                  aspectRatio: '1 / 1',
                  border: '1.5px solid',
                  borderColor: active ? 'primary.main' : 'transparent',
                  borderRadius: 1.2,
                  bgcolor: (th) => (active ? alpha(th.palette.primary.main, 0.12) : 'transparent'),
                  color: active ? 'primary.main' : 'text.secondary',
                  cursor: 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  transition: 'all .15s',
                  '&:hover': {
                    bgcolor: (th) => alpha(th.palette.primary.main, 0.08),
                    color: 'primary.main',
                  },
                }}
              >
                <Icon icon={ic} width={20} />
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Pagination + custom field */}
      <Stack direction="row" alignItems="center" spacing={1}>
        {hasQuery && totalPages > 1 && (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <IconButton
              size="small"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || search.isFetching}
              aria-label={t('common:previous')}
              sx={{ borderRadius: 1.2 }}
            >
              <Icon icon="mdi:chevron-left" width={18} />
            </IconButton>
            <Typography
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.74rem',
                px: 1,
                color: 'text.secondary',
                minWidth: 56,
                textAlign: 'center',
              }}
            >
              {page + 1} / {totalPages}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || search.isFetching}
              aria-label={t('common:next')}
              sx={{ borderRadius: 1.2 }}
            >
              <Icon icon="mdi:chevron-right" width={18} />
            </IconButton>
          </Stack>
        )}
        <Box sx={{ flex: 1 }} />
        <TextField
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('categories.formIconCustomPlaceholder')}
          size="small"
          sx={{ flex: 1, maxWidth: 240 }}
          slotProps={{
            input: { sx: { fontFamily: '"Geist Mono", monospace', fontSize: '0.78rem' } },
          }}
        />
      </Stack>
    </Stack>
  );
}
