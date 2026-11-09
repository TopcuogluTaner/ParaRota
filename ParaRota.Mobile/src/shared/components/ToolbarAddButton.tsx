import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from 'react-native-paper';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { Body } from './Typography';

interface Props {
  label: string;
  onPress: () => void;
  /** Icon adı (react-native-paper / MaterialCommunityIcons). Varsayılan: `plus`. */
  icon?: string;
  /** Devre dışı bırakır — pasif görünüm + onPress tetiklenmez. */
  disabled?: boolean;
  /** Compact mode — sadece ikon (label hidden), küçük ekranlar veya toolbar dolu olduğunda. */
  iconOnly?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Toolbar'ın sağında oturan ekleme butonu. Searchbar/filtre chip yanında
 * 44px yükseklikte ink-pill — sağ-alt FAB pattern'ini değiştiren tutarlı
 * tek nokta. Tüm liste ekranları (Transactions, Budgets, Goals, Debts,
 * Categories, Recurring, Household) bu butonu kullanır.
 */
export function ToolbarAddButton({
  label,
  onPress,
  icon = 'plus',
  disabled,
  iconOnly,
  accessibilityLabel,
  style,
}: Props) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.btn,
        {
          // Primary aksiyon → marka yeşili (go). Eski siyah (ink) pill light temada
          // ağır/tema-dışı görünüyordu.
          backgroundColor: disabled ? colors.bgAlt : colors.go,
          opacity: pressed ? 0.86 : 1,
          paddingHorizontal: iconOnly ? 10 : 14,
        },
        style,
      ]}
      hitSlop={6}
    >
      <Icon source={icon} size={16} color={disabled ? colors.inkMute : colors.onAccent} />
      {iconOnly ? null : (
        <Body
          size="sm"
          weight="bold"
          style={{ color: disabled ? colors.inkMute : colors.onAccent }}
          numberOfLines={1}
        >
          {label}
        </Body>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
