import { useEffect, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable } from 'react-native';
import { Button, TextInput, HelperText } from 'react-native-paper';
import { AppDateTimePicker as DateTimePicker } from '@shared/components/AppDateTimePicker';
import { useTranslation } from 'react-i18next';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { AppModal } from '@shared/components/AppModal';
import { PressableScale } from '@shared/components/PressableScale';
import { Body, Eyebrow } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { useCreateGoal, useUpdateGoal } from '@features/goals/api/useGoals';
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import { formatCurrency } from '@shared/lib/dateFormat';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { formatDate } from '@shared/lib/dateFormat';
import type { GoalDto, GoalStatus, Priority } from '@shared/api/types';

const EMOJI_QUICK = ['🎯', '🏖️', '💻', '🛟', '🚗', '🎓', '🏠', '💍', '✈️', '📱', '🪴', '🎁'];
const TARGET_PRESETS = [10000, 25000, 50000, 100000];

interface Props {
  visible: boolean;
  onDismiss: () => void;
  initial?: GoalDto | null;
}

export function GoalFormModal({ visible, onDismiss, initial }: Props) {
  const { t } = useTranslation('pages');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const create = useCreateGoal();
  const update = useUpdateGoal(initial?.id ?? 0);

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [emoji, setEmoji] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<GoalStatus>('active');
  const [targetDate, setTargetDate] = useState(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
  const [showDate, setShowDate] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAttempted(false);
    if (initial) {
      setName(initial.name);
      setTarget(formatAmountInput(String(initial.target)));
      setCurrent(formatAmountInput(String(initial.current)));
      setEmoji(initial.emoji ?? '');
      setPriority(initial.priority);
      setStatus(initial.status);
      setTargetDate(new Date(initial.targetDate));
    } else {
      setName('');
      setTarget('');
      setCurrent('');
      setEmoji('');
      setPriority('medium');
      setStatus('active');
      setTargetDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000));
    }
  }, [visible, initial]);

  const targetNum = parseAmount(target);
  const currentNum = parseAmount(current || '0');
  const nameInvalid = !name;
  const targetInvalid = !(Number.isFinite(targetNum) && targetNum > 0);
  const canSubmit = !nameInvalid && !targetInvalid;

  const priorityOpts: { value: Priority; label: string; tone: string }[] = [
    { value: 'low', label: t('goals.priorityLow'), tone: colors.sky },
    { value: 'medium', label: t('goals.priorityMedium'), tone: colors.way },
    { value: 'high', label: t('goals.priorityHigh'), tone: colors.halt },
  ];
  const statusOpts: { value: GoalStatus; label: string; tone: string }[] = [
    { value: 'active', label: t('goals.statusActive'), tone: colors.go },
    { value: 'paused', label: t('goals.statusPaused'), tone: colors.way },
    { value: 'completed', label: t('goals.statusCompleted'), tone: colors.sky },
  ];

  const submit = async () => {
    if (!canSubmit) {
      setAttempted(true);
      toast.error(tCommon('fillRequired'));
      return;
    }
    try {
      if (initial) {
        await update.mutateAsync({
          name, target: targetNum, current: currentNum, targetDate: targetDate.toISOString(),
          priority, status, emoji: emoji || undefined,
        });
        toast.success(t('goals.toastUpdateSuccess'));
      } else {
        await create.mutateAsync({
          name, target: targetNum, targetDate: targetDate.toISOString(), priority, emoji: emoji || undefined,
        });
        toast.success(t('goals.toastCreateSuccess'));
      }
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <AppModal
      visible={visible}
      onDismiss={onDismiss}
      eyebrow={t('goals.eyebrow')}
      title={initial ? t('goals.modalEditTitle') : t('goals.modalCreateTitle')}
      subtitle={initial ? t('goals.modalEditSubtitle') : t('goals.modalCreateSubtitle')}
    >
      <ScopeIndicator />

      {/* Ad + emoji önizleme (seçince yeşil accent halka) */}
      <View>
        <View style={styles.row}>
          <View style={[styles.emojiPreview, { borderColor: emoji ? colorAlpha(colors.go, 0.45) : colors.line, backgroundColor: emoji ? colorAlpha(colors.go, 0.08) : colors.bgAlt }]}>
            <Body style={{ fontSize: 30, lineHeight: 38, textAlign: 'center' }}>{emoji || '🎯'}</Body>
          </View>
          <TextInput mode="outlined" label={t('goals.formNameLabel')} placeholder={t('goals.formNamePlaceholder')} value={name} onChangeText={setName} style={{ flex: 1 }} error={attempted && nameInvalid} />
        </View>
        <HelperText type="error" visible={attempted && nameInvalid}>{tCommon('required')}</HelperText>
      </View>

      {/* Emoji seçici — basınca scale geri-bildirimli */}
      <Eyebrow tone="mute" style={styles.sectionLabel}>{t('goals.formEmojiLabel')}</Eyebrow>
      <View style={styles.emojiGrid}>
        {EMOJI_QUICK.map((e) => {
          const active = emoji === e;
          return (
            <PressableScale
              key={e}
              onPress={() => setEmoji(active ? '' : e)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.emojiOpt, { borderColor: active ? colors.go : colors.line, backgroundColor: active ? colorAlpha(colors.go, 0.1) : 'transparent' }]}
            >
              <Body style={{ fontSize: 22, lineHeight: 28, textAlign: 'center' }}>{e}</Body>
            </PressableScale>
          );
        })}
      </View>

      {/* Hedef tutar + hızlı önayarlar */}
      <View style={{ marginTop: 4 }}>
        <TextInput mode="outlined" label={t('goals.formTargetLabel')} value={target} onChangeText={(v) => setTarget(formatAmountInput(v, target))} keyboardType="decimal-pad" left={<TextInput.Affix text="₺" />} error={attempted && targetInvalid} />
        <View style={styles.chips}>
          {TARGET_PRESETS.map((p) => (
            <Pressable key={p} onPress={() => setTarget(formatAmountInput(String(p)))} style={({ pressed }) => [styles.chip, { borderColor: colors.line, backgroundColor: colors.bgAlt, opacity: pressed ? 0.6 : 1 }]}>
              <Body size="xs" weight="bold" tone="soft">{formatCurrency(p)}</Body>
            </Pressable>
          ))}
        </View>
        <HelperText type="error" visible={attempted && targetInvalid}>{tCommon('required')}</HelperText>
      </View>

      {initial ? (
        <TextInput mode="outlined" label={t('goals.formCurrentLabel')} value={current} onChangeText={(v) => setCurrent(formatAmountInput(v, current))} keyboardType="decimal-pad" left={<TextInput.Affix text="₺" />} />
      ) : null}

      <Pressable onPress={() => setShowDate(true)} style={{ marginTop: 4 }}>
        <View pointerEvents="none">
          <TextInput mode="outlined" label={t('goals.formTargetDateLabel')} value={formatDate(targetDate)} editable={false} right={<TextInput.Icon icon="calendar-outline" />} />
        </View>
      </Pressable>
      <DateTimePicker visible={showDate} value={targetDate} mode="date" onConfirm={(d) => { setTargetDate(d); setShowDate(false); }} onCancel={() => setShowDate(false)} />

      {/* Öncelik — renk kodlu pill seçici */}
      <Eyebrow tone="mute" style={styles.sectionLabel}>{t('goals.formPriorityLabel')}</Eyebrow>
      <View style={styles.pillRow}>
        {priorityOpts.map((o) => {
          const on = priority === o.value;
          return (
            <Pressable key={o.value} onPress={() => setPriority(o.value)} style={({ pressed }) => [styles.pill, { borderColor: on ? o.tone : colors.line, backgroundColor: on ? colorAlpha(o.tone, 0.12) : 'transparent', opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
              <View style={[styles.pillDot, { backgroundColor: o.tone, opacity: on ? 1 : 0.4 }]} />
              <Body size="sm" weight={on ? 'bold' : 'medium'} style={{ color: on ? o.tone : colors.inkSoft }}>{o.label}</Body>
            </Pressable>
          );
        })}
      </View>

      {initial ? (
        <>
          <Eyebrow tone="mute" style={styles.sectionLabel}>{t('goals.formStatusLabel')}</Eyebrow>
          <View style={styles.pillRow}>
            {statusOpts.map((o) => {
              const on = status === o.value;
              return (
                <Pressable key={o.value} onPress={() => setStatus(o.value)} style={({ pressed }) => [styles.pill, { borderColor: on ? o.tone : colors.line, backgroundColor: on ? colorAlpha(o.tone, 0.12) : 'transparent', opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                  <View style={[styles.pillDot, { backgroundColor: o.tone, opacity: on ? 1 : 0.4 }]} />
                  <Body size="sm" weight={on ? 'bold' : 'medium'} style={{ color: on ? o.tone : colors.inkSoft }}>{o.label}</Body>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Button
        mode="contained"
        icon={initial ? 'content-save-outline' : 'flag-plus-outline'}
        loading={busy}
        disabled={busy}
        onPress={submit}
        buttonColor={colors.go}
        textColor={colors.onAccent}
        style={{ borderRadius: 999, marginTop: 18 }}
        contentStyle={{ paddingVertical: 6 }}
      >
        {initial ? tCommon('save') : tCommon('add')}
      </Button>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  sectionLabel: { marginTop: 14, marginBottom: 8 },
  emojiPreview: { width: 60, height: 60, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiOpt: { width: 46, height: 46, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  pillDot: { width: 7, height: 7, borderRadius: 999 },
});
