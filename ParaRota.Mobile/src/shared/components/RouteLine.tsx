import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '@shared/theme/AppThemeProvider';

interface Props {
  // Kept for API back-compat; ignored in Calm Ledger.
  dashWidth?: number;
  gapWidth?: number;
  thickness?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

// Plain hairline divider. The previous dashed "survey ruler" look read as
// decorative on text-heavy screens, so we collapsed it to a single hairline.
export function RouteLine({ color, style }: Props) {
  const { colors } = useAppTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: color ?? colors.line }, style]} />;
}
