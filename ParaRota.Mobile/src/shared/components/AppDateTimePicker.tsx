import { useEffect, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Modal, Portal, Button } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';

interface Props {
  visible: boolean;
  value: Date;
  mode?: 'date' | 'time' | 'datetime';
  maximumDate?: Date;
  minimumDate?: Date;
  /** Kullanıcı bir tarih onaylayınca (iOS'ta "Tamam", Android'de native "set"). */
  onConfirm: (date: Date) => void;
  /** İptal / dışına dokunma. */
  onCancel: () => void;
}

/**
 * Tema-uyumlu tarih/saat seçici. iOS'ta inline picker formun İÇİNE açılıp alan kaplıyor +
 * kapanmıyordu; burada iOS'ta picker'ı modalın ÜSTÜNDE yüzen bir POPUP kart içinde gösteriyoruz
 * (İptal/Tamam ile kapanır). Android'de native diyalog zaten popup olarak açılır.
 */
export function AppDateTimePicker({ visible, value, mode = 'date', maximumDate, minimumDate, onConfirm, onCancel }: Props) {
  const { colors, dark } = useAppTheme();
  const { t } = useTranslation('common');
  const [temp, setTemp] = useState(value);

  useEffect(() => {
    if (visible) setTemp(value);
  }, [visible, value]);

  // Android (+web): native diyalog zaten popup; visible olunca aç, kendi kapanır.
  if (Platform.OS !== 'ios') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        display="default"
        maximumDate={maximumDate}
        minimumDate={minimumDate}
        themeVariant={dark ? 'dark' : 'light'}
        accentColor={colors.go}
        onChange={(e, d) => {
          if (e.type === 'set' && d) onConfirm(d);
          else onCancel();
        }}
      />
    );
  }

  // iOS: modal üstünde yüzen popup kart (İptal / Tamam).
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onCancel}
        contentContainerStyle={[styles.card, { backgroundColor: colors.paper, borderColor: colors.line }]}
      >
        <View style={styles.header}>
          <Button onPress={onCancel} textColor={colors.inkMute} compact>{t('cancel')}</Button>
          <Button onPress={() => onConfirm(temp)} textColor={colors.go} compact>{t('done')}</Button>
        </View>
        <DateTimePicker
          value={temp}
          mode={mode}
          display="inline"
          maximumDate={maximumDate}
          minimumDate={minimumDate}
          themeVariant={dark ? 'dark' : 'light'}
          accentColor={colors.go}
          onChange={(_, d) => { if (d) setTemp(d); }}
          style={styles.picker}
        />
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingTop: 4,
  },
  picker: { alignSelf: 'center' },
});
