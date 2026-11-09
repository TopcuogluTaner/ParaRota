import { useEffect, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable, ScrollView, Keyboard } from 'react-native';
import { Button, TextInput, Menu, HelperText, Icon, ActivityIndicator, Divider } from 'react-native-paper';
import { AppDateTimePicker as DateTimePicker } from '@shared/components/AppDateTimePicker';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { AppModal } from '@shared/components/AppModal';
import { Body, Eyebrow } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { useCategoriesQuery } from '@features/categories/api/useCategories';
import { CategoryFormModal } from '@features/categories/components/CategoryFormModal';
import { useCreateTransaction, useUpdateTransaction } from '@features/transactions/api/useTransactions';
import { useScanReceipt } from '@features/receipts/api/useReceipts';
import { useEntitlement } from '@features/subscription/hooks/useEntitlement';
import { openPaywall } from '@features/subscription/lib/paywallNav';
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import { CURRENCIES, getCurrencySymbol } from '@shared/constants/currencies';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { formatDate } from '@shared/lib/dateFormat';
import { shrinkImage } from '@shared/lib/shrinkImage';
import { normalizeIconName } from '@shared/lib/iconName';
import type { TransactionDto, TxNature, TxStatus, TxType, PaidVia } from '@shared/api/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  initial?: TransactionDto | null;
}

const PAID_VIA_OPTIONS: { value: PaidVia; icon: string }[] = [
  { value: 'cash', icon: 'cash' },
  { value: 'debitCard', icon: 'credit-card-outline' },
  { value: 'creditCard', icon: 'credit-card-chip-outline' },
  { value: 'transfer', icon: 'bank-transfer' },
  { value: 'eft', icon: 'send-outline' },
];

