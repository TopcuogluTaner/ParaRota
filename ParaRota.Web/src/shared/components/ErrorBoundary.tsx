import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import i18n from '@shared/i18n';

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Sentry/Datadog eklenince buraya forward et. Şimdilik console.
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 4 }}>
        <Stack spacing={2} alignItems="center" sx={{ maxWidth: 480, textAlign: 'center' }}>
          <Typography variant="h5">{i18n.t('common:errorBoundary_title')}</Typography>
          <Typography variant="body2" color="text.secondary">
            {this.state.error?.message ?? i18n.t('common:errorBoundary_message')}
          </Typography>
          <Button variant="contained" onClick={this.reset}>
            {i18n.t('common:errorBoundary_home')}
          </Button>
        </Stack>
      </Box>
    );
  }
}
