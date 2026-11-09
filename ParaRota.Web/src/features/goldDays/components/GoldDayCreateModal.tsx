import { useEffect, useState } from 'react';
import { Box, Button, ButtonBase, CircularProgress, IconButton, InputAdornment, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { parseAmount } from '@shared/lib/parseAmount';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useCreateGoldDay } from '../api/useGoldDays';
import type { GoldDayFrequency, GoldDayType } from '@shared/api/types';

const GOLD_UNITS = ['ceyrek', 'gram', 'yarim', 'tam', 'cumhuriyet'] as const;
const CURRENCIES = ['TRY', 'USD', 'EUR'] as const;
const FREQS: GoldDayFrequency[] = ['monthly', 'weekly', 'biweekly'];

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function GoldDayCreateModal({ open, onClose, onCreated }: Props) {
  const { t } = useTranslation(['goldDays', 'common']);
  const create = useCreateGoldDay();

  const [name, setName] = useState('');
  const [type, setType] = useState<GoldDayType>('gold');
  const [unit, setUnit] = useState<string>('ceyrek');
  const [amount, setAmount] = useState('1');
  const [frequency, setFrequency] = useState<GoldDayFrequency>('monthly');
  const [startDate, setStartDate] = useState(todayIso());
  const [members, setMembers] = useState<{ name: string; isSelf: boolean }[]>([
    { name: '', isSelf: true },
    { name: '', isSelf: false },
    { name: '', isSelf: false },
  ]);
  const [attempted, setAttempted] = useState(false);

  // Modal her açıldığında formu sıfırla (idiyomatik open→state senkronu).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setName(''); setType('gold'); setUnit('ceyrek'); setAmount('1'); setFrequency('monthly');
    setStartDate(todayIso());
    setMembers([{ name: '', isSelf: true }, { name: '', isSelf: false }, { name: '', isSelf: false }]);
    setAttempted(false);
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const switchType = (next: GoldDayType) => {
    setType(next);
    setUnit(next === 'gold' ? 'ceyrek' : 'TRY');
    if (next === 'currency') setAmount((a) => (a === '1' ? '500' : a));
  };

  const setMemberName = (i: number, v: string) => setMembers((p) => p.map((m, idx) => (idx === i ? { ...m, name: v } : m)));
  const setSelf = (i: number) => setMembers((p) => p.map((m, idx) => ({ ...m, isSelf: idx === i })));
  const addMember = () => setMembers((p) => (p.length >= 50 ? p : [...p, { name: '', isSelf: false }]));
  const removeMember = (i: number) => setMembers((p) => {
    if (p.length <= 2) return p;
    const next = p.filter((_, idx) => idx !== i);
    if (!next.some((m) => m.isSelf)) next[0].isSelf = true;
    return next;
  });

  const amountNum = parseAmount(amount);
  const named = members.filter((m) => m.name.trim().length > 0);
  const valid = name.trim().length > 0 && Number.isFinite(amountNum) && amountNum > 0 && named.length >= 2;

  const handleSubmit = async () => {
    if (create.isPending) return;
    if (!valid) { setAttempted(true); toast.error(t('create_invalid')); return; }
    try {
      const data = await create.mutateAsync({
        name: name.trim(),
        contributionType: type,
        contributionUnit: unit,
        contributionAmount: amountNum,
        frequency,
        startDate,
        members: named.map((m) => ({ name: m.name.trim(), isSelf: m.isSelf })),
      });
      toast.success(t('create_success'));
      onCreated(data.id);
    } catch (err) {
      toast.error(getErrorMessage(err, t('common:errorGeneric')));
    }
  };

  return (
    <ZoomModal
      open={open}
      onClose={create.isPending ? () => {} : onClose}
      icon="mdi:gold"
      title={t('create_title')}
      subtitle={t('create_subtitle')}
      maxWidth={560}
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={create.isPending}>{t('common:cancel')}</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={create.isPending}
            startIcon={create.isPending ? <CircularProgress size={16} thickness={5} /> : <Icon icon="mdi:check" width={18} />}>
            {t('create_submit')}
          </Button>
        </>
      }
    >
      <Stack spacing={2.2}>
        <TextField label={t('field_name')} value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus
          error={attempted && name.trim().length === 0} inputProps={{ maxLength: 120 }} placeholder={t('field_namePlaceholder')} />

        {/* Tür */}
        <Box>
          <FieldLabel text={t('field_type')} />
          <Stack direction="row" spacing={1.2}>
            <TypeButton icon="mdi:gold" label={t('type_gold')} selected={type === 'gold'} onClick={() => switchType('gold')} />
            <TypeButton icon="mdi:cash-multiple" label={t('type_currency')} selected={type === 'currency'} onClick={() => switchType('currency')} />
          </Stack>
        </Box>

        {/* Katkı: tutar + birim */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.6} alignItems="flex-start">
          <TextField label={t('field_amount')} value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, ''))}
            error={attempted && !(amountNum > 0)} sx={{ flex: 1 }} inputProps={{ inputMode: 'decimal' }}
            InputProps={type === 'currency' ? { endAdornment: <InputAdornment position="end">{unit}</InputAdornment> } : undefined} />
          {type === 'gold' ? (
            <TextField select label={t('field_unit')} value={unit} onChange={(e) => setUnit(e.target.value)} sx={{ minWidth: 130 }}>
              {GOLD_UNITS.map((u) => <MenuItem key={u} value={u}>{t(`unit_${u}`)}</MenuItem>)}
            </TextField>
          ) : (
            <TextField select label={t('field_currency')} value={unit} onChange={(e) => setUnit(e.target.value)} sx={{ minWidth: 110 }}>
              {CURRENCIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          )}
        </Stack>

        {/* Sıklık + başlangıç */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.6}>
          <Box sx={{ flex: 1 }}>
            <FieldLabel text={t('field_frequency')} />
            <Box sx={{ display: 'flex', p: 0.4, borderRadius: 999, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
              {FREQS.map((f) => {
                const on = frequency === f;
                return (
                  <ButtonBase key={f} onClick={() => setFrequency(f)} aria-pressed={on}
                    sx={{ flex: 1, py: 0.8, borderRadius: 999, fontSize: '0.8rem', fontWeight: on ? 700 : 500, bgcolor: on ? 'text.primary' : 'transparent', color: on ? 'background.paper' : 'text.secondary', transition: 'all .15s' }}>
                    {t(`freq_${f}`)}
                  </ButtonBase>
                );
              })}
            </Box>
          </Box>
          <TextField label={t('field_startDate')} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            sx={{ minWidth: 160 }} InputLabelProps={{ shrink: true }} />
        </Stack>

        {/* Üyeler */}
        <Box>
          <FieldLabel text={t('field_members')} />
          <Stack spacing={1}>
            {members.map((m, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <TextField value={m.name} onChange={(e) => setMemberName(i, e.target.value)} placeholder={`${t('member')} ${i + 1}`}
                  size="small" sx={{ flex: 1 }} inputProps={{ maxLength: 80 }} />
                <ButtonBase onClick={() => setSelf(i)} aria-pressed={m.isSelf}
                  sx={{ px: 1.2, py: 0.7, borderRadius: 999, border: '1px solid', borderColor: m.isSelf ? 'success.main' : 'divider',
                    bgcolor: m.isSelf ? (th) => alpha(th.palette.success.main, 0.12) : 'transparent', color: m.isSelf ? 'success.main' : 'text.secondary',
                    fontSize: '0.74rem', fontWeight: m.isSelf ? 700 : 500 }}>
                  {t('me')}
                </ButtonBase>
                <IconButton size="small" onClick={() => removeMember(i)} disabled={members.length <= 2} aria-label={t('common:delete')}>
                  <Icon icon="mdi:close" width={16} />
                </IconButton>
              </Stack>
            ))}
          </Stack>
          <Button onClick={addMember} startIcon={<Icon icon="mdi:plus" width={16} />} size="small" sx={{ mt: 1 }} disabled={members.length >= 50}>
            {t('field_addMember')}
          </Button>
        </Box>
      </Stack>
    </ZoomModal>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: '0.64rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'text.disabled', mb: 0.8 }}>{text}</Typography>;
}

function TypeButton({ icon, label, selected, onClick }: { icon: string; label: string; selected: boolean; onClick: () => void }) {
  return (
    <ButtonBase onClick={onClick} aria-pressed={selected}
      sx={{ flex: 1, py: 1.1, borderRadius: 2, border: '1px solid', borderColor: selected ? 'warning.main' : 'divider',
        bgcolor: selected ? (th) => alpha(th.palette.warning.main, 0.1) : 'transparent', color: selected ? 'warning.main' : 'text.secondary',
        display: 'flex', flexDirection: 'column', gap: 0.4, fontWeight: selected ? 700 : 500, transition: 'all .15s' }}>
      <Icon icon={icon} width={22} />
      <Typography component="span" sx={{ fontSize: '0.82rem', fontWeight: 'inherit' }}>{label}</Typography>
    </ButtonBase>
  );
}
