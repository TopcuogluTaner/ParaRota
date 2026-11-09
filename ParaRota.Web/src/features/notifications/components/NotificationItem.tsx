import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { dayjs } from '@shared/lib/dateFormat';
import type { NotificationDto, NotificationSeverity } from '@shared/api/types';

interface Props {
  notification: NotificationDto;
  onMarkRead?: (id: number) => void;
  onDelete?: (id: number) => void;
  onClick?: (n: NotificationDto) => void;
  compact?: boolean;
}

const SEVERITY_ICON: Record<NotificationSeverity, string> = {
  info: 'mdi:information-outline',
  success: 'mdi:check-circle-outline',
  warning: 'mdi:alert-outline',
  error: 'mdi:alert-circle-outline',
};

function parsePayload(payload?: string): Record<string, unknown> {
  if (!payload) return {};
  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function relativeTime(iso: string, t: (k: string, opts?: Record<string, unknown>) => string): string {
  const now = dayjs();
  const then = dayjs(iso);
  const diffMin = now.diff(then, 'minute');
  if (diffMin < 1) return t('time_now');
  if (diffMin < 60) return t('time_minute_ago', { count: diffMin });
  const diffHour = now.diff(then, 'hour');
  if (diffHour < 24) return t('time_hour_ago', { count: diffHour });
  const diffDay = now.diff(then, 'day');
  if (diffDay === 1) return t('time_yesterday');
  if (diffDay < 7) return t('time_day_ago', { count: diffDay });
  return then.format('D MMM');
}

export function NotificationItem({ notification, onMarkRead, onDelete, onClick, compact = false }: Props) {
  const { t } = useTranslation(['notifications', 'common']);
  const theme = useTheme();
  const interp = parsePayload(notification.payload);
  const title = t(notification.titleKey, interp);
  const body = t(notification.messageKey, interp);
  const time = relativeTime(notification.createdDate, t as (k: string, opts?: Record<string, unknown>) => string);
  const tonePalette: Record<NotificationSeverity, string> = {
    info: theme.palette.info?.main ?? theme.palette.primary.main,
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
  };
  const color = tonePalette[notification.severity];
  const unread = !notification.isRead;

  const handleClick = () => {
    if (unread && onMarkRead) onMarkRead(notification.id);
    onClick?.(notification);
  };

  return (
    <Stack
      direction="row"
      spacing={1.4}
      onClick={handleClick}
      sx={{
        px: compact ? 2 : 2.4,
        py: compact ? 1.4 : 1.8,
        cursor: onClick || onMarkRead ? 'pointer' : 'default',
        position: 'relative',
        transition: 'background-color .15s',
        bgcolor: unread ? (th) => alpha(color, th.palette.mode === 'dark' ? 0.06 : 0.04) : 'transparent',
        '&:hover': {
          bgcolor: (th) => alpha(th.palette.text.primary, 0.03),
          '& .notif-actions': { opacity: 1 },
        },
      }}
    >
      {/* Unread dot indicator */}
      {unread && (
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: 6,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 6,
            height: 6,
            borderRadius: '50%',
            bgcolor: color,
            boxShadow: `0 0 0 3px ${alpha(color, 0.18)}`,
          }}
        />
      )}

      <Box
        sx={{
          width: compact ? 32 : 38,
          height: compact ? 32 : 38,
          borderRadius: 1.2,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
          bgcolor: alpha(color, 0.12),
          color,
        }}
      >
        <Icon icon={SEVERITY_ICON[notification.severity]} width={compact ? 16 : 18} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: compact ? '0.86rem' : '0.92rem', fontWeight: unread ? 600 : 500 }} noWrap>
          {title}
        </Typography>
        <Typography
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: compact ? '0.72rem' : '0.78rem',
            color: 'text.secondary',
            mt: 0.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {body}
        </Typography>
      </Box>

      <Stack direction="column" alignItems="flex-end" spacing={0.4} sx={{ flexShrink: 0 }}>
        <Typography
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: '0.66rem',
            color: 'text.disabled',
            whiteSpace: 'nowrap',
          }}
        >
          {time}
        </Typography>
        {(onMarkRead || onDelete) && (
          <Stack
            className="notif-actions"
            direction="row"
            spacing={0.2}
            sx={{ opacity: { xs: 1, sm: 0 }, transition: 'opacity .15s' }}
          >
            {unread && onMarkRead && (
              <Tooltip title={t('markRead')} arrow>
                <IconButton
                  size="small"
                  aria-label={t('markRead')}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkRead(notification.id);
                  }}
                  sx={{ width: 22, height: 22 }}
                >
                  <Icon icon="mdi:check" width={12} />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title={t('delete')} arrow>
                <IconButton
                  size="small"
                  aria-label={t('delete')}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification.id);
                  }}
                  sx={{ width: 22, height: 22, '&:hover': { color: 'error.main' } }}
                >
                  <Icon icon="mdi:close" width={12} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
