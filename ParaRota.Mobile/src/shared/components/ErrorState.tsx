import { View, StyleSheet } from 'react-native';
import { Button, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { Body, Display } from './Typography';
import { RouteLine } from './RouteLine';

interface Props {
  /** Hata mesajı (yoksa generic gösterilir). */
  message?: string;
  /** Verilirse "Yeniden dene" butonu çıkar — genelde query.refetch. */
  onRetry?: () => void;
  icon?: string;
}

/**
 * Veri çekme HATASI durumunda gösterilir — EmptyState ("veri yok") ile karıştırılmamalı.
 * Liste ekranlarında `isError && !data` dalında kullanılır.
 */
export function ErrorState({ message, onRetry, icon = 'alert-circle-outline' }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation('common');
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { borderColor: colors.line, backgroundColor: colors.paper }]}>
        <Icon source={icon} size={36} color={colors.halt} />
      </View>
      <Display size="sm" align="center" style={{ marginTop: 8 }}>{t('error')}</Display>
      {message ? (
        <Body size="sm" tone="soft" align="center" style={{ marginTop: 6, maxWidth: 320 }}>
          {message}
        </Body>
      ) : null}
      <RouteLine style={{ marginTop: 18, width: 120 }} />
      {onRetry ? (
        <Button
          mode="outlined"
          icon="refresh"
          onPress={onRetry}
          style={{ marginTop: 18 }}
        >
          {t('retry')}
        </Button>
      ) : null}
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
