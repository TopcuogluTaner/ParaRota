import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { motion } from '@shared/lib/motion';

interface Props {
  children: ReactNode;
  /** Sıra index'i — gecikme buradan türetilir (staggered cascade). */
  index?: number;
  /** Index başına gecikme (ms). */
  step?: number;
  /** Taban gecikme (ms) — cascade'i geciktirmek için. */
  base?: number;
  /** Maksimum gecikme (ms) — alt kartlar çok beklemesin. */
  cap?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Ölçülü giriş animasyonu (Emil Kowalski ilkeleri: <300ms, güçlü ease-out).
 * İçerik varsayılan olarak görünürdür; entering yalnızca ilk mount'ta aşağıdan
 * yukarı + fade ile belirir. ScrollView içinde güvenli; FlatList'te KULLANMA
 * (virtualization → scroll'da yeniden tetiklenir).
 */
export function Reveal({ children, index = 0, step = 45, base = 0, cap = 320, duration = 300, style }: Props) {
  const delay = Math.min(base + index * step, base + cap);
  return (
    <Animated.View
      entering={FadeInDown.duration(duration).delay(delay).easing(motion.easing.out)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
