import { useEffect, useState } from 'react';
import { Box, Button, Chip, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useAddPotMember, useSharedPotCandidatesQuery } from '../api/useSharedPots';
import type { SharedPotMemberDto } from '@shared/api/types';

interface Props {
  open: boolean;
  onClose: () => void;
  potId: number;
  existing: SharedPotMemberDto[];
}

export function AddMemberModal({ open, onClose, potId, existing }: Props) {
  const { t } = useTranslation(['sharedPots', 'common']);
  const add = useAddPotMember();
  const candidatesQ = useSharedPotCandidatesQuery(open);

  const [name, setName] = useState('');
  const [attempted, setAttempted] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { if (open) { setName(''); setAttempted(false); } }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const linkedIds = new Set(existing.map((m) => m.linkedUserId).filter(Boolean) as number[]);
  const candidates = (candidatesQ.data ?? []).filter((c) => !linkedIds.has(c.userId));

  const addLinked = async (userId: number) => {
    if (add.isPending) return;
    try { await add.mutateAsync({ id: potId, body: { linkedUserId: userId } }); toast.success(t('member_added')); onClose(); }
    catch (err) { toast.error(getErrorMessage(err, t('common:errorGeneric'))); }
  };

  const addFree = async () => {
    if (add.isPending) return;
    if (name.trim().length === 0) { setAttempted(true); return; }
    try { await add.mutateAsync({ id: potId, body: { name: name.trim() } }); toast.success(t('member_added')); onClose(); }
    catch (err) { toast.error(getErrorMessage(err, t('common:errorGeneric'))); }
  };

  return (
    <ZoomModal open={open} onClose={add.isPending ? () => {} : onClose} icon="mdi:account-plus-outline"
      title={t('member_title')} subtitle={t('member_subtitle')} maxWidth={440}
      actions={<Button variant="text" onClick={onClose} disabled={add.isPending}>{t('common:close')}</Button>}>
      <Stack spacing={2.4}>
        {candidates.length > 0 && (
          <Box>
            <FieldLabel text={t('field_householdMembers')} />
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
              {candidates.map((c) => (
                <Chip key={c.userId} label={c.name} onClick={() => addLinked(c.userId)} variant="outlined"
                  icon={<Icon icon="mdi:account-plus-outline" width={16} />} disabled={add.isPending} sx={{ cursor: 'pointer' }} />
              ))}
            </Stack>
          </Box>
        )}
        <Box>
          <FieldLabel text={t('field_byName')} />
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder={t('field_namePlaceholderMember')}
              size="small" sx={{ flex: 1 }} inputProps={{ maxLength: 80 }} error={attempted && name.trim().length === 0}
              onKeyDown={(e) => { if (e.key === 'Enter') void addFree(); }} />
            <Button variant="contained" onClick={addFree} disabled={add.isPending}
              startIcon={add.isPending ? <CircularProgress size={15} thickness={5} /> : <Icon icon="mdi:plus" width={16} />}>
              {t('common:add')}
            </Button>
          </Stack>
        </Box>
      </Stack>
    </ZoomModal>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: '0.64rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'text.disabled', mb: 0.8 }}>{text}</Typography>;
}
