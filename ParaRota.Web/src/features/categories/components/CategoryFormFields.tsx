import { Alert, Box, Stack, TextField, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { IconPicker } from './IconPicker';
import type { CategoryFormState } from './useCategoryFormState';

// Cartographic Finance palette presets.
const COLOR_PRESETS: { value: string; label: string }[] = [
  { value: '#0F8B6C', label: 'GO' },
  { value: '#D58A36', label: 'WAY' },
  { value: '#B0341E', label: 'HALT' },
  { value: '#1E5F8A', label: 'SKY' },
  { value: '#C49A3F', label: 'Gold' },
  { value: '#7B2D5B', label: 'Plum' },
  { value: '#6F8B5E', label: 'Sage' },
  { value: '#D8543B', label: 'Coral' },
  { value: '#5A6E7C', label: 'Steel' },
  { value: '#9C5A9C', label: 'Iris' },
  { value: '#1FB585', label: 'Mint' },
  { value: '#5A4A3D', label: 'Earth' },
];

interface Props {
  form: CategoryFormState;
  set: <K extends keyof CategoryFormState>(key: K, value: CategoryFormState[K]) => void;
  safeColor: string;
  mode: 'create' | 'edit';
  isSystem: boolean;
  attempted: boolean;
  colorIsValid: boolean;
  nameMissing: boolean;
  iconMissing: boolean;
}

export function CategoryFormFields({
  form,
  set,
  safeColor,
  mode,
  isSystem,
  attempted,
  colorIsValid,
  nameMissing,
  iconMissing,
}: Props) {
  const { t } = useTranslation(['pages', 'common']);

  return (
    <Stack spacing={3}>
      {mode === 'create' && <ScopeIndicator />}

      {/* Live preview card */}
      <Box
        sx={{
          position: 'relative',
          borderRadius: 2,
          p: 2,
          border: '1px dashed',
          borderColor: 'divider',
          bgcolor: (th) => alpha(safeColor, th.palette.mode === 'dark' ? 0.08 : 0.05),
        }}
      >
        <Typography
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: '0.6rem',
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'text.disabled',
            position: 'absolute',
            top: 8,
            left: 14,
            bgcolor: 'background.paper',
            px: 0.8,
          }}
        >
          {t('categories.previewLabel')}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={1.8} sx={{ pt: 0.6 }}>
          <motion.div
            key={`${form.icon}-${form.emoji}-${form.color}`}
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.22 }}
          >
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 1.6,
                display: 'grid',
                placeItems: 'center',
                bgcolor: alpha(safeColor, 0.18),
                color: safeColor,
                fontSize: '1.5rem',
              }}
            >
              {form.emoji ? form.emoji : <Icon icon={form.icon} width={26} />}
            </Box>
          </motion.div>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: '"Fraunces", serif',
                fontWeight: 500,
                fontSize: '1.2rem',
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {form.name.trim() || t('categories.formNamePlaceholder')}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.7rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: form.type === 'income' ? 'success.main' : 'error.main',
                mt: 0.2,
              }}
            >
              {form.type === 'income' ? t('categories.tabIncome') : t('categories.tabExpense')}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              bgcolor: safeColor,
              boxShadow: `0 0 0 3px ${alpha(safeColor, 0.22)}`,
            }}
          />
        </Stack>
      </Box>

      {isSystem && (
        <Alert
          severity="info"
          icon={<Icon icon="mdi:shield-lock-outline" width={20} />}
          sx={{ '& .MuiAlert-message': { fontSize: '0.85rem' } }}
        >
          {t('categories.modalEditSystemNotice')}
        </Alert>
      )}

      <Box>
        <FieldLabel text={t('categories.formTypeLabel')} />
        <Stack direction="row" spacing={1.2}>
          <TypeButton
            tone="success"
            icon="mdi:trending-up"
            label={t('categories.tabIncome')}
            active={form.type === 'income'}
            disabled={mode === 'edit'}
            onClick={() => set('type', 'income')}
          />
          <TypeButton
            tone="error"
            icon="mdi:trending-down"
            label={t('categories.tabExpense')}
            active={form.type === 'expense'}
            disabled={mode === 'edit'}
            onClick={() => set('type', 'expense')}
          />
        </Stack>
      </Box>

      <TextField
        label={t('categories.formNameLabel')}
        value={form.name}
        onChange={(e) => set('name', e.target.value)}
        placeholder={t('categories.formNamePlaceholder')}
        fullWidth
        autoFocus
        error={attempted && nameMissing}
        helperText={attempted && nameMissing ? t('common:required') : undefined}
        inputProps={{ maxLength: 100 }}
        slotProps={{
          input: { sx: { fontFamily: '"Fraunces", serif', fontSize: '1.05rem', fontWeight: 500 } },
        }}
      />

      <Box>
        <FieldLabel text={t('categories.formIconLabel')} />
        <IconPicker value={form.icon} onChange={(ic) => set('icon', ic)} />
        {attempted && iconMissing && (
          <Typography variant="caption" sx={{ color: 'error.main', mt: 0.6, display: 'block' }}>
            {t('common:required')}
          </Typography>
        )}
      </Box>

      <TextField
        label={t('categories.formEmojiLabel')}
        value={form.emoji}
        onChange={(e) => set('emoji', e.target.value.slice(0, 8))}
        fullWidth
        size="small"
        helperText={t('categories.formEmojiHelp')}
        inputProps={{ maxLength: 8 }}
        slotProps={{
          input: { sx: { fontSize: '1.3rem', textAlign: 'center' as const } },
        }}
      />

      <Box>
        <FieldLabel text={t('categories.formColorLabel')} />
        <Stack direction="row" useFlexGap flexWrap="wrap" spacing={0.8}>
          {COLOR_PRESETS.map((c) => {
            const active = form.color === c.value;
            return (
              <Box
                key={c.value}
                component="button"
                type="button"
                onClick={() => set('color', c.value)}
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  bgcolor: c.value,
                  border: '2.5px solid',
                  borderColor: active ? 'background.paper' : 'transparent',
                  boxShadow: active
                    ? `0 0 0 2px ${c.value}, 0 0 0 5px ${alpha(c.value, 0.25)}`
                    : '0 0 0 1px rgba(0,0,0,0.05)',
                  cursor: 'pointer',
                  transition: 'transform .15s',
                  '&:hover': { transform: 'scale(1.1)' },
                }}
                aria-label={c.label}
              />
            );
          })}
          <TextField
            value={form.color}
            onChange={(e) => set('color', e.target.value)}
            placeholder="#RRGGBB"
            size="small"
            error={!colorIsValid}
            helperText={!colorIsValid ? t('common:error') : undefined}
            sx={{ width: 110, ml: 1 }}
            slotProps={{
              input: { sx: { fontFamily: '"Geist Mono", monospace', fontSize: '0.78rem' } },
            }}
          />
        </Stack>
      </Box>
    </Stack>
  );
}

// --- Yardımcı sub-components ---

function FieldLabel({ text }: { text: string }) {
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
        opacity: disabled ? 0.55 : 1,
        transition: 'all .15s',
        '&:hover': disabled
          ? {}
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
