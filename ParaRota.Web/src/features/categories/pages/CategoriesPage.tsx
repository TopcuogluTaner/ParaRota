import { useMemo, useState } from 'react';
import { Box, Button, Grid, IconButton, Skeleton, Stack, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { SectionHeader } from '@shared/components/SectionHeader';
import { PageTourTrigger } from '@features/onboarding';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { EmptyState } from '@shared/components/EmptyState';
import type { CategoryDto, TxType } from '@shared/api/types';
import { useCategoriesQuery } from '../api/useCategories';
import { CategoryFormModal } from '../components/CategoryFormModal';
import { CategoryDeleteModal } from '../components/CategoryDeleteModal';
import { CategoryMergeModal } from '../components/CategoryMergeModal';

export function CategoriesPage() {
  const { t } = useTranslation('pages');
  const [tab, setTab] = useState<TxType>('expense');
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<CategoryDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryDto | null>(null);
  const [mergeTarget, setMergeTarget] = useState<CategoryDto | null>(null);

  const { data, isLoading, isError, refetch, isFetching } = useCategoriesQuery();

  const counts = useMemo(() => {
    const list = data ?? [];
    return {
      expense: list.filter((c) => c.type === 'expense').length,
      income: list.filter((c) => c.type === 'income').length,
    };
  }, [data]);

  const visible = useMemo(() => (data ?? []).filter((c) => c.type === tab), [data, tab]);

  const openCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (category: CategoryDto) => {
    setEditTarget(category);
    setFormOpen(true);
  };

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 1280, mx: 'auto' }}>
      <SectionHeader
        eyebrow={t('categories.eyebrow')}
        title={t('categories.title')}
        description={t('categories.description')}
        action={
          <Button
            variant="contained"
            startIcon={<Icon icon="mdi:plus" width={18} />}
            onClick={openCreate}
            data-tour="categories-new"
          >
            {t('categories.newButton')}
          </Button>
        }
      />

      <PageTourTrigger page="categories" />

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 3,
          borderBottom: '1px solid',
          borderColor: 'divider',
          '& .MuiTabs-flexContainer': { gap: 1 },
        }}
      >
        <Tab
          value="expense"
          icon={<Icon icon="mdi:trending-down" width={16} />}
          iconPosition="start"
          label={`${t('categories.tabExpense')} (${counts.expense})`}
        />
        <Tab
          value="income"
          icon={<Icon icon="mdi:trending-up" width={16} />}
          iconPosition="start"
          label={`${t('categories.tabIncome')} (${counts.income})`}
        />
      </Tabs>

      {isLoading ? (
        <CategoriesSkeleton />
      ) : isError ? (
        <EmptyState
          icon="mdi:alert-circle-outline"
          title={t('categories.errorTitle')}
          action={
            <Button variant="contained" onClick={() => void refetch()} startIcon={<Icon icon="mdi:refresh" width={18} />}>
              {t('categories.errorRetry')}
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="mdi:tag-outline"
          title={t('categories.emptyTitle')}
          description={t('categories.emptyDescription')}
          action={
            <Button variant="contained" startIcon={<Icon icon="mdi:plus" width={18} />} onClick={openCreate}>
              {t('categories.emptyAction')}
            </Button>
          }
        />
      ) : (
        <Grid container spacing={2} sx={{ opacity: isFetching ? 0.7 : 1, transition: 'opacity .2s' }}>
          {visible.map((c, i) => (
            <Grid key={c.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <CategoryCard
                category={c}
                index={i}
                onEdit={() => openEdit(c)}
                onDelete={() => setDeleteTarget(c)}
                onMerge={() => setMergeTarget(c)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      <CategoryFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode={editTarget ? 'edit' : 'create'}
        category={editTarget ?? undefined}
      />
      <CategoryDeleteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        category={deleteTarget}
      />
      <CategoryMergeModal
        open={mergeTarget !== null}
        onClose={() => setMergeTarget(null)}
        category={mergeTarget}
      />
    </Box>
  );
}

interface CardProps {
  category: CategoryDto;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onMerge: () => void;
}

function CategoryCard({ category, index, onEdit, onDelete, onMerge }: CardProps) {
  const { t } = useTranslation('pages');
  const color = category.color ?? '#5A6E7C';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.4) }}
    >
      <SurfaceCard interactive padding={2.2}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 1.5 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 1.6,
              display: 'grid',
              placeItems: 'center',
              bgcolor: alpha(color, 0.16),
              color: color,
              fontSize: '1.4rem',
            }}
          >
            {category.emoji ? category.emoji : <Icon icon={category.icon} width={22} />}
          </Box>
          <Stack direction="row" alignItems="center" spacing={0.4}>
            {category.isSystem ? (
              // Sistem kategorisi: salt-okunur, sadece badge gösterilir.
              <Tooltip title={t('categories.systemBadge')} arrow>
                <Box
                  sx={{
                    px: 0.8,
                    py: 0.3,
                    borderRadius: 0.8,
                    bgcolor: (th) => alpha(th.palette.info.main, 0.14),
                    color: 'info.main',
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: '0.58rem',
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.4,
                  }}
                >
                  <Icon icon="mdi:shield-lock-outline" width={11} />
                  {t('categories.systemBadge')}
                </Box>
              </Tooltip>
            ) : (
              <>
                <Tooltip title={t('categories.edit')} arrow>
                  <IconButton size="small" onClick={onEdit} aria-label={t('categories.edit')} sx={{ width: 28, height: 28 }}>
                    <Icon icon="mdi:pencil-outline" width={15} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('categories.merge_action')} arrow>
                  <IconButton
                    size="small"
                    onClick={onMerge}
                    aria-label={t('categories.merge_action')}
                    sx={{
                      width: 28,
                      height: 28,
                      '&:hover': { color: 'primary.main' },
                    }}
                  >
                    <Icon icon="mdi:merge" width={15} />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t('categories.delete')} arrow>
                  <IconButton
                    size="small"
                    onClick={onDelete}
                    aria-label={t('categories.delete')}
                    sx={{
                      width: 28,
                      height: 28,
                      '&:hover': { color: 'error.main' },
                    }}
                  >
                    <Icon icon="mdi:trash-can-outline" width={15} />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Stack>
        </Stack>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: '1.1rem' }}>
            {category.name}
          </Typography>
          {/* Kullanım rozeti: aktif scope'taki işlem sayısı. */}
          <Box
            sx={{
              flexShrink: 0,
              px: 0.9,
              py: 0.3,
              borderRadius: 0.8,
              bgcolor: (th) => alpha(th.palette.text.primary, 0.06),
              color: 'text.secondary',
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.6rem',
              letterSpacing: '0.04em',
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {t('categories.transactionsCount', { count: category.transactionCount })}
          </Box>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.8} sx={{ mt: 0.8 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: color,
              boxShadow: `0 0 0 2px ${alpha(color, 0.22)}`,
            }}
          />
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.62rem',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: 'text.disabled',
            }}
          >
            {(category.icon ?? '').replace('mdi:', '')}
          </Typography>
        </Stack>
      </SurfaceCard>
    </motion.div>
  );
}

function CategoriesSkeleton() {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: 8 }).map((_, i) => (
        <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
          <SurfaceCard padding={2.2}>
            <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
              <Skeleton variant="rounded" width={44} height={44} />
              <Box sx={{ flex: 1 }} />
              <Skeleton variant="circular" width={12} height={12} />
            </Stack>
            <Skeleton variant="text" width="70%" height={28} />
            <Skeleton variant="text" width="50%" height={16} />
          </SurfaceCard>
        </Grid>
      ))}
    </Grid>
  );
}
