import { useEffect, useMemo, useState } from 'react';
import { Box, Button, ButtonBase, CircularProgress, InputAdornment, ListSubheader, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { parseAmount } from '@shared/lib/parseAmount';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { ASSET_GROUPS, ASSET_ICON, ASSET_COLOR } from '@shared/lib/assetMeta';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import type { AlarmDirection, AssetType, PriceAlarmDto } from '@shared/api/types';
import { useAssetRatesQuery, useCreatePriceAlarm, useUpdatePriceAlarm } from '../api/usePriceAlarms';
import { useTefasLookup } from '@features/investments/api/useInvestments';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Düzenleme modunda mevcut alarm; create için undefined. */
  alarm?: PriceAlarmDto;
}

const DIRECTIONS: AlarmDirection[] = ['above', 'below'];

export function PriceAlarmModal({ open, onClose, alarm }: Props) {
  const { t } = useTranslation(['priceAlarms', 'investments', 'common']);
  const fmtMoney = useMoneyFmt();
  const create = useCreatePriceAlarm();
  const update = useUpdatePriceAlarm();
  const isEdit = !!alarm;
  const pending = create.isPending || update.isPending;

  const ratesQ = useAssetRatesQuery(open);
  const tefasLookup = useTefasLookup();

  const [assetType, setAssetType] = useState<AssetType>('goldGram');
  const [fundCode, setFundCodeState] = useState('');
  const [fundName, setFundName] = useState<string | null>(null);
  const [fundPrice, setFundPrice] = useState<number | null>(null);
  const [fundError, setFundError] = useState<string | null>(null);
  const [direction, setDirection] = useState<AlarmDirection>('above');
  const [threshold, setThreshold] = useState('');
  const [note, setNote] = useState('');
  const [attempted, setAttempted] = useState(false);

  const isTefas = assetType === 'tefasFund';

  // Modal her açıldığında formu kaynaktan kur (open→state senkronu).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setAssetType(alarm?.assetType ?? 'goldGram');
    setFundCodeState(alarm?.fundCode ?? '');
    setFundName(alarm?.fundName ?? null);
    setFundPrice(null);
    setFundError(null);
    setDirection(alarm?.direction ?? 'above');
    setThreshold(alarm ? String(alarm.thresholdPrice) : '');
    setNote(alarm?.note ?? '');
    setAttempted(false);
  }, [open, alarm]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const currentPrice = useMemo(() => {
    if (isTefas) return fundPrice;
    const row = ratesQ.data?.find((r) => r.assetType === assetType);
    return row?.sell ?? null;
  }, [ratesQ.data, assetType, isTefas, fundPrice]);

  const onAssetChange = (value: AssetType) => {
    setAssetType(value);
    setFundCodeState('');
    setFundName(null);
    setFundPrice(null);
    setFundError(null);
  };

  const onFundCodeChange = (value: string) => {
    setFundCodeState(value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10));
    setFundName(null);
    setFundPrice(null);
    setFundError(null);
  };

  const handleLookup = async () => {
    const code = fundCode.trim();
    if (!code || tefasLookup.isPending) return;
    setFundError(null);
    try {
      const q = await tefasLookup.mutateAsync(code);
      setFundName(q.name);
      setFundPrice(q.price);
      setFundCodeState(q.code);
    } catch {
      setFundName(null);
      setFundPrice(null);
      setFundError(t('investments:fund_invalid'));
    }
  };

  const thresholdNum = parseAmount(threshold);
  const fundReady = !isTefas || (fundCode.trim().length > 0 && fundName !== null);
  const valid = Number.isFinite(thresholdNum) && thresholdNum > 0 && note.trim().length <= 200 && fundReady;

  const useCurrentPrice = () => {
    if (currentPrice != null) setThreshold(String(Math.round(currentPrice * 100) / 100));
  };

  const handleSubmit = async () => {
    if (pending) return;
    if (!valid) { setAttempted(true); toast.error(t('invalid')); return; }
    const trimmedNote = note.trim() ? note.trim() : null;
    try {
      if (isEdit) {
        await update.mutateAsync({ id: alarm.id, body: { direction, thresholdPrice: thresholdNum, note: trimmedNote } });
        toast.success(t('updated'));
      } else {
        await create.mutateAsync({ assetType, fundCode: isTefas ? fundCode.trim() : undefined, direction, thresholdPrice: thresholdNum, note: trimmedNote });
        toast.success(t('created'));
      }
      onClose();
    } catch (err) {
      toast.error(getErrorMessage(err, t('common:errorGeneric')));
    }
  };

  const accent = ASSET_COLOR[assetType];

  return (
    <ZoomModal
      open={open}
      onClose={pending ? () => {} : onClose}
      icon="mdi:bell-ring-outline"
      title={isEdit ? t('edit_title') : t('create_title')}
      subtitle={isEdit ? t('edit_subtitle') : t('create_subtitle')}
      maxWidth={520}
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={pending}>{t('common:cancel')}</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={pending}
            startIcon={pending ? <CircularProgress size={16} thickness={5} /> : <Icon icon="mdi:check" width={18} />}>
            {isEdit ? t('common:save') : t('create_submit')}
          </Button>
        </>
      }
    >
      <Stack spacing={2.4}>
        {/* Varlık seçimi — düzenlemede kilitli */}
        <Box>
          <FieldLabel text={t('field_asset')} />
          {isEdit ? (
            <Stack direction="row" spacing={1.2} alignItems="center"
              sx={{ px: 1.6, py: 1.2, borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.default' }}>
              <Box sx={{ width: 34, height: 34, borderRadius: '50%', display: 'grid', placeItems: 'center', color: accent, bgcolor: alpha(accent, 0.14) }}>
                <Icon icon={ASSET_ICON[assetType]} width={20} />
              </Box>
              <Typography sx={{ fontWeight: 600 }}>
                {isTefas ? (fundName || fundCode || t('investments:asset_tefasFund')) : t(`investments:asset_${assetType}`)}
              </Typography>
            </Stack>
          ) : (
            <TextField select fullWidth value={assetType} onChange={(e) => onAssetChange(e.target.value as AssetType)}
              SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 360 } } } }}>
              {ASSET_GROUPS.flatMap((g) => [
                <ListSubheader key={g.cat} sx={{ fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.04em' }}>
                  {t(`investments:${g.cat}`)}
                </ListSubheader>,
                ...g.items.map((it) => (
                  <MenuItem key={it} value={it} sx={{ gap: 1.2 }}>
                    <Icon icon={ASSET_ICON[it]} width={18} style={{ color: ASSET_COLOR[it] }} />
                    {t(`investments:asset_${it}`)}
                  </MenuItem>
                )),
              ])}
            </TextField>
          )}

          {/* TEFAS fon kodu — serbest giriş + doğrulama (yalnız create) */}
          {isTefas && !isEdit && (
            <TextField
              label={t('investments:form_fundCode')}
              value={fundCode}
              onChange={(e) => onFundCodeChange(e.target.value)}
              onBlur={() => { if (fundCode.trim() && fundName === null) void handleLookup(); }}
              fullWidth
              sx={{ mt: 1.2 }}
              error={attempted && !fundReady}
              placeholder={t('investments:form_fundCodePlaceholder')}
              helperText={fundError ?? t('investments:form_fundCodeHint')}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button size="small" onClick={() => void handleLookup()} disabled={!fundCode.trim() || tefasLookup.isPending}>
                      {tefasLookup.isPending ? <CircularProgress size={15} thickness={5} /> : t('investments:form_fundLookup')}
                    </Button>
                  </InputAdornment>
                ),
                sx: { fontFamily: '"Geist Mono", monospace', fontWeight: 600, letterSpacing: '0.08em' },
              }}
            />
          )}
          {/* Güncel fiyat ipucu */}
          <Box sx={{ mt: 1, minHeight: 22 }}>
            {ratesQ.isLoading ? (
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>{t('loading_price')}</Typography>
            ) : currentPrice != null ? (
              <Stack direction="row" spacing={0.8} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('current_price')}: <strong>{fmtMoney(currentPrice)}</strong>
                </Typography>
                <ButtonBase onClick={useCurrentPrice}
                  sx={{ px: 1, py: 0.2, borderRadius: 999, fontSize: '0.7rem', fontWeight: 700, color: 'primary.main', bgcolor: (th) => alpha(th.palette.primary.main, 0.1) }}>
                  {t('use_current')}
                </ButtonBase>
              </Stack>
            ) : null}
          </Box>
        </Box>

        {/* Yön */}
        <Box>
          <FieldLabel text={t('field_direction')} />
          <Stack direction="row" spacing={1.2}>
            {DIRECTIONS.map((d) => {
              const on = direction === d;
              const isAbove = d === 'above';
              const tint = isAbove ? 'success' : 'error';
              return (
                <ButtonBase key={d} onClick={() => setDirection(d)} aria-pressed={on}
                  sx={{ flex: 1, py: 1.1, borderRadius: 2, border: '1px solid', flexDirection: 'column', gap: 0.3, transition: 'all .15s',
                    borderColor: on ? `${tint}.main` : 'divider',
                    bgcolor: on ? (th) => alpha(th.palette[tint].main, 0.1) : 'transparent',
                    color: on ? `${tint}.main` : 'text.secondary', fontWeight: on ? 700 : 500 }}>
                  <Icon icon={isAbove ? 'mdi:trending-up' : 'mdi:trending-down'} width={22} />
                  <Typography component="span" sx={{ fontSize: '0.82rem', fontWeight: 'inherit' }}>{t(`dir_${d}`)}</Typography>
                </ButtonBase>
              );
            })}
          </Stack>
        </Box>

        {/* Eşik fiyat */}
        <TextField label={t('field_threshold')} value={threshold} onChange={(e) => setThreshold(e.target.value.replace(/[^\d.,]/g, ''))}
          error={attempted && !(thresholdNum > 0)} fullWidth autoFocus={!isEdit}
          inputProps={{ inputMode: 'decimal' }}
          InputProps={{ endAdornment: <InputAdornment position="end">₺</InputAdornment> }}
          helperText={t('threshold_hint', { asset: t(`investments:asset_short_${assetType}`), dir: t(`dir_short_${direction}`) })} />

        {/* Not */}
        <TextField label={t('field_note')} value={note} onChange={(e) => setNote(e.target.value)}
          fullWidth multiline minRows={1} maxRows={3} inputProps={{ maxLength: 200 }}
          placeholder={t('note_placeholder')} error={attempted && note.trim().length > 200} />
      </Stack>
    </ZoomModal>
  );
}

function FieldLabel({ text }: { text: string }) {
  return <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: '0.64rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'text.disabled', mb: 0.8 }}>{text}</Typography>;
}
