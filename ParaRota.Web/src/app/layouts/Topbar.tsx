import { useMemo, useState, type KeyboardEvent } from 'react';
import {
  Badge,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  InputBase,
  Popover,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { Icon } from '@iconify/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useThemeStore } from '@shared/store/useThemeStore';
import { usePrivacyStore } from '@shared/store/usePrivacyStore';
import { QuickEntryModal } from '@features/transactions/components/QuickEntryModal';
import {
  useMarkAllRead,
  useMarkRead,
  useNotificationsQuery,
  useUnreadCountQuery,
} from '@features/notifications/api/useNotifications';
import { NotificationItem } from '@features/notifications/components/NotificationItem';
import { HouseholdSwitcher } from '@features/household/components/HouseholdSwitcher';
import { LanguageSwitcher } from './LanguageSwitcher';
import { UserMenu } from './UserMenu';

// ──────────────────────────────────────────────────────────
// Topbar — quiet utility bar. All actions wired locally.
// ──────────────────────────────────────────────────────────

interface TopbarProps {
  onToggleSidebar?: () => void;
}

const SECTION_KEYS: Record<string, string> = {
  '/': 'dashboard',
  '/transactions': 'transactions',
  '/categories': 'categories',
  '/budgets': 'budgets',
  '/recurring': 'recurring',
  '/goals': 'goals',
  '/debts': 'debts',
  '/household': 'household',
  '/notifications': 'notifications',
  '/admin': 'admin',
  '/profile': 'profile',
  '/settings': 'settings',
};

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const { t } = useTranslation();
  const mode = useThemeStore((s) => s.mode);
  const toggleMode = useThemeStore((s) => s.toggle);
  const isDark = mode === 'dark';
  const hideAmounts = usePrivacyStore((s) => s.hideAmounts);
  const togglePrivacy = usePrivacyStore((s) => s.toggle);
  const location = useLocation();
  const navigate = useNavigate();

  const [quickOpen, setQuickOpen] = useState(false);
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState('');

  // Bell badge + dropdown — SignalR-driven invalidation notificationBus tarafında.
  const unreadCountQ = useUnreadCountQuery();
  const notificationsQ = useNotificationsQuery(10);
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const unreadCount = unreadCountQ.data ?? 0;
  const items = notificationsQ.data ?? [];
  const notifLoading = notificationsQ.isLoading;
  const notifError = notificationsQ.isError;

  const handleMarkAllRead = () =>
    markAllRead.mutate(undefined, {
      onSuccess: () => toast.success(t('notifications:toastAllRead')),
      onError: () => toast.error(t('common:errorGeneric')),
    });

  const title = useMemo(() => {
    if (SECTION_KEYS[location.pathname]) return t(`navigation:${SECTION_KEYS[location.pathname]}`);
    const partial = Object.entries(SECTION_KEYS).find(
      ([k]) => k !== '/' && location.pathname.startsWith(k)
    );
    return partial ? t(`navigation:${partial[1]}`) : t('appName');
  }, [location.pathname, t]);

  const submitSearch = () => {
    const q = search.trim();
    if (!q) return;
    navigate(`/transactions?q=${encodeURIComponent(q)}`);
  };

  const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') submitSearch();
    if (e.key === 'Escape') setSearch('');
  };

  return (
    <>
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 3,
          bgcolor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider',
          px: { xs: 1.6, md: 3 },
          py: 1.2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.4,
          minHeight: 60,
        }}
      >
        {onToggleSidebar && (
          <IconButton
            onClick={onToggleSidebar}
            aria-label={t('openMenu')}
            data-tour="topbar-menu"
            sx={{ display: { md: 'none' }, borderRadius: 1.4 }}
            size="small"
          >
            <Icon icon="mdi:menu" width={20} />
          </IconButton>
        )}

        <Typography
          sx={{
            fontFamily: '"Geist", sans-serif',
            fontSize: '0.95rem',
            fontWeight: 600,
            letterSpacing: '-0.01em',
            color: 'text.primary',
            display: { xs: 'none', md: 'block' },
          }}
        >
          {title}
        </Typography>

        <Box sx={{ flex: 1 }} />

        {/* Search */}
        <Box
          data-tour="topbar-search"
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 1,
            px: 1.3,
            py: 0.55,
            width: '100%',
            maxWidth: 320,
            borderRadius: 1.5,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
            transition: 'border-color .2s',
            '&:focus-within': { borderColor: 'text.disabled' },
          }}
        >
          <Icon icon="mdi:magnify" width={16} style={{ color: 'var(--pr-ink-mute)' }} />
          <InputBase
            placeholder={t('searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={onSearchKey}
            sx={{
              flex: 1,
              fontSize: '0.85rem',
              color: 'text.primary',
              '& input::placeholder': { color: 'text.disabled', opacity: 1 },
            }}
          />
          {search && (
            <IconButton
              size="small"
              onClick={() => setSearch('')}
              aria-label={t('close')}
              sx={{ width: 22, height: 22, borderRadius: 1 }}
            >
              <Icon icon="mdi:close" width={14} />
            </IconButton>
          )}
        </Box>

        <Button
          variant="contained"
          color="primary"
          size="small"
          startIcon={<Icon icon="mdi:plus" width={15} />}
          onClick={() => setQuickOpen(true)}
          data-tour="topbar-quick-add"
          sx={{
            display: { xs: 'none', sm: 'inline-flex' },
            height: 34,
            borderRadius: 1.4,
            px: 1.4,
            fontSize: '0.8rem',
            fontWeight: 600,
          }}
        >
          {t('quickAdd')}
        </Button>

        <Stack direction="row" spacing={0.6} alignItems="center">
          <Box data-tour="topbar-household" sx={{ display: { xs: 'none', md: 'inline-flex' }, mr: 0.4 }}>
            <HouseholdSwitcher />
          </Box>

          {/* Gizlilik modu — göz ikonu tüm para tutarlarını ₺•••• yapar (kalıcı). */}
          <Tooltip title={hideAmounts ? t('showAmounts') : t('hideAmounts')} arrow>
            <IconButton
              onClick={togglePrivacy}
              size="small"
              aria-label={hideAmounts ? t('showAmounts') : t('hideAmounts')}
              aria-pressed={hideAmounts}
              sx={{ borderRadius: 1.4, width: 34, height: 34 }}
            >
              <Icon icon={hideAmounts ? 'mdi:eye-off-outline' : 'mdi:eye-outline'} width={18} />
            </IconButton>
          </Tooltip>

          <Tooltip title={isDark ? t('lightTheme') : t('darkTheme')} arrow>
            <IconButton
              onClick={toggleMode}
              size="small"
              aria-label={isDark ? t('lightTheme') : t('darkTheme')}
              sx={{ borderRadius: 1.4, width: 34, height: 34 }}
            >
              <Icon icon={isDark ? 'mdi:weather-sunny' : 'mdi:weather-night'} width={18} />
            </IconButton>
          </Tooltip>

          <LanguageSwitcher />

          <Tooltip title={t('notifications:bell', { defaultValue: t('notifications') })} arrow>
            <IconButton
              size="small"
              onClick={(e) => setNotifAnchor(e.currentTarget)}
              aria-label={t('notifications:bell', { defaultValue: t('notifications') })}
              data-tour="topbar-notifications"
              sx={{ borderRadius: 1.4, width: 34, height: 34 }}
            >
              <Badge
                badgeContent={unreadCount}
                color="error"
                max={99}
                slotProps={{
                  badge: {
                    sx: {
                      fontSize: '0.58rem',
                      height: 15,
                      minWidth: 15,
                      fontFamily: '"Geist Mono", monospace',
                      fontWeight: 600,
                    },
                  },
                }}
              >
                <Icon icon="mdi:bell-outline" width={18} />
              </Badge>
            </IconButton>
          </Tooltip>

          <Box sx={{ width: 4 }} />
          <UserMenu />
        </Stack>
      </Box>

      <QuickEntryModal open={quickOpen} onClose={() => setQuickOpen(false)} />

      <Popover
        open={Boolean(notifAnchor)}
        anchorEl={notifAnchor}
        onClose={() => setNotifAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.8,
              width: 340,
              border: '1px solid',
              borderColor: 'divider',
              boxShadow: (t) =>
                t.palette.mode === 'dark'
                  ? '0 16px 40px rgba(0,0,0,0.5)'
                  : '0 16px 40px rgba(43,30,14,0.12)',
            },
          },
        }}
      >
        <Box sx={{ px: 2, pt: 1.4, pb: 1 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.66rem',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                fontWeight: 600,
              }}
            >
              {t('notifications:bell', { defaultValue: t('notifications') })}
            </Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                variant="text"
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
                startIcon={
                  markAllRead.isPending ? (
                    <CircularProgress size={16} thickness={5} />
                  ) : undefined
                }
                sx={{ fontSize: '0.7rem', minHeight: 0, py: 0.2 }}
              >
                {t('notifications:markAllRead')}
              </Button>
            )}
          </Stack>
        </Box>
        <Divider />
        {notifLoading ? (
          <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
            <CircularProgress size={20} thickness={5} />
          </Box>
        ) : notifError ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
              {t('notifications:errorTitle')}
            </Typography>
            <Button
              size="small"
              variant="text"
              onClick={() => void notificationsQ.refetch()}
              startIcon={<Icon icon="mdi:refresh" width={16} />}
              sx={{ fontSize: '0.72rem' }}
            >
              {t('notifications:errorRetry')}
            </Button>
          </Box>
        ) : items.length === 0 ? (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
              {t('notifications:noNew', { defaultValue: t('noNotifications') })}
            </Typography>
          </Box>
        ) : (
          <Stack divider={<Divider />} sx={{ maxHeight: 420, overflowY: 'auto' }}>
            {items.map((n) => (
              <NotificationItem
                key={n.id}
                notification={n}
                compact
                onMarkRead={(id) => markRead.mutate(id)}
                onClick={() => setNotifAnchor(null)}
              />
            ))}
          </Stack>
        )}
        <Divider />
        <Box sx={{ px: 2, py: 1 }}>
          <Button
            fullWidth
            size="small"
            variant="text"
            onClick={() => {
              setNotifAnchor(null);
              navigate('/notifications');
            }}
            sx={{ fontSize: '0.78rem', fontWeight: 600 }}
          >
            {t('notifications:viewAll', { defaultValue: t('viewAll') })}
          </Button>
        </Box>
      </Popover>
    </>
  );
}
