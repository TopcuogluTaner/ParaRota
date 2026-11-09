import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import { ZoomModal } from '@shared/components/ZoomModal';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { CURRENCIES } from '@shared/constants/currencies';
import { parseAmount } from '@shared/lib/parseAmount';
import { formatDate } from '@shared/lib/dateFormat';
import type { CategoryDto, PaidVia, ParsedTransactionDto, TransactionDto, TxType } from '@shared/api/types';
import { useCategoriesQuery } from '@features/categories/api/useCategories';
import { useCreateTransaction, useUpdateTransaction } from '../api/useTransactions';
import { useScanReceipt } from '@features/receipts/api/useReceipts';
import { useParseTransaction, useParseVoice } from '@features/ai/api/useAi';
import { useEntitlement } from '@features/subscription/hooks/useEntitlement';
import { usePaywallStore } from '@features/subscription/store/usePaywallStore';

interface Props {
  open: boolean;
  onClose: () => void;
  /**
   * Modal açıldığı anda OCR'a vermek için hazır dosya. Dock'tan "Fiş Okut"
   * akışı: kullanıcı dock'tan dosya seçer, modal bu dosyayla açılır ve
   * scan otomatik tetiklenir. Null/undefined ise normal "boş açılış".
   */
  initialScanFile?: File | null;
  /**
   * Düzenleme hedefi. Verilirse modal "edit" modunda açılır: alanlar bu
   * kayıttan doldurulur, başlık değişir, submit useUpdateTransaction'a gider.
   * Null/undefined ise normal "create" modu (fiş okutma dahil).
   */
  editing?: TransactionDto | null;
}

const PAID_VIA_OPTIONS: { value: PaidVia; icon: string; labelKey: string }[] = [
  { value: 'cash',       icon: 'mdi:cash',                labelKey: 'transactions.paidVia_cash' },
  { value: 'debitCard',  icon: 'mdi:credit-card-outline', labelKey: 'transactions.paidVia_debitCard' },
  { value: 'creditCard', icon: 'mdi:credit-card-chip-outline', labelKey: 'transactions.paidVia_creditCard' },
  { value: 'transfer',   icon: 'mdi:bank-transfer',       labelKey: 'transactions.paidVia_transfer' },
  { value: 'eft',        icon: 'mdi:send-outline',        labelKey: 'transactions.paidVia_eft' },
];

interface FormState {
  type: TxType;
  categoryId: number | null;
  amount: string;
  currency: string;
  paidVia: PaidVia | null;
  notes: string;
}

const EMPTY_FORM: FormState = {
  type: 'expense',
  categoryId: null,
  amount: '',
  currency: 'TRY',
  paidVia: null,
  notes: '',
};

// ────────────────────────────────────────────────────────────────────────────
// Sesli giriş formatı — tarayıcı MediaRecorder çıktısı ile backend
// NormalizeAudioMime kümesinin kesişimi:
//   audio/mp4 (Safari + Chromium ≥126, AAC) → backend default'u audio/aac
//     (mobilin m4a yolu ile birebir aynı, üretimde kanıtlı),
//   audio/ogg (Firefox, Opus) → Gemini'nin desteklediği audio/ogg.
// audio/webm BİLEREK listede yok: backend onu audio/aac diye etiketler ve
// Gemini webm/opus baytlarını çözemez. Hiçbiri desteklenmiyorsa mikrofon
// butonu hiç render edilmez (yazılı AI girişi her zaman çalışır).
// ────────────────────────────────────────────────────────────────────────────
const VOICE_MIME_CANDIDATES = [
  { mime: 'audio/mp4', ext: 'm4a' },
  { mime: 'audio/ogg;codecs=opus', ext: 'ogg' },
  { mime: 'audio/wav', ext: 'wav' },
] as const;

