import { useEffect, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable } from 'react-native';
import { Button, TextInput, Switch, HelperText } from 'react-native-paper';
import { AppDateTimePicker as DateTimePicker } from '@shared/components/AppDateTimePicker';
import { useTranslation } from 'react-i18next';
import { AppModal } from '@shared/components/AppModal';
import { Body, Eyebrow, Money } from '@shared/components/Typography';
import { useAddDebtPayment } from '@features/debts/api/useDebts';
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { formatDate } from '@shared/lib/dateFormat';
import type { DebtDto, DebtListItemDto } from '@shared/api/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  debt: DebtDto | DebtListItemDto;
}

export function DebtPaymentModal({ visible, onDismiss, debt }: Props) {
  const { t } = useTranslation('debts');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const addPayment = useAddDebtPayment(debt.id);

  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [createLinkedTransaction, setCreateLinked] = useState(true);
  const [showDate, setShowDate] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount('');
      setPaymentDate(new Date());
      setNotes('');
      setCreateLinked(true);
      setAttempted(false);
    }
  }, [visible, debt.id]);

  const amt = parseAmount(amount);
  const amtValid = Number.isFinite(amt) && amt > 0;
  const amtOver = amtValid && amt > debt.remainingAmount;
  const canSubmit = amtValid && !amtOver;

  const submit = async () => {
    if (!canSubmit) {
      setAttempted(true);
      toast.error(amtOver ? t('payment_invalidAmount') : tCommon('fillRequired'));
      return;
    }
    try {
      await addPayment.mutateAsync({
        amount: amt,
        paymentDate: paymentDate.toISOString(),
        notes: notes || undefined,
        createLinkedTransaction,
      });
      toast.success(t('payment_toastSuccess'));
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  return (
    <AppModal
      visible={visible}
      onDismiss={onDismiss}
      eyebrow={t('actions_addPayment')}
      title={t('payment_modalTitle')}
      subtitle={t('payment_modalSubtitle')}
    >
          <View style={[styles.summary, { backgroundColor: colors.paper, borderColor: colors.line }]}>
            <Body weight="bold">{debt.title}</Body>
            <View style={styles.row}>
              <Eyebrow tone="mute">{t('card_remaining')}</Eyebrow>
              <View style={{ flex: 1 }} />
              <Money size="md" tone="ink">{debt.remainingAmount} {debt.currency}</Money>
            </View>
          </View>
          <View>
            <TextInput mode="outlined" label={t('payment_amountLabel')} value={amount} onChangeText={(v) => setAmount(formatAmountInput(v, amount))} keyboardType="decimal-pad" error={amtOver || (attempted && !amtValid)} />
            <HelperText type="error" visible={amtOver}>{t('payment_invalidAmount')}</HelperText>
            <HelperText type="error" visible={attempted && !amtValid}>{tCommon('required')}</HelperText>
          </View>
          <Pressable onPress={() => setShowDate(true)}>
            <View pointerEvents="none">
              <TextInput mode="outlined" label={t('payment_dateLabel')} value={formatDate(paymentDate)} editable={false} right={<TextInput.Icon icon="calendar-outline" />} />
            </View>
          </Pressable>
          <DateTimePicker
            visible={showDate}
            value={paymentDate}
            mode="date"
            onConfirm={(d) => { setPaymentDate(d); setShowDate(false); }}
            onCancel={() => setShowDate(false)}
          />
          <TextInput mode="outlined" label={t('payment_notesLabel')} value={notes} onChangeText={setNotes} multiline numberOfLines={2} />
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Body weight="bold">{t('payment_createTransactionLabel')}</Body>
              <Body size="xs" tone="mute">{debt.kind === 'payable' ? t('payment_createTransactionHint_payable') : t('payment_createTransactionHint_receivable')}</Body>
            </View>
            <Switch value={createLinkedTransaction} onValueChange={setCreateLinked} />
          </View>
          <Button mode="contained" loading={addPayment.isPending} disabled={addPayment.isPending} onPress={submit} buttonColor={colors.go} textColor={colors.onAccent}>
            {t('payment_submit')}
          </Button>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  summary: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
