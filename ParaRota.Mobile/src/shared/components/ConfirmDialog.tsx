import { Button, Dialog, Portal} from 'react-native-paper';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Body, Display, Eyebrow } from './Typography';
import { RouteLine } from './RouteLine';

interface Props {
  visible: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive,
  loading,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation('common');
  const { colors } = useAppTheme();
  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onCancel}
        style={{ backgroundColor: colors.paper, borderRadius: 16, borderWidth: 1, borderColor: colors.line }}
      >
        {title ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
            <Eyebrow tone={destructive ? 'halt' : 'mute'}>
              {destructive ? t('confirmDestructive', { defaultValue: 'Destructive action' }) : t('confirm', { defaultValue: 'Confirm' })}
            </Eyebrow>
            <Display size="sm" style={{ marginTop: 4 }}>{title}</Display>
            <RouteLine style={{ marginTop: 8 }} />
          </View>
        ) : null}
        {message ? (
          <Dialog.Content style={{ paddingTop: 12 }}>
            <Body tone="soft">{message}</Body>
          </Dialog.Content>
        ) : null}
        <Dialog.Actions>
          <Button onPress={onCancel} disabled={loading} textColor={colors.inkSoft}>
            {cancelLabel ?? t('cancel')}
          </Button>
          <Button
            mode="contained"
            onPress={onConfirm}
            loading={loading}
            buttonColor={destructive ? colors.halt : colors.go}
            textColor={colors.onAccent}
          >
            {confirmLabel ?? t('confirm')}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
