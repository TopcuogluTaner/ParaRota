import { useEffect, useState } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { TextInput, Button, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { AppModal } from '@shared/components/AppModal';
import { AppDateTimePicker } from '@shared/components/AppDateTimePicker';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { Body, Display, Eyebrow } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import { formatCurrency, formatDate } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { toast } from '@shared/lib/toast';
import { useApplyPayrollRaise, useUpdateRecurringRule, useDeleteRecurringRule } from '@features/recurring/api/useRecurringRules';
import type { RecurringRuleDto } from '@shared/api/types';

interface Props {
  visible: boolean;
  rule: RecurringRuleDto | null;
  onDismiss: () => void;
}

const nextMonthFirst = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth() + 1, 1, 12, 0, 0); };

// Maaş otomatiğini yönetir (Tekrarlayanlar ekranından açılır): zam gir / gün değiştir / durdur.
// Zam, iç içe modal olmasın diye aynı modal içinde "raise" moduyla gösterilir.
export function PayrollManageModal({ visible, rule, onDismiss }: Props) {
  const { colors } = useAppTheme();
  const fmtMoney = useMoneyFmt(); // gizlilik modunda tutarlari maskeler
  const { t } = useTranslation('payroll');
  const { t: tCommon } = useTranslation('common');

  const raise = useApplyPayrollRaise();
  const update = useUpdateRecurringRule(rule?.id ?? 0);
  const remove = useDeleteRecurringRule();

  const [mode, setMode] = useState<'main' | 'raise'>('main');
  const [grossInput, setGrossInput] = useState('');
  const [effective, setEffective] = useState<Date>(nextMonthFirst());
  const [showEffective, setShowEffective] = useState(false);
  const [showDay, setShowDay] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);

  useEffect(() => {
    if (visible && rule) {
      setMode('main');
      setGrossInput(formatAmountInput(String(Math.round(rule.payrollGrossMonthly ?? 0))));
      setEffective(nextMonthFirst());
    }
  }, [visible, rule?.id]);

  if (!rule) return <AppModal visible={visible} onDismiss={onDismiss}><View /></AppModal>;

  const payday = new Date(rule.startDate).getDate();
  const gross = rule.payrollGrossMonthly ?? 0;

  const submitRaise = async () => {
    const g = parseAmount(grossInput);
    if (!(Number.isFinite(g) && g > 0)) { toast.error(tCommon('fillRequired')); return; }
    try {
      await raise.mutateAsync({ id: rule.id, gross: g, effectiveDate: effective.toISOString() });
      toast.success(t('raiseSuccess', { date: formatDate(effective) }));
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  const changeDay = async (d: Date) => {
    try {
      await update.mutateAsync({
        description: rule.description,
        nature: rule.nature,
        categoryId: rule.categoryId,
        amount: rule.amount,
        currency: rule.currency,
        frequency: rule.frequency,
        startDate: d.toISOString(),
        autoApprove: rule.autoApprove,
        isActive: rule.isActive,
        notes: rule.notes,
      });
      toast.success(t('changeDaySuccess', { date: formatDate(d) }));
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  const stop = async () => {
    try {
      await remove.mutateAsync(rule.id);
      toast.success(t('stopSuccess'));
      setStopOpen(false);
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  return (
    <AppModal
      visible={visible}
      onDismiss={onDismiss}
      eyebrow={t('automationTitle')}
      title={mode === 'raise' ? t('raiseModalTitle') : rule.description}
      subtitle={mode === 'raise' ? t('raiseModalSubtitle') : undefined}
    >
      {mode === 'main' ? (
        <>
          <View style={[styles.info, { backgroundColor: colorAlpha(colors.go, 0.07), borderColor: colorAlpha(colors.go, 0.18) }]}>
            <View style={styles.infoTop}>
              <Display size="md" style={{ color: colors.ink }}>{fmtMoney(gross)}</Display>
              <Body size="sm" tone="mute" style={{ marginBottom: 4 }}>{t('automationGrossSuffix')}</Body>
            </View>
            <Body size="sm" tone="soft">
              {t('automationPayday', { day: payday })} · {t('automationNext', { date: formatDate(new Date(rule.nextRunDate)) })}
            </Body>
          </View>

          <Button mode="contained" icon="trending-up" onPress={() => setMode('raise')} buttonColor={colors.go} textColor={colors.onAccent} style={{ borderRadius: 999 }} contentStyle={{ paddingVertical: 4 }}>
            {t('raiseCta')}
          </Button>
          <View style={styles.row}>
            <Button mode="outlined" icon="calendar-edit" onPress={() => { Keyboard.dismiss(); setShowDay(true); }} textColor={colors.sky} style={{ flex: 1 }}>
              {t('changeDayCta')}
            </Button>
            <Button mode="outlined" icon="stop-circle-outline" onPress={() => setStopOpen(true)} textColor={colors.halt} style={{ flex: 1 }}>
              {t('stopCta')}
            </Button>
          </View>
        </>
      ) : (
        <>
          <TextInput
            mode="outlined"
            label={t('raiseGrossLabel')}
            value={grossInput}
            onChangeText={(v) => setGrossInput(formatAmountInput(v, grossInput))}
            keyboardType="decimal-pad"
            left={<TextInput.Affix text="₺" />}
            contentStyle={{ fontSize: 18, fontWeight: '700' }}
          />
          <View style={{ height: 10 }} />
          <Body size="xs" tone="mute" style={{ marginBottom: 4 }}>{t('raiseEffectiveLabel')}</Body>
          <Button mode="outlined" icon="calendar" onPress={() => { Keyboard.dismiss(); setShowEffective(true); }} textColor={colors.ink}>
            {formatDate(effective)}
          </Button>
          <View style={{ height: 16 }} />
          <Button mode="contained" loading={raise.isPending} disabled={raise.isPending} onPress={submitRaise} buttonColor={colors.go} textColor={colors.onAccent}>
            {t('raiseSubmit')}
          </Button>
          <Button mode="text" onPress={() => setMode('main')} textColor={colors.inkSoft} style={{ marginTop: 2 }}>
            {tCommon('back')}
          </Button>
        </>
      )}

      <AppDateTimePicker visible={showEffective} value={effective} mode="date" onConfirm={(d) => { setShowEffective(false); setEffective(d); }} onCancel={() => setShowEffective(false)} />
      <AppDateTimePicker visible={showDay} value={new Date(rule.nextRunDate)} mode="date" onConfirm={(d) => { setShowDay(false); changeDay(d); }} onCancel={() => setShowDay(false)} />
      <ConfirmDialog visible={stopOpen} destructive title={t('stopConfirmTitle')} message={t('stopConfirmMsg')} confirmLabel={t('stopCta')} loading={remove.isPending} onConfirm={stop} onCancel={() => { if (!remove.isPending) setStopOpen(false); }} />
    </AppModal>
  );
}

const styles = StyleSheet.create({
  info: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 14 },
  infoTop: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 4 },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
});
