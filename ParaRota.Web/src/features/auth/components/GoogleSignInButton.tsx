import { useEffect, useRef, useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useConfigStore } from '@shared/store/useConfigStore';
import { useAuthStore } from '../store/useAuthStore';

// Tam tema kontrollü ÖZEL buton: GIS'in hazır/kişiselleştirilmiş butonunu (One Tap'in
// beyaz chrome'unu) kullanmaz. Tıklayınca Google OAuth2 "code" popup'ı açılır → code
// backend'e gider, orada id_token'a çevrilip doğrulanır.
interface CodeClient {
  requestCode(): void;
}
interface OAuth2 {
  initCodeClient(cfg: {
    client_id: string;
    scope: string;
    ux_mode: 'popup';
    callback: (resp: { code?: string; error?: string }) => void;
  }): CodeClient;
}
declare global {
  interface Window {
    google?: { accounts: { oauth2: OAuth2 } };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';

function loadGis(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const existing = document.getElementById('gis-script') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const s = document.createElement('script');
    s.src = GIS_SRC;
    s.id = 'gis-script';
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('GIS yüklenemedi'));
    document.head.appendChild(s);
  });
}

export function GoogleSignInButton({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useTranslation('auth');
  const clientId = useConfigStore((s) => s.googleClientId);
  const googleLogin = useAuthStore((s) => s.googleLogin);
  const codeClient = useRef<CodeClient | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    void loadGis()
      .then(() => {
        if (cancelled || !window.google) return;
        codeClient.current = window.google.accounts.oauth2.initCodeClient({
          client_id: clientId,
          scope: 'openid email profile',
          ux_mode: 'popup',
          callback: (resp) => {
            if (!resp.code) {
              setBusy(false);
              return;
            }
            void googleLogin(resp.code).then((ok) => {
              setBusy(false);
              if (ok) onSuccess();
            });
          },
        });
      })
      .catch(() => {
        /* GIS yüklenemedi — sessiz */
      });
    return () => {
      cancelled = true;
    };
  }, [clientId, googleLogin, onSuccess]);

  if (!clientId) return null;

  return (
    <Button
      fullWidth
      size="large"
      variant="outlined"
      disabled={busy}
      onClick={() => {
        if (!codeClient.current) return;
        setBusy(true);
        codeClient.current.requestCode();
      }}
      startIcon={busy ? <CircularProgress size={18} thickness={5} /> : <Icon icon="flat-color-icons:google" width={20} />}
      sx={{
        py: 1.25,
        borderRadius: 999,
        textTransform: 'none',
        fontWeight: 600,
        fontSize: '0.95rem',
        color: 'text.primary',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        '&:hover': { borderColor: 'text.secondary', bgcolor: 'action.hover' },
      }}
    >
      {t('login.googleButton')}
    </Button>
  );
}
