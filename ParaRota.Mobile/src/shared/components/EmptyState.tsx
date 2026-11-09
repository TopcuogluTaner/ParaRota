import { View, StyleSheet } from 'react-native';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { Icon} from 'react-native-paper';
import { Body, Display, Eyebrow } from './Typography';
import { RouteLine } from './RouteLine';

interface Props {
  icon?: string;
  title: string;
  message?: string;
  eyebrow?: string;
}

export function EmptyState({ icon = 'compass-outline', title, message, eyebrow }: Props) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { borderColor: colors.line, backgroundColor: colors.paper }]}>
        <Icon source={icon} size={36} color={colors.inkMute} />
      </View>
      {eyebrow ? <Eyebrow tone="mute" style={{ marginTop: 18 }}>{eyebrow}</Eyebrow> : null}
      <Display size="sm" align="center" style={{ marginTop: 8 }}>{title}</Display>
      {message ? (
        <Body size="sm" tone="soft" align="center" style={{ marginTop: 6, maxWidth: 320 }}>
          {message}
        </Body>
      ) : null}
      <RouteLine style={{ marginTop: 18, width: 120 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: 28 },
  iconWrap: {
    width: 78,
    height: 78,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
