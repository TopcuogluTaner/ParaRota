import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useCopilot, type TooltipProps } from 'react-native-copilot';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { fontFamily } from '@shared/theme/tokens';
import { colorAlpha } from '@shared/lib/colorAlpha';

// react-native-copilot'un varsayılan tooltip'i metin rengini siyah sabitler →
// koyu temada `colors.paper` zemininde okunmaz. Bu temalı tooltip metni
// `colors.ink` ile boyar, adım sayacı + tutarlı buton stilleri ekler.
export function TourTooltip({ labels }: TooltipProps) {
  const { colors } = useAppTheme();
  const {
    goToNext,
    goToPrev,
    stop,
    currentStep,
    isFirstStep,
    isLastStep,
    currentStepNumber,
    totalStepsNumber,
  } = useCopilot();

  return (
    <View>
      <View style={styles.header}>
        <View style={[styles.counter, { backgroundColor: colorAlpha(colors.go, 0.14) }]}>
          <Text style={[styles.counterText, { color: colors.go, fontFamily: fontFamily.bodyBold }]}>
            {currentStepNumber}/{totalStepsNumber}
          </Text>
        </View>
        <Pressable onPress={() => void stop()} hitSlop={8}>
          <Text style={[styles.skip, { color: colors.inkMute, fontFamily: fontFamily.body }]}>{labels.skip}</Text>
        </Pressable>
      </View>

      <Text style={[styles.text, { color: colors.ink, fontFamily: fontFamily.body }]}>
        {currentStep?.text}
      </Text>

      <View style={styles.bottomBar}>
        {!isFirstStep ? (
          <Pressable onPress={() => void goToPrev()} style={styles.btn} hitSlop={6}>
            <Text style={[styles.btnGhost, { color: colors.inkMute, fontFamily: fontFamily.bodyBold }]}>{labels.previous}</Text>
          </Pressable>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Pressable
          onPress={() => (isLastStep ? void stop() : void goToNext())}
          style={[styles.btnPrimary, { backgroundColor: colors.go }]}
          hitSlop={6}
        >
          <Text style={[styles.btnPrimaryText, { color: colors.onAccent, fontFamily: fontFamily.bodyBold }]}>
            {isLastStep ? labels.finish : labels.next}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  counter: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  counterText: { fontSize: 11, letterSpacing: 0.4 },
  skip: { fontSize: 13 },
  text: { fontSize: 14.5, lineHeight: 21 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, gap: 12 },
  btn: { flex: 1 },
  btnGhost: { fontSize: 14 },
  btnPrimary: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999 },
  btnPrimaryText: { fontSize: 14, letterSpacing: 0.2 },
});
