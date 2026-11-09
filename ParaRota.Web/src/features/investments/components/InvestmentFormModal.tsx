import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  ListSubheader,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { parseAmount } from '@shared/lib/parseAmount';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import { ASSET_GROUPS, ASSET_ICON, ASSET_COLOR } from '@shared/lib/assetMeta';
import type { AssetType, HoldingDto } from '@shared/api/types';
import { useCreateHolding, useUpdateHolding, useTefasLookup } from '../api/useInvestments';

interface Props {
  open: boolean;
  onClose: () => void;
  mode: 'create' | 'edit';
  holding?: HoldingDto;
}

type EntryMode = 'amount' | 'quantity';

interface FormState {
  assetType: AssetType;
  fundCode: string;
  purchaseDate: string;
  entryMode: EntryMode;
  amount: string;
  quantity: string;
  linkToCashFlow: boolean;
  note: string;
}

const DEFAULT_STATE = (): FormState => ({
  assetType: 'goldGram',
  fundCode: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  entryMode: 'amount',
  amount: '',
  quantity: '',
  linkToCashFlow: true,
  note: '',
});

export function InvestmentFormModal({ open, onClose, mode, holding }: Props) {
  const { t } = useTranslation(['investments', 'common']);
  const createMutation = useCreateHolding();
  const updateMutation = useUpdateHolding();
  const tefasLookup = useTefasLookup();

  const [form, setForm] = useState<FormState>(DEFAULT_STATE);
  const [attempted, setAttempted] = useState(false);
  // TEFAS fon adı: doğrulanmış kodun resmi adı (null = henüz doğrulanmadı).
  const [fundName, setFundName] = useState<string | null>(null);
  const [fundError, setFundError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAttempted(false);
    setFundError(null);
    if (mode === 'edit' && holding) {
      setForm({
        assetType: holding.assetType,
        fundCode: holding.fundCode ?? '',
        purchaseDate: holding.purchaseDate.slice(0, 10),
        entryMode: 'quantity',
        amount: String(holding.investedAmount),
        quantity: String(holding.quantity),
        linkToCashFlow: false,
        note: holding.note ?? '',
      });
      setFundName(holding.fundName ?? null);
    } else {
      setForm(DEFAULT_STATE());
      setFundName(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, holding?.id]);

  const isTefas = form.assetType === 'tefasFund';
  const amountNum = parseAmount(form.amount);
  const quantityNum = parseAmount(form.quantity);
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const valueMissing =
    form.entryMode === 'amount'
      ? Number.isNaN(amountNum) || amountNum <= 0
      : Number.isNaN(quantityNum) || quantityNum <= 0;
  const dateMissing = form.purchaseDate.length === 0;
  // TEFAS fonunda kod doğrulanmış (fundName dolu) olmalı.
  const fundReady = !isTefas || (form.fundCode.trim().length > 0 && fundName !== null);
  const isValid = !valueMissing && !dateMissing && fundReady;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  // Varlık türü değişince TEFAS fon doğrulama durumunu sıfırla.
  const setAsset = (value: AssetType) => {
    setForm((prev) => ({ ...prev, assetType: value, fundCode: '' }));
    setFundName(null);
    setFundError(null);
  };

  // Fon kodu değişince önceki doğrulamayı geçersiz kıl.
  const setFundCode = (value: string) => {
    setForm((prev) => ({ ...prev, fundCode: value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) }));
    setFundName(null);
    setFundError(null);
  };

  const handleLookup = async () => {
    const code = form.fundCode.trim();
    if (!code || tefasLookup.isPending) return;
    setFundError(null);
    try {
      const q = await tefasLookup.mutateAsync(code);
      setFundName(q.name);
      setForm((prev) => ({ ...prev, fundCode: q.code }));
    } catch {
      setFundName(null);
      setFundError(t('fund_invalid'));
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!isValid) {
      setAttempted(true);
      toast.error(t('toast_error'), { id: 'holding-form-validate' });
      return;
    }
    const amountField = form.entryMode === 'amount' ? amountNum : null;
    const quantityField = form.entryMode === 'quantity' ? quantityNum : null;
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          assetType: form.assetType,
          fundCode: isTefas ? form.fundCode.trim() : undefined,
          purchaseDate: form.purchaseDate,
          investedAmount: amountField,
          quantity: quantityField,
          linkToCashFlow: form.linkToCashFlow,
          note: form.note.trim() || undefined,
        });
        toast.success(t('toast_create'));
      } else if (holding) {
        await updateMutation.mutateAsync({
          id: holding.id,
          body: {
            purchaseDate: form.purchaseDate,
            investedAmount: amountField,
            quantity: quantityField,
            note: form.note.trim() || undefined,
          },
        });
        toast.success(t('toast_update'));
      }
      onClose();
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('toast_error')));
    }
  };

  const isGoldGram = form.assetType === 'goldGram';
  const isGoldCoin = ['goldQuarter', 'goldHalf', 'goldFull', 'goldRepublic'].includes(form.assetType);
  const quantityHint = isGoldGram ? t('unit_gram') : isGoldCoin ? t('unit_piece') : t('unit_unit');

  return (
    <ZoomModal
      open={open}
      onClose={handleClose}
      icon={mode === 'create' ? 'mdi:chart-line-variant' : 'mdi:pencil-outline'}
      title={mode === 'create' ? t('modalCreateTitle') : t('modalEditTitle')}
      subtitle={mode === 'create' ? t('modalCreateSubtitle') : t('modalEditSubtitle')}
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
            startIcon={isSubmitting ? <CircularProgress size={16} thickness={5} /> : <Icon icon="mdi:check" width={18} />}
          >
            {t('common:save')}
          </Button>
        </>
      }
    >
      <Stack spacing={2.4}>
        {mode === 'create' && <ScopeIndicator />}

        {/* Varlık türü */}
        <TextField
          select
          label={t('form_asset')}
          value={form.assetType}
          onChange={(e) => setAsset(e.target.value as AssetType)}
          fullWidth
          disabled={mode === 'edit'}
        >
          {ASSET_GROUPS.flatMap((g) => [
            <ListSubheader key={g.cat}>{t(g.cat)}</ListSubheader>,
            ...g.items.map((a) => (
              <MenuItem key={a} value={a}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box sx={{ color: ASSET_COLOR[a], display: 'flex' }}>
                    <Icon icon={ASSET_ICON[a]} width={18} />
                  </Box>
                  {t(`asset_${a}`)}
                </Stack>
              </MenuItem>
            )),
          ])}
        </TextField>

        {/* TEFAS fon kodu — serbest giriş + doğrulama */}
        {isTefas && (
          <Box>
            <TextField
              label={t('form_fundCode')}
              value={form.fundCode}
              onChange={(e) => setFundCode(e.target.value)}
              onBlur={() => { if (form.fundCode.trim() && fundName === null) void handleLookup(); }}
              fullWidth
              disabled={mode === 'edit'}
              error={attempted && !fundReady}
              placeholder={t('form_fundCodePlaceholder')}
              helperText={fundError ?? t('form_fundCodeHint')}
              slotProps={{
                input: {
                  endAdornment: mode === 'edit' ? undefined : (
                    <InputAdornment position="end">
                      <Button size="small" onClick={() => void handleLookup()} disabled={!form.fundCode.trim() || tefasLookup.isPending}>
                        {tefasLookup.isPending ? <CircularProgress size={15} thickness={5} /> : t('form_fundLookup')}
                      </Button>
                    </InputAdornment>
                  ),
                  sx: { fontFamily: '"Geist Mono", monospace', fontWeight: 600, letterSpacing: '0.08em' },
                },
              }}
            />
            {fundName && (
              <Stack direction="row" spacing={0.8} alignItems="center" sx={{ mt: 0.8 }}>
                <Icon icon="mdi:check-circle" width={16} color="#1FB585" />
                <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>{fundName}</Typography>
              </Stack>
            )}
          </Box>
        )}

        {/* Alış tarihi */}
        <TextField
          label={t('form_purchaseDate')}
          type="date"
          value={form.purchaseDate}
          onChange={(e) => set('purchaseDate', e.target.value)}
          fullWidth
          error={attempted && dateMissing}
          InputLabelProps={{ shrink: true }}
          inputProps={{ max: new Date().toISOString().slice(0, 10) }}
        />

        {/* Giriş türü: tutar mı, adet/gram mı */}
        <TextField
          select
          label={t('form_entryMode')}
          value={form.entryMode}
          onChange={(e) => set('entryMode', e.target.value as EntryMode)}
          fullWidth
          helperText={t('form_entryModeHint')}
        >
          <MenuItem value="amount">{t('entry_amount')}</MenuItem>
          <MenuItem value="quantity">{t('entry_quantity')}</MenuItem>
        </TextField>

        {form.entryMode === 'amount' ? (
          <TextField
            label={t('form_amount')}
            type="text"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value.replace(/[^0-9.,]/g, ''))}
            fullWidth
            error={attempted && valueMissing}
            helperText={attempted && valueMissing ? t('toast_error') : undefined}
            inputProps={{ inputMode: 'decimal' }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography sx={{ fontWeight: 600, color: 'text.disabled' }}>₺</Typography>
                  </InputAdornment>
                ),
                sx: { fontFamily: '"Geist Mono", monospace', fontSize: '1.2rem', fontWeight: 600 },
              },
            }}
          />
        ) : (
          <TextField
            label={t('form_quantity')}
            type="text"
            value={form.quantity}
            onChange={(e) => set('quantity', e.target.value.replace(/[^0-9.,]/g, ''))}
            fullWidth
            error={attempted && valueMissing}
            helperText={attempted && valueMissing ? t('toast_error') : quantityHint}
            inputProps={{ inputMode: 'decimal' }}
            slotProps={{ input: { sx: { fontFamily: '"Geist Mono", monospace', fontSize: '1.2rem', fontWeight: 600 } } }}
          />
        )}

        {/* Not */}
        <TextField
          label={t('form_note')}
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
          fullWidth
          multiline
          minRows={1}
          inputProps={{ maxLength: 280 }}
        />

        {/* Nakit bağlama (yalnız create) */}
        {mode === 'create' && (
          <FormControlLabel
            control={<Switch checked={form.linkToCashFlow} onChange={(e) => set('linkToCashFlow', e.target.checked)} />}
            label={
              <Stack>
                <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{t('form_linkCashFlow')}</Typography>
                <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{t('form_linkCashFlowHint')}</Typography>
              </Stack>
            }
          />
        )}
      </Stack>
    </ZoomModal>
  );
}
