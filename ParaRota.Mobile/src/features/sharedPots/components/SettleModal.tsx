import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { TextInput, Button, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { AppModal } from '@shared/components/AppModal';
import { AppDateTimePicker } from '@shared/components/AppDateTimePicker';
import { Body, Eyebrow } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import { formatDate } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { toast } from '@shared/lib/toast';
import { useAddSettlement } from '@features/sharedPots/api/useSharedPots';
import type { SharedPotMemberDto } from '@shared/api/types';

export interface SettlePrefill { fromMemberId: number; toMemberId: number; amount: number; }

interface Props {
  visible: boolean;
  onDismiss: () => void;
  potId: number;
  members: SharedPotMemberDto[];
  currency: string;
  prefill?: SettlePrefill | null;
}

export function SettleModal({ visible, onDismiss, potId, members, currency, prefill }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation('sharedPots');
  const { t: tCommon } = useTranslation('common');
  const add = useAddSettlement();

  const [fromId, setFromId] = useState(0);
  const [toId, setToId] = useState(0);
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [note, setNote] = useState('');
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setFromId(prefill?.fromMemberId ?? members[0]?.id ?? 0);
    setToId(prefill?.toMemberId ?? members[1]?.id ?? 0);
    setAmount(prefill ? formatAmountInput(String(prefill.amount)) : '');
    setDate(new Date()); setNote(''); setAttempted(false);
  }, [visible, prefill, members]);

  const amountNum = parseAmount(amount);
  const valid = fromId > 0 && toId > 0 && fromId !== toId && amountNum > 0;

  const submit = async () => {
    if (add.isPending) return;
    if (!valid) { setAttempted(true); toast.error(t('settle_invalid')); return; }
    try {
      await add.mutateAsync({ id: potId, body: { fromMemberId: fromId, toMemberId: toId, amount: amountNum, settledOn: date.toISOString(), note: note.trim() || null } });
      toast.success(t('settle_added'));
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  const memberChips = (selected: number, onPick: (id: number) => void, tint: string) => (
    <View style={styles.chipWrap}>
      {members.map((m) => {
        const on = selected === m.id;
        return (
          <Pressable key={m.id} onPress={() => onPick(m.id)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={[styles.chip, { borderColor: on ? tint : colors.line, backgroundColor: on ? colorAlpha(tint, 0.12) : 'transparent' }]}>
            <Body size="sm" weight={on ? 'bold' : 'medium'} style={{ color: on ? tint : colors.ink }}>{m.name}{m.isSelf ? ` · ${t('you')}` : ''}</Body>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <AppModal visible={visible} onDismiss={onDismiss} eyebrow={t('page_eyebrow')} title={t('settle_title')} subtitle={t('settle_subtitle')}>
      <Eyebrow tone="mute" style={styles.lbl}>{t('field_from')}</Eyebrow>
      {memberChips(fromId, setFromId, colors.halt)}
      <View style={{ alignItems: 'center', marginVertical: 4 }}><Icon source="arrow-down" size={20} color={colors.inkMute} /></View>
      <Eyebrow tone="mute" style={{ marginBottom: 8 }}>{t('field_to')}</Eyebrow>
      {memberChips(toId, setToId, colors.go)}

      <View style={[styles.row, { marginTop: 14 }]}>
        <TextInput mode="outlined" label={t('field_amount')} value={amount} onChangeText={(v) => setAmount(formatAmountInput(v, amount))}
          keyboardType="decimal-pad" error={attempted && !(amountNum > 0)} right={<TextInput.Affix text={currency} />} style={{ flex: 1 }} />
        <Pressable onPress={() => setShowDate(true)} style={{ flex: 1 }}>
          <View pointerEvents="none">
            <TextInput mode="outlined" label={t('field_date')} value={formatDate(date)} editable={false} right={<TextInput.Icon icon="calendar-outline" />} />
          </View>
        </Pressable>
      </View>
      <AppDateTimePicker visible={showDate} value={date} mode="date" onConfirm={(d) => { setDate(d); setShowDate(false); }} onCancel={() => setShowDate(false)} />

      <TextInput mode="outlined" label={t('field_note')} value={note} onChangeText={setNote} maxLength={300} style={{ marginTop: 10 }} />

      <Button mode="contained" icon={add.isPending ? undefined : 'check'} loading={add.isPending} disabled={add.isPending} onPress={submit}
        buttonColor={colors.go} textColor={colors.onAccent} style={{ borderRadius: 999, marginTop: 16 }}>
        {t('settle_submit')}
      </Button>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  lbl: { marginTop: 6, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
});
