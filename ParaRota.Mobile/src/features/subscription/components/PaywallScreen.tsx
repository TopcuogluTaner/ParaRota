import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { View, StyleSheet, Pressable, Linking, ActivityIndicator } from 'react-native';
import { Icon } from 'react-native-paper';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, {
  FadeInDown,
  ReduceMotion,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { Screen } from '@shared/components/Screen';
import { PressableScale } from '@shared/components/PressableScale';
import { Body, Display, Eyebrow, Money } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { motion } from '@shared/lib/motion';
import { toast } from '@shared/lib/toast';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { useEntitlement } from '../hooks/useEntitlement';
import type { PremiumFeature } from '../lib/paywallNav';
import {
  getCurrentOffering,
  purchasePackage,
  restorePurchases,
  hasActivePremium,
  isPurchasesAvailable,
  type PurchasesPackage,
} from '../lib/purchases';

const TERMS_URL = 'https://pararotam.com/terms';
const PRIVACY_URL = 'https://pararotam.com/privacy';

// Premium özelliklerin tanıtım listesi (i18n key'leri). Aile en üstte —
// abonelik "tek kişilik araç" değil "hane aboneliği" olarak okunmalı.
const FEATURE_KEYS = ['household', 'investments', 'receipts', 'ai'] as const;
const FEATURE_ICONS: Record<(typeof FEATURE_KEYS)[number], string> = {
  household: 'account-group-outline',
  investments: 'chart-line',
  receipts: 'receipt-text-outline',
  ai: 'creation',
};

// Kademeli giriş — paywall NADİR görülür (Emil: rare → delight hakkı var).
// Tek iyi orkestre edilmiş yükleme, dağınık mikro-animasyonlardan değerlidir.
const enter = (step: number) =>
  FadeInDown.duration(motion.duration.base)
    .delay(step * 60)
    .easing(motion.easing.out)
    .reduceMotion(ReduceMotion.System);

const isAnnualPkg = (p: PurchasesPackage) =>
  /annual|year/i.test(p.identifier) || p.packageType === 'ANNUAL';

/** Yıllık paketin "≈ aylık" karşılığı — değer algısını fiyatın yanına koyar. */
function monthlyEquivalent(pkg: PurchasesPackage): string | null {
  if (!isAnnualPkg(pkg)) return null;
  const { price, currencyCode } = pkg.product;
  if (!price || !currencyCode) return null;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 0,
    }).format(price / 12);
  } catch {
    return null;
  }
}

/**
 * Tam ekran paywall ROUTE içeriği (/(app)/paywall) — "Calm Ledger"ın premium
 * sayfası. Uygulamanın para istediği tek ekran olduğu için inverse hero
 * panelini (dashboard özeti gibi) hak eder; altı sade defter düzenidir.
 */
