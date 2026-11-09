import { useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable } from 'react-native';
import { Button, TextInput, Icon } from 'react-native-paper';
import { AppDateTimePicker as DateTimePicker } from '@shared/components/AppDateTimePicker';
import { useTranslation } from 'react-i18next';
import { AppModal } from '@shared/components/AppModal';
import { Body } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { downloadTransactionsXlsx } from '@features/exports/api/useExports';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { formatDate } from '@shared/lib/dateFormat';
import type { TxType } from '@shared/api/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

type RangeKey = 'thisMonth' | 'lastMonth' | 'last3Months' | 'thisYear';

function toIsoDate(d: Date): string {
  return d.toISOString().substring(0, 10);
}

export function TransactionsXlsxModal({ visible, onDismiss }: Props) {
  const { t } = useTranslation('exports');
  const { colors } = useAppTheme();
  const today = new Date();
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const [startDate, setStart] = useState(monthAgo);
  const [endDate, setEnd] = useState(today);
  const [types, setTypes] = useState<TxType[]>([]);
  const [preset, setPreset] = useState<RangeKey | null>(null);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleType = (tx: TxType) =>
    setTypes((cur) => (cur.includes(tx) ? cur.filter((x) => x !== tx) : [...cur, tx]));

  const applyPreset = (key: RangeKey) => {
    const now = new Date();
    let s: Date;
    let e: Date = now;
    switch (key) {
      case 'thisMonth': s = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'lastMonth': s = new Date(now.getFullYear(), now.getMonth() - 1, 1); e = new Date(now.getFullYear(), now.getMonth(), 0); break;
      case 'last3Months': s = new Date(now.getFullYear(), now.getMonth() - 2, 1); break;
      case 'thisYear': s = new Date(now.getFullYear(), 0, 1); break;
    }
    setStart(s);
    setEnd(e);
    setPreset(key);
  };

  const submit = async () => {
    setLoading(true);
    try {
      await downloadTransactionsXlsx({
        startDate: toIsoDate(startDate),
        endDate: toIsoDate(endDate),
        types: types.length > 0 ? types : undefined,
      });
      toast.success(t('toast_xlsxReady'));
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, t('toast_error')));
    } finally {
      setLoading(false);
    }
  };

  const presets: RangeKey[] = ['thisMonth', 'lastMonth', 'last3Months', 'thisYear'];
  const typeOpts: { value: TxType; label: string; tone: string }[] = [
    { value: 'income', label: t('field_types_income'), tone: colors.go },
    { value: 'expense', label: t('field_types_expense'), tone: colors.halt },
  ];

  return (
    <AppModal
      visible={visible}
      onDismiss={onDismiss}
      eyebrow={t('page_eyebrow')}
      title={t('modal_xlsx_title')}
      subtitle={t('modal_xlsx_subtitle')}
    >
      {/* Hızlı aralık */}
      <Body size="sm" weight="bold" style={styles.label}>{t('range_label')}</Body>
      <View style={styles.chips}>
        {presets.map((key) => {
          const on = preset === key;
          return (
            <Pressable
              key={key}
              onPress={() => applyPreset(key)}
              style={[styles.chip, { borderColor: on ? colors.go : colors.line, backgroundColor: on ? colorAlpha(colors.go, 0.12) : 'transparent' }]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Body size="xs" weight="bold" style={{ color: on ? colors.go : colors.inkSoft }}>{t(`range_${key}` as never)}</Body>
            </Pressable>
          );
        })}
      </View>

      {/* Tarih aralığı — alt alta (yan yana dar kalıp tarih taşıyordu) */}
      <View style={styles.dateCol}>
        <Pressable onPress={() => setShowStart(true)}>
          <View pointerEvents="none">
            <TextInput mode="outlined" label={t('field_startDate')} value={formatDate(startDate)} editable={false} left={<TextInput.Icon icon="calendar-start" />} />
          </View>
        </Pressable>
        <Pressable onPress={() => setShowEnd(true)}>
          <View pointerEvents="none">
            <TextInput mode="outlined" label={t('field_endDate')} value={formatDate(endDate)} editable={false} left={<TextInput.Icon icon="calendar-end" />} />
          </View>
        </Pressable>
      </View>
      <DateTimePicker visible={showStart} value={startDate} mode="date" onConfirm={(d) => { setStart(d); setPreset(null); setShowStart(false); }} onCancel={() => setShowStart(false)} />
      <DateTimePicker visible={showEnd} value={endDate} mode="date" onConfirm={(d) => { setEnd(d); setPreset(null); setShowEnd(false); }} onCancel={() => setShowEnd(false)} />
      <Body size="xs" tone="mute" style={{ marginTop: 6 }}>{t('help_dateRange')}</Body>

      {/* Tür filtresi */}
      <Body size="sm" weight="bold" style={styles.label}>{t('field_types')}</Body>
      <View style={styles.chips}>
        {typeOpts.map((o) => {
          const on = types.includes(o.value);
          return (
            <Pressable
              key={o.value}
              onPress={() => toggleType(o.value)}
              style={[styles.chip, styles.typeChip, { borderColor: on ? o.tone : colors.line, backgroundColor: on ? colorAlpha(o.tone, 0.12) : 'transparent' }]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Icon source={on ? 'check-circle' : (o.value === 'income' ? 'arrow-bottom-left' : 'arrow-top-right')} size={14} color={on ? o.tone : colors.inkMute} />
              <Body size="sm" weight="bold" style={{ color: on ? o.tone : colors.inkSoft }}>{o.label}</Body>
            </Pressable>
          );
        })}
      </View>

      <Button
        mode="contained"
        icon={loading ? undefined : 'file-excel-outline'}
        loading={loading}
        disabled={loading}
        onPress={submit}
        buttonColor={colors.go}
        textColor={colors.onAccent}
        style={{ borderRadius: 999, marginTop: 18 }}
        contentStyle={{ paddingVertical: 6 }}
      >
        {t('submit_download')}
      </Button>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  label: { marginTop: 16, marginBottom: 8 },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  typeChip: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateCol: { gap: 10, marginTop: 4 },
});
