import { useEffect, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet } from 'react-native';
import { Snackbar, Portal } from 'react-native-paper';
import { subscribeToasts, dismissToast } from '@shared/lib/toast';
import { Body, Eyebrow } from './Typography';

type Severity = 'info' | 'success' | 'warning' | 'error';
interface Item {
  id: number;
  message: string;
  severity: Severity;
}

export function ToastHost() {
  const [items, setItems] = useState<Item[]>([]);
  const { colors } = useAppTheme();

  useEffect(() => subscribeToasts(setItems), []);

  const visible = items[0];
  if (!visible) return null;

  const accent =
    visible.severity === 'error'
      ? colors.halt
      : visible.severity === 'warning'
        ? colors.way
        : visible.severity === 'success'
          ? colors.go
          : colors.sky;

  // Portal'a sarılır: modal/paywall gibi Paper Portal'larıyla aynı katmanda render
  // edilir; yüksek zIndex/elevation ile her zaman onların ÜSTÜNDE kalır (önceden
  // toast modalın arkasında kalıyordu — açık modalken hata mesajı görünmüyordu).
  return (
    <Portal>
      <View pointerEvents="box-none" style={styles.host}>
        <Snackbar
          visible
          onDismiss={() => dismissToast(visible.id)}
          duration={visible.severity === 'error' ? 5000 : 3000}
          style={{
            backgroundColor: colors.heroBg,
            borderRadius: 12,
            borderLeftWidth: 3,
            borderLeftColor: accent,
          }}
        >
          <View>
            <Eyebrow style={{ color: colors.heroFgMute }}>{visible.severity}</Eyebrow>
            <Body style={{ color: colors.heroFg, marginTop: 2 }}>{visible.message}</Body>
          </View>
        </Snackbar>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 8, right: 8, bottom: 8, zIndex: 9999, elevation: 9999 },
});
