import { useEffect, useState } from 'react';
import { TextInput, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { AppModal } from '@shared/components/AppModal';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { toast } from '@shared/lib/toast';
import { useUpdateSharedPot } from '@features/sharedPots/api/useSharedPots';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  potId: number;
  initialName: string;
  initialNote?: string | null;
}

export function EditPotModal({ visible, onDismiss, potId, initialName, initialNote }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation('sharedPots');
  const { t: tCommon } = useTranslation('common');
  const update = useUpdateSharedPot();
  const [name, setName] = useState(initialName);
  const [note, setNote] = useState(initialNote ?? '');

  useEffect(() => { if (visible) { setName(initialName); setNote(initialNote ?? ''); } }, [visible, initialName, initialNote]);

  const submit = async () => {
    if (update.isPending || name.trim().length === 0) return;
    try { await update.mutateAsync({ id: potId, body: { name: name.trim(), note: note.trim() || null } }); toast.success(t('updated')); onDismiss(); }
    catch (err) { toast.error(getErrorMessage(err, tCommon('errorGeneric'))); }
  };

  return (
    <AppModal visible={visible} onDismiss={onDismiss} eyebrow={t('page_eyebrow')} title={t('edit_title')}>
      <TextInput mode="outlined" label={t('field_name')} value={name} onChangeText={setName} maxLength={120} />
      <TextInput mode="outlined" label={t('field_note')} value={note} onChangeText={setNote} maxLength={300} style={{ marginTop: 10 }} />
      <Button mode="contained" icon={update.isPending ? undefined : 'check'} loading={update.isPending} disabled={update.isPending} onPress={submit}
        buttonColor={colors.go} textColor={colors.onAccent} style={{ borderRadius: 999, marginTop: 16 }}>
        {tCommon('save')}
      </Button>
    </AppModal>
  );
}
