import { useEffect, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable, Keyboard, ScrollView } from 'react-native';
import { Button, TextInput, Menu, HelperText, Divider, Icon } from 'react-native-paper';
import { AppDateTimePicker } from '@shared/components/AppDateTimePicker';
import { useTranslation } from 'react-i18next';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { AppModal } from '@shared/components/AppModal';
import { Body, Eyebrow, Money } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { useCategoriesQuery } from '@features/categories/api/useCategories';
import { CategoryFormModal } from '@features/categories/components/CategoryFormModal';
import { useCreateRecurringRule, useUpdateRecurringRule } from '@features/recurring/api/useRecurringRules';
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { formatCurrency, formatDate } from '@shared/lib/dateFormat';
import { normalizeIconName } from '@shared/lib/iconName';
import type { RecurringRuleDto } from '@shared/api/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  /** Doluysa düzenleme modu: yalnız açıklama/kategori/not değişir (tutar/sayı/tarih kilitli). */
  initial?: RecurringRuleDto | null;
}

const QUICK_COUNTS = [2, 3, 6, 9, 12] as const;

/**
 * Taksitli alışveriş formu. Kullanıcı toplam tutarı YA DA aylık taksiti girer (toggle);
 * diğeri ve son taksit küsuratı canlı önizlemede görünür. Kayıt mevcut RecurringRule
 * altyapısına düşer (aylık, gider, autoApprove) — geçmiş başlangıçta motor backfill eder.
 */
