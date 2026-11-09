import { useEffect, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { TextInput, Icon, ActivityIndicator } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { Body, Eyebrow } from '@shared/components/Typography';
import { useTefasSearch } from '@features/investments/api/useInvestments';

interface Props {
  code: string;
  name: string | null;
  onSelect: (code: string, name: string, price: number) => void;
  error?: boolean;
}

// TEFAS fon aramalı seçici (mobil): seçili fonu gösteren alana dokununca açılır;
// kod/ad ile aranır, listeden seçilir. Elle kod ezberlemeye gerek yok.
// AppModal gövdesi ScrollView olduğundan FlatList değil capped .map() kullanılır.
export function TefasFundPicker({ code, name, onSelect, error }: Props) {
  const { t } = useTranslation('investments');
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  // Her tuşta istek atmamak için 300ms debounce.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(id);
  }, [query]);

  const { data, isFetching } = useTefasSearch(debounced, open);
  const results = data ?? [];

  return (
    <View>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        style={[styles.field, { borderColor: error ? colors.halt : colors.line, backgroundColor: colors.bgAlt }]}
      >
        <Icon source={name ? 'check-circle' : 'magnify'} size={18} color={name ? colors.go : colors.inkMute} />
        <View style={{ flex: 1 }}>
          {name ? (
            <>
              <Body weight="bold" numberOfLines={1}>{code}</Body>
              <Eyebrow tone="mute" numberOfLines={1}>{name}</Eyebrow>
            </>
          ) : (
            <Body tone="mute">{t('form_fundPick')}</Body>
          )}
        </View>
        <Icon source={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.inkMute} />
      </Pressable>

      {open ? (
        <View style={[styles.panel, { borderColor: colors.line, backgroundColor: colors.bg }]}>
          <TextInput
            mode="outlined"
            dense
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder={t('form_fundSearchPlaceholder')}
            left={<TextInput.Icon icon="magnify" />}
            right={isFetching ? <TextInput.Icon icon={() => <ActivityIndicator size={16} />} /> : undefined}
            autoCapitalize="characters"
          />
          <View style={{ marginTop: 4 }}>
            {results.length === 0 && !isFetching ? (
              <Eyebrow tone="mute" style={{ padding: 12 }}>{t('form_fundNoResult')}</Eyebrow>
            ) : (
              results.slice(0, 25).map((f) => {
                const on = f.code === code;
                return (
                  <Pressable
                    key={f.code}
                    onPress={() => { onSelect(f.code, f.name, f.price); setOpen(false); setQuery(''); }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.row, { borderBottomColor: colorAlpha(colors.line, 0.6), backgroundColor: on ? colorAlpha(colors.go, 0.08) : 'transparent' }]}
                  >
                    <Body weight="bold" style={styles.rowCode}>{f.code}</Body>
                    <Body size="sm" numberOfLines={1} style={{ flex: 1, color: colors.inkSoft }}>{f.name}</Body>
                  </Pressable>
                );
              })
            )}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  panel: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowCode: { width: 56 },
});
