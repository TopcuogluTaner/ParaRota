import { useEffect, useState } from 'react';
import { Button, CircularProgress, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { parseAmount } from '@shared/lib/parseAmount';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import type { HoldingDto } from '@shared/api/types';
import { useSellHolding } from '../api/useInvestments';

interface Props {
  open: boolean;
  onClose: () => void;
  holding: HoldingDto | null;
}

export function SellHoldingModal({ open, onClose, holding }: Props) {
  const { t } = useTranslation(['investments', 'common']);
  const fmtMoney = useMoneyFmt(); // gizlilik modunda tutarları maskeler
  const sellMutation = useSellHolding();

  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState('');
  const [linkToCashFlow, setLinkToCashFlow] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSaleDate(new Date().toISOString().slice(0, 10));
    setQuantity('');
    setLinkToCashFlow(true);
  }, [open, holding?.id]);

  const isSubmitting = sellMutation.isPending;
  const qtyNum = parseAmount(quantity);
  const qtyInvalid = quantity.trim().length > 0 && (Number.isNaN(qtyNum) || qtyNum <= 0);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (!holding || isSubmitting || qtyInvalid) return;
    try {
      const result = await sellMutation.mutateAsync({
        id: holding.id,
        body: {
          saleDate,
          quantity: quantity.trim().length > 0 ? qtyNum : null,
          linkToCashFlow,
        },
      });
      toast.success(t('toast_sell', { pnl: fmtMoney(result.realizedProfitLoss) }));
      onClose();
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('toast_error')));
    }
  };

  return (
    <ZoomModal
      open={open}
      onClose={handleClose}
      icon="mdi:cash-multiple"
      title={t('sell_title')}
      subtitle={t('sell_subtitle')}
      maxWidth={500}
      actions={
        <>
          <Button variant="text" onClick={handleClose} disabled={isSubmitting}>
            {t('common:cancel')}
          </Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleSubmit}
            disabled={isSubmitting || qtyInvalid}
            startIcon={isSubmitting ? <CircularProgress size={16} thickness={5} /> : <Icon icon="mdi:cash-multiple" width={18} />}
          >
            {t('sell_button')}
          </Button>
        </>
      }
    >
      <Stack spacing={2.4}>
        {holding && (
          <Typography sx={{ fontSize: '0.9rem', color: 'text.secondary' }}>
            {holding.assetType === 'tefasFund' ? (holding.fundName || holding.fundCode || t('asset_tefasFund')) : t(`asset_${holding.assetType}`)} · {fmtMoney(holding.currentValue)}
          </Typography>
        )}
        <TextField
          label={t('form_purchaseDate')}
          type="date"
          value={saleDate}
          onChange={(e) => setSaleDate(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
          inputProps={{ max: new Date().toISOString().slice(0, 10) }}
        />
        <TextField
          label={t('sell_quantity')}
          type="text"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value.replace(/[^0-9.,]/g, ''))}
          fullWidth
          error={qtyInvalid}
          helperText={t('sell_quantityHint')}
          inputProps={{ inputMode: 'decimal' }}
        />
        <FormControlLabel
          control={<Switch checked={linkToCashFlow} onChange={(e) => setLinkToCashFlow(e.target.checked)} />}
          label={
            <Stack>
              <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>{t('sell_linkCashFlow')}</Typography>
              <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>{t('sell_linkCashFlowHint')}</Typography>
            </Stack>
          }
        />
      </Stack>
    </ZoomModal>
  );
}
