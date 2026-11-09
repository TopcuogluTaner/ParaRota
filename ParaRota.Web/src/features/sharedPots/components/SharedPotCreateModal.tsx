import { useEffect, useState } from 'react';
import { Box, Button, Chip, CircularProgress, IconButton, Stack, TextField, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useCreateSharedPot, useSharedPotCandidatesQuery } from '../api/useSharedPots';
import type { CreateSharedPotMemberInput } from '@shared/api/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}

export function SharedPotCreateModal({ open, onClose, onCreated }: Props) {
  const { t } = useTranslation(['sharedPots', 'common']);
  const create = useCreateSharedPot();
  const candidatesQ = useSharedPotCandidatesQuery(open);

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [pickedUserIds, setPickedUserIds] = useState<number[]>([]);
  const [freeNames, setFreeNames] = useState<string[]>(['']);
  const [attempted, setAttempted] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setName(''); setNote(''); setPickedUserIds([]); setFreeNames(['']); setAttempted(false);
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const candidates = candidatesQ.data ?? [];
  const togglePick = (uid: number) => setPickedUserIds((p) => (p.includes(uid) ? p.filter((x) => x !== uid) : [...p, uid]));
  const setFree = (i: number, v: string) => setFreeNames((p) => p.map((n, idx) => (idx === i ? v : n)));
  const addFree = () => setFreeNames((p) => (p.length >= 30 ? p : [...p, '']));
  const removeFree = (i: number) => setFreeNames((p) => (p.length <= 1 ? [''] : p.filter((_, idx) => idx !== i)));

  const namedFree = freeNames.map((n) => n.trim()).filter((n) => n.length > 0);
  const extraCount = pickedUserIds.length + namedFree.length;
  const valid = name.trim().length > 0 && extraCount >= 1;

  const handleSubmit = async () => {
    if (create.isPending) return;
    if (!valid) { setAttempted(true); toast.error(t('create_invalid')); return; }
    const members: CreateSharedPotMemberInput[] = [
      ...pickedUserIds.map((uid) => ({ linkedUserId: uid })),
      ...namedFree.map((n) => ({ name: n })),
    ];
    try {
      const data = await create.mutateAsync({ name: name.trim(), note: note.trim() || null, members });
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
      icon="mdi:account-cash-outline"
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
      <Stack spacing={2.4}>
        <TextField label={t('field_name')} value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus
          error={attempted && name.trim().length === 0} inputProps={{ maxLength: 120 }} placeholder={t('field_namePlaceholder')} />

        {/* Aile üyeleri */}
        {candidates.length > 0 && (
          <Box>
            <FieldLabel text={t('field_householdMembers')} />
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {candidates.map((c) => {
                const on = pickedUserIds.includes(c.userId);
                return (
                  <Chip key={c.userId} label={c.name} onClick={() => togglePick(c.userId)}
                    icon={<Icon icon={on ? 'mdi:check-circle' : 'mdi:account-plus-outline'} width={16} />}
                    variant={on ? 'filled' : 'outlined'} color={on ? 'primary' : 'default'}
                    sx={{ fontWeight: on ? 700 : 500 }} />
                );
              })}
            </Stack>
          </Box>
        )}

        {/* Serbest isimler */}
        <Box>
          <FieldLabel text={t('field_otherNames')} />
          <Stack spacing={1}>
            {freeNames.map((n, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <TextField value={n} onChange={(e) => setFree(i, e.target.value)} placeholder={`${t('member')} ${i + 1}`}
                  size="small" sx={{ flex: 1 }} inputProps={{ maxLength: 80 }} />
                <IconButton size="small" onClick={() => removeFree(i)} aria-label={t('common:delete')}>
                  <Icon icon="mdi:close" width={16} />
                </IconButton>
              </Stack>
            ))}
          </Stack>
          <Button onClick={addFree} startIcon={<Icon icon="mdi:plus" width={16} />} size="small" sx={{ mt: 1 }} disabled={freeNames.length >= 30}>
            {t('field_addName')}
          </Button>
        </Box>

        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('create_hint', { count: extraCount + 1 })}
        </Typography>

        <TextField label={t('field_note')} value={note} onChange={(e) => setNote(e.target.value)} fullWidth
          multiline minRows={1} maxRows={3} inputProps={{ maxLength: 300 }} placeholder={t('note_placeholder')} />
      </Stack>
    </ZoomModal>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: '0.64rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'text.disabled', mb: 0.8 }}>{text}</Typography>;
}
