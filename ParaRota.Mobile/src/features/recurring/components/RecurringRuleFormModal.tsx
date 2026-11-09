import { useEffect, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable, Keyboard, ScrollView } from 'react-native';
import { Button, TextInput, Menu, Switch, HelperText, Divider, Icon } from 'react-native-paper';
import { AppDateTimePicker as DateTimePicker } from '@shared/components/AppDateTimePicker';
import { useTranslation } from 'react-i18next';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { AppModal } from '@shared/components/AppModal';
import { Body, Eyebrow, Money } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { useCategoriesQuery } from '@features/categories/api/useCategories';
import { CategoryFormModal } from '@features/categories/components/CategoryFormModal';
import { useCreateRecurringRule, useUpdateRecurringRule } from '@features/recurring/api/useRecurringRules';
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import { CURRENCIES } from '@shared/constants/currencies';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { formatCurrency, formatDate } from '@shared/lib/dateFormat';
import { normalizeIconName } from '@shared/lib/iconName';
import type { RecurringFrequency, RecurringRuleDto, TxNature, TxType } from '@shared/api/types';

// Katalogdan gelen ön doldurma — yalnız create modunda uygulanır, kullanıcı her alanı değiştirebilir.
export interface RecurringRulePreset {
  description: string;
  categoryId: number;
  amount: number;
  currency: string;
  frequency: RecurringFrequency;
}

interface Props {
  visible: boolean;
  onDismiss: () => void;
  initial?: RecurringRuleDto | null;
  preset?: RecurringRulePreset | null;
}

const FREQS: RecurringFrequency[] = ['daily', 'weekly', 'monthly', 'yearly'];
const FREQ_KEY: Record<RecurringFrequency, string> = {
  daily: 'recurring.freqDaily',
  weekly: 'recurring.freqWeekly',
  monthly: 'recurring.freqMonthly',
  yearly: 'recurring.freqYearly',
};

