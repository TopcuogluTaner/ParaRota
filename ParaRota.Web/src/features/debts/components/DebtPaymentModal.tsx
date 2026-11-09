import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  FormControlLabel,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { Money } from '@shared/components/Money';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import { parseAmount } from '@shared/lib/parseAmount';
import { useAddDebtPayment } from '../api/useDebts';
import type { DebtDto } from '@shared/api/types/debts';

interface Props {
  open: boolean;
  onClose: () => void;
  debt: DebtDto;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function DebtPaymentModal({ open, onClose, debt }: Props) {
  const { t } = useTranslation(['debts', 'common']);
  const addPayment = useAddDebtPayment();

  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [notes, setNotes] = useState('');
  const [createTx, setCreateTx] = useState(true);
  // İlk başarısız "Öde" denemesinden sonra geçersiz tutarı kırmızı + uyarıyla göster.
  const [attempted, setAttempted] = useState(false);

  // remainingAmount'ı ref'te taşı: dep array'e koymadan açılış değerini
  // okumamızı sağlıyor. Aksi halde kullanıcı yazarken remaining değişirse
  // (paralel başka cihaz) effect tekrar tetiklenip form'u sıfırlardı.
  const remainingRef = useRef(debt.remainingAmount);
  useEffect(() => {
    remainingRef.current = debt.remainingAmount;
  }, [debt.remainingAmount]);

  useEffect(() => {
    if (!open) return;
    setAmount(remainingRef.current.toString());
    setPaymentDate(todayIso());
    setNotes('');
    setCreateTx(true);
    setAttempted(false);
  }, [open, debt.id]);

  const amountNum = parseAmount(amount);
  const valid = !Number.isNaN(amountNum) && amountNum > 0;
  const overAmount = valid && amountNum > debt.remainingAmount + 0.001;
  const isValid = valid && !overAmount;

  const handleClose = () => {
    if (addPayment.isPending) return;
    onClose();
  };

  const handleSubmit = async () => {
    if (addPayment.isPending) return;
    // Geçersiz/aşan tutar: tıklamayı engelleme — net uyarı + kırmızı alan göster.
    if (!isValid) {
      setAttempted(true);
      toast.error(t('payment_invalidAmount'), { id: 'debt-payment-validate' });
      return;
    }
    try {
      await addPayment.mutateAsync({
        id: debt.id,
        body: {
          amount: amountNum,
          paymentDate,
          notes: notes.trim() || undefined,
          createLinkedTransaction: createTx,
        },
      });
      toast.success(t('payment_toastSuccess'));
      onClose();
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('payment_toastError')));
    }
  };

  const hintKey =
    debt.kind === 'payable' ? 'payment_createTransactionHint_payable' : 'payment_createTransactionHint_receivable';

  return (
    <ZoomModal
      open={open}
      onClose={handleClose}
      icon="mdi:cash-check"
      title={t('payment_modalTitle')}
      subtitle={t('payment_modalSubtitle')}
      maxWidth={460}
      actions={
        <>
          <Button variant="text" onClick={handleClose} disabled={addPayment.isPending}>
            {t('common:cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={addPayment.isPending}
            startIcon={
              addPayment.isPending ? (
                <CircularProgress size={16} thickness={5} />
              ) : (
                <Icon icon="mdi:check" width={18} />
              )
            }
          >
            {t('payment_submit')}
          </Button>
        </>
      }
    >
      <Stack spacing={2.2}>
        <Stack direction="row" spacing={1.6} alignItems="baseline">
          <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: '"Geist Mono", monospace', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
            {t('card_remaining')}
          </Typography>
          <Money value={debt.remainingAmount} currency={debt.currency} size="md" weight={600} />
        </Stack>

        <TextField
          label={t('payment_amountLabel')}
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          fullWidth
          autoFocus
          error={overAmount || (attempted && !valid)}
          helperText={overAmount || (attempted && !valid) ? t('payment_invalidAmount') : undefined}
          inputProps={{ inputMode: 'decimal' }}
          InputProps={{
            endAdornment: <InputAdornment position="end">{debt.currency}</InputAdornment>,
          }}
        />

        <TextField
          label={t('payment_dateLabel')}
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          fullWidth
          InputLabelProps={{ shrink: true }}
          inputProps={{ max: todayIso() }}
        />

        <TextField
          label={t('payment_notesLabel')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          minRows={2}
          maxRows={3}
          fullWidth
          inputProps={{ maxLength: 300 }}
        />

        <FormControlLabel
          control={<Switch checked={createTx} onChange={(e) => setCreateTx(e.target.checked)} color="primary" />}
          label={
            <Typography sx={{ fontWeight: 500, fontSize: '0.9rem' }}>
              {t('payment_createTransactionLabel')}
            </Typography>
          }
          sx={{ m: 0, alignItems: 'flex-start' }}
        />
        <Alert
          severity={createTx ? 'info' : 'warning'}
          icon={<Icon icon={createTx ? 'mdi:information-outline' : 'mdi:alert-outline'} width={18} />}
          sx={{ mt: -1, '& .MuiAlert-message': { fontSize: '0.8rem' } }}
        >
          {t(hintKey)}
        </Alert>
      </Stack>
    </ZoomModal>
  );
}
