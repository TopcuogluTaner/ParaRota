import { useEffect, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Button, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { AppModal } from '@shared/components/AppModal';
import { Eyebrow } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { notifyError } from '@shared/lib/apiError';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { authApi } from '@features/auth/api/authApi';
import { AVATAR_COLORS, AVATAR_ICONS, buildAvatar, parseAvatar } from '../lib/avatar';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

// Profil rozeti seçici: küratörlü ikon + renk (galeriden resim yok — DB'de
// yalnız "ikon|#RRGGBB" metni tutulur). Canlı önizleme üstte; kaydet sunucuya
// yazar ve store'daki kullanıcıyı yerinde günceller (yeniden /me çağrısı yok).
export function AvatarPickerModal({ visible, onDismiss }: Props) {
  const { t } = useTranslation('pages');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const user = useAuthStore((s) => s.user);
  const current = parseAvatar(user?.avatar);

  const [icon, setIcon] = useState<string>(current?.icon ?? AVATAR_ICONS[0]);
  const [color, setColor] = useState<string>(current?.color ?? AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      const cur = parseAvatar(useAuthStore.getState().user?.avatar);
      setIcon(cur?.icon ?? AVATAR_ICONS[0]);
      setColor(cur?.color ?? AVATAR_COLORS[0]);
    }
  }, [visible]);

  const apply = async (next: string | null) => {
    setSaving(true);
    try {
      const resp = await authApi.setAvatar(next);
      if (!resp.data.isSuccess) {
        notifyError({ response: { data: resp.data } });
        return;
      }
      useAuthStore.setState((s) => (s.user ? { user: { ...s.user, avatar: next } } : {}));
      onDismiss();
    } catch (err) {
      notifyError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      visible={visible}
      onDismiss={onDismiss}
      eyebrow={t('profile.eyebrow')}
      title={t('profile.avatarTitle', { defaultValue: 'Profil Rozeti' })}
      subtitle={t('profile.avatarSubtitle', { defaultValue: 'Seni temsil eden bir ikon ve renk seç.' })}
    >
      {/* Canlı önizleme — seçim anında yansır */}
      <View style={styles.previewWrap}>
        <View style={[styles.preview, { backgroundColor: color }]}>
          <Icon source={icon} size={34} color="#FFFFFF" />
        </View>
      </View>

      {/* Renkler */}
      <Eyebrow tone="mute" style={styles.label}>{t('categories.formColorLabel', { defaultValue: 'Renk' })}</Eyebrow>
      <View style={styles.swatches}>
        {AVATAR_COLORS.map((c) => {
          const on = color === c;
          return (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[styles.swatch, { backgroundColor: c, borderColor: on ? colors.ink : 'transparent' }]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              {on ? <Icon source="check" size={15} color="#FFFFFF" /> : null}
            </Pressable>
          );
        })}
      </View>

      {/* İkonlar */}
      <Eyebrow tone="mute" style={styles.label}>{t('categories.formIconLabel', { defaultValue: 'İkon' })}</Eyebrow>
      <View style={styles.iconGrid}>
        {AVATAR_ICONS.map((ic) => {
          const on = icon === ic;
          return (
            <Pressable
              key={ic}
              onPress={() => setIcon(ic)}
              style={[
                styles.iconCell,
                {
                  backgroundColor: on ? colorAlpha(color, 0.16) : colors.bgAlt,
                  borderColor: on ? color : colors.line,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={ic}
            >
              <Icon source={ic} size={22} color={on ? color : colors.inkSoft} />
            </Pressable>
          );
        })}
      </View>

      <Button
        mode="contained"
        icon="check"
        loading={saving}
        disabled={saving}
        onPress={() => void apply(buildAvatar(icon, color))}
        buttonColor={colors.go}
        textColor={colors.onAccent}
        style={{ borderRadius: 999, marginTop: 18 }}
        contentStyle={{ paddingVertical: 6 }}
      >
        {tCommon('save')}
      </Button>
      {user?.avatar ? (
        <Button
          mode="text"
          icon="close-circle-outline"
          disabled={saving}
          onPress={() => void apply(null)}
          textColor={colors.inkSoft}
        >
          {t('profile.avatarRemove', { defaultValue: 'Rozeti kaldır' })}
        </Button>
      ) : null}
    </AppModal>
  );
}

const styles = StyleSheet.create({
  previewWrap: { alignItems: 'center', marginTop: 2 },
  preview: { width: 72, height: 72, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  label: { marginTop: 16, marginBottom: 8 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  iconCell: {
    width: 46,
    height: 46,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
