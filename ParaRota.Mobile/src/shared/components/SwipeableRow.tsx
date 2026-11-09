import type { ReactNode } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { Icon } from 'react-native-paper';
import { useAppTheme, type AppColors } from '@shared/theme/AppThemeProvider';
import { colorAlpha } from '@shared/lib/colorAlpha';

export interface SwipeAction {
  icon: string;
  label?: string;
  /** Token-keyed renk — colors[tone] (tema-duyarlı: light/dark ayrı tanımlı). */
  tone: 'halt' | 'sky' | 'go' | 'way' | 'ink';
  onPress: () => void;
  accessibilityLabel?: string;
}

interface Props {
  children: ReactNode;
  rightActions?: SwipeAction[];
  rightThreshold?: number;
  /** Satır/aksiyon zemini — kart içinde kullanılırken kartın paper rengi verilir (varsayılan bg). */
  background?: string;
}

// Her aksiyon için yuvalama genişliği — dairesel buton + nefes payı.
const SLOT_WIDTH = 64;
const CIRCLE = 46;

// iOS Mail tarzı sola-çek aksiyonları — tam-boy renkli bar yerine ekran zemininde
// "yüzen" YUVARLAK ikon butonları. Açılırken daire 0.6→1 ölçeklenir; basınca küçülür.
export function SwipeableRow({ children, rightActions = [], rightThreshold = 40, background }: Props) {
  const { colors } = useAppTheme();
  const bg = background ?? colors.bg;

  if (rightActions.length === 0) {
    return <>{children}</>;
  }

  const totalWidth = SLOT_WIDTH * rightActions.length;

  const renderRightActions = (
    _progress: SharedValue<number>,
    translation: SharedValue<number>,
  ) => (
    <View style={[styles.actionsRow, { width: totalWidth, backgroundColor: bg }]}>
      {rightActions.map((action, i) => (
        <SwipeActionButton
          key={i}
          action={action}
          index={i}
          translation={translation}
          color={colors[action.tone as keyof AppColors] as string}
          fg={colors.onAccent}
        />
      ))}
    </View>
  );

  return (
    <ReanimatedSwipeable
      renderRightActions={renderRightActions}
      rightThreshold={rightThreshold}
      friction={1.6}
      overshootFriction={8}
      overshootRight={false}
    >
      <View style={{ backgroundColor: bg }}>{children}</View>
    </ReanimatedSwipeable>
  );
}

interface SwipeActionButtonProps {
  action: SwipeAction;
  index: number;
  translation: SharedValue<number>;
  color: string;
  fg: string;
}

function SwipeActionButton({ action, index, translation, color, fg }: SwipeActionButtonProps) {
  const revealStart = -SLOT_WIDTH * index;
  const revealEnd = -SLOT_WIDTH * (index + 1);

  const circleStyle = useAnimatedStyle(() => {
    const scale = interpolate(translation.value, [revealStart, revealEnd], [0.6, 1], Extrapolation.CLAMP);
    const opacity = interpolate(translation.value, [revealStart, revealEnd], [0.4, 1], Extrapolation.CLAMP);
    return { transform: [{ scale }], opacity };
  });

  return (
    <View style={styles.slot}>
      <Animated.View style={circleStyle}>
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => [
            styles.circle,
            { backgroundColor: color, shadowColor: color },
            pressed && { transform: [{ scale: 0.9 }], opacity: 0.9 },
          ]}
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel ?? action.label ?? action.icon}
          android_ripple={{ color: colorAlpha('#FFFFFF', 0.22), borderless: true }}
        >
          <Icon source={action.icon} size={20} color={fg} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  actionsRow: { flexDirection: 'row', alignItems: 'center' },
  slot: { width: SLOT_WIDTH, alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.28,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
});
