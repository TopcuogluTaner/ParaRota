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
import { usePrivacyStore } from '@shared/store/usePrivacyStore';
import { formatNumber } from '@shared/lib/dateFormat';
import { useGoldDaysQuery } from '../api/useGoldDays';
import { GoldDayCreateModal } from '../components/GoldDayCreateModal';
import type { GoldDayListItemDto } from '@shared/api/types';

// Tamsayı miktarı ondalıksız (1 çeyrek, "1,00" değil); gizlilik modunda maskele.
const qty = (n: number, hide: boolean) => (hide ? '••' : n % 1 === 0 ? String(n) : formatNumber(n));

export function GoldDaysPage() {
  const { t } = useTranslation(['goldDays', 'common']);
  const navigate = useNavigate();
  const fmtMoney = useMoneyFmt();
  const hide = usePrivacyStore((s) => s.hideAmounts);
  const [createOpen, setCreateOpen] = useState(false);
  const { data, isLoading } = useGoldDaysQuery();

  const contribLabel = (it: GoldDayListItemDto) =>
    it.contributionType === 'gold'
      ? `${qty(it.contributionAmount, hide)} ${t(`unit_${it.contributionUnit}`)}`
      : it.contributionUnit === 'TRY'
        ? fmtMoney(it.contributionAmount)
        : `${qty(it.contributionAmount, hide)} ${it.contributionUnit}`;

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
        <Stack spacing={1.6}>
          {[0, 1].map((i) => <Skeleton key={i} variant="rounded" height={120} sx={{ borderRadius: 2.5 }} />)}
        </Stack>
      ) : !data || data.length === 0 ? (
        <EmptyState icon="mdi:gold" title={t('empty_title')} description={t('empty_hint')}
          action={<Button variant="contained" onClick={() => setCreateOpen(true)} startIcon={<Icon icon="mdi:plus" width={18} />}>{t('new')}</Button>} />
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: { xs: 1.6, md: 2 } }}>
          {data.map((it, i) => (
            <motion.div key={it.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.05 }}>
              <ButtonBase onClick={() => navigate(`/gold-days/${it.id}`)} sx={{ width: '100%', display: 'block', textAlign: 'start', borderRadius: 2.5,
                '&:hover .gd-card': { transform: 'translateY(-2px)', borderColor: (th) => alpha(th.palette.warning.main, 0.5) } }}>
                <Box className="gd-card" sx={{ p: { xs: 2, sm: 2.4 }, bgcolor: 'background.paper', border: '1px solid', borderColor: 'divider', borderRadius: 2.5,
                  transition: 'transform .22s cubic-bezier(.2,.7,.3,1), border-color .22s' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                    <Stack direction="row" alignItems="center" spacing={1.2} sx={{ minWidth: 0 }}>
                      <Box sx={{ width: 38, height: 38, borderRadius: 1.5, display: 'grid', placeItems: 'center', flexShrink: 0,
                        bgcolor: (th) => alpha(th.palette.warning.main, 0.13), color: 'warning.main' }}>
                        <Icon icon={it.contributionType === 'gold' ? 'mdi:gold' : 'mdi:cash-multiple'} width={20} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: '1.15rem', lineHeight: 1.2 }} noWrap>{it.name}</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>{contribLabel(it)} · {t('memberCount', { count: it.memberCount })}</Typography>
                      </Box>
                    </Stack>
                    {it.status === 'completed' && (
                      <Box sx={{ px: 1, py: 0.4, borderRadius: 999, bgcolor: (th) => alpha(th.palette.success.main, 0.13), color: 'success.main', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>{t('status_completed')}</Box>
                    )}
                  </Stack>

                  {/* İlerleme */}
                  <Box sx={{ mt: 1.8 }}>
                    <Box aria-hidden sx={{ height: 6, borderRadius: 999, bgcolor: 'divider', overflow: 'hidden' }}>
                      <Box sx={{ height: '100%', borderRadius: 999, bgcolor: 'warning.main', width: `${Math.round((it.completedMeetings / Math.max(it.memberCount, 1)) * 100)}%` }} />
                    </Box>
                    <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.8 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{t('progress', { done: it.completedMeetings, total: it.memberCount })}</Typography>
                      {it.potValueTry != null && <Typography variant="body2" sx={{ fontWeight: 700 }}>{t('pot')}: {fmtMoney(it.potValueTry)}</Typography>}
                    </Stack>
                  </Box>

                  {it.status === 'active' && it.nextHostName && (
                    <Stack direction="row" alignItems="center" spacing={0.6} sx={{ mt: 1.2, color: 'warning.main' }}>
                      <Icon icon="mdi:account-arrow-right-outline" width={16} />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{t('nextHost', { name: it.nextHostName })}</Typography>
                    </Stack>
                  )}
                </Box>
              </ButtonBase>
            </motion.div>
          ))}
        </Box>
      )}

      <GoldDayCreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={(id) => { setCreateOpen(false); navigate(`/gold-days/${id}`); }} />
    </Box>
  );
}
