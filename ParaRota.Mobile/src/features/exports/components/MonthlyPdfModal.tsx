import { useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable } from 'react-native';
import { Button, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { AppModal } from '@shared/components/AppModal';
import { Body, Display } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { downloadMonthlyPdf } from '@features/exports/api/useExports';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function MonthlyPdfModal({ visible, onDismiss }: Props) {
  const { t, i18n } = useTranslation('exports');
  const { colors } = useAppTheme();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);

  const monthLabel = (m: number) =>
    new Intl.DateTimeFormat(i18n.language, { month: 'short' }).format(new Date(2000, m - 1, 1));

  const isFuture = (m: number) => year > now.getFullYear() || (year === now.getFullYear() && m > now.getMonth() + 1);

  const submit = async () => {
    setLoading(true);
    try {
      await downloadMonthlyPdf({ month, year });
      toast.success(t('toast_pdfReady'));
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, t('toast_error')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppModal
      visible={visible}
      onDismiss={onDismiss}
      eyebrow={t('page_eyebrow')}
      title={t('modal_monthlyPdf_title')}
      subtitle={t('modal_monthlyPdf_subtitle')}
    >
      {/* Yıl seçici */}
      <View style={[styles.yearRow, { borderColor: colors.line, backgroundColor: colors.bgAlt }]}>
        <Pressable onPress={() => setYear((y) => y - 1)} hitSlop={10} style={styles.yearBtn} accessibilityLabel="−">
          <Icon source="chevron-left" size={24} color={colors.ink} />
        </Pressable>
        <Display size="sm">{year}</Display>
        <Pressable
          onPress={() => setYear((y) => Math.min(now.getFullYear(), y + 1))}
          disabled={year >= now.getFullYear()}
          hitSlop={10}
          style={[styles.yearBtn, { opacity: year >= now.getFullYear() ? 0.3 : 1 }]}
          accessibilityLabel="+"
        >
          <Icon source="chevron-right" size={24} color={colors.ink} />
        </Pressable>
      </View>

      {/* Ay ızgarası (3 sütun × 4 satır) */}
      <View style={{ marginTop: 14, gap: 8 }}>
        {[0, 1, 2, 3].map((rowIdx) => (
          <View key={rowIdx} style={styles.monthRow}>
            {[0, 1, 2].map((colIdx) => {
              const m = rowIdx * 3 + colIdx + 1;
              const on = month === m;
              const disabled = isFuture(m);
              return (
                <Pressable
                  key={m}
                  onPress={() => !disabled && setMonth(m)}
                  disabled={disabled}
                  style={[
                    styles.monthCell,
                    {
                      borderColor: on ? colors.go : colors.line,
                      backgroundColor: on ? colorAlpha(colors.go, 0.12) : 'transparent',
                      opacity: disabled ? 0.35 : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on, disabled }}
                >
                  <Body weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.go : colors.ink, textTransform: 'capitalize' }}>
                    {monthLabel(m)}
                  </Body>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <Body size="xs" tone="mute" style={{ marginTop: 10 }}>{t('help_monthSelector')}</Body>

      <Button
        mode="contained"
        icon={loading ? undefined : 'file-pdf-box'}
        loading={loading}
        disabled={loading}
        onPress={submit}
        buttonColor={colors.go}
        textColor={colors.onAccent}
        style={{ borderRadius: 999, marginTop: 16 }}
        contentStyle={{ paddingVertical: 6 }}
      >
        {t('submit_download')}
      </Button>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingHorizontal: 8, paddingVertical: 8 },
  yearBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  monthRow: { flexDirection: 'row', gap: 8 },
  monthCell: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
});
