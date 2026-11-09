import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BrandMark } from '@shared/components/BrandMark';
import { useAuthStore } from '@features/auth/store/useAuthStore';

// ──────────────────────────────────────────────────────────
// Sidebar — restrained, quiet chrome.
// The dashboard does the talking; the navigation gets out of the way.
// ──────────────────────────────────────────────────────────

interface NavEntry {
  to: string;
  /** i18n key under the `navigation` namespace */
  key: string;
  icon: string;
}

const PRIMARY: NavEntry[] = [
  { to: '/', key: 'dashboard', icon: 'mdi:view-dashboard-outline' },
  { to: '/transactions', key: 'transactions', icon: 'mdi:swap-vertical' },
  { to: '/categories', key: 'categories', icon: 'mdi:shape-outline' },
  { to: '/budgets', key: 'budgets', icon: 'mdi:wallet-outline' },
  { to: '/recurring', key: 'recurring', icon: 'mdi:repeat' },
  { to: '/installments', key: 'installments', icon: 'mdi:credit-card-clock-outline' },
  { to: '/goals', key: 'goals', icon: 'mdi:target' },
  { to: '/investments', key: 'investments', icon: 'mdi:chart-line-variant' },
  { to: '/debts', key: 'debts', icon: 'mdi:credit-card-outline' },
  { to: '/gold-days', key: 'goldDays', icon: 'mdi:gold' },
  { to: '/price-alarms', key: 'priceAlarms', icon: 'mdi:bell-alert-outline' },
  { to: '/shared-pots', key: 'sharedPots', icon: 'mdi:account-cash-outline' },
  { to: '/household', key: 'household', icon: 'mdi:account-group-outline' },
  { to: '/calculators', key: 'calculators', icon: 'mdi:calculator-variant-outline' },
  { to: '/exports', key: 'exports', icon: 'mdi:file-download-outline' },
];

const SECONDARY: NavEntry[] = [
  { to: '/profile', key: 'profile', icon: 'mdi:account-circle-outline' },
  { to: '/settings', key: 'settings', icon: 'mdi:tune-variant' },
];

const ADMIN_ENTRY: NavEntry = { to: '/admin', key: 'admin', icon: 'mdi:shield-crown-outline' };

export const SIDEBAR_WIDTH = 232;
export const SIDEBAR_WIDTH_COLLAPSED = 72;

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}

function matches(pathname: string, to: string) {
  if (to === '/') return pathname === '/';
  return pathname === to || pathname.startsWith(to + '/');
}

