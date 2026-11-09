import { useMemo } from 'react';
import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { NotificationItem } from '@features/notifications/components/NotificationItem';
import type { NotificationDto, NotificationSeverity } from '@shared/api/types';
import type { SendNotificationFormErrors, SendNotificationFormState } from './useSendNotificationFormState';

const SEVERITIES: NotificationSeverity[] = ['info', 'success', 'warning', 'error'];
const ROLES = ['Admin', 'User'] as const;

interface Props {
  form: SendNotificationFormState;
  set: <K extends keyof SendNotificationFormState>(key: K, value: SendNotificationFormState[K]) => void;
  errors: SendNotificationFormErrors;
}

export function SendNotificationFormFields({ form, set, errors }: Props) {
  const { t } = useTranslation(['pages', 'common']);

  const preview = useMemo<NotificationDto>(
    () => ({
      id: 0,
      type: 'system',
      severity: form.severity,
      titleKey: form.title || t('admin.sendNotif_titlePlaceholder'),
      messageKey: form.message || t('admin.sendNotif_messagePlaceholder'),
      payload: undefined,
      refType: undefined,
      refId: undefined,
      isRead: false,
      createdDate: new Date().toISOString(),
    }),
    [form.title, form.message, form.severity, t],
  );

  return (
    <Stack spacing={2.6}>
      {/* Target mode segment */}
      <Box>
        <Eyebrow text={t('admin.sendNotif_targetLabel')} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <TargetCard
            active={form.mode === 'broadcast'}
            onClick={() => set('mode', 'broadcast')}
            icon="mdi:broadcast"
            label={t('admin.sendNotif_targetBroadcast')}
            hint={t('admin.sendNotif_targetBroadcastHint')}
          />
          <TargetCard
            active={form.mode === 'role'}
            onClick={() => set('mode', 'role')}
            icon="mdi:account-group-outline"
            label={t('admin.sendNotif_targetRole')}
            hint={t('admin.sendNotif_targetRoleHint')}
          />
          <TargetCard
            active={form.mode === 'single'}
            onClick={() => set('mode', 'single')}
            icon="mdi:account-outline"
            label={t('admin.sendNotif_targetSingle')}
            hint={t('admin.sendNotif_targetSingleHint')}
          />
        </Stack>
      </Box>

      {form.mode === 'role' && (
        <TextField
          select
          label={t('admin.sendNotif_roleLabel')}
          value={form.role}
          onChange={(e) => set('role', e.target.value)}
          fullWidth
        >
          {ROLES.map((r) => (
            <MenuItem key={r} value={r}>
              {r}
            </MenuItem>
          ))}
        </TextField>
      )}

      {form.mode === 'single' && (
        <TextField
          label={t('admin.sendNotif_userIdLabel')}
          value={form.userId}
          onChange={(e) => set('userId', e.target.value.replace(/[^0-9]/g, ''))}
          error={errors.userId}
          helperText={errors.userId ? t('admin.sendNotif_userIdRequired') : t('admin.sendNotif_userIdHelp')}
          fullWidth
          inputProps={{ inputMode: 'numeric' }}
        />
      )}

      <TextField
        label={t('admin.sendNotif_titleLabel')}
        placeholder={t('admin.sendNotif_titlePlaceholder')}
        value={form.title}
        onChange={(e) => set('title', e.target.value)}
        error={errors.title}
        helperText={errors.title ? t('admin.sendNotif_titleRequired') : undefined}
        fullWidth
        inputProps={{ maxLength: 100 }}
      />

      <TextField
        label={t('admin.sendNotif_messageLabel')}
        placeholder={t('admin.sendNotif_messagePlaceholder')}
        value={form.message}
        onChange={(e) => set('message', e.target.value)}
        error={errors.message}
        helperText={errors.message ? t('admin.sendNotif_messageRequired') : undefined}
        multiline
        minRows={2}
        maxRows={5}
        fullWidth
        inputProps={{ maxLength: 500 }}
      />

      <TextField
        label={t('admin.sendNotif_urlLabel')}
        placeholder={t('admin.sendNotif_urlPlaceholder')}
        value={form.url}
        onChange={(e) => set('url', e.target.value)}
        fullWidth
        inputProps={{ maxLength: 500 }}
      />

      <Box>
        <Eyebrow text={t('admin.sendNotif_severityLabel')} />
        <Stack direction="row" spacing={0.6}>
          {SEVERITIES.map((s) => (
            <SeverityPill
              key={s}
              active={form.severity === s}
              onClick={() => set('severity', s)}
              severity={s}
              label={t(`admin.sendNotif_severity${s.charAt(0).toUpperCase() + s.slice(1)}` as const)}
            />
          ))}
        </Stack>
      </Box>

      <Box>
        <Stack direction="row" alignItems="center" spacing={1.2} sx={{ mb: 1 }}>
          <Eyebrow text={t('admin.sendNotif_preview')} noMargin />
          <Box className="pr-route-line" sx={{ flex: 1, opacity: 0.6 }} />
        </Stack>
        <Box
          sx={{
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1.6,
            overflow: 'hidden',
            bgcolor: (th) =>
              th.palette.mode === 'dark' ? alpha(th.palette.background.paper, 0.5) : 'background.default',
          }}
        >
          <NotificationItem notification={preview} compact />
        </Box>
      </Box>
    </Stack>
  );
}

