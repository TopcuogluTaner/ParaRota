import { ScrollView, Pressable, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { Body } from '@shared/components/Typography';
import { CLASS_ICON } from '@features/investments/lib/assetMeta';

interface Props {
  categories: readonly string[];
  value: string;
  onChange: (c: string) => void;
}

// Varlık sınıfı seçici — SegmentedButtons sabit genişlikte 5 öğede dar ekranda taşıyordu.
// Yatay kaydırılabilir pill satırı: kaç kategori olursa olsun taşmaz, responsive.
export function CategoryScroller({ categories, value, onChange }: Props) {
  const { t } = useTranslation('investments');
  const { colors } = useAppTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.row}
    >
      {categories.map((c) => {
        const on = c === value;
        return (
          <Pressable
            key={c}
            onPress={() => onChange(c)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            style={[styles.pill, { borderColor: on ? colors.go : colors.line, backgroundColor: on ? colorAlpha(colors.go, 0.12) : colors.bgAlt }]}
          >
            <Icon source={CLASS_ICON[c as keyof typeof CLASS_ICON] ?? 'circle-outline'} size={15} color={on ? colors.go : colors.inkMute} />
            <Body size="sm" weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.go : colors.inkSoft }}>{t(`cat_${c}`)}</Body>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingVertical: 2, paddingRight: 8 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
