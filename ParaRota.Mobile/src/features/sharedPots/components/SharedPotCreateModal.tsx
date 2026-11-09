import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { TextInput, Button, Icon, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { AppModal } from '@shared/components/AppModal';
import { Body, Eyebrow } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { toast } from '@shared/lib/toast';
import { useCreateSharedPot, useSharedPotCandidatesQuery } from '@features/sharedPots/api/useSharedPots';
import type { CreateSharedPotMemberInput } from '@shared/api/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onCreated: (id: number) => void;
}

export function SharedPotCreateModal({ visible, onDismiss, onCreated }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation('sharedPots');
  const { t: tCommon } = useTranslation('common');
  const create = useCreateSharedPot();
  const candidatesQ = useSharedPotCandidatesQuery(visible);

  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [freeNames, setFreeNames] = useState<string[]>(['']);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(''); setNote(''); setPicked([]); setFreeNames(['']); setAttempted(false);
  }, [visible]);

  const candidates = candidatesQ.data ?? [];
  const togglePick = (uid: number) => setPicked((p) => (p.includes(uid) ? p.filter((x) => x !== uid) : [...p, uid]));
  const setFree = (i: number, v: string) => setFreeNames((p) => p.map((n, idx) => (idx === i ? v : n)));
  const addFree = () => setFreeNames((p) => (p.length >= 30 ? p : [...p, '']));
  const removeFree = (i: number) => setFreeNames((p) => (p.length <= 1 ? [''] : p.filter((_, idx) => idx !== i)));

  const namedFree = freeNames.map((n) => n.trim()).filter((n) => n.length > 0);
  const extra = picked.length + namedFree.length;
  const valid = name.trim().length > 0 && extra >= 1;

  const submit = async () => {
    if (create.isPending) return;
    if (!valid) { setAttempted(true); toast.error(t('create_invalid')); return; }
    const members: CreateSharedPotMemberInput[] = [
      ...picked.map((uid) => ({ linkedUserId: uid })),
      ...namedFree.map((n) => ({ name: n })),
    ];
    try {
      const data = await create.mutateAsync({ name: name.trim(), note: note.trim() || null, members });
      toast.success(t('create_success'));
      onCreated(data.id);
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  return (
    <AppModal visible={visible} onDismiss={onDismiss} eyebrow={t('page_eyebrow')} title={t('create_title')} subtitle={t('create_subtitle')}>
      <TextInput mode="outlined" label={t('field_name')} value={name} onChangeText={setName} maxLength={120}
        error={attempted && name.trim().length === 0} placeholder={t('field_namePlaceholder')} />

      {candidates.length > 0 && (
        <>
          <Eyebrow tone="mute" style={styles.lbl}>{t('field_householdMembers')}</Eyebrow>
          <View style={styles.chipWrap}>
            {candidates.map((c) => {
              const on = picked.includes(c.userId);
              return (
                <Pressable key={c.userId} onPress={() => togglePick(c.userId)} accessibilityRole="button" accessibilityState={{ selected: on }}
                  style={[styles.chip, { borderColor: on ? colors.go : colors.line, backgroundColor: on ? colorAlpha(colors.go, 0.12) : 'transparent' }]}>
                  <Icon source={on ? 'check-circle' : 'account-plus-outline'} size={15} color={on ? colors.go : colors.inkSoft} />
                  <Body size="sm" weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.go : colors.ink }}>{c.name}</Body>
                </Pressable>
              );
            })}
          </View>
        </>
      )}

      <Eyebrow tone="mute" style={styles.lbl}>{t('field_otherNames')}</Eyebrow>
      {freeNames.map((n, i) => (
        <View key={i} style={styles.row}>
          <TextInput mode="outlined" dense value={n} onChangeText={(v) => setFree(i, v)} placeholder={`${t('member')} ${i + 1}`} maxLength={80} style={{ flex: 1 }} />
          <IconButton icon="close" size={18} onPress={() => removeFree(i)} />
        </View>
      ))}
      <Button mode="text" icon="plus" onPress={addFree} disabled={freeNames.length >= 30} compact style={{ alignSelf: 'flex-start' }}>{t('field_addName')}</Button>

      <Body size="xs" tone="mute" style={{ marginTop: 6 }}>{t('create_hint', { count: extra + 1 })}</Body>

      <TextInput mode="outlined" label={t('field_note')} value={note} onChangeText={setNote} maxLength={300} style={{ marginTop: 12 }} />

      <Button mode="contained" icon={create.isPending ? undefined : 'check'} loading={create.isPending} disabled={create.isPending} onPress={submit}
        buttonColor={colors.go} textColor={colors.onAccent} style={{ borderRadius: 999, marginTop: 16 }}>
        {t('create_submit')}
      </Button>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  lbl: { marginTop: 14, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
});
