import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { AppModal } from '@shared/components/AppModal';
import { Body } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';

interface Member {
  id: number;
  name: string;
  isSelf: boolean;
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  members: Member[];
}

// Gün üyeleri — ev sahipliği rotasyon sırası (1, 2, 3…). Salt-okunur; üyeler
// kuruluşta belirlenir. Detay ekranını şişirmemek için tam liste burada.
export function GoldDayMembersModal({ visible, onDismiss, members }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation('goldDays');

  return (
    <AppModal visible={visible} onDismiss={onDismiss} eyebrow={`${members.length}`} title={t('members')} subtitle={t('current_host')}>
      {members.map((m, i, arr) => (
        <View key={m.id} style={[styles.row, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }]}>
          <View style={[styles.num, { backgroundColor: colorAlpha(m.isSelf ? colors.go : colors.way, 0.14) }]}>
            <Body size="xs" weight="bold" style={{ color: m.isSelf ? colors.go : colors.way }}>{i + 1}</Body>
          </View>
          <Body size="md" weight="medium" style={{ flex: 1 }} numberOfLines={1}>{m.name}{m.isSelf ? ` · ${t('me')}` : ''}</Body>
        </View>
      ))}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  num: { width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
});
