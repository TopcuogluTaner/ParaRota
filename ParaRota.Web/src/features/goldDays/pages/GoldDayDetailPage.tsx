import { useEffect, useState } from 'react';
import { Box, Button, Checkbox, CircularProgress, IconButton, Skeleton, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { EmptyState } from '@shared/components/EmptyState';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { usePrivacyStore } from '@shared/store/usePrivacyStore';
import { formatNumber } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import i18n from '@shared/i18n';
import { useGoldDayQuery, useSetContributionPaid, useSetMeetingCompleted, useDeleteGoldDay } from '../api/useGoldDays';
import type { GoldDayDetailDto, GoldDayMeetingDto } from '@shared/api/types';

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' });
// Tamsayı miktarı ondalıksız; gizlilik modunda maskele.
const qty = (n: number, hide: boolean) => (hide ? '••' : n % 1 === 0 ? String(n) : formatNumber(n));

export function GoldDayDetailPage() {
  const { id } = useParams();
  const numId = Number(id);
  const { t } = useTranslation(['goldDays', 'common']);
  const navigate = useNavigate();
  const fmtMoney = useMoneyFmt();
  const hide = usePrivacyStore((s) => s.hideAmounts);

  const { data, isLoading, isError } = useGoldDayQuery(Number.isFinite(numId) ? numId : null);
  const setPaid = useSetContributionPaid();
  const setCompleted = useSetMeetingCompleted();
  const del = useDeleteGoldDay();

  const [expanded, setExpanded] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);

  useEffect(() => {
    // Veri gelince sıradaki toplantıyı varsayılan aç (türetilmiş senkron).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (data?.currentMeetingId) setExpanded(data.currentMeetingId);
  }, [data?.currentMeetingId]);

  const contribLabel = (d: GoldDayDetailDto) =>
    d.contributionType === 'gold' ? `${qty(d.contributionAmount, hide)} ${t(`unit_${d.contributionUnit}`)}`
      : d.contributionUnit === 'TRY' ? fmtMoney(d.contributionAmount) : `${qty(d.contributionAmount, hide)} ${d.contributionUnit}`;

  const handleDelete = async () => {
    try { await del.mutateAsync(numId); toast.success(t('delete_success')); navigate('/gold-days'); }
    catch (err) { toast.error(getErrorMessage(err, t('common:errorGeneric'))); }
  };

  return (
    <Box sx={{ p: { xs: 2, sm: 2.6, md: 4 }, maxWidth: 760, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={() => navigate('/gold-days')} aria-label={t('common:back')}><Icon icon="mdi:arrow-left" width={22} /></IconButton>
        <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: '1.5rem', flex: 1, minWidth: 0 }} noWrap>{data?.name ?? t('page_title')}</Typography>
        {data && <IconButton onClick={() => setConfirmDel(true)} aria-label={t('common:delete')} sx={{ color: 'error.main' }}><Icon icon="mdi:trash-can-outline" width={20} /></IconButton>}
      </Stack>

      {isLoading ? (
        <Stack spacing={1.6}><Skeleton variant="rounded" height={120} sx={{ borderRadius: 2.5 }} /><Skeleton variant="rounded" height={200} sx={{ borderRadius: 2.5 }} /></Stack>
      ) : isError || !data ? (
        <EmptyState icon="mdi:alert-circle-outline" title={t('detail_notFound')} action={<Button variant="contained" onClick={() => navigate('/gold-days')}>{t('common:back')}</Button>} />
      ) : (
        <Stack spacing={2}>
          {/* Özet */}
          <SurfaceCard>
            <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
              <Box>
                <Typography sx={eyebrow}>{t('summary_contribution')}</Typography>
                <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: '1.4rem' }}>{contribLabel(data)} <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>/ {t('per_meeting')}</Typography></Typography>
              </Box>
              {data.potValueTry != null && (
                <Box sx={{ textAlign: 'right' }}>
                  <Typography sx={eyebrow}>{t('summary_pot')}</Typography>
                  <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: '1.4rem', color: 'warning.main' }}>{fmtMoney(data.potValueTry)}</Typography>
                </Box>
              )}
            </Stack>
            {/* Sıra kimde */}
            {(() => {
              const cur = data.meetings.find((m) => m.id === data.currentMeetingId);
              return cur ? (
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1.6, p: 1.4, borderRadius: 2, bgcolor: (th) => alpha(th.palette.warning.main, 0.08), border: '1px solid', borderColor: (th) => alpha(th.palette.warning.main, 0.25) }}>
                  <Icon icon="mdi:account-star-outline" width={18} color="var(--mui-palette-warning-main)" />
                  <Typography variant="body2"><b>{t('current_host')}:</b> {cur.hostName} · {fmtDate(cur.meetingDate)}</Typography>
                </Stack>
              ) : <Typography variant="body2" sx={{ color: 'success.main', mt: 1.6, fontWeight: 600 }}>{t('all_done')}</Typography>;
            })()}
          </SurfaceCard>

          {/* Üyeler */}
          <SurfaceCard>
            <Typography sx={{ ...eyebrow, mb: 1.2 }}>{t('members')} ({data.members.length})</Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.8}>
              {data.members.map((m) => (
                <Box key={m.id} sx={{ px: 1.3, py: 0.6, borderRadius: 999, border: '1px solid', borderColor: m.isSelf ? 'success.main' : 'divider', bgcolor: m.isSelf ? (th) => alpha(th.palette.success.main, 0.1) : 'transparent', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Typography component="span" sx={{ fontSize: 'inherit', color: m.isSelf ? 'success.main' : 'text.primary', fontWeight: m.isSelf ? 700 : 500 }}>{m.name}</Typography>
                  {m.isSelf && <Typography component="span" sx={{ fontSize: '0.66rem', color: 'success.main' }}>· {t('me')}</Typography>}
                </Box>
              ))}
            </Stack>
          </SurfaceCard>

          {/* Toplantılar */}
          <Box>
            <Typography sx={{ ...eyebrow, mb: 1, ml: 0.5 }}>{t('meetings')}</Typography>
            <Stack spacing={1}>
              {data.meetings.map((m) => (
                <MeetingCard key={m.id} meeting={m} expanded={expanded === m.id} onToggleExpand={() => setExpanded((e) => (e === m.id ? null : m.id))}
                  onPaid={(cid, paid) => setPaid.mutate({ contributionId: cid, isPaid: paid })}
                  onComplete={(done) => setCompleted.mutate({ meetingId: m.id, isCompleted: done })}
                  busy={(setCompleted.isPending && setCompleted.variables?.meetingId === m.id)
                    || (setPaid.isPending && m.contributions.some((c) => c.id === setPaid.variables?.contributionId))}
                  t={t} />
              ))}
            </Stack>
          </Box>
        </Stack>
      )}

      <ConfirmDialog open={confirmDel} onClose={() => setConfirmDel(false)} onConfirm={handleDelete} tone="error" isPending={del.isPending}
        title={t('delete_title')} body={t('delete_body', { name: data?.name ?? '' })} />
    </Box>
  );
}