export function InstallmentFormModal({ visible, onDismiss, initial }: Props) {
  const { t } = useTranslation('installments');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const create = useCreateRecurringRule();
  const update = useUpdateRecurringRule(initial?.id ?? 0);
  const cats = useCategoriesQuery();

  const [description, setDescription] = useState('');
  const [amountMode, setAmountMode] = useState<'total' | 'monthly'>('total');
  const [amountInput, setAmountInput] = useState('');
  const [count, setCount] = useState(6);
  const [countInput, setCountInput] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [firstDate, setFirstDate] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [catMenu, setCatMenu] = useState(false);
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAttempted(false);
    if (initial) {
      setDescription(initial.description);
      setCategoryId(initial.categoryId);
      setNotes(initial.notes ?? '');
      setCount(initial.installmentCount ?? 2);
      setAmountInput(formatAmountInput(String(initial.installmentTotalAmount ?? initial.amount)));
      setAmountMode('total');
      setFirstDate(new Date(initial.startDate));
    } else {
      setDescription('');
      setAmountMode('total');
      setAmountInput('');
      setCount(6);
      setCountInput('');
      setCategoryId(null);
      setFirstDate(new Date());
      setNotes('');
    }
  }, [visible, initial]);

  const expenseCats = (cats.data ?? []).filter((c) => c.type === 'expense');
  const activeCat = expenseCats.find((c) => c.id === categoryId);

  const entered = parseAmount(amountInput);
  const amountValid = Number.isFinite(entered) && entered > 0;
  // Aylık taksit her zaman 2 haneye yuvarlanır; küsurat farkı son taksitte kapanır.
  const total = amountMode === 'total' ? entered : Math.round(entered * count * 100) / 100;
  const monthly = amountMode === 'total' ? Math.round((entered / count) * 100) / 100 : entered;
  const lastInstallment = Math.round((total - monthly * (count - 1)) * 100) / 100;
  const hasResidual = amountValid && Math.abs(lastInstallment - monthly) >= 0.01;

  const descInvalid = !description.trim();
  const catInvalid = !categoryId;
  const canSubmit = !descInvalid && !catInvalid && amountValid && count >= 2;

  const submit = async () => {
    if (!canSubmit) {
      setAttempted(true);
      toast.error(tCommon('fillRequired'));
      return;
    }
    try {
      if (initial) {
        // Kilitli alanlar (tutar/sıklık/başlangıç) entity'deki değerleriyle aynen geri gönderilir.
        await update.mutateAsync({
          description: description.trim(),
          nature: 'fixed',
          categoryId: categoryId!,
          amount: initial.amount,
          currency: initial.currency,
          frequency: 'monthly',
          startDate: initial.startDate,
          endDate: initial.endDate,
          autoApprove: initial.autoApprove,
          isActive: initial.isActive,
          notes: notes.trim() || undefined,
        });
        toast.success(t('toastUpdated'));
      } else {
        await create.mutateAsync({
          description: description.trim(),
          type: 'expense',
          nature: 'fixed',
          categoryId: categoryId!,
          amount: monthly,
          currency: 'TRY',
          frequency: 'monthly',
          startDate: firstDate.toISOString(),
          autoApprove: true,
          notes: notes.trim() || undefined,
          installmentCount: count,
          installmentTotalAmount: total,
        });
        toast.success(t('toastCreated'));
      }
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  const busy = create.isPending || update.isPending;
  const locked = !!initial;

  return (
    <AppModal
      visible={visible}
      onDismiss={onDismiss}
      eyebrow={t('eyebrow')}
      title={locked ? t('modalEditTitle') : t('modalCreateTitle')}
      subtitle={locked ? t('modalEditSubtitle') : t('modalCreateSubtitle')}
    >
      <ScopeIndicator />

      <View>
        <TextInput
          mode="outlined"
          label={t('formDescriptionLabel')}
          placeholder={t('formDescriptionPlaceholder')}
          value={description}
          onChangeText={setDescription}
          error={attempted && descInvalid}
        />
        <HelperText type="error" visible={attempted && descInvalid} style={styles.helper}>{tCommon('required')}</HelperText>
      </View>

      {!locked ? (
        <>
          {/* Toplam ↔ Aylık: kullanıcı hangisini biliyorsa onu girer, diğerini biz hesaplarız */}
          <View>
            <Eyebrow tone="mute" style={styles.label}>{t('formAmountModeLabel')}</Eyebrow>
            <View style={[styles.seg, { borderColor: colors.line, backgroundColor: colors.bgAlt }]}>
              {(['total', 'monthly'] as const).map((m) => {
                const on = amountMode === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setAmountMode(m)}
                    style={[styles.segBtn, on && { backgroundColor: colors.ink }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Body size="sm" weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.paper : colors.inkSoft }}>
                      {t(m === 'total' ? 'amountModeTotal' : 'amountModeMonthly')}
                    </Body>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <TextInput
              mode="outlined"
              label={amountMode === 'total' ? t('formTotalLabel') : t('formMonthlyLabel')}
              value={amountInput}
              onChangeText={(v) => setAmountInput(formatAmountInput(v, amountInput))}
              keyboardType="decimal-pad"
              left={<TextInput.Affix text="₺" />}
              error={attempted && !amountValid}
            />
            <HelperText type="error" visible={attempted && !amountValid} style={styles.helper}>{tCommon('required')}</HelperText>
          </View>

          {/* Taksit sayısı: hızlı chip'ler + serbest giriş */}
          <View>
            <Eyebrow tone="mute" style={styles.label}>{t('formCountLabel')}</Eyebrow>
            <View style={styles.countRow}>
              {QUICK_COUNTS.map((c) => {
                const on = count === c && countInput === '';
                return (
                  <Pressable
                    key={c}
                    onPress={() => { setCount(c); setCountInput(''); Keyboard.dismiss(); }}
                    style={[styles.chip, { borderColor: on ? colors.go : colors.line, backgroundColor: on ? colorAlpha(colors.go, 0.12) : 'transparent' }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Body size="sm" weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.go : colors.inkSoft }}>{c}</Body>
                  </Pressable>
                );
              })}
              <TextInput
                mode="outlined"
                dense
                placeholder={t('formCountOther')}
                value={countInput}
                onChangeText={(v) => {
                  const digits = v.replace(/[^0-9]/g, '');
                  setCountInput(digits);
                  const n = Number(digits);
                  if (n >= 2 && n <= 120) setCount(n);
                }}
                keyboardType="number-pad"
                style={styles.countInput}
              />
            </View>
          </View>

          <Pressable onPress={() => { Keyboard.dismiss(); setShowDate(true); }}>
            <View pointerEvents="none">
              <TextInput mode="outlined" label={t('formFirstDateLabel')} value={formatDate(firstDate)} editable={false} right={<TextInput.Icon icon="calendar-outline" />} />
            </View>
          </Pressable>
          <AppDateTimePicker
            visible={showDate}
            value={firstDate}
            mode="date"
            onConfirm={(d) => { setFirstDate(d); setShowDate(false); }}
            onCancel={() => setShowDate(false)}
          />
        </>
      ) : (
        // Düzenlemede plan çekirdeği kilitli — kullanıcıya neden değiştiremediğini söyle.
        <View style={[styles.lockedBox, { backgroundColor: colors.bgAlt, borderColor: colors.line }]}>
          <Icon source="lock-outline" size={15} color={colors.inkMute} />
          <View style={{ flex: 1 }}>
            <Body size="sm" weight="bold">
              {initial!.installmentCount} × {formatCurrency(initial!.amount, initial!.currency)}
            </Body>
            <Body size="xs" tone="mute" style={{ marginTop: 2 }}>{t('lockedHint')}</Body>
          </View>
        </View>
      )}

      <View>
        <Menu
          visible={catMenu}
          onDismiss={() => setCatMenu(false)}
          anchor={
            <Pressable onPress={() => { Keyboard.dismiss(); setCatMenu(true); }}>
              <View pointerEvents="none">
                <TextInput mode="outlined" label={t('formCategoryLabel')} value={activeCat?.name ?? ''} editable={false} error={attempted && catInvalid} right={<TextInput.Icon icon="menu-down" />} />
              </View>
            </Pressable>
          }
          contentStyle={{ backgroundColor: colors.paper }}
        >
          {/* Hızlı kategori ekleme — kaydırmadan hep görünür (listenin üstünde) */}
          <Menu.Item
            leadingIcon="plus"
            title={tCommon('quickAddCategory')}
            titleStyle={{ color: colors.go }}
            onPress={() => { setCatMenu(false); setCatFormOpen(true); }}
          />
          <Divider />
          {/* Çok sayıda kategori ekrana sığmıyordu → gelir/giderdeki gibi sınırlı,
              kaydırılabilir liste (maxHeight + nestedScroll). */}
          <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {expenseCats.map((c) => (
              <Menu.Item key={c.id} title={c.name} leadingIcon={normalizeIconName(c.icon)} onPress={() => { setCategoryId(c.id); setCatMenu(false); }} />
            ))}
          </ScrollView>
        </Menu>
        <HelperText type="error" visible={attempted && catInvalid} style={styles.helper}>{tCommon('required')}</HelperText>
      </View>

      <TextInput mode="outlined" label={t('formNotesLabel')} value={notes} onChangeText={setNotes} multiline numberOfLines={2} />

      {/* Canlı önizleme: "6 × ₺1.666,67 · son taksit ₺1.666,65" + bitiş ayı */}
      {!locked && amountValid ? (
        <View style={[styles.preview, { backgroundColor: colorAlpha(colors.go, 0.07), borderColor: colorAlpha(colors.go, 0.28) }]}>
          <View style={styles.previewHead}>
            <Icon source="credit-card-clock-outline" size={14} color={colors.go} />
            <Eyebrow style={{ color: colors.go }}>{t('previewEyebrow')}</Eyebrow>
          </View>
          <View style={styles.previewLine}>
            <Money size="md" style={{ color: colors.go }}>{count} × {formatCurrency(monthly)}</Money>
            <Body size="sm" tone="mute"> = {formatCurrency(total)}</Body>
          </View>
          {hasResidual ? (
            <Body size="xs" tone="mute" style={{ marginTop: 2 }}>{t('previewResidual', { amount: formatCurrency(lastInstallment) })}</Body>
          ) : null}
          <Body size="xs" tone="mute" style={{ marginTop: 2 }}>
            {t('previewEnds', { date: formatDate(new Date(firstDate.getFullYear(), firstDate.getMonth() + count - 1, 1)) })}
          </Body>
        </View>
      ) : null}

      <Button
        mode="contained"
        icon={busy ? undefined : 'check'}
        loading={busy}
        disabled={busy}
        onPress={submit}
        buttonColor={colors.go}
        textColor={colors.onAccent}
        style={{ borderRadius: 999 }}
        contentStyle={{ paddingVertical: 6 }}
      >
        {locked ? tCommon('save') : tCommon('add')}
      </Button>

      <CategoryFormModal
        visible={catFormOpen}
        onDismiss={() => setCatFormOpen(false)}
        presetType="expense"
        onCreated={(c) => { if (c.type === 'expense') setCategoryId(c.id); }}
      />
    </AppModal>
  );
}

const styles = StyleSheet.create({
  helper: { marginBottom: -8 },
  label: { marginBottom: 8 },
  seg: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, padding: 3 },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 999 },
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  countInput: { width: 86, height: 40 },
  lockedBox: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  preview: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 13 },
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewLine: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
});
