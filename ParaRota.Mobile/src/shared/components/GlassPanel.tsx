import type { ReactNode } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  children?: ReactNode;
  // Kept for backwards compatibility with existing call sites that pass these.
  // No-op now — there is no blur or vibrancy layer in Calm Ledger.
  intensity?: number;
  tint?: string;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  rim?: boolean;
}

// Renamed in spirit only: this is now a plain elevated surface. A finance app
// reads better with opaque cards than with frosted glass, which over-decorates
// numeric content. Kept the export name so existing imports keep working.
export function GlassPanel({ children, style, radius = 12, rim = true }: Props) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.wrap, { borderRadius: radius, backgroundColor: colors.paper }, style]}>
      {rim ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { borderRadius: radius, borderColor: colors.line, borderWidth: StyleSheet.hairlineWidth },
          ]}
        />
      ) : null}
      <View style={{ borderRadius: radius, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
});
