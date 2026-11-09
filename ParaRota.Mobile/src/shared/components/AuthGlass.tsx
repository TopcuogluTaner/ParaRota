import type { ReactNode } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { TopographicOverlay } from './TopographicOverlay';
import { GlowOrb } from './GlowOrb';
import { colorAlpha } from '@shared/lib/colorAlpha';

interface Props {
  /** Atmosfer üzerinde, kartın dışında üst bar (dil seçici / geri tuşu vb.). */
  topBar?: ReactNode;
  children: ReactNode;
}

/**
 * Apple "Liquid Glass" auth kabuğu: temaya duyarlı tam ekran kartografik atmosfer
 * (aydınlıkta açık, karanlıkta koyu) + ortada buzlu cam kart (specular rim + sheen +
 * derinlik). login + AuthFrame (register/forgot/reset/verify) bunu paylaşır.
 */
export function AuthGlass({ topBar, children }: Props) {
  const { colors, dark } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* ── ATMOSFER ──────────────────────────────────────────────────── */}
      <View style={StyleSheet.absoluteFill}>
        <LinearGradient colors={[colors.bgAlt, colors.bg]} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <TopographicOverlay opacity={dark ? 0.22 : 0.12} tint={dark ? colors.heroFg : colors.ink} />
        <GlowOrb color={colors.waySoft} top={-120} right={-90} size={420} />
        <GlowOrb color={colors.goSoft} bottom={-140} left={-110} size={460} />
        <LinearGradient
          colors={['transparent', colorAlpha('#000000', dark ? 0.4 : 0.05)]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      </View>

      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1 }}>
        {topBar ? <View style={styles.topBar}>{topBar}</View> : null}

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {/* ── LIQUID GLASS KART ───────────────────────────────────────── */}
            <Animated.View
              entering={FadeIn.duration(520)}
              style={[
                styles.cardBase,
                // Apple-vari: aydınlıkta yumuşak/diffüz gölge, karanlıkta daha derin.
                dark
                  ? { shadowColor: '#000', shadowOpacity: 0.32, shadowRadius: 28, shadowOffset: { width: 0, height: 16 }, elevation: 14 }
                  : { shadowColor: '#1A2A22', shadowOpacity: 0.16, shadowRadius: 36, shadowOffset: { width: 0, height: 22 }, elevation: 10 },
              ]}
            >
              <View style={[styles.cardClip, { borderColor: dark ? colorAlpha('#FFFFFF', 0.18) : colorAlpha('#FFFFFF', 0.7) }]}>
                <BlurView intensity={dark ? 60 : 100} tint={dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
                {/* ince saydam dolgu — aydınlıkta parlak/nötr (Apple frost), karanlıkta paper koyu */}
                <View
                  style={[StyleSheet.absoluteFill, { backgroundColor: dark ? colorAlpha(colors.paper, 0.26) : colorAlpha('#FFFFFF', 0.5) }]}
                  pointerEvents="none"
                />
                {/* çapraz sheen */}
                <LinearGradient
                  colors={[colorAlpha('#FFFFFF', dark ? 0.16 : 0.55), 'transparent']}
                  locations={[0, 0.62]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />
                {/* üst kenar specular rim (Apple: keskin, parlak ince hat) */}
                <LinearGradient
                  colors={[colorAlpha('#FFFFFF', dark ? 0.42 : 0.92), 'transparent']}
                  style={styles.rim}
                  pointerEvents="none"
                />
                {/* alt iç gölge */}
                <LinearGradient
                  colors={['transparent', colorAlpha('#000000', dark ? 0.28 : 0.1)]}
                  style={styles.innerShade}
                  pointerEvents="none"
                />
                <Animated.View entering={FadeInDown.duration(480).delay(90)} style={styles.cardInner}>
                  {children}
                </Animated.View>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 6, gap: 12 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 24 },
  cardBase: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 460,
  },
  cardClip: { borderRadius: 36, overflow: 'hidden', borderWidth: 1 },
  rim: { position: 'absolute', top: 0, left: 0, right: 0, height: 60 },
  innerShade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 88 },
  cardInner: { padding: 26 },
});
