import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { TextInput, Button, ProgressBar } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { AppModal } from '@shared/components/AppModal';
import { Body, Eyebrow, Money } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import { formatCurrency } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { toast } from '@shared/lib/toast';
import { useUpdateGoal } from '@features/goals/api/useGoals';
import type { GoalDto } from '@shared/api/types';

interface Props {
  visible: boolean;
  goal: GoalDto | null;
  onDismiss: () => void;
  onEdit: () => void;
}

const QUICK = [100, 500, 1000, 5000];

// Hedefe tek tıkla hızlı birikim ekleme (tüm düzenleme formunu açmadan). current += tutar.
export function QuickContributeModal({ visible, goal, onDismiss, onEdit }: Props) {
  const { colors } = useAppTheme();
  const fmtMoney = useMoneyFmt(); // gizlilik modunda tutarlari maskeler
  const { t } = useTranslation('pages');
  const { t: tCommon } = useTranslation('common');
  const update = useUpdateGoal(goal?.id ?? 0);
  const [amount, setAmount] = useState('');

  useEffect(() => { if (visible) setAmount(''); }, [visible, goal?.id]);

  if (!goal) return <AppModal visible={visible} onDismiss={onDismiss}><View /></AppModal>;

  const add = parseAmount(amount);
  const valid = Number.isFinite(add) && add > 0;
  const preview = Math.max(0, goal.current + (valid ? add : 0));
  const pct = goal.target > 0 ? Math.min(1, preview / goal.target) : 0;

  const submit = async () => {
    if (!valid) { toast.error(tCommon('fillRequired')); return; }
    const newCurrent = Math.max(0, goal.current + add);
    const status = goal.target > 0 && newCurrent >= goal.target && goal.status === 'active' ? 'completed' : goal.status;
    try {
      await update.mutateAsync({
        name: goal.name,
        target: goal.target,
        current: newCurrent,
        targetDate: goal.targetDate,
        priority: goal.priority,
        status,
        emoji: goal.emoji,
      });
      toast.success(t('goals.contributeSuccess'));
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  return (
    <AppModal visible={visible} onDismiss={onDismiss} eyebrow={t('goals.eyebrow')} title={t('goals.contributeTitle')} subtitle={`${goal.emoji ? goal.emoji + '  ' : ''}${goal.name}`}>
      <View style={[styles.summary, { backgroundColor: colors.bgAlt, borderColor: colors.line }]}>
        <View style={styles.amountRow}>
          <Money size="md" tone="ink">{formatCurrency(preview)}</Money>
          <Body size="xs" tone="mute"> / {fmtMoney(goal.target)}</Body>
          <View style={{ flex: 1 }} />
          <Eyebrow tone="mute">{tCommon('percentValue', { value: (pct * 100).toFixed(0) })}</Eyebrow>
        </View>
        <ProgressBar progress={pct} color={colors.go} style={styles.bar} />
      </View>

      <View style={{ height: 12 }} />
      <TextInput
        mode="outlined"
        label={t('goals.contributeAmountLabel')}
        value={amount}
        onChangeText={(v) => setAmount(formatAmountInput(v, amount))}
        keyboardType="decimal-pad"
        left={<TextInput.Affix text="₺" />}
        contentStyle={{ fontSize: 18, fontWeight: '700' }}
        autoFocus
      />

      <View style={styles.chips}>
        {QUICK.map((q) => (
          <Pressable key={q} onPress={() => setAmount(formatAmountInput(String((parseAmount(amount) || 0) + q)))} style={[styles.chip, { borderColor: colorAlpha(colors.go, 0.3), backgroundColor: colorAlpha(colors.go, 0.08) }]}>
            <Body size="xs" weight="bold" style={{ color: colors.go }}>+{formatCurrency(q)}</Body>
          </Pressable>
        ))}
      </View>

      <View style={{ height: 14 }} />
      <Button mode="contained" icon="plus" loading={update.isPending} disabled={update.isPending} onPress={submit} buttonColor={colors.go} textColor={colors.onAccent} style={{ borderRadius: 999 }} contentStyle={{ paddingVertical: 6 }}>
        {t('goals.contributeAdd')}
      </Button>
      <Button mode="text" icon="pencil-outline" onPress={onEdit} textColor={colors.inkSoft} style={{ marginTop: 2 }}>
        {tCommon('edit')}
      </Button>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  summary: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 8 },
  bar: { height: 6, borderRadius: 999 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
});
