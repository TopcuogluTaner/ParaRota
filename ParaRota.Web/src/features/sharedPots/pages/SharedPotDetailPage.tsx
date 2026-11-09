import { useState } from 'react';
import { Box, Button, ButtonBase, Chip, CircularProgress, IconButton, Menu, MenuItem, Stack, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { EmptyState } from '@shared/components/EmptyState';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { formatDate } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { AddExpenseModal } from '../components/AddExpenseModal';
import { SettleModal, type SettlePrefill } from '../components/SettleModal';
import { AddMemberModal } from '../components/AddMemberModal';
import { EditPotModal } from '../components/EditPotModal';
import { useSharedPotQuery, useDeleteSharedPot, useDeleteExpense, useDeleteSettlement, useRemovePotMember } from '../api/useSharedPots';
import type { SharedExpenseDto, SharedPotMemberDto, SharedSettlementDto } from '@shared/api/types';

export function SharedPotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const potId = Number(id);
  const { t } = useTranslation(['sharedPots', 'common']);
  const navigate = useNavigate();
  const fmtMoney = useMoneyFmt();
  const { data: pot, isLoading } = useSharedPotQuery(potId);

  const delPot = useDeleteSharedPot();
  const delExpense = useDeleteExpense();
  const delSettlement = useDeleteSettlement();
  const removeMember = useRemovePotMember();

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settlePrefill, setSettlePrefill] = useState<SettlePrefill | null>(null);
  const [deletePotOpen, setDeletePotOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<SharedExpenseDto | null>(null);
  const [settlementToDelete, setSettlementToDelete] = useState<SharedSettlementDto | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<SharedPotMemberDto | null>(null);

  if (isLoading) {
    return <Box sx={{ p: 6, display: 'grid', placeItems: 'center' }}><CircularProgress /></Box>;
  }
  if (!pot) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 900, mx: 'auto' }}>
        <BackBtn onClick={() => navigate('/shared-pots')} label={t('common:back')} />
        <EmptyState icon="mdi:alert-circle-outline" title={t('detail_notFound')} />
      </Box>
    );
  }

  const openSettle = (prefill: SettlePrefill | null) => { setSettlePrefill(prefill); setSettleOpen(true); };

  const doDeletePot = async () => {
    try { await delPot.mutateAsync(pot.id); toast.success(t('deleted')); navigate('/shared-pots'); }
    catch (err) { toast.error(getErrorMessage(err, t('common:errorGeneric'))); }
  };
  const doDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try { await delExpense.mutateAsync({ id: pot.id, expenseId: expenseToDelete.id }); toast.success(t('expense_deleted')); setExpenseToDelete(null); }
    catch (err) { toast.error(getErrorMessage(err, t('common:errorGeneric'))); }
  };
  const doDeleteSettlement = async () => {
    if (!settlementToDelete) return;
    try { await delSettlement.mutateAsync({ id: pot.id, settlementId: settlementToDelete.id }); toast.success(t('settle_deleted')); setSettlementToDelete(null); }
    catch (err) { toast.error(getErrorMessage(err, t('common:errorGeneric'))); }
  };
  const doRemoveMember = async () => {
    if (!memberToRemove) return;
    try { await removeMember.mutateAsync({ id: pot.id, memberId: memberToRemove.id }); toast.success(t('member_removed')); setMemberToRemove(null); }
    catch (err) { toast.error(getErrorMessage(err, t('common:errorGeneric'))); }
  };

  const myBalance = pot.members.find((m) => m.id === pot.myMemberId)?.balance ?? null;

  return (
    <Box sx={{ p: { xs: 2, sm: 2.6, md: 4 }, maxWidth: 900, mx: 'auto' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <BackBtn onClick={() => navigate('/shared-pots')} label={t('common:back')} />
        {pot.isOwner && (
          <>
            <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)} aria-label={t('common:more', { defaultValue: 'Daha fazla' })}>
              <Icon icon="mdi:dots-vertical" width={22} />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={() => setMenuAnchor(null)}>
              <MenuItem onClick={() => { setMenuAnchor(null); setEditOpen(true); }}>
                <Icon icon="mdi:pencil-outline" width={18} style={{ marginRight: 8 }} />{t('common:edit')}
              </MenuItem>
              <MenuItem onClick={() => { setMenuAnchor(null); setDeletePotOpen(true); }} sx={{ color: 'error.main' }}>
                <Icon icon="mdi:trash-can-outline" width={18} style={{ marginRight: 8 }} />{t('common:delete')}
              </MenuItem>
            </Menu>
          </>
        )}
      </Stack>

      {/* Başlık + senin durumun */}
      <SurfaceCard padding={2.6} sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', lineHeight: 1.2 }}>{pot.name}</Typography>
        {pot.note && <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>{pot.note}</Typography>}
        <Stack direction="row" spacing={3} sx={{ mt: 1.6, flexWrap: 'wrap' }}>
          <Stat label={t('totalSpent')} value={fmtMoney(pot.totalSpent)} />
          <Stat label={t('members')} value={String(pot.members.length)} />
          {myBalance !== null && (
            <Stat label={t('your_balance')}
              value={Math.abs(myBalance) < 0.01 ? t('settled_up') : `${myBalance > 0 ? '+' : ''}${fmtMoney(myBalance)}`}
              tone={Math.abs(myBalance) < 0.01 ? undefined : myBalance > 0 ? 'success.main' : 'error.main'} />
          )}
        </Stack>
      </SurfaceCard>

      {/* Kim kime borçlu */}
      <SurfaceCard padding={2.4} sx={{ mb: 2 }}>
        <CardTitle icon="mdi:swap-horizontal-bold" text={t('whoOwesWhom')} />
        {pot.suggestions.length === 0 ? (
          <Typography sx={{ color: 'success.main', fontWeight: 600, mt: 1 }}>{t('all_settled')} 🎉</Typography>
        ) : (
          <Stack spacing={1} sx={{ mt: 1.2 }}>
            {pot.suggestions.map((s, i) => (
              <Stack key={i} direction="row" alignItems="center" spacing={1.2}
                sx={{ p: 1.2, borderRadius: 2, bgcolor: 'background.default', border: '1px solid', borderColor: 'divider' }}>
                <Typography sx={{ fontWeight: 600, flexShrink: 0 }}>{s.fromName}</Typography>
                <Icon icon="mdi:arrow-right" width={18} style={{ opacity: 0.5, flexShrink: 0 }} />
                <Typography sx={{ fontWeight: 600 }}>{s.toName}</Typography>
                <Box sx={{ flex: 1, textAlign: 'end' }}>
                  <Typography component="span" sx={{ fontWeight: 700, fontFamily: '"Geist Mono", monospace', mr: 1.2 }}>{fmtMoney(s.amount)}</Typography>
                  <Button size="small" variant="outlined" onClick={() => openSettle({ fromMemberId: s.fromMemberId, toMemberId: s.toMemberId, amount: s.amount })}
                    sx={{ borderRadius: 999 }}>{t('mark_paid')}</Button>
                </Box>
              </Stack>
            ))}
          </Stack>
        )}
        <Button size="small" startIcon={<Icon icon="mdi:cash-plus" width={16} />} onClick={() => openSettle(null)} sx={{ mt: 1.2 }}>
          {t('record_payment')}
        </Button>
      </SurfaceCard>

      {/* Üyeler */}
      <SurfaceCard padding={2.4} sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <CardTitle icon="mdi:account-group-outline" text={t('members')} />
          {pot.isOwner && (
            <Button size="small" startIcon={<Icon icon="mdi:account-plus-outline" width={16} />} onClick={() => setAddMemberOpen(true)}>
              {t('add_member')}
            </Button>
          )}
        </Stack>
        <Stack sx={{ mt: 1 }}>
          {pot.members.map((m) => (
            <Stack key={m.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.8, borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 'none' } }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography sx={{ fontWeight: 600 }}>{m.name}</Typography>
                {m.isSelf && <Chip size="small" label={t('you')} sx={{ height: 20, fontSize: '0.66rem' }} />}
                {!m.linkedUserId && <Icon icon="mdi:account-outline" width={14} style={{ opacity: 0.4 }} />}
              </Stack>
              <Stack direction="row" alignItems="center" spacing={0.6}>
                <BalanceChip balance={m.balance} fmtMoney={fmtMoney} t={t} />
                {pot.isOwner && !m.isSelf && (
                  <IconButton size="small" onClick={() => setMemberToRemove(m)} aria-label={t('common:delete')}>
                    <Icon icon="mdi:close" width={16} />
                  </IconButton>
                )}
              </Stack>
            </Stack>
          ))}
        </Stack>
      </SurfaceCard>

      {/* Masraflar */}
      <SurfaceCard padding={2.4} sx={{ mb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <CardTitle icon="mdi:receipt-text-outline" text={t('expenses')} />
          <Button size="small" variant="contained" startIcon={<Icon icon="mdi:plus" width={16} />} onClick={() => setExpenseOpen(true)} sx={{ borderRadius: 999 }}>
            {t('add_expense')}
          </Button>
        </Stack>
        {pot.expenses.length === 0 ? (
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1.2 }}>{t('no_expenses')}</Typography>
        ) : (
          <Stack spacing={1} sx={{ mt: 1.2 }}>
            {pot.expenses.map((e) => (
              <Stack key={e.id} direction="row" alignItems="flex-start" spacing={1.2} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 'none' } }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }}>{e.description}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {t('paid_by', { name: e.payerName })} · {formatDate(e.expenseDate)} · {e.splitType === 'equal' ? t('split_equal_n', { count: e.shares.length }) : t('split_exact')}
                  </Typography>
                  {e.note && <Typography variant="caption" sx={{ display: 'block', color: 'text.disabled', fontStyle: 'italic' }}>{e.note}</Typography>}
                </Box>
                <Typography sx={{ fontWeight: 700, fontFamily: '"Geist Mono", monospace', whiteSpace: 'nowrap' }}>{fmtMoney(e.amount)}</Typography>
                {e.canEdit && (
                  <IconButton size="small" onClick={() => setExpenseToDelete(e)} aria-label={t('common:delete')} sx={{ color: 'error.main', mt: -0.5 }}>
                    <Icon icon="mdi:trash-can-outline" width={16} />
                  </IconButton>
                )}
              </Stack>
            ))}
          </Stack>
        )}
      </SurfaceCard>

      {/* Ödemeler */}
      {pot.settlements.length > 0 && (
        <SurfaceCard padding={2.4} sx={{ mb: 2 }}>
          <CardTitle icon="mdi:cash-multiple" text={t('payments')} />
          <Stack spacing={1} sx={{ mt: 1.2 }}>
            {pot.settlements.map((s) => (
              <Stack key={s.id} direction="row" alignItems="center" spacing={1.2} sx={{ py: 0.8, borderBottom: '1px solid', borderColor: 'divider', '&:last-of-type': { borderBottom: 'none' } }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }}>{s.fromName} → {s.toName}</Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>{formatDate(s.settledOn)}{s.note ? ` · ${s.note}` : ''}</Typography>
                </Box>
                <Typography sx={{ fontWeight: 700, fontFamily: '"Geist Mono", monospace', whiteSpace: 'nowrap', color: 'success.main' }}>{fmtMoney(s.amount)}</Typography>
                {s.canEdit && (
                  <IconButton size="small" onClick={() => setSettlementToDelete(s)} aria-label={t('common:delete')} sx={{ color: 'error.main' }}>
                    <Icon icon="mdi:trash-can-outline" width={16} />
                  </IconButton>
                )}
              </Stack>
            ))}
          </Stack>
        </SurfaceCard>
      )}

      {/* Modallar */}
      <EditPotModal open={editOpen} onClose={() => setEditOpen(false)} potId={pot.id} initialName={pot.name} initialNote={pot.note} />
      <AddMemberModal open={addMemberOpen} onClose={() => setAddMemberOpen(false)} potId={pot.id} existing={pot.members} />
      <AddExpenseModal open={expenseOpen} onClose={() => setExpenseOpen(false)} potId={pot.id} members={pot.members} currency={pot.currency} defaultPayerId={pot.myMemberId} />
      <SettleModal open={settleOpen} onClose={() => setSettleOpen(false)} potId={pot.id} members={pot.members} currency={pot.currency} prefill={settlePrefill} />

      <ConfirmDialog open={deletePotOpen} onClose={() => setDeletePotOpen(false)} onConfirm={doDeletePot}
        title={t('delete_title')} body={t('delete_body', { name: pot.name })} tone="error" isPending={delPot.isPending} />
      <ConfirmDialog open={!!expenseToDelete} onClose={() => setExpenseToDelete(null)} onConfirm={doDeleteExpense}
        title={t('expense_delete_title')} body={t('expense_delete_body')} tone="error" isPending={delExpense.isPending} />
      <ConfirmDialog open={!!settlementToDelete} onClose={() => setSettlementToDelete(null)} onConfirm={doDeleteSettlement}
        title={t('settle_delete_title')} body={t('settle_delete_body')} tone="error" isPending={delSettlement.isPending} />
      <ConfirmDialog open={!!memberToRemove} onClose={() => setMemberToRemove(null)} onConfirm={doRemoveMember}
        title={t('member_remove_title')} body={t('member_remove_body', { name: memberToRemove?.name ?? '' })} tone="error" isPending={removeMember.isPending} />
    </Box>
  );
}

function BackBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <ButtonBase onClick={onClick} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, py: 0.6, px: 1, borderRadius: 2, color: 'text.secondary' }}>
      <Icon icon="mdi:arrow-left" width={18} /><Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
    </ButtonBase>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block' }}>{label}</Typography>
      <Typography sx={{ fontWeight: 700, color: tone ?? 'text.primary', fontFamily: '"Geist Mono", monospace' }}>{value}</Typography>
    </Box>
  );
}

function CardTitle({ icon, text }: { icon: string; text: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={0.8}>
      <Icon icon={icon} width={20} />
      <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{text}</Typography>
    </Stack>
  );
}

function BalanceChip({ balance, fmtMoney, t }: { balance: number; fmtMoney: (v: number) => string; t: (k: string) => string }) {
  const settled = Math.abs(balance) < 0.01;
  const positive = balance > 0;
  const color = settled ? 'text.secondary' : positive ? 'success.main' : 'error.main';
  const label = settled ? t('settled_up') : `${positive ? '+' : ''}${fmtMoney(balance)}`;
  return (
    <Typography sx={{ fontWeight: 700, color, fontFamily: '"Geist Mono", monospace', fontSize: '0.9rem' }}>{label}</Typography>
  );
}
