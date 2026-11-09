import { Box, Chip, MenuItem, Select, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import type { TxNature, TxStatus, TxType } from '@shared/api/types';
import { useCategoriesQuery } from '@features/categories/api/useCategories';

export interface TxFilterState {
  type: 'all' | TxType;
  nature: 'all' | TxNature;
  status: 'all' | TxStatus;
  categoryId: 'all' | number;
  month: number;
  year: number;
}

interface Props {
  value: TxFilterState;
  onChange: (next: TxFilterState) => void;
  totalCount: number;
}

const MONTH_KEYS = [
  'month_long_january',
  'month_long_february',
  'month_long_march',
  'month_long_april',
  'month_long_may',
  'month_long_june',
  'month_long_july',
  'month_long_august',
  'month_long_september',
  'month_long_october',
  'month_long_november',
  'month_long_december',
] as const;

export function TransactionFilters({ value, onChange, totalCount }: Props) {
  const { t } = useTranslation(['pages', 'common']);
  const categoriesQ = useCategoriesQuery();
  const set = <K extends keyof TxFilterState>(k: K, v: TxFilterState[K]) => onChange({ ...value, [k]: v });

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2.5,
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} useFlexGap flexWrap="wrap">
        <ToggleButtonGroup
          exclusive
          size="small"
          value={value.type}
          onChange={(_, v) => v && set('type', v)}
          sx={{
            '& .MuiToggleButton-root': {
              textTransform: 'none',
              border: '1px solid',
              borderColor: 'divider',
              px: 1.5,
              py: 0.6,
              gap: 0.6,
              fontSize: '0.82rem',
              fontWeight: 500,
            },
            '& .MuiToggleButton-root.Mui-selected': {
              bgcolor: (th) => alpha(th.palette.primary.main, 0.12),
              color: 'primary.main',
              borderColor: 'primary.main',
            },
          }}
        >
          <ToggleButton value="all">{t('transactions.filter_typeAll')}</ToggleButton>
          <ToggleButton value="income">
            <Icon icon="mdi:trending-up" width={15} /> {t('transactions.filter_typeIncome')}
          </ToggleButton>
          <ToggleButton value="expense">
            <Icon icon="mdi:trending-down" width={15} /> {t('transactions.filter_typeExpense')}
          </ToggleButton>
        </ToggleButtonGroup>

        <Stack direction="row" spacing={0.8} alignItems="center">
          <Select
            size="small"
            value={value.month}
            onChange={(e) => set('month', Number(e.target.value))}
            sx={{ minWidth: 130, '& .MuiSelect-select': { py: 0.7, fontSize: '0.85rem' } }}
          >
            {MONTH_KEYS.map((key, i) => (
              <MenuItem key={key} value={i + 1} sx={{ fontSize: '0.85rem' }}>
                {t(`common:${key}`)}
              </MenuItem>
            ))}
          </Select>
          <Select
            size="small"
            value={value.year}
            onChange={(e) => set('year', Number(e.target.value))}
            sx={{ minWidth: 86, '& .MuiSelect-select': { py: 0.7, fontSize: '0.85rem' } }}
          >
            {[2024, 2025, 2026].map((y) => (
              <MenuItem key={y} value={y} sx={{ fontSize: '0.85rem' }}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </Stack>

        <Select
          size="small"
          value={value.nature}
          onChange={(e) => set('nature', e.target.value as TxFilterState['nature'])}
          sx={{ minWidth: 140, '& .MuiSelect-select': { py: 0.7, fontSize: '0.85rem' } }}
          displayEmpty
        >
          <MenuItem value="all" sx={{ fontSize: '0.85rem' }}>{t('transactions.filter_natureAll')}</MenuItem>
          <MenuItem value="fixed" sx={{ fontSize: '0.85rem' }}>{t('transactions.filter_natureFixed')}</MenuItem>
          <MenuItem value="variable" sx={{ fontSize: '0.85rem' }}>{t('transactions.filter_natureVariable')}</MenuItem>
        </Select>

        <Select
          size="small"
          value={value.status}
          onChange={(e) => set('status', e.target.value as TxFilterState['status'])}
          sx={{ minWidth: 150, '& .MuiSelect-select': { py: 0.7, fontSize: '0.85rem' } }}
        >
          <MenuItem value="all" sx={{ fontSize: '0.85rem' }}>{t('transactions.filter_statusAll')}</MenuItem>
          <MenuItem value="completed" sx={{ fontSize: '0.85rem' }}>{t('transactions.filter_statusCompleted')}</MenuItem>
          <MenuItem value="planned" sx={{ fontSize: '0.85rem' }}>{t('transactions.filter_statusPlanned')}</MenuItem>
        </Select>

        <Select
          size="small"
          value={value.categoryId}
          onChange={(e) => set('categoryId', e.target.value as TxFilterState['categoryId'])}
          sx={{ minWidth: 170, '& .MuiSelect-select': { py: 0.7, fontSize: '0.85rem' } }}
        >
          <MenuItem value="all" sx={{ fontSize: '0.85rem' }}>{t('transactions.filter_categoryAll')}</MenuItem>
          {(categoriesQ.data ?? []).map((c) => {
            const color = c.color ?? '#5A6E7C';
            return (
              <MenuItem key={c.id} value={c.id} sx={{ fontSize: '0.85rem' }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 14,
                      height: 14,
                      borderRadius: 0.6,
                      bgcolor: alpha(color, 0.18),
                      color,
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: '0.6rem',
                    }}
                  >
                    {c.emoji ? c.emoji : <Icon icon={c.icon} width={10} />}
                  </Box>
                  {c.name}
                </Stack>
              </MenuItem>
            );
          })}
        </Select>

        <Box sx={{ flex: 1 }} />

        <Chip
          label={
            <Stack direction="row" spacing={0.6} alignItems="center">
              <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: '0.78rem', fontWeight: 600 }}>
                {totalCount}
              </Typography>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                {t('transactions.filter_recordCount', { count: totalCount }).replace(/^\d+\s*/, '')}
              </Typography>
            </Stack>
          }
          sx={{ borderRadius: 1.5, height: 28 }}
        />
      </Stack>
    </Box>
  );
}