export function Sidebar({ collapsed = false, onToggleCollapse, onClose }: SidebarProps) {
  const location = useLocation();
  const { t } = useTranslation();
  const isAdmin = useAuthStore((s) => s.hasRole('Admin'));

  return (
    <Box
      component="aside"
      sx={{
        width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        borderRight: '1px solid',
        borderColor: 'divider',
        zIndex: 2,
        transition: 'width .25s cubic-bezier(.2,.7,.3,1)',
      }}
    >
      {/* Brand */}
      <Box
        sx={{
          px: collapsed ? 1.5 : 2.4,
          pt: 2.6,
          pb: 2,
          display: 'flex',
          alignItems: 'center',
          minHeight: 72,
        }}
      >
        <BrandMark
          size={collapsed ? 30 : 32}
          showWordmark={!collapsed}
          variant={collapsed ? 'compact' : 'default'}
        />
      </Box>

      {/* Nav */}
      <Stack sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: collapsed ? 0.6 : 1.4, gap: 0.2 }}>
        {PRIMARY.map((e) => (
          <NavItem
            key={e.to}
            entry={e}
            label={t(`navigation:${e.key}`)}
            collapsed={collapsed}
            active={matches(location.pathname, e.to)}
            onClick={onClose}
          />
        ))}

        <Box sx={{ flex: 1 }} />

        {isAdmin && (
          <>
            <Box
              sx={{
                px: collapsed ? 0 : 1.4,
                mb: 0.4,
                opacity: collapsed ? 0 : 0.55,
                transition: 'opacity .2s',
              }}
            >
              <Box className="pr-route-line" sx={{ height: 1 }} />
            </Box>
            <NavItem
              entry={ADMIN_ENTRY}
              label={t(`navigation:${ADMIN_ENTRY.key}`)}
              collapsed={collapsed}
              active={matches(location.pathname, ADMIN_ENTRY.to)}
              onClick={onClose}
              tone="admin"
            />
          </>
        )}

        {SECONDARY.map((e) => (
          <NavItem
            key={e.to}
            entry={e}
            label={t(`navigation:${e.key}`)}
            collapsed={collapsed}
            active={matches(location.pathname, e.to)}
            onClick={onClose}
          />
        ))}
      </Stack>

      {/* Collapse toggle */}
      {onToggleCollapse && (
        <Box
          sx={{
            px: collapsed ? 0.6 : 1.4,
            pb: 1.8,
            pt: 0.6,
            display: 'flex',
            justifyContent: collapsed ? 'center' : 'flex-end',
          }}
        >
          <Box
            component="button"
            onClick={onToggleCollapse}
            aria-label={collapsed ? t('expand') : t('collapse')}
            sx={{
              all: 'unset',
              cursor: 'pointer',
              width: 28,
              height: 28,
              borderRadius: 1,
              display: 'grid',
              placeItems: 'center',
              color: 'text.disabled',
              transition: 'color .2s, background-color .2s',
              '&:hover': {
                color: 'text.primary',
                bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
              },
            }}
          >
            <Icon icon={collapsed ? 'mdi:chevron-right' : 'mdi:chevron-left'} width={16} />
          </Box>
        </Box>
      )}

      {/* Version mark — tiny, quiet, only when expanded */}
      {!collapsed && (
        <Box sx={{ px: 2.4, pb: 2 }}>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.6rem',
              letterSpacing: '0.16em',
              color: 'text.disabled',
              textTransform: 'uppercase',
            }}
          >
            v0.1 · {t('version')}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

interface NavItemProps {
  entry: NavEntry;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
  tone?: 'default' | 'admin';
}

function NavItem({ entry, label, active, collapsed, onClick, tone = 'default' }: NavItemProps) {
  const railColor = tone === 'admin' ? 'warning.main' : 'primary.main';
  const iconColor = active ? (tone === 'admin' ? 'warning.main' : 'primary.main') : 'inherit';

  const inner = (
    <Box
      component={NavLink}
      to={entry.to}
      end={entry.to === '/'}
      onClick={onClick}
      data-tour={`nav-${entry.key}`}
      sx={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        gap: 1.4,
        height: 38,
        px: collapsed ? 0 : 1.4,
        borderRadius: 1.2,
        textDecoration: 'none',
        color: active ? 'text.primary' : 'text.secondary',
        fontWeight: active ? 600 : 500,
        fontSize: '0.88rem',
        letterSpacing: '-0.005em',
        justifyContent: collapsed ? 'center' : 'flex-start',
        bgcolor: active
          ? (t) => alpha(t.palette.text.primary, t.palette.mode === 'dark' ? 0.06 : 0.04)
          : 'transparent',
        transition: 'background-color .15s, color .15s',
        '&:hover': {
          color: 'text.primary',
          bgcolor: (t) => alpha(t.palette.text.primary, t.palette.mode === 'dark' ? 0.05 : 0.03),
        },
        // Active rail on the left
        '&::before': active
          ? {
              content: '""',
              position: 'absolute',
              left: collapsed ? '50%' : -10,
              top: 9,
              bottom: 9,
              width: collapsed ? 22 : 2.5,
              borderRadius: 999,
              bgcolor: railColor,
              transform: collapsed ? 'translateX(-50%)' : 'none',
              ...(collapsed && { top: 'auto', bottom: -4, height: 2.5 }),
            }
          : undefined,
      }}
    >
      <Box sx={{ display: 'flex', flexShrink: 0, color: iconColor }}>
        <Icon icon={entry.icon} width={18} />
      </Box>
      {!collapsed && <Box sx={{ flex: 1, whiteSpace: 'nowrap' }}>{label}</Box>}
    </Box>
  );

  if (collapsed) {
    return (
      <Tooltip title={label} placement="right" arrow>
        <Box sx={{ display: 'block' }}>{inner}</Box>
      </Tooltip>
    );
  }
  return inner;
}
