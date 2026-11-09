import { useTheme } from '@mui/material';
import type { TargetRect } from './useTargetRect';

// ──────────────────────────────────────────────────────────
// Spotlight karartması — tek bir fixed div hedefin üstüne oturur, devasa
// box-shadow ile etrafı karartır ("delik" tekniği). Adımlar arası delik CSS
// transition ile akıcı kayar. rect=null → deliksiz tam karartma (hedefsiz adım).
//
// ⚠️ RTL: Konumlar kasıtlı olarak inline `style` ile (sx DEĞİL) veriliyor —
// Arapça'da stylis-plugin-rtl sx içindeki `left`'i `right`'a çevirip deliği
// yanlış yere koyar; inline style bu dönüşümden geçmez.
// ──────────────────────────────────────────────────────────

const HOLE_PADDING = 6;

interface SpotlightOverlayProps {
  rect: TargetRect | null;
  zIndex: number;
}

export function SpotlightOverlay({ rect, zIndex }: SpotlightOverlayProps) {
  const theme = useTheme();
  const dim = theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.68)' : 'rgba(27, 19, 10, 0.55)';
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const transition = reduced
    ? 'none'
    : 'top .35s cubic-bezier(.2,.7,.3,1), left .35s cubic-bezier(.2,.7,.3,1), width .35s cubic-bezier(.2,.7,.3,1), height .35s cubic-bezier(.2,.7,.3,1), opacity .25s ease';

  return (
    <>
      {/* Click shield — tur açıkken arkaya tıklamayı engeller (yanlışlıkla
          kapanma/yanlış aksiyon yok; gezinme tooltip butonlarıyla). */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex,
          background: 'transparent',
        }}
      />
      {rect ? (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            top: rect.top - HOLE_PADDING,
            left: rect.left - HOLE_PADDING,
            width: rect.width + HOLE_PADDING * 2,
            height: rect.height + HOLE_PADDING * 2,
            borderRadius: 12,
            boxShadow: `0 0 0 200vmax ${dim}`,
            zIndex,
            pointerEvents: 'none',
            transition,
          }}
        />
      ) : (
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            background: dim,
            zIndex,
            pointerEvents: 'none',
            transition: reduced ? 'none' : 'opacity .25s ease',
          }}
        />
      )}
    </>
  );
}
