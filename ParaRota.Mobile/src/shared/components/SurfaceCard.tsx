import type { ReactNode } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { } from 'react-native-paper';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SurfaceCard({ children, style }: Props) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, boxShadow: theme.colors.cardShadow },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
});
