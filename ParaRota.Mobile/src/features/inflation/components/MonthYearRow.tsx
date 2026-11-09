import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { Body, Eyebrow } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';

const MONTH_SHORT = [
  'month_short_jan', 'month_short_feb', 'month_short_mar', 'month_short_apr',
  'month_short_may', 'month_short_jun', 'month_short_jul', 'month_short_aug',
  'month_short_sep', 'month_short_oct', 'month_short_nov', 'month_short_dec',
] as const;

interface Props {
  /** Mono etiket; verilmezse satır etiketsiz (iç içe ikinci seçici). */
  label?: string;
  month: number;
  year: number;
  minYear: number;
  maxYear: number;
  onMonth: (m: number) => void;
  onYear: (y: number) => void;
}

/** Ay (12 chip) + yıl (2003→bugün) yatay kaydırmalı chip seçici. Kira ekranının chip diliyle aynı. */
export function MonthYearRow({ label, month, year, minYear, maxYear, onMonth, onYear }: Props) {
  const { colors } = useAppTheme();
  const { t: tCommon } = useTranslation('common');
  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);

  return (
    <View style={{ marginTop: label ? 14 : 10 }}>
      {label ? <Eyebrow tone="mute" style={{ marginBottom: 8 }}>{label}</Eyebrow> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {MONTH_SHORT.map((key, i) => {
          const on = month === i + 1;
          return (
            <Pressable
              key={key}
              onPress={() => onMonth(i + 1)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.chip, { borderColor: on ? colors.go : colors.line, backgroundColor: on ? colorAlpha(colors.go, 0.12) : 'transparent' }]}
            >
              <Body size="xs" weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.go : colors.inkSoft }}>{tCommon(key)}</Body>
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.chips, { marginTop: 8 }]}>
        {years.map((y) => {
          const on = year === y;
          return (
            <Pressable
              key={y}
              onPress={() => onYear(y)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              style={[styles.chip, { borderColor: on ? colors.go : colors.line, backgroundColor: on ? colorAlpha(colors.go, 0.12) : 'transparent' }]}
            >
              <Body size="xs" weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.go : colors.inkSoft }}>{y}</Body>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 6, paddingVertical: 2, paddingRight: 4 },
  chip: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, minWidth: 40, alignItems: 'center' },
});
