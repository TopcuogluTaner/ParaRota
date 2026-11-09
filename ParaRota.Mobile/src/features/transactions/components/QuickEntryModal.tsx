import { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Keyboard } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Button, TextInput, Menu, Icon, HelperText, Divider } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { PressableScale } from '@shared/components/PressableScale';
import { AppModal } from '@shared/components/AppModal';
import { Body, Eyebrow } from '@shared/components/Typography';
import { useCategoriesQuery } from '@features/categories/api/useCategories';
import { CategoryFormModal } from '@features/categories/components/CategoryFormModal';
import { useCreateTransaction } from '@features/transactions/api/useTransactions';
import { useScanReceipt } from '@features/receipts/api/useReceipts';
import { useParseTransaction, useTranscribeVoice } from '@features/ai/api/useAi';
import { useAudioRecorder, AudioModule, RecordingPresets, setAudioModeAsync } from 'expo-audio';
import i18n from '@shared/i18n';
import type { ParsedTransactionDto } from '@shared/api/types';
import { useEntitlement } from '@features/subscription/hooks/useEntitlement';
import { openPaywall } from '@features/subscription/lib/paywallNav';
import { useQuickEntryStore } from '@shared/store/useQuickEntryStore';
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import { CURRENCIES } from '@shared/constants/currencies';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { shrinkImage } from '@shared/lib/shrinkImage';
import { normalizeIconName } from '@shared/lib/iconName';
import { formatDate } from '@shared/lib/dateFormat';
import { colorAlpha } from '@shared/lib/colorAlpha';
import type { CategoryDto, PaidVia, TxType } from '@shared/api/types';

const PAID_VIA_OPTIONS: { value: PaidVia; icon: string; labelKey: string }[] = [
  { value: 'cash', icon: 'cash', labelKey: 'transactions.paidVia_cash' },
  { value: 'debitCard', icon: 'credit-card-outline', labelKey: 'transactions.paidVia_debitCard' },
  { value: 'creditCard', icon: 'credit-card-chip-outline', labelKey: 'transactions.paidVia_creditCard' },
  { value: 'transfer', icon: 'bank-transfer', labelKey: 'transactions.paidVia_transfer' },
  { value: 'eft', icon: 'send-outline', labelKey: 'transactions.paidVia_eft' },
];

interface FormState {
  type: TxType;
  categoryId: number | null;
  amount: string;
  currency: string;
  paidVia: PaidVia | null;
  notes: string;
}

// Cihaz üstü konuşma tanıma (iOS Speech / Android SpeechRecognizer) — bedava, kotasız,
// CANLI (konuşurken kelimeler akar). Native modül: Expo Go'da yok → require throw eder,
// o durumda Gemini dikte yedeğine düşülür (aşağıda toggleVoice).
let speechModule: typeof import('expo-speech-recognition') | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  speechModule = require('expo-speech-recognition');
} catch {
  speechModule = null;
}

const SPEECH_LOCALES: Record<string, string> = { tr: 'tr-TR', en: 'en-US', de: 'de-DE', es: 'es-ES', ar: 'ar-SA' };

const EMPTY_FORM: FormState = {
  type: 'expense',
  categoryId: null,
  amount: '',
  currency: 'TRY',
  paidVia: null,
  notes: '',
};

