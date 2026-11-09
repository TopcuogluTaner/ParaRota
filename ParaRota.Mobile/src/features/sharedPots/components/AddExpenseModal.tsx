import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { TextInput, Button, SegmentedButtons, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { AppModal } from '@shared/components/AppModal';
import { AppDateTimePicker } from '@shared/components/AppDateTimePicker';
import { Body, Eyebrow } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import { formatCurrency, formatDate } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { toast } from '@shared/lib/toast';
import { useAddExpense } from '@features/sharedPots/api/useSharedPots';
import type { ExpenseSplitType, SharedPotMemberDto } from '@shared/api/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  potId: number;
  members: SharedPotMemberDto[];
  currency: string;
  defaultPayerId?: number | null;
}

export function AddExpenseModal({ visible, onDismiss, potId, members, currency, defaultPayerId }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation('sharedPots');
  const { t: tCommon } = useTranslation('common');
  const add = useAddExpense();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState(0);
  const [date, setDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [splitType, setSplitType] = useState<ExpenseSplitType>('equal');
  const [participants, setParticipants] = useState<number[]>([]);
  const [exact, setExact] = useState<Record<number, string>>({});
  const [note, setNote] = useState('');
  const [customize, setCustomize] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setDescription(''); setAmount(''); setDate(new Date()); setSplitType('equal');
    setPayerId(defaultPayerId ?? members[0]?.id ?? 0);
    setParticipants(members.map((m) => m.id));
    setExact({}); setNote(''); setCustomize(false); setAttempted(false);
  }, [visible, members, defaultPayerId]);

  const amountNum = parseAmount(amount);
  const toggleParticipant = (id: number) => setParticipants((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const setExactAmount = (id: number, v: string) => setExact((p) => ({ ...p, [id]: formatAmountInput(v, p[id] ?? '') }));
  const exactSum = useMemo(() => members.reduce((acc, m) => acc + (parseAmount(exact[m.id] ?? '') || 0), 0), [exact, members]);

  const valid = useMemo(() => {
    if (description.trim().length === 0 || !(amountNum > 0) || !payerId) return false;
    if (splitType === 'equal') return participants.length >= 1;
    return Math.abs(exactSum - amountNum) < 0.01 && members.some((m) => (parseAmount(exact[m.id] ?? '') || 0) > 0);
  }, [description, amountNum, payerId, splitType, participants, exactSum, exact, members]);

  const submit = async () => {
    if (add.isPending) return;
    if (!valid) { setAttempted(true); toast.error(t('expense_invalid')); return; }
    try {
      await add.mutateAsync({
        id: potId,
        body: {
          description: description.trim(), amount: amountNum, expenseDate: date.toISOString(),
          payerMemberId: payerId, splitType,
          participantMemberIds: splitType === 'equal' ? participants : [],
          exactShares: splitType === 'exact'
            ? members.map((m) => ({ memberId: m.id, shareAmount: parseAmount(exact[m.id] ?? '') || 0 })).filter((s) => s.shareAmount > 0)
            : null,
          note: note.trim() || null,
        },
      });
      toast.success(t('expense_added'));
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  const remaining = amountNum - exactSum;

  return (
    <AppModal visible={visible} onDismiss={onDismiss} eyebrow={t('page_eyebrow')} title={t('expense_title')} subtitle={t('expense_subtitle')}>
      <TextInput mode="outlined" label={t('field_description')} value={description} onChangeText={setDescription} maxLength={160} autoFocus
        error={attempted && description.trim().length === 0} placeholder={t('field_descriptionPlaceholder')} />

      <View style={[styles.row, { marginTop: 10 }]}>
        <TextInput mode="outlined" label={t('field_amount')} value={amount} onChangeText={(v) => setAmount(formatAmountInput(v, amount))}
          keyboardType="decimal-pad" error={attempted && !(amountNum > 0)} right={<TextInput.Affix text={currency} />} style={{ flex: 1 }} />
        <Pressable onPress={() => setShowDate(true)} style={{ flex: 1 }}>
          <View pointerEvents="none">
            <TextInput mode="outlined" label={t('field_date')} value={formatDate(date)} editable={false} right={<TextInput.Icon icon="calendar-outline" />} />
          </View>
        </Pressable>
      </View>
      <AppDateTimePicker visible={showDate} value={date} mode="date" onConfirm={(d) => { setDate(d); setShowDate(false); }} onCancel={() => setShowDate(false)} />

      {/* Ödeyen */}
      <Eyebrow tone="mute" style={styles.lbl}>{t('field_payer')}</Eyebrow>
      <View style={styles.chipWrap}>
        {members.map((m) => {
          const on = payerId === m.id;
          return (
            <Pressable key={m.id} onPress={() => setPayerId(m.id)} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={[styles.chip, { borderColor: on ? colors.sky : colors.line, backgroundColor: on ? colorAlpha(colors.sky, 0.12) : 'transparent' }]}>
              <Body size="sm" weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.sky : colors.ink }}>{m.name}{m.isSelf ? ` · ${t('you')}` : ''}</Body>
            </Pressable>
          );
        })}
      </View>

      {/* Bölüşüm — varsayılan eşit/herkes; sade tutmak için ayrıntı "Özelleştir" arkasında */}
      {!customize ? (
        <Pressable onPress={() => setCustomize(true)} accessibilityRole="button" accessibilityLabel={t('customize')}
          style={[styles.splitSummary, { borderColor: colors.line, backgroundColor: colors.bgAlt }]}>
          <View style={[styles.splitIcon, { backgroundColor: colorAlpha(colors.go, 0.14) }]}>
            <Icon source="equal" size={16} color={colors.go} />
          </View>
          <View style={{ flex: 1 }}>
            <Body size="sm" weight="bold">{t('split_equal')} · {t('memberCount', { count: participants.length })}</Body>
            {amountNum > 0 ? <Body size="xs" tone="mute">{t('per_person', { amount: formatCurrency(amountNum / Math.max(participants.length, 1)) })}</Body> : null}
          </View>
          <Body size="xs" weight="bold" style={{ color: colors.sky }}>{t('customize')}</Body>
        </Pressable>
      ) : (
        <>
      <Eyebrow tone="mute" style={styles.lbl}>{t('field_split')}</Eyebrow>
      <SegmentedButtons value={splitType} onValueChange={(v) => setSplitType(v as ExpenseSplitType)} density="small"
        buttons={[{ value: 'equal', label: t('split_equal'), icon: 'equal' }, { value: 'exact', label: t('split_exact'), icon: 'tune-variant' }]} />

      {splitType === 'equal' ? (
        <View style={{ marginTop: 10 }}>
          {members.map((m) => {
            const on = participants.includes(m.id);
            const each = on && participants.length > 0 ? amountNum / participants.length : 0;
            return (
              <Pressable key={m.id} onPress={() => toggleParticipant(m.id)} style={styles.partRow}
                accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={m.name}>
                <Icon source={on ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={on ? colors.go : colors.inkMute} />
                <Body size="sm" style={{ flex: 1, color: colors.ink }}>{m.name}{m.isSelf ? ` · ${t('you')}` : ''}</Body>
                {on && amountNum > 0 ? <Body size="xs" tone="mute">{formatCurrency(each)}</Body> : null}
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ marginTop: 10 }}>
          {members.map((m) => (
            <View key={m.id} style={styles.exactRow}>
              <Body size="sm" style={{ flex: 1, color: colors.ink }}>{m.name}{m.isSelf ? ` · ${t('you')}` : ''}</Body>
              <TextInput mode="outlined" dense value={exact[m.id] ?? ''} onChangeText={(v) => setExactAmount(m.id, v)} keyboardType="decimal-pad"
                right={<TextInput.Affix text={currency} />} style={{ width: 140 }} />
            </View>
          ))}
          <Body size="xs" weight="bold" style={{ marginTop: 6, color: Math.abs(remaining) < 0.01 ? colors.go : colors.way }}>
            {Math.abs(remaining) < 0.01 ? t('exact_balanced') : t('exact_remaining', { amount: formatCurrency(remaining).replace(/[^\d.,-]/g, ''), currency })}
          </Body>
        </View>
      )}
        </>
      )}

      <TextInput mode="outlined" label={t('field_note')} value={note} onChangeText={setNote} maxLength={300} style={{ marginTop: 12 }} />

      <Button mode="contained" icon={add.isPending ? undefined : 'check'} loading={add.isPending} disabled={add.isPending} onPress={submit}
        buttonColor={colors.go} textColor={colors.onAccent} style={{ borderRadius: 999, marginTop: 16 }}>
        {t('expense_submit')}
      </Button>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  lbl: { marginTop: 14, marginBottom: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  partRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  exactRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  splitSummary: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  splitIcon: { width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
});
