import { useEffect, useState } from 'react';
import { Button, CircularProgress, InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { parseAmount } from '@shared/lib/parseAmount';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useAddSettlement } from '../api/useSharedPots';
import type { SharedPotMemberDto } from '@shared/api/types';

export interface SettlePrefill {
  fromMemberId: number;
  toMemberId: number;
  amount: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  potId: number;
  members: SharedPotMemberDto[];
  currency: string;
  prefill?: SettlePrefill | null;
}

function todayIso() { return new Date().toISOString().slice(0, 10); }

export function SettleModal({ open, onClose, potId, members, currency, prefill }: Props) {
  const { t } = useTranslation(['sharedPots', 'common']);
  const add = useAddSettlement();

  const [fromId, setFromId] = useState<number>(0);
  const [toId, setToId] = useState<number>(0);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayIso());
  const [note, setNote] = useState('');
  const [attempted, setAttempted] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setFromId(prefill?.fromMemberId ?? members[0]?.id ?? 0);
    setToId(prefill?.toMemberId ?? members[1]?.id ?? 0);
    setAmount(prefill ? String(prefill.amount) : '');
    setDate(todayIso()); setNote(''); setAttempted(false);
  }, [open, prefill, members]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const amountNum = parseAmount(amount);
  const valid = fromId > 0 && toId > 0 && fromId !== toId && amountNum > 0;

  const handleSubmit = async () => {
    if (add.isPending) return;
    if (!valid) { setAttempted(true); toast.error(t('settle_invalid')); return; }
    try {
      await add.mutateAsync({ id: potId, body: { fromMemberId: fromId, toMemberId: toId, amount: amountNum, settledOn: date, note: note.trim() || null } });
      toast.success(t('settle_added'));
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, t('common:errorGeneric')));
    }
  };

  return (
    <ZoomModal
      open={open}
      onClose={add.isPending ? () => {} : onClose}
      icon="mdi:cash-check"
      title={t('settle_title')}
      subtitle={t('settle_subtitle')}
      maxWidth={480}
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={add.isPending}>{t('common:cancel')}</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={add.isPending}
            startIcon={add.isPending ? <CircularProgress size={16} thickness={5} /> : <Icon icon="mdi:check" width={18} />}>
            {t('settle_submit')}
          </Button>
        </>
      }
    >
      <Stack spacing={2.2}>
        <Stack direction="row" spacing={1.2} alignItems="center">
          <TextField select label={t('field_from')} value={fromId || ''} onChange={(e) => setFromId(Number(e.target.value))} sx={{ flex: 1 }}
            error={attempted && (!fromId || fromId === toId)}>
            {members.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}{m.isSelf ? ` (${t('you')})` : ''}</MenuItem>)}
          </TextField>
          <Icon icon="mdi:arrow-right" width={22} style={{ flexShrink: 0, opacity: 0.5 }} />
          <TextField select label={t('field_to')} value={toId || ''} onChange={(e) => setToId(Number(e.target.value))} sx={{ flex: 1 }}
            error={attempted && (!toId || fromId === toId)}>
            {members.map((m) => <MenuItem key={m.id} value={m.id}>{m.name}{m.isSelf ? ` (${t('you')})` : ''}</MenuItem>)}
          </TextField>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.6}>
          <TextField label={t('field_amount')} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            error={attempted && !(amountNum > 0)} sx={{ flex: 1 }} inputProps={{ inputMode: 'decimal' }}
            InputProps={{ endAdornment: <InputAdornment position="end">{currency}</InputAdornment> }} />
          <TextField label={t('field_date')} type="date" value={date} onChange={(e) => setDate(e.target.value)}
            sx={{ minWidth: 160 }} InputLabelProps={{ shrink: true }} />
        </Stack>

        <TextField label={t('field_note')} value={note} onChange={(e) => setNote(e.target.value)} fullWidth
          inputProps={{ maxLength: 300 }} placeholder={t('note_placeholder')} />
      </Stack>
    </ZoomModal>
  );
}
