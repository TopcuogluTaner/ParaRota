import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { useTranslation } from 'react-i18next';
import { Eyebrow } from './Typography';
import { BrandMark } from './BrandMark';

// "Rota" temalı yükleme: yavaşça dönen kesikli pusula halkası + nabız atan çekirdek + marka.
export function LoadingScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('common');

  const spin = useSharedValue(0);
  const pulse = useSharedValue(0.9);

  useEffect(() => {
    spin.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.linear }), -1, false);
    pulse.value = withRepeat(withTiming(1.14, { duration: 950, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [spin, pulse]);

  const ringStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.value * 360}deg` }] }));
  const coreStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <View style={[styles.wrap, { backgroundColor: colors.bg }]}>
      <View style={styles.compass}>
        {/* Dönen kesikli halka + pusula yön çizgileri */}
        <Animated.View style={[StyleSheet.absoluteFillObject, styles.center, ringStyle]}>
          <Svg width={84} height={84} viewBox="0 0 84 84">
            <Circle cx="42" cy="42" r="34" fill="none" stroke={colors.line} strokeWidth={1.5} strokeDasharray="2 7" />
            <Line x1="42" y1="6" x2="42" y2="14" stroke={colors.go} strokeWidth={2} strokeLinecap="round" />
            <Line x1="42" y1="70" x2="42" y2="78" stroke={colors.line} strokeWidth={2} strokeLinecap="round" />
            <Line x1="6" y1="42" x2="14" y2="42" stroke={colors.line} strokeWidth={2} strokeLinecap="round" />
            <Line x1="70" y1="42" x2="78" y2="42" stroke={colors.line} strokeWidth={2} strokeLinecap="round" />
          </Svg>
        </Animated.View>
        {/* Nabız atan çekirdek (dönmez) */}
        <Animated.View style={[styles.center, coreStyle]}>
          <Svg width={84} height={84} viewBox="0 0 84 84">
            <Circle cx="42" cy="42" r="17" fill="none" stroke={colors.go} strokeWidth={2} />
            <Circle cx="42" cy="42" r="4.5" fill={colors.go} />
          </Svg>
        </Animated.View>
      </View>

      <View style={styles.foot}>
        <BrandMark size={30} />
        <Eyebrow tone="mute" style={{ marginTop: 10, letterSpacing: 1.4 }}>{t('loadingRoute')}</Eyebrow>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  compass: { width: 84, height: 84, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', justifyContent: 'center' },
  foot: { marginTop: 24, alignItems: 'center' },
});
