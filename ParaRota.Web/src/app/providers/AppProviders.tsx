import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CssBaseline } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AppThemeProvider } from '@shared/theme/AppThemeProvider';
import { queryClient } from '@shared/api/queryClient';

interface Props {
  children: ReactNode;
}

export function AppProviders({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <CssBaseline />
        {children}
        {/* Toaster'ı document.body'ye portalla — #root'un (z-index:1) stacking
            context'ine hapsolmasın; aksi halde body'ye portallanan MUI Modal'ın
            (z-index 1300) ARKASINDA kalıyor. Body seviyesinde 13000 > 1300 → en üstte. */}
        {createPortal(
          <Toaster
            position="bottom-right"
            // QuickActionDock FAB de sağ-altta sabit (~90px) — toast'lar onun üstünde dursun.
            containerStyle={{ zIndex: 13000, bottom: 96 }}
            toastOptions={{ duration: 3500 }}
          />,
          document.body,
        )}
      </AppThemeProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />}
    </QueryClientProvider>
  );
}