function pickAudioMime(): { mime: string; ext: string } | null {
  if (
    typeof MediaRecorder === 'undefined' ||
    typeof navigator === 'undefined' ||
    !navigator.mediaDevices?.getUserMedia
  ) {
    return null;
  }
  for (const c of VOICE_MIME_CANDIDATES) {
    if (MediaRecorder.isTypeSupported(c.mime)) return c;
  }
  return null;
}

function isPremiumRequiredError(err: unknown): boolean {
  const e = err as { response?: { status?: number; data?: { errorCode?: string } } } | undefined;
  return e?.response?.data?.errorCode === 'PREMIUM_REQUIRED' || e?.response?.status === 403;
}

export function QuickEntryModal({ open, onClose, initialScanFile, editing }: Props) {
  const { t } = useTranslation(['pages', 'common', 'ai']);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  // İlk başarısız "Kaydet" denemesinden sonra eksik alanları kırmızı + uyarıyla göster.
  const [attempted, setAttempted] = useState(false);
  const isEditMode = editing != null;

  const categoriesQ = useCategoriesQuery();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const scan = useScanReceipt();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ── AI giriş modu (premium) — mobil QuickEntryModal portu ──
  const { isPremium } = useEntitlement();
  const showPaywall = usePaywallStore((s) => s.show);
  const aiParse = useParseTransaction();
  const aiVoice = useParseVoice();
  // AI sahnesi kapalı başlar — ✨ çipine tıklayınca açılır (sade varsayılan).
  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState('');
  // AI'ın çözdüğü tarih ("dün" vb.) — formda alan yok, submit'te kullanılır; chip ile temizlenir.
  const [aiDate, setAiDate] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordStartedAtRef = useRef(0);
  // Modal kapanırken durdurulan kayıt çözümlemeye GİTMESİN (onstop async gelir).
  const discardRecordingRef = useRef(false);
  // Tek sefer feature-detect; null ise mikrofon butonu hiç görünmez.
  const voiceMime = useMemo(() => pickAudioMime(), []);

  // setState içermez (effect'ten çağrılır); recording bayrağını onstop callback'i düşürür.
  const stopRecorder = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== 'inactive') {
      discardRecordingRef.current = true;
      rec.stop();
    }
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAttempted(false);
    setForm(
      editing
        ? {
            type: editing.type,
            categoryId: editing.categoryId,
            amount: String(editing.amount),
            currency: editing.currency,
            paidVia: editing.paidVia ?? null,
            notes: editing.notes ?? '',
          }
        : EMPTY_FORM,
    );
    // AI sahnesi her açılışta sıfırdan başlar.
    setAiOpen(false);
    setAiText('');
    setAiDate(null);
  }, [open, editing]);

  // Modal kapanırken / unmount'ta açık mikrofon kaydı kalmasın.
  useEffect(() => {
    if (!open) stopRecorder();
    return stopRecorder;
  }, [open, stopRecorder]);

  const handleScanClick = () => fileInputRef.current?.click();

  const runScan = useCallback(async (file: File) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif', 'application/pdf'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.error(t('transactions.scan_unsupportedType'));
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error(t('transactions.scan_tooLarge'));
      return;
    }

    try {
      const result = await scan.mutateAsync(file);
      // Pre-fill form alanları — kategori HALA boş kalır; kullanıcı seçer.
      // Kullanıcının manuel girdiği değerleri OCR overwrite ETMEZ:
      // amount/currency boşsa (default) OCR ile doldur; doluysa kullanıcı veri korur, notes append edilir.
      setForm((prev) => {
        const totalAmount = result.total ?? result.subtotal;
        const merchantLine = result.merchantName ? `${result.merchantName}` : '';
        const itemsLine = result.items && result.items.length > 0
          ? result.items
              .filter((i) => i.name)
              .slice(0, 8)
              .map((i) => `• ${i.name}${i.totalPrice ? ` — ${i.totalPrice.toFixed(2)}` : ''}`)
              .join('\n')
          : '';
        const ocrNotes = [merchantLine, itemsLine].filter(Boolean).join('\n');

        const ocrCurrencyValid = result.currency && CURRENCIES.some((c) => c.code === result.currency);
        return {
          ...prev,
          amount: prev.amount.trim() === '' && totalAmount ? totalAmount.toFixed(2) : prev.amount,
          // Currency için "kullanıcı dokundu" sinyali yok; default TRY'den farklı ise korunur.
          currency: prev.currency === 'TRY' && ocrCurrencyValid ? result.currency! : prev.currency,
          notes: ocrNotes
            ? (prev.notes.trim() ? `${prev.notes}\n\n${ocrNotes}` : ocrNotes)
            : prev.notes,
        };
      });

      toast.success(t('transactions.scan_success'));
      if (result.confidence !== undefined && result.confidence < 0.6) {
        toast(t('transactions.scan_lowConfidence'), { icon: '⚠️' });
      }
      const itemCount = result.items?.length ?? 0;
      if (itemCount > 0) {
        toast(t('transactions.scan_appliedItems', { count: itemCount }), { icon: 'ℹ️' });
      }
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('transactions.scan_error')));
    }
  }, [scan, t]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // aynı dosyayı tekrar seçebilmek için reset
    if (!file) return;
    void runScan(file);
  };

  // Dock'tan gelen "Fiş Okut" akışı — modal initialScanFile ile açıldıysa
  // user-gesture zinciri içinde scan'i hemen başlat. Aynı File referansı için
  // tek sefer çalışır (ref guard); modal kapanıp tekrar açılırsa parent prop'u
  // null'a çekmeli.
  const scannedFileRef = useRef<File | null>(null);
  useEffect(() => {
    if (!open) {
      scannedFileRef.current = null;
      return;
    }
    if (initialScanFile && scannedFileRef.current !== initialScanFile) {
      scannedFileRef.current = initialScanFile;
      void runScan(initialScanFile);
    }
  }, [open, initialScanFile, runScan]);

  // AI ön doldurma — OCR ile aynı sözleşme: yalnız BOŞ alanları doldur, notu append et,
  // kullanıcının girdiğini ASLA ezme. Kategori yalnız listede gerçekten varsa uygulanır.
  const applyParsed = useCallback(
    (parsed: ParsedTransactionDto) => {
      const parsedCategoryValid = (categoriesQ.data ?? []).some(
        (c) => c.id === parsed.categoryId && c.type === parsed.type,
      );
      setForm((prev) => ({
        ...prev,
        type: parsed.type,
        categoryId: prev.categoryId ?? (parsedCategoryValid ? parsed.categoryId! : null),
        amount: prev.amount.trim() === '' ? parsed.amount.toFixed(2) : prev.amount,
        // Currency için "kullanıcı dokundu" sinyali yok; default TRY'den farklıysa korunur.
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
      toast.success(t('ai:entry_success'));
    },
    [categoriesQ.data, t],
  );

  /** Premium kapısı: çağrı YAPILMADAN önce paywall — backend [RequirePremium] son savunma. */
  const requirePremiumForAi = useCallback(() => {
    if (isPremium) return true;
    showPaywall('ai');
    return false;
  }, [isPremium, showPaywall]);

  const toggleAiOpen = () => {
    if (!requirePremiumForAi()) return;
    setAiOpen((v) => !v);
  };

  const handleAiParse = async () => {
    const text = aiText.trim();
    if (text.length < 3 || aiParse.isPending) return;
    if (!requirePremiumForAi()) return;
    try {
      const parsed = await aiParse.mutateAsync(text);
      applyParsed(parsed);
      setAiText('');
    } catch (err) {
      // Yarış durumu (abonelik bitti vb.): 403 görgülü karşılanır → paywall.
      if (isPremiumRequiredError(err)) showPaywall('ai');
      else toast.error(resolveApiErrorWithFallback(err, t('ai:entry_failed')));
    }
  };

  // Mikrofona TIKLA → kayıt; tekrar tıkla → durur ve Gemini doğrudan işleme çevirir.
  const toggleVoice = async () => {
    if (!voiceMime || aiVoice.isPending) return;
    if (recording) {
      // onstop handler'ı çözümlemeyi yapar.
      const rec = mediaRecorderRef.current;
      if (rec && rec.state !== 'inactive') rec.stop();
      mediaRecorderRef.current = null;
      setRecording(false);
      return;
    }
    if (!requirePremiumForAi()) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error(t('ai:entry_micDenied'));
      return;
    }
    try {
      const recorder = new MediaRecorder(stream, { mimeType: voiceMime.mime });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        if (discardRecordingRef.current) {
          discardRecordingRef.current = false;
          return;
        }
        const tooShort = Date.now() - recordStartedAtRef.current < 700;
        if (tooShort || chunks.length === 0) {
          if (tooShort) toast(t('ai:entry_tooShort'), { icon: 'ℹ️' });
          return;
        }
        // Codec parametresi at: backend yalnız temel mime'a bakar ("audio/ogg;codecs=opus"
        // default'a düşüp yanlış etiketlenirdi).
        const blob = new Blob(chunks, { type: voiceMime.mime.split(';')[0] });
        aiVoice
          .mutateAsync({ file: blob, fileName: `voice.${voiceMime.ext}` })
          .then(applyParsed)
          .catch((err: unknown) => {
            if (isPremiumRequiredError(err)) showPaywall('ai');
            else toast.error(resolveApiErrorWithFallback(err, t('ai:entry_failed')));
          });
      };
      discardRecordingRef.current = false;
      recorder.start();
      mediaRecorderRef.current = recorder;
      recordStartedAtRef.current = Date.now();
      setRecording(true);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      toast.error(t('ai:entry_failed'));
    }
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Tür değişince kategori reset (Income → Expense ya da tersi).
  const onTypeChange = (next: TxType) => {
    setForm((prev) => ({ ...prev, type: next, categoryId: null }));
  };

  // Tür-filtreli kategori listesi.
  const visibleCategories = useMemo<CategoryDto[]>(
    () => (categoriesQ.data ?? []).filter((c) => c.type === form.type),
    [categoriesQ.data, form.type],
  );

  const selectedCurrency = CURRENCIES.find((c) => c.code === form.currency) ?? CURRENCIES[0];
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const amountNum = parseAmount(form.amount);
  const amountInvalid = Number.isNaN(amountNum) || amountNum <= 0;
  const categoryMissing = form.categoryId === null;

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    // Eksik alan(lar) varsa: tıklamayı engelleme — bunun yerine net uyarı + kırmızı alan göster.
    if (amountInvalid || categoryMissing) {
      setAttempted(true);
      // Sabit id: tekrar tekrar Kaydet'e basınca toast'lar üst üste YIĞILMAZ,
      // mevcut toast yerinde yenilenir.
      toast.error(
        amountInvalid
          ? t('transactions.quickEntry_errorAmount')
          : t('transactions.quickEntry_errorCategory'),
        { id: 'quick-entry-validate' },
      );
      return;
    }
    if (form.categoryId === null) return;
    try {
      if (editing) {
        // Düzenleme: Type değişmez (backend Update'te yok). nature/status/tarih
        // mevcut kayıttan korunur; yalnız kategori/tutar/para birimi/ödeme/not güncellenir.
        await updateMutation.mutateAsync({
          id: editing.id,
          body: {
            categoryId: form.categoryId,
            nature: editing.nature,
            status: editing.status,
            amount: amountNum,
            currency: form.currency,
            paidVia: form.paidVia ?? undefined,
            transactionDate: editing.transactionDate,
            notes: form.notes.trim() || undefined,
            receiptUrl: editing.receiptUrl,
          },
        });
        toast.success(t('transactions.toastUpdateSuccess'));
      } else {
        await createMutation.mutateAsync({
          categoryId: form.categoryId,
          type: form.type,
          nature: 'variable',
          status: 'completed',
          amount: amountNum,
          currency: form.currency,
          paidVia: form.paidVia ?? undefined,
          // AI bugünden farklı bir tarih çözdüyse (chip görünür) onu kullan.
          transactionDate: aiDate ?? new Date().toISOString(),
          notes: form.notes.trim() || undefined,
        });
        toast.success(t('transactions.quickEntry_successAdded'));
      }
      onClose();
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('transactions.quickEntry_errorMissing')));
    }
  };

  return (
    <ZoomModal
      open={open}
      onClose={handleClose}
      title={isEditMode ? t('transactions.editTitle') : t('transactions.quickEntry_title')}
      subtitle={isEditMode ? t('transactions.editSubtitle') : t('transactions.quickEntry_subtitle')}
      icon={isEditMode ? 'mdi:pencil-outline' : 'mdi:lightning-bolt'}
      maxWidth={560}
      actions={
        <>
          <Button variant="text" onClick={handleClose} disabled={isSubmitting}>
            {t('common:cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={isSubmitting}
            startIcon={<Icon icon="mdi:check" width={18} />}
          >
            {t('common:save')}
          </Button>
        </>
      }
    >
      <Stack spacing={2.6}>
        {/* Scan/fiş okutma + AI girişi yalnız CREATE modunda — düzenlemede tür/akış kilitli. */}
        {!isEditMode && (
          /* Tek Box: kapalı Collapse, dış Stack spacing'inde hayalet boşluk bırakmasın */
          <Box>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
              sx={{ flexWrap: 'wrap', gap: 1 }}
            >
              <ScopeIndicator />
              <Stack direction="row" spacing={1} alignItems="center">
                {/* ✨ AI çipi — tıklayınca serbest-metin sahnesi açılır; premium değilse paywall('ai') */}
                <Box
                  component="button"
                  type="button"
                  onClick={toggleAiOpen}
                  aria-label={t('ai:entry_chipLabel')}
                  aria-expanded={aiOpen}
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.6,
                    px: 1.3,
                    py: 0.6,
                    cursor: 'pointer',
                    borderRadius: 999,
                    border: '1px solid',
                    borderColor: (th) => (aiOpen ? th.palette.warning.main : alpha(th.palette.warning.main, 0.45)),
                    bgcolor: (th) => (aiOpen ? th.palette.warning.main : alpha(th.palette.warning.main, 0.1)),
                    color: aiOpen ? 'warning.contrastText' : 'warning.main',
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: '0.68rem',
                    letterSpacing: '0.16em',
                    fontWeight: 600,
                    transition: 'all .18s ease',
                    '&:hover': {
                      bgcolor: (th) =>
                        aiOpen ? th.palette.warning.dark : alpha(th.palette.warning.main, 0.18),
                    },
                    '&:focus-visible': {
                      outline: 'none',
                      boxShadow: (th) => `0 0 0 3px ${alpha(th.palette.warning.main, 0.35)}`,
                    },
                  }}
                >
                  <Icon icon="mdi:creation" width={14} />
                  AI
                  {!isPremium && <Icon icon="mdi:lock-outline" width={12} />}
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleScanClick}
                  disabled={scan.isPending}
                  startIcon={
                    scan.isPending ? (
                      <CircularProgress size={14} thickness={5} />
                    ) : (
                      <Icon icon="mdi:camera-document-outline" width={16} />
                    )
                  }
                  sx={{
                    alignSelf: 'flex-start',
                    px: 1.4,
                    py: 0.5,
                    fontSize: '0.74rem',
                    fontFamily: '"Geist Mono", monospace',
                    letterSpacing: '0.02em',
                    '& .MuiButton-startIcon': { mr: 0.7 },
                  }}
                >
                  {scan.isPending ? t('transactions.scan_uploading') : t('transactions.scan_button')}
                </Button>
              </Stack>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/heic,image/heif,application/pdf"
                style={{ display: 'none' }}
                aria-hidden="true"
                tabIndex={-1}
                onChange={handleFileChange}
              />
            </Stack>

            {/* AI sahnesi: "dün akşam 450 lira market" → form ön doldurma.
                Mikrofon yalnız tarayıcı backend'in kabul ettiği formatı üretebiliyorsa görünür. */}
            <Collapse in={aiOpen} unmountOnExit>
              {/* pt (mt değil): Collapse yükseklik ölçümüne margin girmez, padding girer */}
              <Box sx={{ pt: 1.5 }}>
              <Stack
                direction="row"
                spacing={0.8}
                alignItems="center"
                sx={(th) => ({
                  py: 0.5,
                  paddingInlineStart: th.spacing(voiceMime ? 0.6 : 1.4),
                  paddingInlineEnd: th.spacing(0.6),
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: recording ? th.palette.warning.main : alpha(th.palette.warning.main, 0.3),
                  bgcolor: alpha(th.palette.warning.main, 0.06),
                  transition: 'border-color .2s ease',
                })}
              >
                {voiceMime && (
                  <IconButton
                    size="small"
                    onClick={() => void toggleVoice()}
                    disabled={aiVoice.isPending}
                    aria-label={recording ? t('ai:entry_micStop') : t('ai:entry_micStart')}
                    sx={(th) => ({
                      color: recording ? th.palette.warning.contrastText : th.palette.warning.main,
                      bgcolor: recording ? th.palette.warning.main : 'transparent',
                      '&:hover': {
                        bgcolor: recording ? th.palette.warning.dark : alpha(th.palette.warning.main, 0.12),
                      },
                      ...(recording && {
                        '@media (prefers-reduced-motion: no-preference)': {
                          animation: 'pr-ai-rec 1.6s ease-in-out infinite',
                        },
                        '@keyframes pr-ai-rec': {
                          '0%, 100%': { boxShadow: `0 0 0 0 ${alpha(th.palette.warning.main, 0.4)}` },
                          '50%': { boxShadow: `0 0 0 7px ${alpha(th.palette.warning.main, 0)}` },
                        },
                      }),
                    })}
                  >
                    {aiVoice.isPending ? (
                      <CircularProgress size={16} thickness={5} color="warning" />
                    ) : (
                      <Icon icon={recording ? 'mdi:stop' : 'mdi:microphone-outline'} width={18} />
                    )}
                  </IconButton>
                )}
                <TextField
                  variant="standard"
                  fullWidth
                  autoFocus
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleAiParse();
                    }
                  }}
                  placeholder={
                    recording
                      ? t('ai:entry_listening')
                      : aiVoice.isPending
                        ? t('ai:entry_thinking')
                        : t('ai:entry_placeholder')
                  }
                  inputProps={{ 'aria-label': t('ai:entry_chipLabel'), maxLength: 280 }}
                  slotProps={{ input: { disableUnderline: true, sx: { fontSize: '0.88rem' } } }}
                />
                <IconButton
                  size="small"
                  onClick={() => void handleAiParse()}
                  disabled={aiParse.isPending || aiText.trim().length < 3}
                  aria-label={t('ai:entry_send')}
                  sx={{
                    bgcolor: 'warning.main',
                    color: 'warning.contrastText',
                    '&:hover': { bgcolor: 'warning.dark' },
                    '&.Mui-disabled': {
                      bgcolor: (th) => alpha(th.palette.warning.main, 0.3),
                      color: 'warning.contrastText',
                    },
                  }}
                >
                  {aiParse.isPending ? (
                    <CircularProgress size={16} thickness={5} color="inherit" />
                  ) : (
                    <Icon icon="mdi:arrow-up" width={16} />
                  )}
                </IconButton>
              </Stack>
              </Box>
            </Collapse>

            {/* AI'ın çözdüğü tarih ("dün" vb.) — silinebilir chip; submit bunu kullanır */}
            {aiDate && (
              <Box sx={{ pt: 1.5 }}>
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  icon={<Icon icon="mdi:calendar-outline" width={14} />}
                  label={t('ai:entry_dateApplied', { date: formatDate(aiDate) })}
                  onDelete={() => setAiDate(null)}
                  deleteIcon={<Icon icon="mdi:close-circle" width={15} aria-label={t('ai:entry_clearDate')} />}
                  sx={{ fontWeight: 600 }}
                />
              </Box>
            )}
          </Box>
        )}
        {/* Type segment — düzenlemede tür değişmez (backend Update'te Type yok), kilitli. */}
        <Box>
          <FieldLabel text={t('transactions.quickEntry_typeLabel')} />
          <Stack direction="row" spacing={1.2}>
            <TypeButton
              tone="success"
              icon="mdi:trending-up"
              label={t('common:income')}
              active={form.type === 'income'}
              disabled={isEditMode}
              onClick={() => onTypeChange('income')}
            />
            <TypeButton
              tone="error"
              icon="mdi:trending-down"
              label={t('common:expense')}
              active={form.type === 'expense'}
              disabled={isEditMode}
              onClick={() => onTypeChange('expense')}
            />
          </Stack>
        </Box>

        {/* Amount + currency */}
        <TextField
          label={t('transactions.quickEntry_amountLabel')}
          type="text"
          value={form.amount}
          onChange={(e) => set('amount', e.target.value)}
          fullWidth
          autoFocus
          error={attempted && amountInvalid}
          helperText={attempted && amountInvalid ? t('transactions.quickEntry_errorAmount') : undefined}
          inputProps={{ inputMode: 'decimal' }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Typography className="pr-num" sx={{ fontWeight: 600, color: 'text.disabled' }}>
                    {selectedCurrency.symbol}
                  </Typography>
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Select
                    variant="standard"
                    value={form.currency}
                    onChange={(e) => set('currency', e.target.value)}
                    disableUnderline
                    sx={{
                      fontFamily: '"Geist Mono", monospace',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      '& .MuiSelect-select': { py: 0, pr: '20px !important' },
                    }}
                  >
                    {CURRENCIES.map((c) => (
                      <MenuItem key={c.code} value={c.code} sx={{ fontSize: '0.82rem' }}>
                        {c.symbol} {c.code}
                      </MenuItem>
                    ))}
                  </Select>
                </InputAdornment>
              ),
              sx: { fontFamily: '"Geist Mono", monospace', fontSize: '1.2rem', fontWeight: 600 },
            },
          }}
        />

        {/* Category dropdown — filtered by type */}
        <TextField
          select
          label={t('transactions.quickEntry_categoryLabel')}
          value={form.categoryId ?? ''}
          onChange={(e) => set('categoryId', Number(e.target.value))}
          fullWidth
          disabled={categoriesQ.isLoading || categoriesQ.isError}
          error={(attempted && categoryMissing && visibleCategories.length > 0) || categoriesQ.isError}
          helperText={
            categoriesQ.isLoading
              ? t('common:loading')
              : categoriesQ.isError
                ? t('categories.errorTitle')
                : visibleCategories.length === 0
                  ? t('transactions.quickEntry_noCategoryForType')
                  : attempted && categoryMissing
                    ? t('transactions.quickEntry_errorCategory')
                    : undefined
          }
          slotProps={{
            input: {
              startAdornment: categoriesQ.isLoading ? (
                <InputAdornment position="start">
                  <CircularProgress size={14} thickness={5} />
                </InputAdornment>
              ) : undefined,
            },
          }}
        >
          {visibleCategories.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              <Stack direction="row" spacing={1.2} alignItems="center">
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: 0.9,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: alpha(c.color ?? '#5A6E7C', 0.16),
                    color: c.color ?? 'text.primary',
                    fontSize: '0.9rem',
                  }}
                >
                  {c.emoji ? c.emoji : <Icon icon={c.icon} width={14} />}
                </Box>
                {c.name}
              </Stack>
            </MenuItem>
          ))}
        </TextField>

        {/* PaidVia 5-segment */}
        <Box>
          <FieldLabel text={t('transactions.paidVia_label')} optional />
          <Stack
            direction="row"
            spacing={0.8}
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 0.8,
            }}
          >
            {PAID_VIA_OPTIONS.map((opt) => {
              const active = form.paidVia === opt.value;
              return (
                <Tooltip key={opt.value} title={t(opt.labelKey)} arrow placement="top">
                  <Box
                    component="button"
                    type="button"
                    onClick={() => set('paidVia', active ? null : opt.value)}
                    aria-label={t(opt.labelKey)}
                    aria-pressed={active}
                    sx={{
                      py: 1.1,
                      px: 0.5,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.4,
                      cursor: 'pointer',
                      borderRadius: 1.4,
                      border: '1.5px solid',
                      borderColor: active ? 'primary.main' : 'divider',
                      bgcolor: (th) =>
                        active ? alpha(th.palette.primary.main, 0.1) : 'transparent',
                      color: active ? 'primary.main' : 'text.secondary',
                      transition: 'all .15s',
                      '&:hover': {
                        borderColor: 'primary.main',
                        color: 'primary.main',
                      },
                    }}
                  >
                    <Icon icon={opt.icon} width={20} />
                    <Box
                      sx={{
                        fontFamily: '"Geist Mono", monospace',
                        fontSize: '0.58rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      }}
                    >
                      {t(opt.labelKey)}
                    </Box>
                  </Box>
                </Tooltip>
              );
            })}
          </Stack>
        </Box>

        {/* Notes */}
        <TextField
          label={t('transactions.quickEntry_noteLabel')}
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          fullWidth
          multiline
          minRows={2}
          placeholder={t('transactions.quickEntry_notePlaceholder')}
          inputProps={{ maxLength: 500 }}
        />
      </Stack>
    </ZoomModal>
  );
}

