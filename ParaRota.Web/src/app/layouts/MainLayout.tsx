import { Outlet } from 'react-router-dom';
import { Box, Drawer, useMediaQuery, useTheme } from '@mui/material';
import { QuickActionDock } from '@shared/components';
import { PaywallDialog } from '@features/subscription/components/PaywallDialog';
import { OnboardingGate } from '@features/onboarding';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useLayoutStore } from './useLayoutStore';

export function MainLayout() {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const collapsed = useLayoutStore((s) => s.collapsed);
  const mobileOpen = useLayoutStore((s) => s.mobileOpen);
  const toggleCollapsed = useLayoutStore((s) => s.toggleCollapsed);
  const setMobileOpen = useLayoutStore((s) => s.setMobileOpen);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>
      {isDesktop ? (
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      ) : (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          anchor={theme.direction === 'rtl' ? 'right' : 'left'}
          slotProps={{
            paper: {
              sx: { border: 'none', bgcolor: 'background.paper' },
            },
          }}
        >
          <Sidebar onClose={() => setMobileOpen(false)} />
        </Drawer>
      )}

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar onToggleSidebar={!isDesktop ? () => setMobileOpen(true) : undefined} />
        <Box component="main" sx={{ flex: 1, position: 'relative' }}>
          <Outlet />
        </Box>
      </Box>

      {/* Sağ alt sabit hızlı aksiyon dock'u — Fiş Okut + Gider Gir.
          Authenticated tüm sayfalarda görünür (MainLayout altında). */}
      <QuickActionDock />

      {/* Global premium paywall — usePaywallStore.show() ile her yerden açılır. */}
      <PaywallDialog />

      {/* İlk girişte hoş geldin slaytları + spotlight tanıtım turları. */}
      <OnboardingGate />
    </Box>
  );
}
