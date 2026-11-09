import { useState, useEffect } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import { HouseholdTransferMode } from '@shared/api/types';
import { useCreateHousehold } from '../api/useHousehold';
import { useActiveHouseholdStore } from '../store/useActiveHouseholdStore';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateHouseholdModal({ open, onClose }: Props) {
  const { t } = useTranslation(['household', 'common']);
  const create = useCreateHousehold();
  const setActive = useActiveHouseholdStore((s) => s.setActive);

  const [name, setName] = useState('');
  const [mode, setMode] = useState<HouseholdTransferMode>(HouseholdTransferMode.None);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setName('');
    setMode(HouseholdTransferMode.None);
  }, [open]);

  const canSubmit = !create.isPending && name.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const result = await create.mutateAsync({
        name: name.trim(),
        transferMode: mode,
      });
      toast.success(t('create_toastSuccess'));
      if (result?.id) setActive(result.id);
      onClose();
    } catch (err) {
      toast.error(resolveApiErrorWithFallback(err, t('common:errorGeneric')));
    }
  };

  // Seçili moda göre Alert tone + icon
  const alertProps = mode === HouseholdTransferMode.Move
    ? { severity: 'error' as const, icon: 'mdi:alert-octagon-outline', hintKey: 'create_transferHint_move' }
    : { severity: 'info' as const, icon: 'mdi:lock-outline', hintKey: 'create_transferHint_none' };

  return (
    <ZoomModal
      open={open}
      onClose={() => !create.isPending && onClose()}
      icon="mdi:account-group-outline"
      title={t('create_modalTitle')}
      subtitle={t('create_modalSubtitle')}
      maxWidth={560}
      actions={
        <>
          <Button variant="text" onClick={onClose} disabled={create.isPending}>
            {t('common:cancel')}
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit}
            startIcon={<Icon icon="mdi:check" width={18} />}
          >
            {t('create_submit')}
          </Button>
        </>
      }
    >
      <Stack spacing={2.6}>
        <TextField
          label={t('create_nameLabel')}
          placeholder={t('create_namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          fullWidth
          autoFocus
          inputProps={{ maxLength: 80 }}
        />

        <Box>
          <Typography sx={{ fontWeight: 500, fontSize: '0.92rem', mb: 1 }}>
            {t('create_transferQuestion')}
          </Typography>
          <RadioGroup
            value={mode}
            onChange={(e) => setMode(Number(e.target.value) as HouseholdTransferMode)}
          >
            <FormControlLabel
              value={HouseholdTransferMode.None}
              control={<Radio size="small" />}
              label={
                <Typography sx={{ fontSize: '0.88rem' }}>
                  {t('create_transferOption_none')}
                </Typography>
              }
            />
            <FormControlLabel
              value={HouseholdTransferMode.Move}
              control={<Radio size="small" />}
              label={
                <Typography sx={{ fontSize: '0.88rem' }}>
                  {t('create_transferOption_move')}
                </Typography>
              }
            />
          </RadioGroup>
          <Alert
            severity={alertProps.severity}
            icon={<Icon icon={alertProps.icon} width={18} />}
            sx={{ mt: 1, '& .MuiAlert-message': { whiteSpace: 'pre-line', fontSize: '0.8rem' } }}
          >
            {t(alertProps.hintKey)}
          </Alert>
        </Box>
      </Stack>
    </ZoomModal>
  );
}
