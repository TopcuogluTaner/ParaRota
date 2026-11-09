import { useEffect, useMemo, useState } from 'react';
import { Box, Button, ButtonBase, Checkbox, CircularProgress, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { parseAmount } from '@shared/lib/parseAmount';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useAddExpense } from '../api/useSharedPots';
import type { ExpenseSplitType, SharedPotMemberDto } from '@shared/api/types';

interface Props {
  open: boolean;
  onClose: () => void;
  potId: number;
  members: SharedPotMemberDto[];
  currency: string;
  defaultPayerId?: number | null;
}

function todayIso() { return new Date().toISOString().slice(0, 10); }

export function AddExpenseModal({ open, onClose, potId, members, currency, defaultPayerId }: Props) {
  const { t } = useTranslation(['sharedPots', 'common']);
  const add = useAddExpense();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState<number>(0);
  const [date, setDate] = useState(todayIso());
  const [splitType, setSplitType] = useState<ExpenseSplitType>('equal');
  const [participants, setParticipants] = useState<number[]>([]);
  const [exact, setExact] = useState<Record<number, string>>({});
  const [note, setNote] = useState('');
  const [attempted, setAttempted] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setDescription(''); setAmount(''); setDate(todayIso()); setSplitType('equal');
    setPayerId(defaultPayerId ?? members[0]?.id ?? 0);
    setParticipants(members.map((m) => m.id));
    setExact({}); setNote(''); setAttempted(false);
  }, [open, members, defaultPayerId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const amountNum = parseAmount(amount);
  const toggleParticipant = (id: number) => setParticipants((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const setExactAmount = (id: number, v: string) => setExact((p) => ({ ...p, [id]: v.replace(/[^\d.,]/g, '') }));

  const exactSum = useMemo(
    () => members.reduce((acc, m) => acc + (parseAmount(exact[m.id] ?? '') || 0), 0),
    [exact, members],
  );

  const valid = useMemo(() => {
    if (description.trim().length === 0 || !(amountNum > 0) || !payerId) return false;
    if (splitType === 'equal') return participants.length >= 1;
    return Math.abs(exactSum - amountNum) < 0.01 && members.some((m) => (parseAmount(exact[m.id] ?? '') || 0) > 0);
  }, [description, amountNum, payerId, splitType, participants, exactSum, exact, members]);

  const handleSubmit = async () => {
    if (add.isPending) return;
    if (!valid) { setAttempted(true); toast.error(t('expense_invalid')); return; }
    try {
      await add.mutateAsync({
        id: potId,
        body: {
          description: description.trim(),
          amount: amountNum,
          expenseDate: date,
          payerMemberId: payerId,
          splitType,
          participantMemberIds: splitType === 'equal' ? participants : [],
          exactShares: splitType === 'exact'
            ? members.map((m) => ({ memberId: m.id, shareAmount: parseAmount(exact[m.id] ?? '') || 0 })).filter((s) => s.shareAmount > 0)
            : null,
          note: note.trim() || null,
        },
      });
      toast.success(t('expense_added'));
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, t('common:errorGeneric')));
    }
  };

  const remaining = amountNum - exactSum;

  return (
    <ZoomModal
      open={open}
      onClose={add.isPending ? () => {} : onClose}
      icon="mdi:receipt-text-plus-outline"
      title={t('expense_title')}
      subtitle={t('expense_subtitle')}
      maxWidth={560}
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={add.isPending}>{t('common:cancel')}</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={add.isPending}
            startIcon={add.isPending ? <CircularProgress size={16} thickness={5} /> : <Icon icon="mdi:check" width={18} />}>
            {t('expense_submit')}
          </Button>
        </>
      }
    >
      <Stack spacing={2.2}>
        <TextField label={t('field_description')} value={description} onChange={(e) => setDescription(e.target.value)} fullWidth autoFocus
          error={attempted && description.trim().length === 0} inputProps={{ maxLength: 160 }} placeholder={t('field_descriptionPlaceholder')} />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.6}>
          <TextField label={t('field_amount')} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            error={attempted && !(amountNum > 0)} sx={{ flex: 1 }} inputProps={{ inputMode: 'decimal' }}
            InputProps={{ endAdornment: <InputAdornment position="end">{currency}</InputAdornment> }} />
          <TextField label={t('field_date')} type="date" value={date} onChange={(e) => setDate(e.target.value)}
            sx={{ minWidth: 160 }} InputLabelProps={{ shrink: true }} />
        </Stack>

        <TextField select label={t('field_payer')} value={payerId || ''} onChange={(e) => setPayerId(Number(e.target.value))} fullWidth>
          {members.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}{m.isSelf ? ` (${t('you')})` : ''}</MenuItem>)}
        </TextField>

        {/* Bölüşüm tipi */}
        <Box>
          <FieldLabel text={t('field_split')} />
          <Stack direction="row" spacing={1.2}>
            <SplitButton icon="mdi:equal" label={t('split_equal')} selected={splitType === 'equal'} onClick={() => setSplitType('equal')} />
            <SplitButton icon="mdi:tune-variant" label={t('split_exact')} selected={splitType === 'exact'} onClick={() => setSplitType('exact')} />
          </Stack>
        </Box>

        {splitType === 'equal' ? (
          <Box>
            <FieldLabel text={t('field_participants')} />
            <Stack>
              {members.map((m) => {
                const on = participants.includes(m.id);
                const each = on && participants.length > 0 ? amountNum / participants.length : 0;
                return (
                  <Stack key={m.id} direction="row" alignItems="center" justifyContent="space-between" sx={{ py: 0.3 }}>
                    <Stack direction="row" alignItems="center">
                      <Checkbox checked={on} onChange={() => toggleParticipant(m.id)} size="small" />
                      <Typography sx={{ fontWeight: 500 }}>{m.name}{m.isSelf ? ` (${t('you')})` : ''}</Typography>
                    </Stack>
                    {on && amountNum > 0 && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: '"Geist Mono", monospace' }}>
                        {each.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                      </Typography>
                    )}
                  </Stack>
                );
              })}
            </Stack>
          </Box>
        ) : (
          <Box>
            <FieldLabel text={t('field_exactShares')} />
            <Stack spacing={1}>
              {members.map((m) => (
                <Stack key={m.id} direction="row" spacing={1.2} alignItems="center">
                  <Typography sx={{ flex: 1, fontWeight: 500 }}>{m.name}{m.isSelf ? ` (${t('you')})` : ''}</Typography>
                  <TextField value={exact[m.id] ?? ''} onChange={(e) => setExactAmount(m.id, e.target.value)} size="small"
                    sx={{ width: 130 }} inputProps={{ inputMode: 'decimal' }}
                    InputProps={{ endAdornment: <InputAdornment position="end">{currency}</InputAdornment> }} />
                </Stack>
              ))}
            </Stack>
            <Typography variant="caption" sx={{ mt: 1, display: 'block', color: Math.abs(remaining) < 0.01 ? 'success.main' : 'warning.main', fontWeight: 600 }}>
              {Math.abs(remaining) < 0.01
                ? t('exact_balanced')
                : t('exact_remaining', { amount: remaining.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), currency })}
            </Typography>
          </Box>
        )}

        <TextField label={t('field_note')} value={note} onChange={(e) => setNote(e.target.value)} fullWidth
          multiline minRows={1} maxRows={2} inputProps={{ maxLength: 300 }} placeholder={t('note_placeholder')} />
      </Stack>
    </ZoomModal>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: '0.64rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'text.disabled', mb: 0.8 }}>{text}</Typography>;
}

function SplitButton({ icon, label, selected, onClick }: { icon: string; label: string; selected: boolean; onClick: () => void }) {
  return (
    <ButtonBase onClick={onClick} aria-pressed={selected}
      sx={{ flex: 1, py: 1, borderRadius: 2, border: '1px solid', gap: 0.8, flexDirection: 'row',
        borderColor: selected ? 'primary.main' : 'divider',
        bgcolor: selected ? (th) => alpha(th.palette.primary.main, 0.1) : 'transparent',
        color: selected ? 'primary.main' : 'text.secondary', fontWeight: selected ? 700 : 500 }}>
      <Icon icon={icon} width={18} />
      <Typography component="span" sx={{ fontSize: '0.84rem', fontWeight: 'inherit' }}>{label}</Typography>
    </ButtonBase>
  );
}