export function PaywallScreen({ feature = 'generic' }: { feature?: PremiumFeature }) {
  const { colors } = useAppTheme();
  const { t } = useTranslation('paywall');
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const { isInTrial, trialDaysLeft } = useEntitlement();

  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    getCurrentOffering()
      .then((offering) => {
        if (!active) return;
        const pkgs = offering?.availablePackages ?? [];
        // Yıllık üstte (en iyi değer önce okunur) ve varsayılan seçili.
        const sorted = [...pkgs].sort((a, b) => Number(isAnnualPkg(b)) - Number(isAnnualPkg(a)));
        setPackages(sorted);
        setSelectedId(sorted[0]?.identifier ?? null);
      })
      .catch(() => active && setPackages([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const selected = useMemo(
    () => packages.find((p) => p.identifier === selectedId) ?? null,
    [packages, selectedId],
  );

  const closeScreen = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(app)/(tabs)');
  };

  async function onPurchase() {
    if (!selected) return;
    setBusy(true);
    try {
      const info = await purchasePackage(selected);
      // Anlık UX için SDK'dan kontrol; otorite backend → /auth/me tazele.
      await fetchUser();
      if (hasActivePremium(info)) toast.success(t('toast.purchaseSuccess'));
      closeScreen();
    } catch (err: unknown) {
      // Kullanıcı iptal ederse hata gösterme.
      const cancelled = (err as { userCancelled?: boolean })?.userCancelled;
      if (!cancelled) toast.error(t('toast.purchaseFailed'));
    } finally {
      setBusy(false);
    }
  }

  async function onRestore() {
    setBusy(true);
    try {
      const info = await restorePurchases();
      await fetchUser();
      if (hasActivePremium(info)) {
        toast.success(t('toast.restoreSuccess'));
        closeScreen();
      } else {
        toast.info(t('toast.restoreEmpty'));
      }
    } catch {
      toast.error(t('toast.restoreFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      {/* Kapat — paywall her zaman vazgeçilebilir olmalı (mağaza kuralı + UX). */}
      <View style={styles.topBar}>
        <PressableScale
          scaleTo={0.94}
          onPress={busy ? undefined : closeScreen}
          hitSlop={10}
          style={[styles.closeBtn, { borderColor: colors.line }]}
          accessibilityRole="button"
        >
          <Icon source="close" size={20} color={colors.ink} />
        </PressableScale>
      </View>

      {/* Hero — marka yeşili "para" paneli (go = para; paywall bunu hak eden tek ekran).
          Eski inverse (siyah) panel aydınlık temada yabancı duruyordu. */}
      <Animated.View entering={enter(0)} style={[styles.hero, { backgroundColor: colors.go }]}>
        <View style={styles.heroHead}>
          <Eyebrow style={{ color: colorAlpha(colors.onAccent, 0.7) }}>{t('eyebrow')}</Eyebrow>
          <Icon source="crown-outline" size={22} color={colors.onAccent} />
        </View>
        <Display size="lg" style={{ color: colors.onAccent, marginTop: 10 }}>
          {t('title')}
        </Display>
        <Body size="sm" style={{ color: colorAlpha(colors.onAccent, 0.85), marginTop: 6, lineHeight: 20 }}>
          {t('subtitle')}
        </Body>
        {isInTrial && trialDaysLeft != null ? (
          <View style={[styles.trialChip, { backgroundColor: colorAlpha(colors.onAccent, 0.18) }]}>
            <Icon source="clock-outline" size={13} color={colors.onAccent} />
            <Body size="xs" weight="bold" style={{ color: colors.onAccent }}>
              {t('trial.daysLeft', { count: trialDaysLeft })}
            </Body>
          </View>
        ) : null}
      </Animated.View>

      {/* Özellikler — kart yığını değil, hairline'lı defter satırları */}
      <Animated.View
        entering={enter(1)}
        style={[styles.ledger, { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow }]}
      >
        {FEATURE_KEYS.map((key, i) => {
          const highlighted = key === feature;
          return (
            <View key={key}>
              {i > 0 ? <View style={[styles.hairline, { backgroundColor: colors.line }]} /> : null}
              <View style={[styles.featureRow, highlighted && { backgroundColor: colors.goGlow }]}>
                <View style={[styles.featureIcon, { backgroundColor: colorAlpha(colors.go, 0.1) }]}>
                  <Icon source={FEATURE_ICONS[key]} size={18} color={colors.go} />
                </View>
                <View style={{ flex: 1 }}>
                  <Body size="sm" weight="medium">{t(`features.${key}.title`)}</Body>
                  <Body size="xs" tone="soft" style={{ marginTop: 1 }}>{t(`features.${key}.desc`)}</Body>
                </View>
                <Icon
                  source={highlighted ? 'lock-open-variant-outline' : 'check'}
                  size={16}
                  color={highlighted ? colors.go : colors.inkMute}
                />
              </View>
            </View>
          );
        })}
      </Animated.View>

      {/* Plan seçimi */}
      <Animated.View entering={enter(2)} style={{ paddingHorizontal: 20 }}>
        {loading ? (
          <ActivityIndicator style={{ marginVertical: 28 }} color={colors.go} />
        ) : packages.length > 0 ? (
          <View style={{ gap: 10, marginTop: 18 }}>
            {packages.map((pkg) => {
              const isAnnual = isAnnualPkg(pkg);
              const equiv = monthlyEquivalent(pkg);
              return (
                <PlanCard
                  key={pkg.identifier}
                  selected={pkg.identifier === selectedId}
                  onPress={() => setSelectedId(pkg.identifier)}
                >
                  <View style={{ flex: 1 }}>
                    <Body weight="medium">{isAnnual ? t('plan.yearly') : t('plan.monthly')}</Body>
                    {isAnnual ? (
                      <Eyebrow tone="go" style={{ marginTop: 3, fontSize: 10 }}>{t('plan.bestValue')}</Eyebrow>
                    ) : null}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    {/* Fiyat = kahraman rakam (Calm Ledger: rakamlar büyük, etiketler sessiz) */}
                    <Money size="lg" numberOfLines={1} adjustsFontSizeToFit>
                      {pkg.product.priceString}
                    </Money>
                    {equiv ? (
                      <Body size="xs" tone="mute" style={{ marginTop: 1 }}>
                        {t('plan.perMonthEquiv', { price: equiv })}
                      </Body>
                    ) : null}
                  </View>
                </PlanCard>
              );
            })}
          </View>
        ) : (
          // SDK yapılandırılmamış / offering yok — fiyatlar yine de plan kartı
          // dilinde okunur ve SEÇİLEBİLİR (önizleme); satın alma kapalı notu altta.
          <View style={{ gap: 10, marginTop: 18 }}>
            <PlanCard
              selected={(selectedId ?? 'static-yearly') === 'static-yearly'}
              onPress={() => setSelectedId('static-yearly')}
            >
              <View style={{ flex: 1 }}>
                <Body weight="medium">{t('plan.yearly')}</Body>
                <Eyebrow tone="go" style={{ marginTop: 3, fontSize: 10 }}>{t('plan.bestValue')}</Eyebrow>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Money size="lg">{t('plan.staticYearlyPrice')}</Money>
                <Body size="xs" tone="mute" style={{ marginTop: 1 }}>
                  {t('plan.perMonthEquiv', { price: t('plan.staticYearlyEquiv') })}
                </Body>
              </View>
            </PlanCard>
            <PlanCard
              selected={selectedId === 'static-monthly'}
              onPress={() => setSelectedId('static-monthly')}
            >
              <View style={{ flex: 1 }}>
                <Body weight="medium">{t('plan.monthly')}</Body>
              </View>
              <Money size="lg">{t('plan.staticMonthlyPrice')}</Money>
            </PlanCard>
            <Body size="xs" tone="mute" align="center" style={{ marginTop: 4 }}>
              {isPurchasesAvailable() ? t('empty.noOffering') : t('empty.unavailable')}
            </Body>
          </View>
        )}
      </Animated.View>

      <Animated.View entering={enter(3)} style={{ paddingHorizontal: 20 }}>
        {/* CTA — basınca tepki veren tek güçlü blok; fiyat CTA'nın içinde okunur */}
        <PressableScale
          onPress={onPurchase}
          disabled={!selected || busy}
          accessibilityRole="button"
          style={[styles.cta, { backgroundColor: colors.go, opacity: !selected || busy ? 0.55 : 1 }]}
        >
          {busy ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <>
              <Body weight="bold" style={{ color: colors.onAccent }}>{t('cta.subscribe')}</Body>
              {selected ? (
                <Money size="sm" style={{ color: colors.onAccent }}>{selected.product.priceString}</Money>
              ) : null}
            </>
          )}
        </PressableScale>

        <Pressable onPress={busy ? undefined : onRestore} style={styles.restore} hitSlop={6}>
          <Body size="sm" tone="soft" style={styles.link}>{t('cta.restore')}</Body>
        </Pressable>

        <Body size="xs" tone="mute" align="center" style={{ marginTop: 12, lineHeight: 18 }}>
          {t('legal.autoRenew')}
        </Body>
        <View style={styles.legalLinks}>
          <Pressable onPress={() => Linking.openURL(TERMS_URL)} hitSlop={6}>
            <Body size="xs" tone="soft" style={styles.link}>{t('legal.terms')}</Body>
          </Pressable>
          <Body size="xs" tone="mute"> · </Body>
          <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={6}>
            <Body size="xs" tone="soft" style={styles.link}>{t('legal.privacy')}</Body>
          </Pressable>
        </View>
      </Animated.View>
    </Screen>
  );
}

/**
 * Seçilebilir plan kartı — seçim, renk SIÇRAMASI yerine 180ms ease-out ile
 * kenarlık/zemin/radyo geçişi yapar (kesintiye dayanıklı: hızlı dokunuşlarda
 * mevcut değerden devam eder).
 */
function PlanCard({ selected, onPress, children }: { selected: boolean; onPress: () => void; children: ReactNode }) {
  const { colors } = useAppTheme();
  const p = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    p.value = withTiming(selected ? 1 : 0, { duration: motion.duration.fast, easing: motion.easing.out });
  }, [selected, p]);

  const cardStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(p.value, [0, 1], [colors.line, colors.go]),
    backgroundColor: interpolateColor(p.value, [0, 1], [colors.paper, colors.goGlow]),
  }));
  const ringStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(p.value, [0, 1], [colors.lineStrong, colors.go]),
  }));
  // Nokta 0'dan değil 0.5'ten büyür (Emil: hiçbir şey yoktan var olmaz).
  const dotStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scale: 0.5 + 0.5 * p.value }],
  }));

  return (
    <PressableScale onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected }}>
      <Animated.View style={[styles.planCard, cardStyle]}>
        {children}
        <Animated.View style={[styles.radio, ringStyle]}>
          <Animated.View style={[styles.radioDot, { backgroundColor: colors.go }, dotStyle]} />
        </Animated.View>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 14, paddingTop: 8, marginBottom: 4 },
  closeBtn: {
    width: 38, height: 38, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
  hero: { marginHorizontal: 20, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 22 },
  heroHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  trialChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999, marginTop: 14,
  },
  ledger: {
    marginHorizontal: 20, marginTop: 14, borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden',
  },
  hairline: { height: StyleSheet.hairlineWidth, marginLeft: 58 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, paddingHorizontal: 14 },
  featureIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  planCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 16,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
  cta: {
    marginTop: 18, height: 54, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  restore: { alignSelf: 'center', marginTop: 14, paddingVertical: 2 },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 6 },
  link: { textDecorationLine: 'underline' },
});
