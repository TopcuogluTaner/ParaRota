import type { ReactNode } from 'react';
import { useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable } from 'react-native';
import { Menu } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Body, Display, Eyebrow } from './Typography';
import { RouteLine } from './RouteLine';
import { BrandMark } from './BrandMark';
import { AuthGlass } from './AuthGlass';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { SUPPORTED_LANGS, changeLanguage } from '@shared/i18n';

interface Props {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Footer link area. e.g. "Have an account? Sign in →" */
  footer?: ReactNode;
}

/**
 * Alt auth ekranları (register, forgot, reset, verify) için Liquid Glass çerçevesi.
 * Atmosfer + buzlu cam kart AuthGlass'ten gelir; üstte geri + dil, kart içinde marka +
 * eyebrow/başlık/alt başlık + içerik + footer.
 */
export function AuthFrame({ eyebrow, title, subtitle, children, footer }: Props) {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { t, i18n } = useTranslation('common');
  const [langMenu, setLangMenu] = useState(false);
  const currentLang = SUPPORTED_LANGS.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGS[0];

  const topBar = (
    <>
      <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel={t('back')}>
        <View style={[styles.chip, { borderColor: colorAlpha(colors.ink, 0.2), backgroundColor: colorAlpha(colors.paper, 0.5) }]}>
          <Eyebrow tone="mute">← {t('back')}</Eyebrow>
        </View>
      </Pressable>

      <Menu
        visible={langMenu}
        onDismiss={() => setLangMenu(false)}
        anchor={
          <Pressable
            onPress={() => setLangMenu(true)}
            style={[styles.chip, { borderColor: colorAlpha(colors.ink, 0.2), backgroundColor: colorAlpha(colors.paper, 0.5) }]}
            accessibilityRole="button"
            accessibilityLabel={currentLang.label}
          >
            <Body size="sm">{currentLang.flag}</Body>
            <Eyebrow tone="mute">{currentLang.code.toUpperCase()}</Eyebrow>
          </Pressable>
        }
        contentStyle={{ backgroundColor: colors.paper }}
      >
        {SUPPORTED_LANGS.map((l) => (
          <Menu.Item key={l.code} title={`${l.flag}  ${l.label}`} onPress={() => { void changeLanguage(l.code); setLangMenu(false); }} />
        ))}
      </Menu>
    </>
  );

  return (
    <AuthGlass topBar={topBar}>
      <BrandMark size={32} />
      <Eyebrow tone="mute" style={{ marginTop: 16 }}>{eyebrow}</Eyebrow>
      <Display size="lg" italic style={{ marginTop: 8 }}>{title}</Display>
      {subtitle ? <Body size="md" tone="soft" style={{ marginTop: 8 }}>{subtitle}</Body> : null}
      <RouteLine style={{ marginVertical: 22 }} color={colorAlpha(colors.ink, 0.18)} />
      {children}
      {footer ? (
        <>
          <RouteLine style={{ marginTop: 26 }} color={colorAlpha(colors.ink, 0.18)} />
          <View style={styles.footer}>{footer}</View>
        </>
      ) : null}
    </AuthGlass>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: { marginTop: 16, alignItems: 'center' },
});