export function TransactionFormModal({ visible, onDismiss, initial }: Props) {
  const { t } = useTranslation('pages');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const create = useCreateTransaction();
  const update = useUpdateTransaction(initial?.id ?? 0);
  const scan = useScanReceipt();
  const cats = useCategoriesQuery();
  const { isPremium } = useEntitlement();

  const [type, setType] = useState<TxType>('expense');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [date, setDate] = useState(new Date());
  const [nature, setNature] = useState<TxNature>('variable');
  const [status, setStatus] = useState<TxStatus>('completed');
  const [paidVia, setPaidVia] = useState<PaidVia | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [showDate, setShowDate] = useState(false);
  const [catMenu, setCatMenu] = useState(false);
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAttempted(false);
    if (initial) {
      setType(initial.type);
      setCategoryId(initial.categoryId);
      setAmount(formatAmountInput(String(initial.amount)));
      setCurrency(initial.currency);
      setDate(new Date(initial.transactionDate));
      setNature(initial.nature);
      setStatus(initial.status);
      setPaidVia(initial.paidVia);
      setNotes(initial.notes ?? '');
    } else {
      setType('expense');
      setCategoryId(null);
      setAmount('');
      setCurrency('TRY');
      setDate(new Date());
      setNature('variable');
      setStatus('completed');
      setPaidVia(undefined);
      setNotes('');
    }
  }, [visible, initial]);

  const filteredCats = (cats.data ?? []).filter((c) => c.type === type);
  const activeCat = filteredCats.find((c) => c.id === categoryId);
  const amt = parseAmount(amount);
  const busy = create.isPending || update.isPending;
  const amountInvalid = !Number.isFinite(amt) || amt <= 0;
  const categoryInvalid = !categoryId;

  const submit = async () => {
    if (categoryInvalid || amountInvalid) {
      setAttempted(true);
      toast.error(tCommon('fillRequired'));
      return;
    }
    if (!categoryId) return;
    try {
      const body = {
        categoryId, nature, status, amount: amt, currency, paidVia,
        transactionDate: date.toISOString(),
        notes: notes || undefined,
      };
      if (initial) {
        await update.mutateAsync(body);
        toast.success(t('transactions.toastUpdateSuccess'));
      } else {
        await create.mutateAsync({ ...body, type });
        toast.success(t('transactions.quickEntry_successAdded'));
      }
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  // Fiş tara — kameradan çek ya da galeriden seç → tutar/para birimi/notları otomatik doldur.
  const captureReceipt = async (fromCamera: boolean) => {
    // Modalı kapatmadan paywall'a gidilmez — Portal modal route'un üstüne biner.
    if (!isPremium) { onDismiss(); openPaywall('receipts'); return; }
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { toast.error(t('transactions.scan_error')); return; }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    try {
      // 413 önlemi: ham telefon fotoğrafı 10MB+ olabiliyor — önce küçült.
      const scanned = await scan.mutateAsync(await shrinkImage(a));
      if (!amount && scanned.total) setAmount(formatAmountInput(String(scanned.total)));
      if (currency === 'TRY' && scanned.currency) setCurrency(scanned.currency);
      const extra = [scanned.merchantName, ...(scanned.items ?? []).slice(0, 8).map((i) => i.name).filter(Boolean)]
        .filter(Boolean)
        .join('\n');
      if (extra) setNotes((cur) => (cur ? `${cur}\n${extra}` : extra));
      if (scanned.confidence != null && scanned.confidence < 0.6) {
        toast.warning(t('transactions.scan_lowConfidence'));
      } else {
        toast.success(t('transactions.scan_success'));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t('transactions.scan_error')));
    }
  };

  const natureOpts: { value: TxNature; icon: string; title: string; desc: string }[] = [
    { value: 'variable', icon: 'chart-line-variant', title: t('transactions.natureVariable'), desc: t('transactions.natureVariable_desc') },
    { value: 'fixed', icon: 'repeat', title: t('transactions.natureFixed'), desc: t('transactions.natureFixed_desc') },
  ];
  const statusOpts: { value: TxStatus; icon: string; title: string; desc: string }[] = [
    { value: 'completed', icon: 'check-circle-outline', title: t('transactions.statusCompleted'), desc: t('transactions.statusCompleted_desc') },
    { value: 'planned', icon: 'clock-outline', title: t('transactions.statusPlanned'), desc: t('transactions.statusPlanned_desc') },
  ];

  return (
    <AppModal
      visible={visible}
      onDismiss={onDismiss}
      eyebrow={t('transactions.eyebrow')}
      title={initial ? t('transactions.modalEditTitle') : t('transactions.modalCreateTitle')}
    >
      <ScopeIndicator />

      {!initial ? (
        <View style={styles.typeRow}>
          <TypeButton tone="halt" icon="trending-down" label={t('transactions.typeExpense')} active={type === 'expense'} onPress={() => { setType('expense'); setCategoryId(null); }} colors={colors} />
          <TypeButton tone="go" icon="trending-up" label={t('transactions.typeIncome')} active={type === 'income'} onPress={() => { setType('income'); setCategoryId(null); }} colors={colors} />
        </View>
      ) : null}

      {/* Fişten otomatik doldur — kolay giriş için en üstte */}
      {!initial ? (
        <View style={[styles.scanCard, { backgroundColor: colorAlpha(colors.sky, 0.07), borderColor: colorAlpha(colors.sky, 0.25) }]}>
          <View style={styles.scanHead}>
            <View style={[styles.scanIcon, { backgroundColor: colorAlpha(colors.sky, 0.14) }]}>
              {scan.isPending ? <ActivityIndicator size={16} color={colors.sky} /> : <Icon source="receipt-text-outline" size={18} color={colors.sky} />}
            </View>
            <View style={{ flex: 1 }}>
              <Body size="sm" weight="bold">{t('transactions.scan_title')}</Body>
              <Body size="xs" tone="mute" style={{ marginTop: 2 }}>{t('transactions.scan_hint')}</Body>
            </View>
          </View>
          <View style={styles.scanBtns}>
            <Pressable onPress={() => captureReceipt(true)} disabled={scan.isPending} style={({ pressed }) => [styles.scanBtn, { borderColor: colorAlpha(colors.sky, 0.4), backgroundColor: colors.paper, opacity: pressed ? 0.7 : 1 }]}>
              <Icon source="camera-outline" size={17} color={colors.sky} />
              <Body size="sm" weight="bold" style={{ color: colors.sky }}>{t('transactions.scan_camera')}</Body>
            </Pressable>
            <Pressable onPress={() => captureReceipt(false)} disabled={scan.isPending} style={({ pressed }) => [styles.scanBtn, { borderColor: colorAlpha(colors.sky, 0.4), backgroundColor: colors.paper, opacity: pressed ? 0.7 : 1 }]}>
              <Icon source="image-outline" size={17} color={colors.sky} />
              <Body size="sm" weight="bold" style={{ color: colors.sky }}>{t('transactions.scan_gallery')}</Body>
            </Pressable>
          </View>
        </View>
      ) : null}

      <Menu
        visible={catMenu}
        onDismiss={() => setCatMenu(false)}
        anchor={
          <Pressable onPress={() => { Keyboard.dismiss(); setCatMenu(true); }} disabled={cats.isLoading}>
            <View pointerEvents="none">
              <TextInput
                mode="outlined"
                label={t('transactions.categoryLabel')}
                value={activeCat ? activeCat.name : ''}
                editable={false}
                error={attempted && categoryInvalid}
                right={<TextInput.Icon icon="menu-down" onPress={() => { Keyboard.dismiss(); setCatMenu(true); }} />}
                placeholder={cats.isLoading ? tCommon('loading') : filteredCats.length === 0 ? t('transactions.quickEntry_noCategoryForType') : undefined}
              />
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
      <HelperText type="error" visible={attempted && categoryInvalid}>{tCommon('required')}</HelperText>

      <View>
        <TextInput
          mode="outlined"
          label={t('transactions.amountLabel')}
          value={amount}
          onChangeText={(v) => setAmount(formatAmountInput(v, amount))}
          keyboardType="decimal-pad"
          left={<TextInput.Affix text={getCurrencySymbol(currency)} />}
          error={attempted && amountInvalid}
          contentStyle={{ fontSize: 20, fontWeight: '700' }}
        />
        {/* Para birimi — Menu yerine chip'ler: Android'de klavye açıkken Modal
            içindeki Paper Menu konumunu sürekli yeniden ölçüp titriyordu.
            4 seçenek için dropdown gereksiz; tek dokunuşla seçilir. */}
        <View style={styles.currencyRow}>
          {CURRENCIES.map((c) => {
            const on = currency === c.code;
            return (
              <Pressable
                key={c.code}
                onPress={() => setCurrency(c.code)}
                style={({ pressed }) => [styles.currencyChip, { borderColor: on ? colors.go : colors.line, backgroundColor: on ? colorAlpha(colors.go, 0.1) : 'transparent', opacity: pressed ? 0.75 : 1 }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Body size="sm" weight="bold" style={{ color: on ? colors.go : colors.inkSoft }}>{`${c.symbol} ${c.code}`}</Body>
              </Pressable>
            );
          })}
        </View>
      </View>
      <HelperText type="error" visible={attempted && amountInvalid}>{tCommon('required')}</HelperText>

      <Pressable onPress={() => setShowDate(true)}>
        <View pointerEvents="none">
          <TextInput mode="outlined" label={t('transactions.dateLabel')} value={formatDate(date)} editable={false} right={<TextInput.Icon icon="calendar-outline" onPress={() => setShowDate(true)} />} />
        </View>
      </Pressable>
      <DateTimePicker visible={showDate} value={date} mode="date" onConfirm={(d) => { setDate(d); setShowDate(false); }} onCancel={() => setShowDate(false)} />

      {/* Doğa — açıklamalı kartlar */}
      <Body size="sm" weight="bold" style={styles.sectionLabel}>{t('transactions.natureLabel')}</Body>
      <View style={styles.optRow}>
        {natureOpts.map((o) => (
          <DescOption key={o.value} icon={o.icon} title={o.title} desc={o.desc} active={nature === o.value} onPress={() => setNature(o.value)} colors={colors} />
        ))}
      </View>

      {/* Durum — açıklamalı kartlar */}
      <Body size="sm" weight="bold" style={styles.sectionLabel}>{t('transactions.statusLabel')}</Body>
      <View style={styles.optRow}>
        {statusOpts.map((o) => (
          <DescOption key={o.value} icon={o.icon} title={o.title} desc={o.desc} active={status === o.value} onPress={() => setStatus(o.value)} colors={colors} />
        ))}
      </View>

      {/* Ödeme yöntemi */}
      <Body size="sm" weight="bold" style={styles.sectionLabel}>{t('transactions.paidVia_label')} <Body size="xs" tone="mute">({tCommon('optional')})</Body></Body>
      <View style={styles.paidViaRow}>
        {PAID_VIA_OPTIONS.map((opt) => {
          const on = paidVia === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setPaidVia(on ? undefined : opt.value)}
              style={[styles.paidViaItem, { borderColor: on ? colors.go : colors.line, backgroundColor: on ? colorAlpha(colors.go, 0.1) : 'transparent' }]}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
            >
              <Icon source={opt.icon} size={19} color={on ? colors.go : colors.inkSoft} />
              <Eyebrow tone={on ? 'go' : 'mute'} style={styles.paidViaLabel} numberOfLines={1}>{t(`transactions.paidVia_${opt.value}` as never)}</Eyebrow>
            </Pressable>
          );
        })}
      </View>

      <TextInput mode="outlined" label={t('transactions.notesLabel')} value={notes} onChangeText={setNotes} multiline numberOfLines={3} outlineStyle={{ borderRadius: 14 }} style={{ marginTop: 6 }} />

      <Button
        mode="contained"
        loading={busy}
        disabled={busy}
        onPress={submit}
        buttonColor={colors.go}
        textColor={colors.onAccent}
        contentStyle={{ paddingVertical: 8 }}
        style={{ borderRadius: 999, marginTop: 14 }}
        icon={busy ? undefined : 'check'}
      >
        {initial ? tCommon('save') : tCommon('add')}
      </Button>

      {/* Hızlı kategori ekleme — Portal'la üstte açılır, form kapanmaz; tür bu
          formun türü ön seçili (değiştirilebilir). Tür formla eşleşiyorsa yeni
          kategori otomatik seçilir; eşleşmiyorsa sadece oluşturulur. */}
      <CategoryFormModal
        visible={catFormOpen}
        onDismiss={() => setCatFormOpen(false)}
        presetType={type}
        onCreated={(c) => { if (c.type === type) setCategoryId(c.id); }}
      />
    </AppModal>
  );
}

interface TypeButtonProps {
  tone: 'go' | 'halt';
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
}

function TypeButton({ tone, icon, label, active, onPress, colors }: TypeButtonProps) {
  const toneColor = tone === 'go' ? colors.go : colors.halt;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.typeBtn, { borderColor: active ? toneColor : colors.line, backgroundColor: active ? colorAlpha(toneColor, 0.12) : 'transparent' }]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Icon source={icon} size={18} color={active ? toneColor : colors.inkSoft} />
      <Body weight="bold" style={{ color: active ? toneColor : colors.inkSoft }}>{label}</Body>
    </Pressable>
  );
}