function FieldLabel({ text, optional }: { text: string; optional?: boolean }) {
  const { t } = useTranslation('common');
  return (
    <Typography
      sx={{
        fontFamily: '"Geist Mono", monospace',
        fontSize: '0.66rem',
        letterSpacing: '0.2em',
        textTransform: 'uppercase',
        color: 'text.disabled',
        mb: 1,
      }}
    >
      {text}
      {optional && (
        <Box
          component="span"
          sx={{ color: 'text.disabled', opacity: 0.6, ml: 0.6, textTransform: 'lowercase', letterSpacing: 0 }}
        >
          ({t('optional')})
        </Box>
      )}
    </Typography>
  );
}

interface TypeButtonProps {
  tone: 'success' | 'error';
  icon: string;
  label: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function TypeButton({ tone, icon, label, active, disabled, onClick }: TypeButtonProps) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        flex: 1,
        py: 1.3,
        px: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0.9,
        fontFamily: '"Geist", sans-serif',
        fontWeight: 600,
        fontSize: '0.9rem',
        textTransform: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderRadius: 1.5,
        border: '1.5px solid',
        borderColor: active ? `${tone}.main` : 'divider',
        bgcolor: (th) => (active ? alpha(th.palette[tone].main, 0.12) : 'transparent'),
        color: active ? `${tone}.main` : 'text.secondary',
        opacity: disabled && !active ? 0.45 : 1,
        transition: 'all .15s',
        '&:hover': disabled
          ? undefined
          : {
              borderColor: `${tone}.main`,
              color: `${tone}.main`,
              bgcolor: (th) => alpha(th.palette[tone].main, 0.06),
            },
      }}
    >
      <Icon icon={icon} width={18} />
      {label}
    </Box>
  );
}
