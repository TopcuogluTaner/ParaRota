import { View, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Portal, Text, IconButton, TextInput, Icon } from 'react-native-paper';

const ICONS = [
  'cart-outline', 'food', 'food-fork-drink', 'cup', 'coffee', 'glass-mug',
  'home-outline', 'lightbulb-outline', 'water', 'fire', 'wifi', 'cellphone',
  'car-outline', 'bus', 'train', 'airplane', 'gas-station', 'parking',
  'cash', 'cash-multiple', 'wallet-outline', 'credit-card-outline', 'bank-outline', 'piggy-bank-outline',
  'shopping', 'tshirt-crew', 'shoe-formal', 'gift-outline', 'spa-outline', 'medical-bag',
  'school-outline', 'book-open-page-variant', 'pencil-outline', 'briefcase-outline', 'office-building-outline', 'laptop',
  'gamepad-variant-outline', 'movie-outline', 'music', 'television-classic', 'controller-classic',
  'dumbbell', 'soccer', 'basketball', 'bike', 'run',
  'hospital-box-outline', 'pill', 'heart-pulse', 'tooth-outline', 'baby',
  'dog', 'cat', 'paw',
  'tree-outline', 'flower-outline',
  'umbrella-outline', 'weather-sunny', 'snowflake',
  'star-outline', 'heart-outline', 'palette-outline',
  'wrench-outline', 'tools', 'hammer-screwdriver',
  'chart-line', 'finance', 'trending-up',
];

interface Props {
  visible: boolean;
  value: string;
  onDismiss: () => void;
  onChange: (icon: string) => void;
}

export function CategoryIconPicker({ visible, value, onDismiss, onChange }: Props) {
  const theme = useAppTheme();
  const { t } = useTranslation('common');
  const [search, setSearch] = useState('');
  const filtered = search ? ICONS.filter((i) => i.toLowerCase().includes(search.toLowerCase())) : ICONS;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.header}>
          <Text variant="titleMedium">{t('pickIcon')}</Text>
          <IconButton icon="close" onPress={onDismiss} />
        </View>
        <TextInput
          mode="outlined"
          dense
          placeholder={t('search')}
          value={search}
          onChangeText={setSearch}
          style={{ marginBottom: 12 }}
        />
        <ScrollView style={{ maxHeight: 360 }}>
          <View style={styles.grid}>
            {filtered.map((icon) => {
              const selected = icon === value;
              return (
                <Pressable
                  key={icon}
                  onPress={() => {
                    onChange(icon);
                    onDismiss();
                  }}
                  style={[
                    styles.cell,
                    {
                      backgroundColor: selected ? theme.colors.primaryContainer : theme.colors.surface,
                      borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                    },
                  ]}
                >
                  <Icon source={icon} size={26} color={selected ? theme.colors.primary : theme.colors.onSurface} />
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: { margin: 20, padding: 16, borderRadius: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
