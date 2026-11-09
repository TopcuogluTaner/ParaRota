import { View, ScrollView, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { CopilotStep } from 'react-native-copilot';
import { WalkView } from '@features/onboarding/tour';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { PressableScale } from '@shared/components/PressableScale';
import { Body, Eyebrow } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { formatCurrency } from '@shared/lib/dateFormat';
import { normalizeIconName } from '@shared/lib/iconName';
import { useSubscriptionCatalogQuery } from '@features/recurring/api/useSubscriptionCatalog';
import type { SubscriptionCatalogItemDto } from '@shared/api/types';

interface Props {
  onSelect: (item: SubscriptionCatalogItemDto, categoryId: number) => void;
}

// Katalogdaki marka ikonu (mdi:netflix vb.) yüklü MDI sürümünde olmayabilir —
// glyphmap'te yoksa jenerik "autorenew" ikonuna düş. Paper'ın kendi fallback
// zinciriyle aynı modül; expo'nun içine gömülü olduğundan static import yerine
// require (Metro alias'ı çözer, çözemezse doğrulama atlanır).
let mdiGlyphMap: Record<string, number> | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  mdiGlyphMap = require('@expo/vector-icons/MaterialCommunityIcons').default?.glyphMap;
} catch {
  mdiGlyphMap = undefined;
}

function safeIcon(icon: string): string {
  const name = normalizeIconName(icon, 'autorenew');
  return mdiGlyphMap && !(name in mdiGlyphMap) ? 'autorenew' : name;
}

/**
 * "Popüler abonelikler" şeridi — Tekrarlayanlar listesinin başında yatay kaydırılır.
 * Dokunuş yalnızca formu önceden doldurulmuş açar; kullanıcı onaylamadan kayıt oluşmaz.
 * Katalog yüklenemezse şerit sessizce gizlenir (nice-to-have, ekranı bloklamaz).
 */
export function PopularSubscriptionsStrip({ onSelect }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation('pages');
  const { t: tCommon } = useTranslation('common');
  const { data } = useSubscriptionCatalogQuery();

  if (!data || data.items.length === 0) return null;

  return (
    // Tur adımı strip'in içinde: katalog yüklenmediyse strip null döner ve adım hiç kaydolmaz.
    <CopilotStep text={tCommon('onboarding.tour_rec_popular')} order={2} name="rec-popular">
    <WalkView>
    <View style={styles.wrap}>
      <Eyebrow tone="mute" style={styles.title}>{t('recurring.popularTitle')}</Eyebrow>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {data.items.map((item) => (
          <PressableScale
            key={item.key}
            onPress={() => onSelect(item, data.categoryId)}
            accessibilityRole="button"
            accessibilityLabel={`${item.name} · ${formatCurrency(item.suggestedAmount, item.currency)}`}
            style={[styles.card, { backgroundColor: colors.paper, borderColor: colors.line }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: colorAlpha(item.color, 0.14) }]}>
              <Icon source={safeIcon(item.icon)} size={20} color={item.color} />
            </View>
            {/* İki satıra sarar ("Spotify Premi…" kesiği yerine); minHeight kart yüksekliklerini eşitler. */}
            <Body size="sm" weight="bold" numberOfLines={2} style={styles.name}>{item.name}</Body>
            <Eyebrow tone="mute">{formatCurrency(item.suggestedAmount, item.currency)}</Eyebrow>
          </PressableScale>
        ))}
      </ScrollView>
    </View>
    </WalkView>
    </CopilotStep>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 6 },
  title: { paddingHorizontal: 16, marginBottom: 8 },
  row: { gap: 8, paddingHorizontal: 16 },
  card: {
    width: 124,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 6,
    alignItems: 'flex-start',
  },
  iconCircle: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { minHeight: 36 },
});
