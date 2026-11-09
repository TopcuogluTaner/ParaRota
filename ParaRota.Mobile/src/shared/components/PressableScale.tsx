import { type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle, type GestureResponderEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { motion } from '@shared/lib/motion';

interface Props extends Omit<PressableProps, 'style' | 'children'> {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  // Basınç ölçeği (0.95–0.98 arası ince tutulmalı — Emil).
  scaleTo?: number;
}

// Basınca anlık scale geri-bildirimi veren Pressable — "arayüz seni duyuyor" hissi.
// Görsel stil iç Animated.View'da; Pressable yalnız dokunma alanı. Güçlü ease-out, 140ms.
export function PressableScale({ style, children, scaleTo = 0.97, onPressIn, onPressOut, ...rest }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handleIn = (e: GestureResponderEvent) => {
    scale.value = withTiming(scaleTo, { duration: motion.duration.press, easing: motion.easing.out });
    onPressIn?.(e);
  };
  const handleOut = (e: GestureResponderEvent) => {
    scale.value = withTiming(1, { duration: motion.duration.press, easing: motion.easing.out });
    onPressOut?.(e);
  };

  return (
    <Pressable {...rest} onPressIn={handleIn} onPressOut={handleOut}>
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
