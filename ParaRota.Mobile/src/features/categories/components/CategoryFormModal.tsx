import { useEffect, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable } from 'react-native';
import { Button, TextInput, Icon, HelperText } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { AppModal } from '@shared/components/AppModal';
import { Body } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { CategoryIconPicker } from '@shared/components/CategoryIconPicker';
import { useCreateCategory, useUpdateCategory } from '@features/categories/api/useCategories';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { normalizeIconName } from '@shared/lib/iconName';
import type { CategoryDto, TxType } from '@shared/api/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  initial?: CategoryDto | null;
  /** Hızlı ekleme bağlamı (işlem/bütçe formu içinden): tür ön seçili gelir
      (değiştirilebilir) — gider formundan açılınca gider seçili başlar. */
  presetType?: TxType;
  /** Oluşturma başarılı olunca yeni kategoriyle çağrılır (hızlı ekle → otomatik seç). */
  onCreated?: (created: CategoryDto) => void;
}

const PALETTE = ['#1976d2', '#0ea5e9', '#14b8a6', '#10b981', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#6366f1', '#64748b'];

export function CategoryFormModal({ visible, onDismiss, initial, presetType, onCreated }: Props) {
  const { t } = useTranslation('pages');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const create = useCreateCategory();
  const update = useUpdateCategory(initial?.id ?? 0);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('shape-outline');
  const [color, setColor] = useState('#1976d2');
  const [type, setType] = useState<TxType>('expense');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (visible) {
      setAttempted(false);
      setName(initial?.name ?? '');
      setIcon(normalizeIconName(initial?.icon, 'shape-outline'));
      setColor(initial?.color ?? '#1976d2');
      setType(initial?.type ?? presetType ?? 'expense');
    }
  }, [visible, initial, presetType]);

  const nameInvalid = !name.trim();

  const submit = async () => {
    if (nameInvalid) {
      setAttempted(true);
      toast.error(tCommon('fillRequired'));
      return;
    }
    try {
      if (initial) {
        await update.mutateAsync({ name, icon, color });
        toast.success(t('categories.toastUpdateSuccess'));
      } else {
        const created = await create.mutateAsync({ name, icon, color, type });
        toast.success(t('categories.toastCreateSuccess'));
        onCreated?.(created);
      }
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <>
      <AppModal
        visible={visible}
        onDismiss={onDismiss}
        eyebrow={t('categories.eyebrow')}
        title={initial ? t('categories.modalEditTitle') : t('categories.modalCreateTitle')}
        subtitle={initial ? t('categories.modalEditSubtitle') : t('categories.modalCreateSubtitle')}
      >
        <ScopeIndicator />

        {/* Canlı önizleme: ikona dokun → seçici; ad yanında. Renk/ikon anında yansır. */}
        <View style={styles.heroRow}>
          <Pressable
            onPress={() => setPickerOpen(true)}
            style={[styles.preview, { backgroundColor: color }]}
            accessibilityRole="button"
            accessibilityLabel={t('categories.formIconLabel')}
          >
            <Icon source={icon} color="#fff" size={28} />
            <View style={[styles.editBadge, { backgroundColor: colors.paper, borderColor: colors.line }]}>
              <Icon source="pencil" size={11} color={colors.ink} />
            </View>
          </Pressable>
          <TextInput
            mode="outlined"
            label={t('categories.formNameLabel')}
            placeholder={t('categories.formNamePlaceholder')}
            value={name}
            onChangeText={setName}
            error={attempted && nameInvalid}
            style={{ flex: 1 }}
          />
        </View>
        <HelperText type="error" visible={attempted && nameInvalid}>{tCommon('required')}</HelperText>

        {/* Renk paleti — hex yazmak yerine dokun-seç */}
        <Body size="sm" weight="bold" style={styles.sectionLabel}>{t('categories.formColorLabel')}</Body>
        <View style={styles.swatches}>
          {PALETTE.map((c) => {
            const on = color.toLowerCase() === c.toLowerCase();
            return (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                style={[styles.swatch, { backgroundColor: c, borderColor: on ? colors.ink : 'transparent' }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                {on ? <Icon source="check" size={16} color="#fff" /> : null}
              </Pressable>
            );
          })}
        </View>

        {/* Tip — açıklamalı kartlar (yalnız oluştururken; var olanın türü sabit).
            Hızlı eklemede çağıran formun türü ÖN SEÇİLİ gelir ama değiştirilebilir. */}
        {!initial ? (
          <>
            <Body size="sm" weight="bold" style={styles.sectionLabel}>{t('categories.formTypeLabel')}</Body>
            <View style={styles.optRow}>
              <TypeCard icon="trending-down" title={t('categories.tabExpense')} desc={t('categories.formTypeExpenseDesc')} active={type === 'expense'} tone={colors.halt} onPress={() => setType('expense')} colors={colors} />
              <TypeCard icon="trending-up" title={t('categories.tabIncome')} desc={t('categories.formTypeIncomeDesc')} active={type === 'income'} tone={colors.go} onPress={() => setType('income')} colors={colors} />
            </View>
          </>
        ) : null}

        <Button
          mode="contained"
          icon={busy ? undefined : (initial ? 'content-save-outline' : 'plus')}
          loading={busy}
          disabled={busy}
          onPress={submit}
          buttonColor={colors.go}
          textColor={colors.onAccent}
          style={{ borderRadius: 999, marginTop: 18 }}
          contentStyle={{ paddingVertical: 6 }}
        >
          {initial ? tCommon('save') : tCommon('add')}
        </Button>
      </AppModal>

      <CategoryIconPicker visible={pickerOpen} value={icon} onDismiss={() => setPickerOpen(false)} onChange={setIcon} />
    </>
  );
}

interface TypeCardProps {
  icon: string;
  title: string;
  desc: string;
  active: boolean;
  tone: string;
  onPress: () => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
}

function TypeCard({ icon, title, desc, active, tone, onPress, colors }: TypeCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.typeCard, { borderColor: active ? tone : colors.line, backgroundColor: active ? colorAlpha(tone, 0.1) : 'transparent', opacity: pressed ? 0.75 : 1 }]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Icon source={icon} size={20} color={active ? tone : colors.inkSoft} />
      <Body size="sm" weight="bold" style={{ color: active ? tone : colors.ink, marginTop: 6 }}>{title}</Body>
      <Body size="xs" tone="mute" style={styles.typeDesc} numberOfLines={2}>{desc}</Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  preview: { width: 60, height: 60, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  editBadge: { position: 'absolute', right: -4, bottom: -4, width: 22, height: 22, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { marginTop: 14, marginBottom: 8 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  swatch: { width: 36, height: 36, borderRadius: 999, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  optRow: { flexDirection: 'row', gap: 8 },
  typeCard: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  typeDesc: { textAlign: 'center', marginTop: 4, lineHeight: 15 },
});
