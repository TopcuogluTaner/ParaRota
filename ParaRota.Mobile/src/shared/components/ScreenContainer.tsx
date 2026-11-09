import type { ReactNode } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { ScrollView, View, StyleSheet, RefreshControl } from 'react-native';
import { } from 'react-native-paper';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  padded?: boolean;
}

export function ScreenContainer({ children, scroll = true, refreshing, onRefresh, padded = true }: Props) {
  const theme = useAppTheme();
  const padding = padded ? 16 : 0;

  if (!scroll) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.colors.background, padding }]}>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ padding, paddingBottom: padding + 64 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined
      }
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
