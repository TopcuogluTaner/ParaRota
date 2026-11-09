import { useState } from 'react';
import { Box, Button, ButtonBase, Skeleton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { SectionHeader } from '@shared/components/SectionHeader';
import { EmptyState } from '@shared/components/EmptyState';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { SharedPotCreateModal } from '../components/SharedPotCreateModal';
import { useSharedPotsQuery } from '../api/useSharedPots';
import type { SharedPotListItemDto } from '@shared/api/types';

export function SharedPotsPage() {
  const { t } = useTranslation(['sharedPots', 'common']);
  const navigate = useNavigate();
  const fmtMoney = useMoneyFmt();
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useSharedPotsQuery();

  return (
    <Box sx={{ p: { xs: 2, sm: 2.6, md: 4 }, maxWidth: 1100, mx: 'auto' }}>
      <SectionHeader
        eyebrow={t('page_eyebrow')}
        title={t('page_title')}
        description={t('page_description')}
        action={
          <Button variant="contained" onClick={() => setCreateOpen(true)} startIcon={<Icon icon="mdi:plus" width={18} />} sx={{ borderRadius: 999, fontWeight: 700 }}>
            {t('new')}
          </Button>
        }
      />

      {isLoading ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 1.6, md: 2 } }}>
          {[0, 1].map((i) => <Skeleton key={i} variant="rounded" height={116} sx={{ borderRadius: 2.5 }} />)}
        </Box>
      ) : !data || data.length === 0 ? (
        <EmptyState icon="mdi:account-cash-outline" title={t('empty_title')} description={t('empty_hint')}
          action={<Button variant="contained" onClick={() => setCreateOpen(true)} startIcon={<Icon icon="mdi:plus" width={18} />}>{t('new')}</Button>} />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 1.6, md: 2 } }}>
          {data.map((it, i) => (
            <motion.div key={it.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
              <PotCard it={it} fmtMoney={fmtMoney} onClick={() => navigate(`/shared-pots/${it.id}`)} />
            </motion.div>
          ))}
        </Box>
      )}

      <SharedPotCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => { setCreateOpen(false); navigate(`/shared-pots/${id}`); }} />
    </Box>
  );
}

function PotCard({ it, fmtMoney, onClick }: { it: SharedPotListItemDto; fmtMoney: (v: number) => string; onClick: () => void }) {
  const { t } = useTranslation('sharedPots');
  const bal = it.myBalance ?? null;
  const settled = bal === null || Math.abs(bal) < 0.01;
  const positive = (bal ?? 0) > 0;
  const tone = settled ? 'text.secondary' : positive ? 'success.main' : 'error.main';

  return (
    <ButtonBase onClick={onClick} sx={{ width: '100%', display: 'block', textAlign: 'start', borderRadius: 2.5 }}>
      <Box sx={{ p: { xs: 2, sm: 2.4 }, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
        <Stack direction="row" spacing={1.6} alignItems="center">
          <Box sx={{ width: 42, height: 42, flexShrink: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', color: 'primary.main', bgcolor: (th) => alpha(th.palette.primary.main, 0.12) }}>
            <Icon icon="mdi:account-cash-outline" width={24} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem' }} noWrap>{it.name}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('memberCount', { count: it.memberCount })} · {t('totalSpent')}: {fmtMoney(it.totalSpent)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'end' }}>
            <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>{t('your_balance')}</Typography>
            <Typography sx={{ fontWeight: 700, color: tone, fontFamily: '"Geist Mono", monospace' }}>
              {settled ? t('settled_up') : `${positive ? '+' : ''}${fmtMoney(bal ?? 0)}`}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </ButtonBase>
  );
}