// --- Yardımcı sub-components ---

function Eyebrow({ text, noMargin }: { text: string; noMargin?: boolean }) {
  return (
    <Typography
      sx={{
        fontFamily: '"Geist Mono", monospace',
        fontSize: '0.62rem',
        letterSpacing: '0.22em',
        textTransform: 'uppercase',
        color: 'text.disabled',
        mb: noMargin ? 0 : 0.8,
      }}
    >
      {text}
    </Typography>
  );
}

function TargetCard({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  hint: string;
}) {
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        all: 'unset',
        cursor: 'pointer',
        flex: 1,
        textAlign: 'left',
        p: 1.6,
        borderRadius: 1.6,
        border: '1px solid',
        borderColor: active ? 'primary.main' : 'divider',
        bgcolor: (th) =>
          active
            ? alpha(th.palette.primary.main, th.palette.mode === 'dark' ? 0.12 : 0.06)
            : 'background.default',
        transition: 'border-color .15s, background-color .15s',
        '&:hover': { borderColor: active ? 'primary.main' : 'text.disabled' },
        position: 'relative',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.2} sx={{ mb: 0.6 }}>
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: 1,
            display: 'grid',
            placeItems: 'center',
            bgcolor: (th) => alpha(active ? th.palette.primary.main : th.palette.text.disabled, 0.14),
            color: active ? 'primary.main' : 'text.disabled',
          }}
        >
          <Icon icon={icon} width={15} />
        </Box>
        <Typography sx={{ fontWeight: 600, fontSize: '0.86rem', color: active ? 'primary.main' : 'text.primary' }}>
          {label}
        </Typography>
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0, lineHeight: 1.4 }}>
        {hint}
      </Typography>
    </Box>
  );
}

function SeverityPill({
  active,
  onClick,
  severity,
  label,
}: {
  active: boolean;
  onClick: () => void;
  severity: NotificationSeverity;
  label: string;
}) {
  const theme = useTheme();
  const tonePalette: Record<NotificationSeverity, string> = {
    info: theme.palette.info?.main ?? theme.palette.primary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
  };
  const color = tonePalette[severity];
  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      sx={{
        all: 'unset',
        cursor: 'pointer',
        px: 1.4,
        py: 0.7,
        borderRadius: 999,
        border: '1px solid',
        borderColor: active ? color : 'divider',
        bgcolor: active ? alpha(color, 0.14) : 'transparent',
        color: active ? color : 'text.secondary',
        fontFamily: '"Geist Mono", monospace',
        fontSize: '0.72rem',
        fontWeight: 600,
        letterSpacing: '0.04em',
        transition: 'border-color .15s, background-color .15s, color .15s',
        '&:hover': { borderColor: color, color },
      }}
    >
      {label}
    </Box>
  );
}
