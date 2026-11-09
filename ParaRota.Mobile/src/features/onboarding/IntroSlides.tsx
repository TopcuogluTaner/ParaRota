import type { ReactNode } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import AppIntroSlider from 'react-native-app-intro-slider';
import { Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { Display, Body, Eyebrow, Money } from '@shared/components/Typography';
import { DonutChart } from '@shared/components/charts/TrendBars';
import { colorAlpha } from '@shared/lib/colorAlpha';

interface Slide {
  key: string;
  titleKey: string;
  textKey: string;
}

const SLIDES: Slide[] = [
  { key: 'hero', titleKey: 'onboarding.slide1_title', textKey: 'onboarding.slide1_text' },
  { key: 'add', titleKey: 'onboarding.slide2_title', textKey: 'onboarding.slide2_text' },
  { key: 'scope', titleKey: 'onboarding.slide3_title', textKey: 'onboarding.slide3_text' },
  { key: 'donut', titleKey: 'onboarding.slide4_title', textKey: 'onboarding.slide4_text' },
  { key: 'export', titleKey: 'onboarding.slide5_title', textKey: 'onboarding.slide5_text' },
];

interface Props {
  visible: boolean;
  onDone: () => void;
}

// İlk girişte tam ekran karşılama slaytları. İkon yerine uygulamanın gerçek
// parçalarının canlı mini-önizlemesi (örnek veriyle) — "ekran görüntüsü" hissi.
export function IntroSlides({ visible, onDone }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation(['common', 'dashboard', 'pages', 'exports']);
  const insets = useSafeAreaInsets();

  const Pill = ({ label, tone }: { label: string; tone: 'go' | 'mute' }) => (
    <View
      style={[
        styles.pill,
        tone === 'go'
          ? { backgroundColor: colors.go }
          : { backgroundColor: 'transparent', borderColor: colors.line, borderWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <Body weight="bold" style={{ color: tone === 'go' ? colors.onAccent : colors.inkMute }}>{label}</Body>
    </View>
  );

  // ── Mini önizlemeler (gerçek bileşen/token + örnek veri) ──
  const Frame = ({ children }: { children: ReactNode }) => (
    <View style={[styles.frame, { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow }]}>
      {children}
    </View>
  );

  const HeroPreview = () => (
    <Frame>
      <Eyebrow tone="mute">{t('dashboard:stat_net')}</Eyebrow>
      <Money size="xl" style={{ color: colors.go, fontSize: 34, lineHeight: 40, marginTop: 6 }}>+₺12.450</Money>
      <View style={[styles.hr, { backgroundColor: colors.line }]} />
      <View style={styles.statRow}>
        <View style={styles.stat}>
          <Display size="sm">₺28.000</Display>
          <Eyebrow tone="mute" style={{ marginTop: 2 }}>{t('dashboard:stat_income')}</Eyebrow>
        </View>
        <View style={[styles.vline, { backgroundColor: colors.line }]} />
        <View style={styles.stat}>
          <Display size="sm">%44</Display>
          <Eyebrow tone="mute" style={{ marginTop: 2 }}>{t('dashboard:stat_savings')}</Eyebrow>
        </View>
      </View>
    </Frame>
  );

  const AddPreview = () => {
    const Row = ({ icon, tone, label }: { icon: string; tone: string; label: string }) => (
      <View style={styles.addRow}>
        <View style={[styles.addIcon, { backgroundColor: colorAlpha(tone, 0.14) }]}>
          <Icon source={icon} size={18} color={tone} />
        </View>
        <Body weight="bold" style={{ flex: 1 }}>{label}</Body>
      </View>
    );
    return (
      <Frame>
        <Row icon="camera-outline" tone={colors.go} label={t('pages:transactions.quickMenu_scan')} />
        <View style={[styles.hrThin, { backgroundColor: colors.line }]} />
        <Row icon="pencil-outline" tone={colors.ink} label={t('pages:transactions.quickMenu_manual')} />
        <View style={[styles.plusBtn, { backgroundColor: colors.go }]}>
          <Icon source="plus" size={22} color={colors.onAccent} />
        </View>
      </Frame>
    );
  };

  const ScopePreview = () => (
    <Frame>
      <View style={styles.chipRow}>
        <View style={[styles.chip, { backgroundColor: colors.paper, borderColor: colors.lineStrong }]}>
          <Icon source="account" size={13} color={colors.inkSoft} />
          <Body size="xs" weight="bold" style={{ color: colors.inkSoft }}>{t('common:scope_personal', { defaultValue: 'Kişisel' })}</Body>
          <Icon source="menu-down" size={14} color={colors.inkMute} />
        </View>
        <View style={[styles.chip, { backgroundColor: colorAlpha(colors.go, 0.12), borderColor: colorAlpha(colors.go, 0.45) }]}>
          <Icon source="account-group" size={13} color={colors.go} />
          <Body size="xs" weight="bold" style={{ color: colors.go }}>{t('common:scope_household', { defaultValue: 'Aile' })}</Body>
          <Icon source="menu-down" size={14} color={colors.go} />
        </View>
      </View>
      <View style={[styles.familyMini, { borderColor: colors.line }]}>
        <View style={[styles.addIcon, { backgroundColor: colorAlpha(colors.go, 0.14) }]}>
          <Icon source="account-group" size={18} color={colors.go} />
        </View>
        <Body weight="bold" style={{ flex: 1 }}>{t('common:scope_household', { defaultValue: 'Aile' })}</Body>
        <View style={styles.memberPips}>
          <View style={[styles.pip, { backgroundColor: colors.go }]} />
          <View style={[styles.pip, { backgroundColor: colors.sky, marginLeft: -6 }]} />
        </View>
      </View>
    </Frame>
  );

  const DonutPreview = () => {
    const data = [
      { label: t('onboarding.demoCat_market'), value: 4200, color: '#5B8A72' },
      { label: t('onboarding.demoCat_rent'), value: 3000, color: '#4A6D8C' },
      { label: t('onboarding.demoCat_transport'), value: 1500, color: '#C99846' },
      { label: t('onboarding.demoCat_fun'), value: 900, color: '#B05F47' },
    ];
    return (
      <Frame>
        <View style={{ alignItems: 'center' }}>
          <DonutChart data={data} size={150} thickness={20} centerValue="₺9.600" centerLabel={t('dashboard:stat_expense')} />
        </View>
      </Frame>
    );
  };

  const ExportPreview = () => {
    const Doc = ({ icon, tone, title, sub, badge }: { icon: string; tone: string; title: string; sub: string; badge: string }) => (
      <View style={[styles.exportRow, { borderColor: colors.line }]}>
        <View style={[styles.addIcon, { backgroundColor: colorAlpha(tone, 0.14) }]}>
          <Icon source={icon} size={20} color={tone} />
        </View>
        <View style={{ flex: 1 }}>
          <Body weight="bold">{title}</Body>
          <Eyebrow tone="mute" style={{ marginTop: 1 }}>{sub}</Eyebrow>
        </View>
        <View style={[styles.exportBadge, { backgroundColor: colorAlpha(tone, 0.14) }]}>
          <Body size="xs" weight="bold" style={{ color: tone }}>{badge}</Body>
        </View>
      </View>
    );
    return (
      <Frame>
        <Doc icon="file-pdf-box" tone={colors.halt} title={t('exports:card_monthlyPdf_title')} sub={t('exports:page_eyebrow')} badge="PDF" />
        <View style={{ height: 10 }} />
        <Doc icon="file-excel-box" tone={colors.go} title={t('exports:card_transactionsXlsx_title')} sub={t('exports:page_eyebrow')} badge="XLSX" />
        <View style={styles.exportShareRow}>
          <Icon source="export-variant" size={15} color={colors.inkMute} />
          <Eyebrow tone="mute">{t('common:export')}</Eyebrow>
        </View>
      </Frame>
    );
  };

  const preview = (key: string) => {
    if (key === 'hero') return <HeroPreview />;
    if (key === 'add') return <AddPreview />;
    if (key === 'scope') return <ScopePreview />;
    if (key === 'export') return <ExportPreview />;
    return <DonutPreview />;
  };

  return (
    <Modal visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onDone}>
      {/* Alt boşluk: Android jest navigasyonunda insets.bottom çok küçük kalıyor,
          Atla/Devam butonları sistemin dokunmatik bölgesine denk geliyor — min 16 + 12 pay. */}
      <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) + 12 }}>
        <AppIntroSlider
          data={SLIDES}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <View style={styles.previewWrap}>{preview(item.key)}</View>
              <Display size="lg" align="center" style={{ marginTop: 28 }}>{t(item.titleKey)}</Display>
              <Body size="md" tone="soft" align="center" style={{ marginTop: 10, lineHeight: 22, maxWidth: 320 }}>
                {t(item.textKey)}
              </Body>
            </View>
          )}
          onDone={onDone}
          onSkip={onDone}
          showSkipButton
          renderNextButton={() => <Pill label={t('onboarding.next')} tone="go" />}
          renderDoneButton={() => <Pill label={t('onboarding.done')} tone="go" />}
          renderSkipButton={() => <Pill label={t('onboarding.skip')} tone="mute" />}
          activeDotStyle={{ backgroundColor: colors.go }}
          dotStyle={{ backgroundColor: colors.line }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  previewWrap: { width: '100%', alignItems: 'center', minHeight: 200, justifyContent: 'center' },
  frame: { width: '92%', maxWidth: 360, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 18 },
  hr: { height: StyleSheet.hairlineWidth, marginVertical: 14 },
  hrThin: { height: StyleSheet.hairlineWidth, marginVertical: 6, marginLeft: 52 },
  statRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center' },
  vline: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: 2 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  addIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  plusBtn: { width: 44, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 14 },
  chipRow: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 10, paddingRight: 5, paddingVertical: 6, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  familyMini: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  memberPips: { flexDirection: 'row', alignItems: 'center' },
  pip: { width: 18, height: 18, borderRadius: 999 },
  pill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  exportRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  exportBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  exportShareRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 14 },
});
