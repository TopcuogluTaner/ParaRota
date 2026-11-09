import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import { ZoomModal } from '@shared/components/ZoomModal';
import { useMyHouseholdsQuery } from '@features/household/api/useHousehold';
import { useCategoriesForScopeQuery } from '@features/categories/api/useCategories';
import { useMoveTransactionScope } from '../api/useTransactions';
import type { TransactionDto } from '@shared/api/types';

interface Props {
  open: boolean;
  onClose: () => void;
  tx: TransactionDto;
}

export function MoveScopeModal({ open, onClose, tx }: Props) {
  const { t } = useTranslation(['household', 'common']);
  const move = useMoveTransactionScope();
  const { data: households } = useMyHouseholdsQuery();

  // Kişisel kayıt → aileye taşınır; aile kaydı → kişisele alınır.
  const isPersonalRecord = tx.householdId == null;

  const [targetHouseholdId, setTargetHouseholdId] = useState<number | null>(null);
  // Kullanıcının elle seçtiği kategori; null = otomatik (mevcut geçerliyse o, değilse ilk uygun).
  const [pickedCategoryId, setPickedCategoryId] = useState<number | null>(null);
  // İlk başarısız "Taşı" denemesinden sonra eksik alanı kırmızı + uyarıyla göster.
  const [attempted, setAttempted] = useState(false);

  // Hedef kapsam: kişisel kayıt için seçilen aile, aile kaydı için kişisel (null).
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAttempted(false);
    setPickedCategoryId(null);
    if (isPersonalRecord) {
      setTargetHouseholdId(households?.[0]?.id ?? null);
    } else {
      setTargetHouseholdId(null);
    }
  }, [open, isPersonalRecord, households]);

  // Hedef scope kategorileri (kişisel kayıt için aile, aile kaydı için kişisel).
  const targetScopeId = isPersonalRecord ? targetHouseholdId : null;
  const { data: targetCategories } = useCategoriesForScopeQuery(
    targetScopeId,
    open && (!isPersonalRecord || targetHouseholdId != null),
  );

  const eligible = useMemo(
    () => (targetCategories ?? []).filter((c) => c.type === tx.type),
    [targetCategories, tx.type],
  );

  // Kategori varsayılanı türetilir (effect'te setState yok): elle seçim hedefte hâlâ
  // geçerliyse o; değilse mevcut kategori hedefte geçerliyse o; o da yoksa ilk uygun.
  const categoryId = useMemo(() => {
    if (pickedCategoryId != null && eligible.some((c) => c.id === pickedCategoryId)) return pickedCategoryId;
    if (eligible.some((c) => c.id === tx.categoryId)) return tx.categoryId;
    return eligible[0]?.id ?? tx.categoryId;
  }, [pickedCategoryId, eligible, tx.categoryId]);

  const noFamily = isPersonalRecord && (households?.length ?? 0) === 0;
  const targetMissing = isPersonalRecord && targetHouseholdId == null;
  const categoryMissing = eligible.length === 0;

  const handleSubmit = async () => {
    if (move.isPending) return;
    // Eksik alan(lar) varsa: tıklamayı engelleme — net uyarı + kırmızı alan göster.
    if (noFamily || categoryMissing || targetMissing) {
      setAttempted(true);
      toast.error(
        noFamily
          ? t('move_noFamily')
          : targetMissing
            ? t('move_targetFamily')
            : t('move_noCategory'),
        { id: 'move-scope-validate' },
      );
      return;
    }
    try {
      await move.mutateAsync({
        id: tx.id,
        body: { targetHouseholdId: isPersonalRecord ? targetHouseholdId : null, categoryId },
      });
      toast.success(t('move_toastSuccess'));
      onClose();
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('common:errorGeneric')));
    }
  };

  return (
    <ZoomModal
      open={open}
      onClose={() => !move.isPending && onClose()}
      icon="mdi:swap-horizontal"
      title={t('move_modalTitle')}
      subtitle={isPersonalRecord ? t('move_toFamily') : t('move_toPersonal')}
      maxWidth={480}
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={move.isPending}>
            {t('common:cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={move.isPending}
            startIcon={
              move.isPending ? (
                <CircularProgress size={16} thickness={5} />
              ) : (
                <Icon icon="mdi:swap-horizontal" width={18} />
              )
            }
          >
            {t('move_action')}
          </Button>
        </>
      }
    >
      <Stack spacing={2.4}>
        {noFamily && (
          <Alert severity="info" icon={<Icon icon="mdi:account-group-outline" width={18} />}>
            {t('move_noFamily')}
          </Alert>
        )}

        {/* Kişisel kayıt + birden çok aile → hedef aile seçimi. */}
        {isPersonalRecord && (households?.length ?? 0) > 1 && (
          <TextField
            select
            label={t('move_targetFamily')}
            value={targetHouseholdId ?? ''}
            onChange={(e) => setTargetHouseholdId(Number(e.target.value))}
            fullWidth
            error={attempted && targetMissing}
            helperText={attempted && targetMissing ? t('move_targetFamily') : undefined}
          >
            {(households ?? []).map((h) => (
              <MenuItem key={h.id} value={h.id}>
                {h.name}
              </MenuItem>
            ))}
          </TextField>
        )}

        {!noFamily && (
          <Box>
            <Typography sx={{ fontWeight: 500, fontSize: '0.9rem', mb: 1 }}>
              {t('move_selectCategory')}
            </Typography>
            <TextField
              select
              value={eligible.some((c) => c.id === categoryId) ? categoryId : ''}
              onChange={(e) => setPickedCategoryId(Number(e.target.value))}
              fullWidth
              disabled={eligible.length === 0}
              error={attempted && categoryMissing}
            >
              {eligible.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {c.emoji ? <span>{c.emoji}</span> : <Icon icon={c.icon} width={16} />}
                    <span>{c.name}</span>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
            {eligible.length === 0 && !noFamily && (
              <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.6, display: 'block' }}>
                {t('move_noCategory')}
              </Typography>
            )}
          </Box>
        )}
      </Stack>
    </ZoomModal>
  );
}
