import { useRef, type ReactNode } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, ScrollView, RefreshControl, StyleSheet, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScrollToTop } from '@react-navigation/native';

interface Props {
  children: ReactNode;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  bare?: boolean;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
  contentStyle?: StyleProp<ViewStyle>;
  /** Scroll başlayınca tetiklenir — ör. donut seçimini sıfırlamak için. */
  onScrollBeginDrag?: () => void;
}

/** Canonical screen wrapper — bg fill + safe area + scroll + responsive max width. */
export function Screen({ children, scroll = true, refreshing, onRefresh, bare, edges = ['top', 'bottom'], contentStyle, onScrollBeginDrag }: Props) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const isTablet = width >= 720;
  const maxWidth = isTablet ? 880 : '100%';
  // Aktif sekmeye tekrar dokununca en üste kaydır (custom tab bar her dokunuşta
  // 'tabPress' emit ediyor; bu ref yalnız scroll modunda ScrollView'e bağlanır).
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const containerStyle = [styles.flex, { backgroundColor: colors.bg }];

  if (bare) {
    return (
      <SafeAreaView edges={edges} style={containerStyle}>
        {children}
      </SafeAreaView>
    );
  }

  if (!scroll) {
    return (
      <SafeAreaView edges={edges} style={containerStyle}>
        <View style={[styles.flex, styles.center]}>
          <View style={[styles.flex, { width: '100%', maxWidth }, contentStyle]}>
            {children}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={edges} style={containerStyle}>
      <ScrollView
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets
        onScrollBeginDrag={onScrollBeginDrag}
        contentContainerStyle={[styles.scrollContent, { maxWidth }]}
        style={styles.flex}
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.go} /> : undefined}
      >
        {/* DİKKAT: içeriğe flex:1 verme — ScrollView içinde flex:1, içeriği viewport
            yüksekliğine sıkıştırıp taşmayı engeller ve scroll ölür. Doğal yükseklik kalmalı. */}
        <View style={contentStyle}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: 'center' },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 120,
    alignSelf: 'center',
    width: '100%',
  },
});
