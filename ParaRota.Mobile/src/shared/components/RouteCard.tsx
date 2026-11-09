import type { ReactNode } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from 'react-native-paper';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { Display, Eyebrow } from './Typography';
import { RouteLine } from './RouteLine';

interface Props {
  children?: ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  tone?: 'paper' | 'paperElevated' | 'ink';
  divider?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
  noPadding?: boolean;
  /** Başlıkta sol tarafta renkli ikon rozeti — bölümleri görsel olarak ayırır. */
  icon?: string;
  iconTone?: string;
}

// Standard Calm Ledger surface card: paper bg + hairline border, optional
// eyebrow/title cap and a divider before the body.
export function RouteCard({
  children,
  eyebrow,
  title,
  subtitle,
  right,
  tone = 'paper',
  divider = true,
  onPress,
  style,
  bodyStyle,
  noPadding,
  icon,
  iconTone,
}: Props) {
  const { colors } = useAppTheme();
  const accent = iconTone ?? colors.go;
  const bg =
    tone === 'ink' ? colors.ink : tone === 'paperElevated' ? colors.paper2 : colors.paper;
  const borderColor = tone === 'ink' ? colors.ink : colors.line;
  const onTone = tone === 'ink' ? 'onAccent' : undefined;

  const Wrapper: any = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress}
      style={({ pressed }: { pressed?: boolean }) => [
        styles.card,
        {
          backgroundColor: bg,
          borderColor,
          opacity: pressed ? 0.94 : 1,
          boxShadow: colors.cardShadow,
        },
        style,
      ]}
    >
      {(eyebrow || title || right) && (
        <View style={[styles.head, noPadding ? null : styles.headPad]}>
          {icon ? (
            <View style={[styles.iconChip, { backgroundColor: tone === 'ink' ? colorAlpha('#FFFFFF', 0.16) : colorAlpha(accent, 0.14) }]}>
              <Icon source={icon} size={19} color={tone === 'ink' ? colors.onAccent : accent} />
            </View>
          ) : null}
          <View style={{ flex: 1 }}>
            {eyebrow ? <Eyebrow tone={onTone ?? 'mute'}>{eyebrow}</Eyebrow> : null}
            {title ? (
              <Display size="sm" tone={onTone} style={{ marginTop: eyebrow ? 4 : 0 }}>
                {title}
              </Display>
            ) : null}
            {subtitle ? (
              <View style={{ marginTop: 2 }}>
                {/* eslint-disable-next-line @typescript-eslint/no-unused-expressions */}
              </View>
            ) : null}
          </View>
          {right}
        </View>
      )}
      {(eyebrow || title) && divider ? (
        <RouteLine style={{ marginHorizontal: noPadding ? 0 : 16, marginBottom: 12 }} />
      ) : null}
      <View style={[noPadding ? null : styles.body, bodyStyle]}>{children}</View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    overflow: 'hidden',
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  headPad: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  iconChip: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 16, paddingBottom: 14 },
});
