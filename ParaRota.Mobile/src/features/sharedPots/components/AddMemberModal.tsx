import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { TextInput, Button, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { AppModal } from '@shared/components/AppModal';
import { Body, Eyebrow } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { toast } from '@shared/lib/toast';
import { useAddPotMember, useSharedPotCandidatesQuery } from '@features/sharedPots/api/useSharedPots';
import type { SharedPotMemberDto } from '@shared/api/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  potId: number;
  existing: SharedPotMemberDto[];
}

export function AddMemberModal({ visible, onDismiss, potId, existing }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation('sharedPots');
  const { t: tCommon } = useTranslation('common');
  const add = useAddPotMember();
  const candidatesQ = useSharedPotCandidatesQuery(visible);

  const [name, setName] = useState('');

  useEffect(() => { if (visible) setName(''); }, [visible]);

  const linkedIds = new Set(existing.map((m) => m.linkedUserId).filter(Boolean) as number[]);
  const candidates = (candidatesQ.data ?? []).filter((c) => !linkedIds.has(c.userId));

  const addLinked = async (userId: number) => {
    if (add.isPending) return;
    try { await add.mutateAsync({ id: potId, body: { linkedUserId: userId } }); toast.success(t('member_added')); onDismiss(); }
    catch (err) { toast.error(getErrorMessage(err, tCommon('errorGeneric'))); }
  };
  const addFree = async () => {
    if (add.isPending || name.trim().length === 0) return;
    try { await add.mutateAsync({ id: potId, body: { name: name.trim() } }); toast.success(t('member_added')); onDismiss(); }
    catch (err) { toast.error(getErrorMessage(err, tCommon('errorGeneric'))); }
  };

  return (
    <AppModal visible={visible} onDismiss={onDismiss} eyebrow={t('page_eyebrow')} title={t('member_title')} subtitle={t('member_subtitle')}>
      {candidates.length > 0 && (
        <>
          <Eyebrow tone="mute" style={styles.lbl}>{t('field_householdMembers')}</Eyebrow>
          <View style={styles.chipWrap}>
            {candidates.map((c) => (
              <Pressable key={c.userId} onPress={() => addLinked(c.userId)} disabled={add.isPending} accessibilityRole="button"
                style={[styles.chip, { borderColor: colors.line }]}>
                <Icon source="account-plus-outline" size={15} color={colors.inkSoft} />
                <Body size="sm" weight="medium" style={{ color: colors.ink }}>{c.name}</Body>
              </Pressable>
            ))}
          </View>
        </>
      )}
      <Eyebrow tone="mute" style={styles.lbl}>{t('field_byName')}</Eyebrow>
      <View style={styles.row}>
        <TextInput mode="outlined" dense value={name} onChangeText={setName} placeholder={t('field_namePlaceholderMember')} maxLength={80} style={{ flex: 1 }} onSubmitEditing={addFree} />
        <Button mode="contained" icon={add.isPending ? undefined : 'plus'} loading={add.isPending} disabled={add.isPending || name.trim().length === 0}
          onPress={addFree} buttonColor={colors.go} textColor={colors.onAccent} style={{ borderRadius: 999 }}>{tCommon('add')}</Button>
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  lbl: { marginTop: 8, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