interface DescOptionProps {
  icon: string;
  title: string;
  desc: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
}

// Açıklamalı seçim kartı (doğa/durum): ikon + başlık + tek satır açıklama. Seçili = yeşil accent.
function DescOption({ icon, title, desc, active, onPress, colors }: DescOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.descOpt, { borderColor: active ? colors.go : colors.line, backgroundColor: active ? colorAlpha(colors.go, 0.1) : 'transparent', opacity: pressed ? 0.75 : 1 }]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Icon source={icon} size={22} color={active ? colors.go : colors.inkSoft} />
      <Body weight="bold" style={{ color: active ? colors.go : colors.ink, marginTop: 6 }}>{title}</Body>
      <Body size="xs" tone="mute" style={styles.descText} numberOfLines={2}>{desc}</Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  currencyRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  currencyChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  sectionLabel: { marginTop: 14, marginBottom: 8 },
  scanCard: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 12, marginTop: 4, marginBottom: 4 },
  scanHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scanIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  scanBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  scanBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  optRow: { flexDirection: 'row', gap: 8 },
  descOpt: { flex: 1, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  descText: { textAlign: 'center', marginTop: 4, lineHeight: 16 },
  paidViaRow: { flexDirection: 'row', gap: 6 },
  paidViaItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  paidViaLabel: { fontSize: 9, letterSpacing: 0.8, textAlign: 'center' },
  optional: { textTransform: 'lowercase', letterSpacing: 0 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
});
