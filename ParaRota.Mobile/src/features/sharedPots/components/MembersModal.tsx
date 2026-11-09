import { View, StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { AppModal } from '@shared/components/AppModal';
import { SwipeableRow } from '@shared/components/SwipeableRow';
import { Body, Money } from '@shared/components/Typography';
import { formatCurrency } from '@shared/lib/dateFormat';
import type { SharedPotMemberDto } from '@shared/api/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  members: SharedPotMemberDto[];
  isOwner: boolean;
  /** Sola çekince doğrudan çıkar (toast geri-bildirimli). */
  onRemove: (m: SharedPotMemberDto) => void;
  onAdd: () => void;
}

// Üye listesi modalı — detay ekranını şişirmemek için tam liste burada.
// Bakiyeli satırlar; sahibi sola çekerek üyeyi çıkarır, alttan üye ekler.
export function MembersModal({ visible, onDismiss, members, isOwner, onRemove, onAdd }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation('sharedPots');

  const balColor = (bal: number) => (Math.abs(bal) < 0.01 ? colors.inkMute : bal > 0 ? colors.go : colors.halt);
  const balText = (bal: number) => (Math.abs(bal) < 0.01 ? t('settled_up') : `${bal > 0 ? '+' : ''}${formatCurrency(bal)}`);

  return (
    <AppModal visible={visible} onDismiss={onDismiss} eyebrow={`${members.length}`} title={t('members')} subtitle={isOwner ? t('member_swipe_hint', { defaultValue: '' }) : undefined}>
      {members.map((m, i, arr) => (
        <SwipeableRow
          key={m.id}
          background="transparent"
          rightActions={isOwner && !m.isSelf ? [{ icon: 'account-remove-outline', tone: 'halt', onPress: () => onRemove(m), accessibilityLabel: t('member_remove_title') }] : []}
        >
          <View style={[styles.row, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }]}>
            <Body size="md" weight="medium" style={{ flex: 1 }} numberOfLines={1}>{m.name}{m.isSelf ? ` · ${t('you')}` : ''}</Body>
            <Money size="sm" style={{ color: balColor(m.balance) }}>{balText(m.balance)}</Money>
          </View>
        </SwipeableRow>
      ))}
      {isOwner ? (
        <Button mode="contained" icon="account-plus-outline" onPress={onAdd} buttonColor={colors.go} textColor={colors.onAccent} style={{ borderRadius: 999, marginTop: 14 }}>
          {t('add_member')}
        </Button>
      ) : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
});