function MeetingCard({ meeting, expanded, onToggleExpand, onPaid, onComplete, busy, t }: {
  meeting: GoldDayMeetingDto; expanded: boolean; onToggleExpand: () => void;
  onPaid: (cid: number, paid: boolean) => void; onComplete: (done: boolean) => void; busy: boolean;
  t: (k: string, o?: Record<string, unknown>) => string;
}) {
  const allPaid = meeting.paidCount >= meeting.contributionCount && meeting.contributionCount > 0;
  return (
    <SurfaceCard padding={0} sx={{ overflow: 'hidden', opacity: meeting.isCompleted ? 0.75 : 1 }}>
      <Box component="button" onClick={onToggleExpand} aria-expanded={expanded}
        sx={{ all: 'unset', cursor: 'pointer', width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 1.2, px: 2, py: 1.6 }}>
        <Box sx={{ width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center', flexShrink: 0,
          bgcolor: (th) => meeting.isCompleted ? th.palette.success.main : alpha(th.palette.warning.main, 0.13), color: (th) => meeting.isCompleted ? th.palette.success.contrastText : th.palette.warning.main, fontWeight: 700, fontSize: '0.82rem' }}>
          {meeting.isCompleted ? <Icon icon="mdi:check" width={16} /> : meeting.sequenceNo}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, textAlign: 'start' }}>
          <Typography sx={{ fontWeight: 600, fontSize: '0.92rem' }} noWrap>{meeting.hostName}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{fmtDate(meeting.meetingDate)} · {t('paid_count', { paid: meeting.paidCount, total: meeting.contributionCount })}</Typography>
        </Box>
        <Icon icon={expanded ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={20} />
      </Box>

      {expanded && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} transition={{ duration: 0.2 }}>
          <Box sx={{ px: 2, pb: 1.8, borderTop: '1px solid', borderColor: 'divider', pt: 1 }}>
            {meeting.contributions.map((c) => (
              <Stack key={c.id} direction="row" alignItems="center" spacing={1} sx={{ py: 0.4 }}>
                <Checkbox checked={c.isPaid} disabled={busy} onChange={(e) => onPaid(c.id, e.target.checked)} size="small" color="success" sx={{ p: 0.5 }} inputProps={{ 'aria-label': c.memberName }} />
                <Typography variant="body2" sx={{ flex: 1, color: c.isPaid ? 'text.secondary' : 'text.primary', textDecoration: c.isPaid ? 'line-through' : 'none' }}>{c.memberName}</Typography>
              </Stack>
            ))}
            <Button fullWidth variant={meeting.isCompleted ? 'outlined' : 'contained'} onClick={() => onComplete(!meeting.isCompleted)} disabled={busy}
              startIcon={busy ? <CircularProgress size={15} /> : <Icon icon={meeting.isCompleted ? 'mdi:undo-variant' : 'mdi:flag-checkered'} width={16} />}
              sx={{ mt: 1, borderRadius: 999, fontWeight: 700 }} color={allPaid || meeting.isCompleted ? 'success' : 'primary'}>
              {meeting.isCompleted ? t('meeting_reopen') : t('meeting_complete')}
            </Button>
          </Box>
        </motion.div>
      )}
    </SurfaceCard>
  );
}

const eyebrow = { fontFamily: '"Geist Mono", monospace', fontSize: '0.64rem', letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: 'text.disabled' };
