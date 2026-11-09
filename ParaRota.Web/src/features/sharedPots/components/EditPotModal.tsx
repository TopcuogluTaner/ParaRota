import { useEffect, useState } from 'react';
import { Button, CircularProgress, Stack, TextField } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useUpdateSharedPot } from '../api/useSharedPots';

interface Props {
  open: boolean;
  onClose: () => void;
  potId: number;
  initialName: string;
  initialNote?: string | null;
}

export function EditPotModal({ open, onClose, potId, initialName, initialNote }: Props) {
  const { t } = useTranslation(['sharedPots', 'common']);
  const update = useUpdateSharedPot();
  const [name, setName] = useState(initialName);
  const [note, setNote] = useState(initialNote ?? '');

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { if (open) { setName(initialName); setNote(initialNote ?? ''); } }, [open, initialName, initialNote]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSubmit = async () => {
    if (update.isPending) return;
    if (name.trim().length === 0) { toast.error(t('create_invalid')); return; }
    try {
      await update.mutateAsync({ id: potId, body: { name: name.trim(), note: note.trim() || null } });
      toast.success(t('updated'));
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, t('common:errorGeneric')));
    }
  };

  return (
    <ZoomModal open={open} onClose={update.isPending ? () => {} : onClose} icon="mdi:pencil-outline"
      title={t('edit_title')} maxWidth={440}
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={update.isPending}>{t('common:cancel')}</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={update.isPending}
            startIcon={update.isPending ? <CircularProgress size={16} thickness={5} /> : <Icon icon="mdi:check" width={18} />}>
            {t('common:save')}
          </Button>
        </>
      }>
      <Stack spacing={2.2}>
        <TextField label={t('field_name')} value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus inputProps={{ maxLength: 120 }} />
        <TextField label={t('field_note')} value={note} onChange={(e) => setNote(e.target.value)} fullWidth multiline minRows={1} maxRows={3} inputProps={{ maxLength: 300 }} />
      </Stack>
    </ZoomModal>
  );
}
