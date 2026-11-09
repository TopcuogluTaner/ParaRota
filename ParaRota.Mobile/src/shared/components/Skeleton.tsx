import { useEffect } from 'react';
import { View, StyleSheet, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useAppTheme } from '@shared/theme/AppThemeProvider';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

// Tek bir nabız atan placeholder bloğu. Spinner yerine içerik şeklini taklit eder.
export function Skeleton({ width = '100%', height = 14, radius = 8, style }: SkeletonProps) {
  const { colors } = useAppTheme();
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 850, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [o]);
  const aStyle = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.line }, aStyle, style]} />;
}

// Kart şekilli placeholder — yeni kart düzenine (ikon çipi + başlık + rozet + tutar + çubuk) benzer.
export function CardSkeleton() {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.paper, borderColor: colors.line }]}>
      <View style={styles.row}>
        <Skeleton width={40} height={40} radius={12} />
        <View style={{ flex: 1, gap: 7 }}>
          <Skeleton width="55%" height={13} />
          <Skeleton width="32%" height={10} />
        </View>
        <Skeleton width={62} height={22} radius={999} />
      </View>
      <Skeleton width="42%" height={20} radius={6} style={{ marginTop: 16 }} />
      <Skeleton width="100%" height={8} radius={999} style={{ marginTop: 12 }} />
    </View>
  );
}

// Liste yükleme placeholder'ı — N adet kart iskeleti.
export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.list} pointerEvents="none">
      {Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 10 },
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
