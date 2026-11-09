import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { TextInput, Button, Icon, IconButton } from 'react-native-paper';
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
import { useCreateGoldDay } from '@features/goldDays/api/useGoldDays';
import type { GoldDayFrequency, GoldDayType } from '@shared/api/types';

const GOLD_UNITS = ['ceyrek', 'gram', 'yarim', 'tam', 'cumhuriyet'] as const;
const CURRENCIES = ['TRY', 'USD', 'EUR'] as const;
const FREQS: GoldDayFrequency[] = ['monthly', 'weekly', 'biweekly'];

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onCreated: (id: number) => void;
}

export function GoldDayCreateModal({ visible, onDismiss, onCreated }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation('goldDays');
  const { t: tCommon } = useTranslation('common');
  const create = useCreateGoldDay();

  const [name, setName] = useState('');
  const [type, setType] = useState<GoldDayType>('gold');
  const [unit, setUnit] = useState('ceyrek');
  const [amount, setAmount] = useState('1');
  const [frequency, setFrequency] = useState<GoldDayFrequency>('monthly');
  const [startDate, setStartDate] = useState(new Date());
  const [showStart, setShowStart] = useState(false);
  const [members, setMembers] = useState<{ name: string; isSelf: boolean }[]>([
    { name: '', isSelf: true }, { name: '', isSelf: false }, { name: '', isSelf: false },
  ]);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName(''); setType('gold'); setUnit('ceyrek'); setAmount('1'); setFrequency('monthly');
    setStartDate(new Date());
    setMembers([{ name: '', isSelf: true }, { name: '', isSelf: false }, { name: '', isSelf: false }]);
    setAttempted(false);
  }, [visible]);

  const switchType = (next: GoldDayType) => {
    setType(next);
    setUnit(next === 'gold' ? 'ceyrek' : 'TRY');
    if (next === 'currency' && amount === '1') setAmount('500');
  };
  const setMemberName = (i: number, v: string) => setMembers((p) => p.map((m, idx) => (idx === i ? { ...m, name: v } : m)));
  const setSelf = (i: number) => setMembers((p) => p.map((m, idx) => ({ ...m, isSelf: idx === i })));
  const addMember = () => setMembers((p) => (p.length >= 50 ? p : [...p, { name: '', isSelf: false }]));
  const removeMember = (i: number) => setMembers((p) => {
    if (p.length <= 2) return p;
    const next = p.filter((_, idx) => idx !== i);
    if (!next.some((m) => m.isSelf)) next[0].isSelf = true;
    return next;
  });

  const amountNum = parseAmount(amount);
  const named = members.filter((m) => m.name.trim().length > 0);
  const valid = name.trim().length > 0 && Number.isFinite(amountNum) && amountNum > 0 && named.length >= 2;

  const submit = async () => {
    if (create.isPending) return;
    if (!valid) { setAttempted(true); toast.error(t('create_invalid')); return; }
    try {
      const data = await create.mutateAsync({
        name: name.trim(), contributionType: type, contributionUnit: unit, contributionAmount: amountNum,
        frequency, startDate: startDate.toISOString(), members: named.map((m) => ({ name: m.name.trim(), isSelf: m.isSelf })),
      });
      toast.success(t('create_success'));
      onCreated(data.id);
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  return (
    <AppModal visible={visible} onDismiss={onDismiss} eyebrow={t('page_eyebrow')} title={t('create_title')} subtitle={t('create_subtitle')}>
      <TextInput mode="outlined" label={t('field_name')} value={name} onChangeText={setName} error={attempted && name.trim().length === 0} maxLength={120} placeholder={t('field_namePlaceholder')} />

      {/* Tür */}
      <Eyebrow tone="mute" style={styles.lbl}>{t('field_type')}</Eyebrow>
      <View style={styles.row}>
        <OptChip icon="gold" label={t('type_gold')} active={type === 'gold'} onPress={() => switchType('gold')} colors={colors} />
        <OptChip icon="cash-multiple" label={t('type_currency')} active={type === 'currency'} onPress={() => switchType('currency')} colors={colors} />
      </View>

      {/* Birim */}
      <Eyebrow tone="mute" style={styles.lbl}>{type === 'gold' ? t('field_unit') : t('field_currency')}</Eyebrow>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {(type === 'gold' ? GOLD_UNITS : CURRENCIES).map((u) => {
          const on = unit === u;
          return (
            <Pressable key={u} onPress={() => setUnit(u)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, { borderColor: on ? colors.way : colors.line, backgroundColor: on ? colorAlpha(colors.way, 0.12) : 'transparent' }]}>
              <Body size="xs" weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.way : colors.inkSoft }}>{type === 'gold' ? t(`unit_${u}`) : u}</Body>
            </Pressable>
          );
        })}
      </ScrollView>

      <TextInput mode="outlined" label={t('field_amount')} value={amount} onChangeText={(v) => setAmount(formatAmountInput(v, amount))} keyboardType="decimal-pad" error={attempted && !(amountNum > 0)} style={{ marginTop: 10 }} />

      {/* Sıklık */}
      <Eyebrow tone="mute" style={styles.lbl}>{t('field_frequency')}</Eyebrow>
      <View style={[styles.seg, { borderColor: colors.line, backgroundColor: colors.bgAlt }]}>
        {FREQS.map((f) => {
          const on = frequency === f;
          return (
            <Pressable key={f} onPress={() => setFrequency(f)} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.segBtn, on && { backgroundColor: colors.ink }]}>
              <Body size="sm" weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.paper : colors.inkSoft }}>{t(`freq_${f}`)}</Body>
            </Pressable>
          );
        })}
      </View>

      {/* Başlangıç */}
      <Pressable onPress={() => setShowStart(true)} style={{ marginTop: 10 }}>
        <TextInput mode="outlined" label={t('field_startDate')} value={formatDate(startDate)} editable={false} right={<TextInput.Icon icon="calendar-outline" />} />
      </Pressable>
      <AppDateTimePicker visible={showStart} value={startDate} mode="date" onConfirm={(d) => { setStartDate(d); setShowStart(false); }} onCancel={() => setShowStart(false)} />

      {/* Üyeler */}
      <Eyebrow tone="mute" style={styles.lbl}>{t('field_members')}</Eyebrow>
      {members.map((m, i) => (
        <View key={i} style={styles.memberRow}>
          <TextInput mode="outlined" dense value={m.name} onChangeText={(v) => setMemberName(i, v)} placeholder={`${t('member')} ${i + 1}`} maxLength={80} style={{ flex: 1 }} />
          <Pressable onPress={() => setSelf(i)} accessibilityRole="button" accessibilityState={{ selected: m.isSelf }} accessibilityLabel={t('me')} style={[styles.meChip, { borderColor: m.isSelf ? colors.go : colors.line, backgroundColor: m.isSelf ? colorAlpha(colors.go, 0.12) : 'transparent' }]}>
            <Body size="xs" weight={m.isSelf ? 'bold' : 'medium'} style={{ color: m.isSelf ? colors.go : colors.inkSoft }}>{t('me')}</Body>
          </Pressable>
          <IconButton icon="close" size={18} onPress={() => removeMember(i)} disabled={members.length <= 2} />
        </View>
      ))}
      <Button mode="text" icon="plus" onPress={addMember} disabled={members.length >= 50} compact style={{ alignSelf: 'flex-start' }}>{t('field_addMember')}</Button>

      <Button mode="contained" icon={create.isPending ? undefined : 'check'} loading={create.isPending} disabled={create.isPending} onPress={submit} buttonColor={colors.go} textColor={colors.onAccent} style={{ borderRadius: 999, marginTop: 12 }}>
        {t('create_submit')}
      </Button>
    </AppModal>
  );
}

function OptChip({ icon, label, active, onPress, colors }: { icon: string; label: string; active: boolean; onPress: () => void; colors: ReturnType<typeof useAppTheme>['colors'] }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={label} style={[styles.optChip, { borderColor: active ? colors.way : colors.line, backgroundColor: active ? colorAlpha(colors.way, 0.1) : 'transparent' }]}>
      <Icon source={icon} size={20} color={active ? colors.way : colors.inkSoft} />
      <Body size="sm" weight="bold" style={{ color: active ? colors.way : colors.ink, marginTop: 4 }}>{label}</Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  lbl: { marginTop: 14, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  optChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  chips: { gap: 6, paddingVertical: 2, paddingRight: 4 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  seg: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, padding: 3 },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 999 },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  meChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
});
