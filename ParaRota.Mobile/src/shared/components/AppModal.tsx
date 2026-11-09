import { useEffect, useState, type ReactNode } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions, Keyboard, Platform, BackHandler, type StyleProp, type ViewStyle } from 'react-native';
import { Modal, Portal, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { Body, Display, Eyebrow } from './Typography';
import { RouteLine } from './RouteLine';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  /** Başlık üstü küçük etiket. */
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children: ReactNode;
  /** İçeriği kaydırılabilir yap (uzun formlar). Varsayılan true. */
  scroll?: boolean;
  /** Arka planı buzlu cam ile bulanıklaştır. Varsayılan true. */
  blur?: boolean;
  /** Dışarı dokunma ile kapanma. false ise dışarı dokunuş modal'ı KAPATMAZ,
      yalnızca açık klavyeyi kapatır. Varsayılan true. */
  dismissable?: boolean;
  /** Android geri tuşu ile kapanma; dismissable=false iken bile geri tuşunu açık
      tutmak için ayrı verilir. Varsayılan: dismissable ile aynı. */
  dismissableBackButton?: boolean;
  /** Başlık satırına sağdan eklenecek opsiyonel öğe (kapat ikonundan önce). */
  headerRight?: ReactNode;
  /** Gövde (body) için ek stil — gap/padding özelleştirmek isteyen modallar için. */
  bodyStyle?: StyleProp<ViewStyle>;
}

// Tüm form modallarının ortak iskeleti: Portal + buzlu-cam backdrop + standart
// başlık (eyebrow/title/subtitle + kapat) + RouteLine + klavye-dostu gövde.
// Her modal yalnızca kendi alanlarını children olarak verir; blur/başlık/klavye
// davranışı burada tek yerde yönetilir. (Paper Modal'ın koyu scrim'i hafif tinte
// indirilip blur öne çıkarılır; blur ayrı Portal'da DEĞİL — aynı Portal'da Modal'dan
// ÖNCE render edilir ki altta kalsın, kart net görünsün.)
export function AppModal({
  visible,
  onDismiss,
  eyebrow,
  title,
  subtitle,
  children,
  scroll = true,
  blur = true,
  dismissable = true,
  dismissableBackButton,
  headerRight,
  bodyStyle,
}: Props) {
  const { colors, dark } = useAppTheme();
  const { t: tCommon } = useTranslation('common');
  const { height } = useWindowDimensions();
  const hasHeader = !!(eyebrow || title || subtitle || headerRight);

  // Android + edge-to-edge: pencere klavye açılınca yeniden boyutlanmıyor
  // (adjustResize etkisiz) ve ScrollView'deki automaticallyAdjustKeyboardInsets
  // yalnızca iOS'ta çalışıyor → input klavyenin altında kalıyordu. Çözüm:
  // klavye yüksekliğini dinle, (1) Modal wrapper'ına o kadar alt padding ver
  // (ortalanan kart görünür alana taşınır), (2) ScrollView maxHeight'ini
  // kısalt (kart klavyenin üstüne sığar, odaklı input içeride kayar).
  // iOS'ta 0 kalır; oradaki davranış değişmez.
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e) => setKbHeight(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // ScrollView'e somut bir maxHeight ver: kısa içerikte kart içeriğe yapışır
  // (alt beyaz boşluk yok), uzun içerikte burada kayar. Header + margin + safe
  // area için ~240px pay bırakılır; klavye açıkken onun yüksekliği de düşülür.
  const scrollMaxHeight = Math.max(220, height - 240 - kbHeight);

  // dismissable=false: Paper Modal'a yine dismissable=true verilir ki backdrop
  // dokunuşu yakalanabilsin; ama dokunuş modal'ı kapatmak yerine yalnızca
  // klavyeyi kapatır (klavyeyi kapatmak için dışarı dokunan kullanıcı modal'ı
  // kaybetmesin). Geri tuşu ise aşağıdaki handler'la gerçek kapatmaya bağlanır.
  const handlePaperDismiss = () => {
    if (dismissable) {
      onDismiss();
    } else {
      Keyboard.dismiss();
    }
  };

  // Paper'ın kendi geri tuşu handler'ı yukarıdaki handlePaperDismiss'e düşer ve
  // dismissable=false iken modal'ı kapatmaz; geri tuşuyla kapanma isteniyorsa
  // burada kendi handler'ımızı kaydederiz. Paper'ınkinden SONRA kaydolduğu için
  // (child effect'ler önce çalışır) BackHandler bunu önce çağırır.
  const backCloses = dismissableBackButton ?? dismissable;
  useEffect(() => {
    if (Platform.OS !== 'android' || !visible || dismissable || !backCloses) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onDismiss();
      return true;
    });
    return () => sub.remove();
  }, [visible, dismissable, backCloses, onDismiss]);

  return (
    <Portal>
      {visible && blur ? (
        <BlurView
          intensity={dark ? 38 : 28}
          tint={dark ? 'dark' : 'light'}
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <Modal
        visible={visible}
        onDismiss={handlePaperDismiss}
        dismissable
        theme={{ colors: { backdrop: colorAlpha(dark ? '#000000' : '#1A1A17', 0.18) } }}
        style={kbHeight > 0 ? { paddingBottom: kbHeight } : undefined}
        contentContainerStyle={[styles.modal, { backgroundColor: colors.bg }]}
      >
        {hasHeader ? (
          <>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                {eyebrow ? <Eyebrow tone="mute">{eyebrow}</Eyebrow> : null}
                {title ? <Display size="sm" style={{ marginTop: 2 }}>{title}</Display> : null}
                {subtitle ? <Body size="xs" tone="mute" style={{ marginTop: 2 }}>{subtitle}</Body> : null}
              </View>
              {headerRight}
              <IconButton icon="close" onPress={onDismiss} accessibilityLabel={tCommon('close')} />
            </View>
            <RouteLine style={{ marginHorizontal: 16 }} />
          </>
        ) : null}

        {scroll ? (
          <ScrollView
            style={[styles.scroll, { maxHeight: scrollMaxHeight }]}
            contentContainerStyle={[styles.body, bodyStyle]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets
            bounces={false}
            alwaysBounceVertical={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.body, bodyStyle]}>{children}</View>
        )}
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { margin: 16, borderRadius: 18, padding: 0, overflow: 'hidden' },
  // flexShrink:1 → içerik kısaysa kart içeriğe yapışır (altta beyaz boşluk yok),
  // uzunsa modal maxHeight'te durup ScrollView kayar.
  scroll: { flexGrow: 0, flexShrink: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  body: { padding: 16, gap: 14 },
});