export function QuickEntryModal() {
  const { t } = useTranslation('pages');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const open = useQuickEntryStore((s) => s.open);
  const mode = useQuickEntryStore((s) => s.mode);
  const close = useQuickEntryStore((s) => s.closeModal);
  const autoScanned = useRef(false);

  const cats = useCategoriesQuery();
  const create = useCreateTransaction();
  const scan = useScanReceipt();
  const { isPremium } = useEntitlement();

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [catMenu, setCatMenu] = useState(false);
  // Fiş kaynağı menüsü — kamera ya da galeri. Hata sonrası tekrar denemede
  // kullanıcı yeniden kameraya dönebilsin (auto-scan yalnız ilk açılışta tetiklenir).
  const [scanMenu, setScanMenu] = useState(false);
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);
  // AI sahnesi kapalı başlar — ✨ çipine dokununca açılır (sade varsayılan, kasıtlı "an").
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  // AI'ın çözdüğü tarih ("dün" vb.) — formda alan yok, submit'te kullanılır; chip ile temizlenebilir.
  const [aiDate, setAiDate] = useState<string | null>(null);
  const aiParse = useParseTransaction();
  const transcribe = useTranscribeVoice();
  const [recording, setRecording] = useState(false);
  const recordStartedAt = useRef(0);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  // Dikte başlamadan önceki kutu içeriği — canlı transkript bunun SONUNA akar.
  const aiBase = useRef('');
  // Sesli giriş bitince otomatik AI'a gönderim: aktiflik bayrağı + son metin + parse fn
  // ref'leri (cihaz STT 'end' olayı [] bağımlılıklı effect'te → stale closure'ı önler).
  const voiceAutoSend = useRef(false);
  const aiTextRef = useRef('');
  const parseRef = useRef<(t: string) => void>(() => {});

  // Cihaz STT olayları: 'result' canlı kelimeleri kutuya yazar; 'end/error' kaydı kapatır.
  useEffect(() => {
    const mod = speechModule?.ExpoSpeechRecognitionModule;
    if (!mod) return;
    const subs = [
      mod.addListener('result', (e: { results?: { transcript?: string }[] }) => {
        const tr = e?.results?.[0]?.transcript ?? '';
        if (tr) {
          const next = aiBase.current ? `${aiBase.current} ${tr}` : tr;
          aiTextRef.current = next; // 'end' otomatik gönderimi render zamanlamasına bağlı kalmasın
          setAiText(next);
        }
      }),
      mod.addListener('end', () => {
        setRecording(false);
        // Konuşma bitti (sessizlik) ya da kullanıcı durdurdu → transkripti otomatik gönder.
        if (voiceAutoSend.current) {
          voiceAutoSend.current = false;
          const txt = aiTextRef.current.trim();
          if (txt.length >= 3) parseRef.current(txt);
        }
      }),
      mod.addListener('error', (e: { error?: string }) => {
        voiceAutoSend.current = false;
        setRecording(false);
        if (e?.error === 'no-speech') toast.info(t('transactions.ai_tooShort'));
        else if (e?.error !== 'aborted') toast.error(t('transactions.ai_failed'));
      }),
    ];
    return () => subs.forEach((sub) => sub.remove());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM);
      setAttempted(false);
      autoScanned.current = false;
      setAiOpen(false);
      setAiText('');
      setAiDate(null);
      setRecording(false);
    } else {
      // Modal kapanırken açık dikte kalmasın (best-effort).
      voiceAutoSend.current = false;
      try { speechModule?.ExpoSpeechRecognitionModule?.abort?.(); } catch { /* noop */ }
    }
  }, [open]);

  // When opened from the "Fişten okut" menu, jump straight into the camera once.
  useEffect(() => {
    if (open && mode === 'scan' && !autoScanned.current) {
      autoScanned.current = true;
      // Fiş tarama premium — değilse modalı KAPATIP paywall route'una git
      // (Portal modal açık kalırsa paywall'ın üstüne biner). Backend de
      // [RequirePremium] ile korur.
      if (isPremium) {
        void handleScanCamera();
      } else {
        close();
        openPaywall('receipts');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onTypeChange = (next: TxType) => {
    setForm((prev) => ({ ...prev, type: next, categoryId: null }));
  };

  const visibleCategories = useMemo<CategoryDto[]>(
    () => (cats.data ?? []).filter((c) => c.type === form.type),
    [cats.data, form.type],
  );

  const activeCategory = visibleCategories.find((c) => c.id === form.categoryId) ?? null;
  const selectedCurrency = CURRENCIES.find((c) => c.code === form.currency) ?? CURRENCIES[0];
  const amountNum = parseAmount(form.amount);
  const isSubmitting = create.isPending;
  const amountInvalid = !Number.isFinite(amountNum) || amountNum <= 0;
  const categoryInvalid = form.categoryId === null;

  const handleClose = () => {
    if (isSubmitting) return;
    close();
  };

  const processReceipt = async (a: ImagePicker.ImagePickerAsset) => {
    try {
      // 413 önlemi: ham telefon fotoğrafı 10MB+ olabiliyor — önce küçült.
      const scanned = await scan.mutateAsync(await shrinkImage(a));
      setForm((prev) => {
        const totalAmount = scanned.total ?? scanned.subtotal;
        const merchantLine = scanned.merchantName ?? '';
        const itemsLine =
          scanned.items && scanned.items.length > 0
            ? scanned.items
                .filter((i) => i.name)
                .slice(0, 8)
                .map((i) => `• ${i.name}${i.totalPrice ? ` — ${i.totalPrice.toFixed(2)}` : ''}`)
                .join('\n')
            : '';
        const ocrNotes = [merchantLine, itemsLine].filter(Boolean).join('\n');
        const ocrCurrencyValid =
          scanned.currency && CURRENCIES.some((c) => c.code === scanned.currency);
        return {
          ...prev,
          amount: prev.amount.trim() === '' && totalAmount ? formatAmountInput(totalAmount.toFixed(2)) : prev.amount,
          currency: prev.currency === 'TRY' && ocrCurrencyValid ? scanned.currency! : prev.currency,
          notes: ocrNotes
            ? prev.notes.trim()
              ? `${prev.notes}\n\n${ocrNotes}`
              : ocrNotes
            : prev.notes,
        };
      });
      if (scanned.confidence != null && scanned.confidence < 0.6) {
        toast.warning(t('transactions.scan_lowConfidence'));
      } else {
        toast.success(t('transactions.scan_success'));
      }
      const itemCount = scanned.items?.length ?? 0;
      if (itemCount > 0) {
        toast.info(t('transactions.scan_appliedItems', { count: itemCount }));
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t('transactions.scan_error')));
    }
  };

  const handlePickReceipt = async () => {
    if (!isPremium) { close(); openPaywall('receipts'); return; }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.error(t('transactions.scan_error'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    await processReceipt(result.assets[0]);
  };

  const handleScanCamera = async () => {
    if (!isPremium) { close(); openPaywall('receipts'); return; }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      toast.error(t('transactions.scan_error'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    await processReceipt(result.assets[0]);
  };

  // AI ön doldurma — OCR ile aynı sözleşme: yalnız BOŞ alanları doldur, notu append et.
  const applyParsed = (parsed: ParsedTransactionDto) => {
    setForm((prev) => ({
      ...prev,
      type: parsed.type,
      categoryId: prev.categoryId ?? parsed.categoryId ?? null,
      amount: prev.amount.trim() === '' ? formatAmountInput(parsed.amount.toFixed(2)) : prev.amount,
      currency: prev.currency === 'TRY' && parsed.currency !== 'TRY' ? parsed.currency : prev.currency,
      notes: parsed.description
        ? prev.notes.trim()
          ? `${prev.notes}\n${parsed.description}`
          : parsed.description
        : prev.notes,
    }));
    // Bugünden farklı bir tarih çözüldüyse chip olarak göster (submit'te kullanılır).
    const d = new Date(parsed.transactionDate);
    setAiDate(d.toDateString() === new Date().toDateString() ? null : parsed.transactionDate);
    toast.success(t('transactions.ai_success'));
  };

  const toggleAiOpen = () => {
    if (!isPremium) {
      close();
      openPaywall('ai');
      return;
    }
    setAiOpen((v) => !v);
  };

  const requirePremiumForAi = () => {
    if (isPremium) return true;
    close();
    openPaywall('ai');
    return false;
  };

  const parseText = async (raw: string) => {
    const text = raw.trim();
    if (text.length < 3) return;
    if (!requirePremiumForAi()) return;
    Keyboard.dismiss();
    try {
      const parsed = await aiParse.mutateAsync(text);
      applyParsed(parsed);
      setAiText('');
    } catch (err) {
      toast.error(getErrorMessage(err, t('transactions.ai_failed')));
    }
  };
  const handleAiParse = () => parseText(aiText);
  // 'end' olayı (sesli giriş bitişi) [] effect'inde — son metin + parse fn'i ref'ten okur.
  aiTextRef.current = aiText;
  parseRef.current = parseText;

  // Dikte: mikrofona DOKUN → kayıt; tekrar dokun → durur.
  // 1) Cihaz STT varsa (dev/store build): bedava + CANLI — kelimeler konuşurken kutuya akar.
  //    Dikte yereldir, premium istemez; premium kapısı gönderimde (handleAiParse).
  // 2) Expo Go'da native modül yok → Gemini dikte yedeği (premium, kota yakar).
  const toggleVoice = async () => {
    const mod = speechModule?.ExpoSpeechRecognitionModule;
    if (mod) {
      if (recording) {
        mod.stop(); // 'end' olayı recording'i kapatır
        return;
      }
      try {
        const perm = await mod.requestPermissionsAsync();
        if (!perm.granted) {
          toast.warning(t('transactions.ai_micDenied'));
          return;
        }
        aiBase.current = aiText.trim();
        voiceAutoSend.current = true; // bitince (sessizlik/durdurma) otomatik gönder
        mod.start({
          lang: SPEECH_LOCALES[i18n.language] ?? 'tr-TR',
          interimResults: true,
          continuous: false,
        });
        setRecording(true);
      } catch {
        toast.error(t('transactions.ai_failed'));
      }
      return;
    }

    // ── Gemini dikte yedeği (Expo Go) ──
    if (!requirePremiumForAi()) return;
    if (recording) {
      setRecording(false);
      try {
        await recorder.stop();
        const tooShort = Date.now() - recordStartedAt.current < 700;
        const uri = recorder.uri;
        if (tooShort || !uri) {
          if (tooShort) toast.info(t('transactions.ai_tooShort'));
          return;
        }
        const text = await transcribe.mutateAsync({ uri, name: 'voice.m4a', type: 'audio/mp4' });
        const combined = aiText.trim() ? `${aiText.trim()} ${text}` : text;
        setAiText(combined);
        await parseText(combined); // dikte bitince otomatik AI'a gönder
      } catch (err) {
        toast.error(getErrorMessage(err, t('transactions.ai_failed')));
      }
      return;
    }
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        toast.warning(t('transactions.ai_micDenied'));
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      recordStartedAt.current = Date.now();
      setRecording(true);
    } catch {
      toast.error(t('transactions.ai_failed'));
    }
  };

  const handleSubmit = async () => {
    if (categoryInvalid || amountInvalid || form.categoryId === null) {
      setAttempted(true);
      toast.error(t('transactions.quickEntry_errorMissing'));
      return;
    }
    try {
      await create.mutateAsync({
        categoryId: form.categoryId,
        type: form.type,
        nature: 'variable',
        status: 'completed',
        amount: amountNum,
        currency: form.currency,
        paidVia: form.paidVia ?? undefined,
        transactionDate: aiDate ?? new Date().toISOString(),
        notes: form.notes.trim() || undefined,
      });
      toast.success(t('transactions.quickEntry_successAdded'));
      close();
    } catch (err) {
      toast.error(getErrorMessage(err, t('transactions.quickEntry_errorMissing')));
    }
  };

  return (
    <AppModal
      visible={open}
      onDismiss={handleClose}
      eyebrow={t('transactions.eyebrow')}
      title={t('transactions.quickEntry_title')}
      subtitle={t('transactions.quickEntry_subtitle')}
      bodyStyle={{ gap: 16 }}
      // Klavyeyi kapatmak için dışarı dokununca modal da kapanıyordu; dışarı
      // dokunma kapatmaz, geri tuşu + X ile kapanma korunur.
      dismissable={false}
      dismissableBackButton
    >
          <View style={styles.topRow}>
            <ScopeIndicator />
            <View style={{ flex: 1 }} />
            {/* ✨ AI çipi — dokununca dikte/yazı sahnesi açılır; premium değilse paywall */}
            <PressableScale
              onPress={toggleAiOpen}
              accessibilityRole="button"
              accessibilityLabel={t('transactions.ai_chip')}
              accessibilityState={{ expanded: aiOpen }}
              style={[
                styles.aiChip,
                aiOpen
                  ? { backgroundColor: colors.way, borderColor: colors.way }
                  : { backgroundColor: colorAlpha(colors.way, 0.1), borderColor: colorAlpha(colors.way, 0.4) },
              ]}
            >
              <Icon source="creation" size={14} color={aiOpen ? colors.onAccent : colors.way} />
              <Eyebrow style={{ color: aiOpen ? colors.onAccent : colors.way, letterSpacing: 1.2 }}>AI</Eyebrow>
            </PressableScale>
            <Menu
              visible={scanMenu}
              onDismiss={() => setScanMenu(false)}
              anchor={
                <Button
                  mode="outlined"
                  compact
                  icon={scan.isPending ? undefined : 'receipt-text-outline'}
                  loading={scan.isPending}
                  onPress={() => {
                    // Premium değilse menüyü açma — direkt paywall'a yönlen.
                    if (!isPremium) { close(); openPaywall('receipts'); return; }
                    setScanMenu(true);
                  }}
                  disabled={scan.isPending}
                  style={[styles.scanBtn, { borderColor: colors.line }]}
                  textColor={colors.ink}
                  labelStyle={styles.scanBtnLabel}
                >
                  {scan.isPending ? t('transactions.scan_uploading') : t('transactions.scan_button')}
                </Button>
              }
            >
              <Menu.Item
                leadingIcon="camera-outline"
                title={t('transactions.scan_camera')}
                onPress={() => { setScanMenu(false); void handleScanCamera(); }}
              />
              <Menu.Item
                leadingIcon="image-outline"
                title={t('transactions.scan_gallery')}
                onPress={() => { setScanMenu(false); void handlePickReceipt(); }}
              />
            </Menu>
          </View>

          {/* AI sahnesi (dikte): ✨ çipiyle açılır — mikrofona dokun → konuş → tekrar dokun →
              yazı kutuya dökülür; kullanıcı düzenleyip ok'la gönderir (OCR prefill sözleşmesi). */}
          {aiOpen ? (
          <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut.duration(120)} style={[styles.aiRow, { backgroundColor: colorAlpha(colors.way, 0.07), borderColor: recording ? colors.way : colorAlpha(colors.way, 0.28) }]}>
            <TextInput
              mode="flat"
              dense
              placeholder={
                recording
                  ? t('transactions.ai_listening')
                  : transcribe.isPending
                    ? t('transactions.ai_thinking')
                    : t('transactions.ai_placeholder')
              }
              placeholderTextColor={recording ? colors.way : colors.inkMute}
              value={aiText}
              onChangeText={setAiText}
              onSubmitEditing={handleAiParse}
              autoFocus
              returnKeyType="send"
              underlineColor="transparent"
              activeUnderlineColor="transparent"
              style={styles.aiInput}
              contentStyle={{ paddingHorizontal: 0 }}
            />
            <Pressable
              onPress={toggleVoice}
              hitSlop={8}
              disabled={transcribe.isPending}
              accessibilityRole="button"
              accessibilityLabel={t('transactions.ai_voiceToggle')}
              style={[styles.aiMic, recording && { backgroundColor: colors.way }]}
            >
              <Icon
                source={transcribe.isPending ? 'dots-horizontal' : recording ? 'stop' : 'microphone-outline'}
                size={18}
                color={recording ? colors.onAccent : colors.way}
              />
            </Pressable>
            <Pressable
              onPress={handleAiParse}
              hitSlop={8}
              disabled={aiParse.isPending || aiText.trim().length < 3}
              accessibilityRole="button"
              accessibilityLabel={t('transactions.ai_button')}
              style={({ pressed }) => [
                styles.aiSend,
                {
                  backgroundColor: aiText.trim().length >= 3 ? colors.way : colorAlpha(colors.way, 0.35),
                  opacity: pressed || aiParse.isPending ? 0.6 : 1,
                },
              ]}
            >
              <Icon source={aiParse.isPending ? 'dots-horizontal' : 'arrow-up'} size={16} color={colors.onAccent} />
            </Pressable>
          </Animated.View>
          ) : null}
          {aiDate ? (
            <View style={[styles.aiDateChip, { backgroundColor: colorAlpha(colors.way, 0.12), borderColor: colorAlpha(colors.way, 0.35) }]}>
              <Icon source="calendar-outline" size={13} color={colors.way} />
              <Body size="xs" weight="bold" style={{ color: colors.way }}>
                {t('transactions.ai_dateApplied', { date: formatDate(new Date(aiDate)) })}
              </Body>
              <Pressable onPress={() => setAiDate(null)} hitSlop={8} accessibilityLabel={tCommon('close')}>
                <Icon source="close-circle" size={14} color={colors.way} />
              </Pressable>
            </View>
          ) : null}

          <View>
            <Eyebrow tone="mute" style={{ marginBottom: 8 }}>
              {t('transactions.quickEntry_typeLabel')}
            </Eyebrow>
            <View style={styles.typeRow}>
              <TypeButton
                tone="go"
                icon="trending-up"
                label={tCommon('income')}
                active={form.type === 'income'}
                onPress={() => onTypeChange('income')}
                colors={colors}
              />
              <TypeButton
                tone="halt"
                icon="trending-down"
                label={tCommon('expense')}
                active={form.type === 'expense'}
                onPress={() => onTypeChange('expense')}
                colors={colors}
              />
            </View>
          </View>

          <View>
            <TextInput
              mode="outlined"
              label={t('transactions.quickEntry_amountLabel')}
              value={form.amount}
              onChangeText={(v) => set('amount', formatAmountInput(v, form.amount))}
              keyboardType="decimal-pad"
              left={<TextInput.Affix text={selectedCurrency.symbol} />}
              error={attempted && amountInvalid}
            />
            {/* Para birimi — Menu yerine chip'ler: Android'de klavye açıkken Modal
                içindeki Paper Menu konumunu sürekli yeniden ölçüp titriyordu
                (Keyboard.dismiss yeterli olmadı). 4 seçenek; tek dokunuşla seçilir. */}
            <View style={styles.currencyRow}>
              {CURRENCIES.map((c) => {
                const on = form.currency === c.code;
                return (
                  <Pressable
                    key={c.code}
                    onPress={() => set('currency', c.code)}
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
          <HelperText type="error" visible={attempted && amountInvalid} style={styles.helper}>
            {tCommon('required')}
          </HelperText>

          <Menu
            visible={catMenu}
            onDismiss={() => setCatMenu(false)}
            anchor={
              <Pressable onPress={() => { Keyboard.dismiss(); setCatMenu(true); }} disabled={cats.isLoading}>
                <View pointerEvents="none">
                  <TextInput
                    mode="outlined"
                    label={t('transactions.quickEntry_categoryLabel')}
                    value={activeCategory ? activeCategory.name : ''}
                    editable={false}
                    error={attempted && categoryInvalid}
                    right={<TextInput.Icon icon="menu-down" />}
                    placeholder={
                      cats.isLoading
                        ? tCommon('loading')
                        : visibleCategories.length === 0
                          ? t('transactions.quickEntry_noCategoryForType')
                          : undefined
                    }
                  />
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
            <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {visibleCategories.map((c) => (
                <Menu.Item
                  key={c.id}
                  title={c.name}
                  leadingIcon={normalizeIconName(c.icon)}
                  onPress={() => {
                    set('categoryId', c.id);
                    setCatMenu(false);
                  }}
                />
              ))}
            </ScrollView>
          </Menu>
          <HelperText type="error" visible={attempted && categoryInvalid} style={styles.helper}>
            {tCommon('required')}
          </HelperText>

          <View>
            <Eyebrow tone="mute" style={{ marginBottom: 8 }}>
              {t('transactions.paidVia_label')}{' '}
              <Eyebrow tone="mute" style={styles.optional}>
                ({tCommon('optional')})
              </Eyebrow>
            </Eyebrow>
            <View style={styles.paidViaRow}>
              {PAID_VIA_OPTIONS.map((opt) => {
                const active = form.paidVia === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => set('paidVia', active ? null : opt.value)}
                    style={[
                      styles.paidViaItem,
                      {
                        borderColor: active ? colors.go : colors.line,
                        backgroundColor: active ? colorAlpha(colors.go, 0.1) : 'transparent',
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={t(opt.labelKey)}
                    accessibilityState={{ selected: active }}
                  >
                    <Icon source={opt.icon} size={20} color={active ? colors.go : colors.inkSoft} />
                    <Eyebrow tone={active ? 'go' : 'mute'} style={styles.paidViaLabel} numberOfLines={1}>
                      {t(opt.labelKey)}
                    </Eyebrow>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <TextInput
            mode="outlined"
            label={t('transactions.quickEntry_noteLabel')}
            placeholder={t('transactions.quickEntry_notePlaceholder')}
            value={form.notes}
            onChangeText={(v) => set('notes', v)}
            multiline
            numberOfLines={2}
            maxLength={500}
          />

          <View style={styles.actions}>
            <Button mode="text" onPress={handleClose} disabled={isSubmitting} textColor={colors.inkSoft}>
              {tCommon('cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit}
              loading={isSubmitting}
              disabled={isSubmitting}
              icon="check"
              buttonColor={colors.go}
              textColor={colors.onAccent}
            >
              {tCommon('save')}
            </Button>
          </View>

          {/* Hızlı kategori ekleme — Portal'la üstte açılır, hızlı giriş kapanmaz;
              tür formun türü ön seçili (değiştirilebilir). Tür eşleşiyorsa yeni
              kategori otomatik seçilir; eşleşmiyorsa sadece oluşturulur. */}
          <CategoryFormModal
            visible={catFormOpen}
            onDismiss={() => setCatFormOpen(false)}
            presetType={form.type}
            onCreated={(c) => { if (c.type === form.type) set('categoryId', c.id); }}
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
      style={[
        styles.typeBtn,
        {
          borderColor: active ? toneColor : colors.line,
          backgroundColor: active ? colorAlpha(toneColor, 0.12) : 'transparent',
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Icon source={icon} size={18} color={active ? toneColor : colors.inkSoft} />
      <Body weight="bold" style={{ color: active ? toneColor : colors.inkSoft }}>
        {label}
      </Body>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 12, paddingRight: 6, paddingVertical: 4, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  aiMic: { width: 32, height: 32, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  aiChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, marginRight: 8 },
  aiInput: { flex: 1, backgroundColor: 'transparent', height: 38, fontSize: 13.5 },
  aiSend: { width: 30, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  aiDateChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, marginTop: -6 },
  helper: { marginTop: -12 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  scanBtn: { borderRadius: 8, alignSelf: 'flex-start' },
  scanBtnLabel: { fontSize: 12, marginVertical: 4, marginHorizontal: 8 },
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
  currencyRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  currencyChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  paidViaRow: { flexDirection: 'row', gap: 6 },
  paidViaItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  paidViaLabel: { fontSize: 9, letterSpacing: 1, textAlign: 'center' },
  optional: { textTransform: 'lowercase', letterSpacing: 0 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
});