export function RecurringRuleFormModal({ visible, onDismiss, initial, preset }: Props) {
  const { t } = useTranslation('pages');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const create = useCreateRecurringRule();
  const update = useUpdateRecurringRule(initial?.id ?? 0);
  const cats = useCategoriesQuery();

  const [description, setDescription] = useState('');
  const [type, setType] = useState<TxType>('expense');
  const [nature, setNature] = useState<TxNature>('fixed');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = useState(new Date());
  const [autoApprove, setAutoApprove] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState('');
  const [showStart, setShowStart] = useState(false);
  const [catMenu, setCatMenu] = useState(false);
  const [curMenu, setCurMenu] = useState(false);
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAttempted(false);
    if (initial) {
      setDescription(initial.description);
      setType(initial.type);
      setNature(initial.nature);
      setCategoryId(initial.categoryId);
      setAmount(formatAmountInput(String(initial.amount)));
      setCurrency(initial.currency);
      setFrequency(initial.frequency);
      setStartDate(new Date(initial.startDate));
      setAutoApprove(initial.autoApprove);
      setIsActive(initial.isActive);
      setNotes(initial.notes ?? '');
    } else {
      setDescription(preset?.description ?? '');
      setType('expense');
      setNature('fixed');
      setCategoryId(preset?.categoryId ?? null);
      setAmount(preset ? formatAmountInput(String(preset.amount)) : '');
      setCurrency(preset?.currency ?? 'TRY');
      setFrequency(preset?.frequency ?? 'monthly');
      setStartDate(new Date());
      setAutoApprove(true);
      setIsActive(true);
      setNotes('');
    }
  }, [visible, initial, preset]);

  const filteredCats = (cats.data ?? []).filter((c) => c.type === type);
  const activeCat = filteredCats.find((c) => c.id === categoryId);
  const selectedCurrency = CURRENCIES.find((c) => c.code === currency) ?? CURRENCIES[0];
  const amt = parseAmount(amount);
  const descInvalid = !description;
  const catInvalid = !categoryId;
  const amtInvalid = !(Number.isFinite(amt) && amt > 0);
  const canSubmit = !descInvalid && !catInvalid && !amtInvalid;
  const typeColor = type === 'income' ? colors.go : colors.halt;
  // Canlı önizleme: tutar + açıklama girilince kuralın ne yapacağı cümle olarak görünür.
  const previewReady = !amtInvalid && !descInvalid;

  const submit = async () => {
    if (!canSubmit) {
      setAttempted(true);
      toast.error(tCommon('fillRequired'));
      return;
    }
    try {
      const base = {
        description,
        nature,
        categoryId: categoryId!,
        amount: amt,
        currency,
        frequency,
        startDate: startDate.toISOString(),
        autoApprove,
        notes: notes || undefined,
      };
      if (initial) {
        await update.mutateAsync({ ...base, isActive });
        toast.success(t('recurring.toastUpdateSuccess'));
      } else {
        await create.mutateAsync({ ...base, type });
        toast.success(t('recurring.toastCreateSuccess'));
      }
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <AppModal
      visible={visible}
      onDismiss={onDismiss}
      eyebrow={t('recurring.eyebrow')}
      title={initial ? t('recurring.modalEditTitle') : t('recurring.modalCreateTitle')}
      subtitle={initial ? t('recurring.modalEditSubtitle') : t('recurring.modalCreateSubtitle')}
    >
          <ScopeIndicator />

          <View>
            <TextInput mode="outlined" label={t('recurring.formDescriptionLabel')} placeholder={t('recurring.formDescriptionPlaceholder')} value={description} onChangeText={setDescription} error={attempted && descInvalid} />
            <HelperText type="error" visible={attempted && descInvalid} style={styles.helper}>{tCommon('required')}</HelperText>
          </View>

          {/* Tür — uygulamanın geri kalanındaki go/halt tip kartları (eski
              SegmentedButtons ikonları anlamca tersti: gider=arrow-up). */}
          {!initial ? (
            <View>
              <Eyebrow tone="mute" style={styles.label}>{t('recurring.formTypeLabel')}</Eyebrow>
              <View style={styles.typeRow}>
                <TypeBtn
                  tone={colors.halt}
                  icon="trending-down"
                  label={t('transactions.typeExpense')}
                  active={type === 'expense'}
                  onPress={() => { setType('expense'); setCategoryId(null); }}
                  colors={colors}
                />
                <TypeBtn
                  tone={colors.go}
                  icon="trending-up"
                  label={t('transactions.typeIncome')}
                  active={type === 'income'}
                  onPress={() => { setType('income'); setCategoryId(null); }}
                  colors={colors}
                />
              </View>
            </View>
          ) : null}

          <View>
            <Menu
              visible={catMenu}
              onDismiss={() => setCatMenu(false)}
              anchor={
                <Pressable onPress={() => { Keyboard.dismiss(); setCatMenu(true); }}>
                  <View pointerEvents="none">
                    <TextInput mode="outlined" label={t('recurring.formCategoryLabel')} value={activeCat?.name ?? ''} editable={false} error={attempted && catInvalid} right={<TextInput.Icon icon="menu-down" />} />
                  </View>
                </Pressable>
              }
            >
              {/* Hızlı kategori ekleme — liste yetmezse formdan çıkmadan oluştur */}
              <Menu.Item
                leadingIcon="plus"
                title={tCommon('quickAddCategory')}
                titleStyle={{ color: colors.go }}
                onPress={() => { setCatMenu(false); setCatFormOpen(true); }}
              />
              <Divider />
              {/* Çok kategoride ekrana sığması için sınırlı, kaydırılabilir liste. */}
              <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {filteredCats.map((c) => (
                  <Menu.Item key={c.id} title={c.name} leadingIcon={normalizeIconName(c.icon)} onPress={() => { setCategoryId(c.id); setCatMenu(false); }} />
                ))}
              </ScrollView>
            </Menu>
            <HelperText type="error" visible={attempted && catInvalid} style={styles.helper}>{tCommon('required')}</HelperText>
          </View>

          <View>
            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label={t('recurring.formAmountLabel')}
                value={amount}
                onChangeText={(v) => setAmount(formatAmountInput(v, amount))}
                keyboardType="decimal-pad"
                left={<TextInput.Affix text={selectedCurrency.symbol} />}
                style={{ flex: 2 }}
                error={attempted && amtInvalid}
              />
              <Menu
                visible={curMenu}
                onDismiss={() => setCurMenu(false)}
                anchor={
                  <Pressable style={{ flex: 1 }} onPress={() => { Keyboard.dismiss(); setCurMenu(true); }}>
                    <View pointerEvents="none">
                      <TextInput mode="outlined" label={t('transactions.currencyLabel')} value={currency} editable={false} right={<TextInput.Icon icon="menu-down" />} />
                    </View>
                  </Pressable>
                }
              >
                {CURRENCIES.map((c) => (
                  <Menu.Item key={c.code} title={`${c.symbol}  ${c.code}`} onPress={() => { setCurrency(c.code); setCurMenu(false); }} />
                ))}
              </Menu>
            </View>
            <HelperText type="error" visible={attempted && amtInvalid} style={styles.helper}>{tCommon('required')}</HelperText>
          </View>

          {/* Sabit / Değişken — gizli kalmış `nature` alanı artık görünür. */}
          <View>
            <Eyebrow tone="mute" style={styles.label}>{t('transactions.natureLabel')}</Eyebrow>
            <View style={[styles.seg, { borderColor: colors.line, backgroundColor: colors.bgAlt }]}>
              {(['fixed', 'variable'] as const).map((n) => {
                const on = nature === n;
                return (
                  <Pressable
                    key={n}
                    onPress={() => setNature(n)}
                    style={[styles.segBtn, on && { backgroundColor: colors.ink }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Body size="sm" weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.paper : colors.inkSoft }}>
                      {t(n === 'fixed' ? 'transactions.natureFixed' : 'transactions.natureVariable')}
                    </Body>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Sıklık — kuralın en belirleyici özelliği dropdown'da saklanmaz:
              4 seçenek tek bakışta, tek dokunuşla (dashboard segment dili). */}
          <View>
            <Eyebrow tone="mute" style={styles.label}>{t('recurring.formFrequencyLabel')}</Eyebrow>
            <View style={[styles.seg, { borderColor: colors.line, backgroundColor: colors.bgAlt }]}>
              {FREQS.map((f) => {
                const on = frequency === f;
                return (
                  <Pressable
                    key={f}
                    onPress={() => setFrequency(f)}
                    style={[styles.segBtn, on && { backgroundColor: colors.ink }]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Body size="sm" weight={on ? 'bold' : 'medium'} numberOfLines={1} style={{ color: on ? colors.paper : colors.inkSoft }}>
                      {t(FREQ_KEY[f])}
                    </Body>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable onPress={() => { Keyboard.dismiss(); setShowStart(true); }}>
            <View pointerEvents="none">
              <TextInput mode="outlined" label={t('recurring.formStartDateLabel')} value={formatDate(startDate)} editable={false} right={<TextInput.Icon icon="calendar-outline" />} />
            </View>
          </Pressable>
          <DateTimePicker
            visible={showStart}
            value={startDate}
            mode="date"
            onConfirm={(d) => { setStartDate(d); setShowStart(false); }}
            onCancel={() => setShowStart(false)}
          />

          {/* Davranış — otomatik onay (+ düzenlemede aktif/duraklı) tek grupta */}
          <View style={[styles.behavior, { backgroundColor: colors.bgAlt, borderColor: colors.line }]}>
            <View style={styles.switchRow}>
              <View style={[styles.behaviorIcon, { backgroundColor: colorAlpha(colors.way, 0.14) }]}>
                <Icon source="flash-outline" size={17} color={colors.way} />
              </View>
              <View style={{ flex: 1 }}>
                <Body weight="bold">{t('recurring.autoApproveLabel')}</Body>
                <Body size="xs" tone="mute" style={{ marginTop: 1 }}>
                  {autoApprove ? t('recurring.autoApproveHelp_on') : t('recurring.autoApproveHelp_off')}
                </Body>
              </View>
              <Switch value={autoApprove} onValueChange={setAutoApprove} color={colors.go} />
            </View>
            {initial ? (
              <>
                <View style={[styles.behaviorDiv, { backgroundColor: colors.line }]} />
                <View style={styles.switchRow}>
                  <View style={[styles.behaviorIcon, { backgroundColor: colorAlpha(colors.go, 0.14) }]}>
                    <Icon source={isActive ? 'play-outline' : 'pause'} size={17} color={isActive ? colors.go : colors.inkMute} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Body weight="bold">{tCommon('active')}</Body>
                    <Body size="xs" tone="mute" style={{ marginTop: 1 }}>
                      {isActive ? t('recurring.tabActive') : t('recurring.tabPaused')}
                    </Body>
                  </View>
                  <Switch value={isActive} onValueChange={setIsActive} color={colors.go} />
                </View>
              </>
            ) : null}
          </View>

          <TextInput mode="outlined" label={t('recurring.formNotesLabel')} value={notes} onChangeText={setNotes} multiline numberOfLines={2} />

          {/* Canlı önizleme — kaydetmeden önce kural tek cümlede:
              "AYLIK · OTOMATİK İŞLENİR / ₺12.500 · Kira / 01.07.2026 itibarıyla" */}
          {previewReady ? (
            <View style={[styles.preview, { backgroundColor: colorAlpha(typeColor, 0.07), borderColor: colorAlpha(typeColor, 0.28) }]}>
              <View style={styles.previewHead}>
                <Icon source="autorenew" size={14} color={typeColor} />
                <Eyebrow style={{ color: typeColor }}>
                  {t(FREQ_KEY[frequency])} · {autoApprove ? t('recurring.previewAuto') : t('recurring.previewManual')}
                </Eyebrow>
              </View>
              <View style={styles.previewLine}>
                <Money size="md" style={{ color: typeColor }}>
                  {type === 'income' ? '+' : '−'}{formatCurrency(amt, currency)}
                </Money>
                <Body size="sm" numberOfLines={1} style={{ flexShrink: 1 }}> · {description}</Body>
              </View>
              <Body size="xs" tone="mute" style={{ marginTop: 2 }}>
                {t('recurring.previewFrom', { date: formatDate(startDate) })}
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
            {initial ? tCommon('save') : tCommon('add')}
          </Button>

          {/* Hızlı kategori ekleme — Portal'la üstte açılır; tür kuralın türü
              ön seçili (değiştirilebilir). Tür eşleşiyorsa yeni kategori
              otomatik seçilir; eşleşmiyorsa sadece oluşturulur. */}
          <CategoryFormModal
            visible={catFormOpen}
            onDismiss={() => setCatFormOpen(false)}
            presetType={type}
            onCreated={(c) => { if (c.type === type) setCategoryId(c.id); }}
          />
    </AppModal>
  );
}

interface TypeBtnProps {
  tone: string;
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
}

// Hızlı Giriş'teki tip kartının birebir karşılığı — aynı kontrol her ekranda aynı görünür.
function TypeBtn({ tone, icon, label, active, onPress, colors }: TypeBtnProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.typeBtn,
        {
          borderColor: active ? tone : colors.line,
          backgroundColor: active ? colorAlpha(tone, 0.12) : 'transparent',
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Icon source={icon} size={18} color={active ? tone : colors.inkSoft} />
      <Body weight="bold" style={{ color: active ? tone : colors.inkSoft }}>
        {label}
      </Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  helper: { marginBottom: -8 },
  label: { marginBottom: 8 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  seg: { flexDirection: 'row', borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, padding: 3 },
  segBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 999 },
  behavior: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 4 },
  behaviorIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  behaviorDiv: { height: StyleSheet.hairlineWidth, marginLeft: 44 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  preview: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 13 },
  previewHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewLine: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6 },
});
