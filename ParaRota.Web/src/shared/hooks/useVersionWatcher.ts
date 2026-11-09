import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import i18n from '@shared/i18n';

// Build'e gömülen sürüm (vite define). Dev'de define yoksa 'dev'.
const CURRENT_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';
const POLL_INTERVAL_MS = 60_000;
const RELOAD_DELAY_MS = 1500;

/**
 * Yeni deploy'ı anında yakalar: periyodik olarak ve sekme tekrar odağa
 * geldiğinde <code>/version.json</code> dosyasını (cache'siz) okur; build'e
 * gömülü sürümden farklıysa kullanıcıyı bilgilendirip sayfayı yeniler.
 *
 * Dev modda devre dışıdır (Vite HMR zaten anında günceller).
 */
export function useVersionWatcher() {
  const triggered = useRef(false);

  useEffect(() => {
    if (import.meta.env.DEV) return;

    const reloadForNewVersion = () => {
      if (triggered.current) return;
      triggered.current = true;
      toast.loading(i18n.t('appUpdateReloading'), { duration: RELOAD_DELAY_MS + 500 });
      window.setTimeout(() => window.location.reload(), RELOAD_DELAY_MS);
    };

    const check = async () => {
      if (triggered.current) return;
      try {
        const res = await fetch(`/version.json?ts=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { version?: string };
        if (data.version && data.version !== CURRENT_VERSION) reloadForNewVersion();
      } catch {
        // offline / geçici hata — sessizce bir sonraki tetiklemeyi bekle
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };

    void check();
    const timer = window.setInterval(check, POLL_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);
}
