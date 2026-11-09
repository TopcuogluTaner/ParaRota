import { useLayoutEffect, useRef, useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import type { TargetRect } from './useTargetRect';

// ──────────────────────────────────────────────────────────
// Tur tooltip'i — mobil TourTooltip'in web karşılığı: adım sayacı pill'i +
// Atla + metin + Geri/İleri-Bitti. Hedefin altına (sığmazsa üstüne) konur,
// yatayda viewport'a clamp edilir; rect=null → ekran ortası.
//
// ⚠️ RTL: dış konumlandırma inline `style` ile (stylis-plugin-rtl sx'teki
// left/right'ı aynalar, inline style'a dokunmaz). İç düzen sx kullanabilir —
// buton sırasının RTL'de aynalanması zaten istenen davranış.
// ──────────────────────────────────────────────────────────

const MARGIN = 16; // viewport kenar boşluğu
const GAP = 14; // hedef ile tooltip arası

interface TourTooltipProps {
  rect: TargetRect | null;
  text: string;
  stepNumber: number;
  totalSteps: number;
  isFirst: boolean;
  isLast: boolean;
  zIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export function TourTooltip({
  rect,
  text,
  stepNumber,
  totalSteps,
  isFirst,
  isLast,
  zIndex,
  onNext,
  onPrev,
  onSkip,
}: TourTooltipProps) {
  const { t } = useTranslation('onboarding');
  const ref = useRef<HTMLDivElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; arrow: 'up' | 'down' | null; arrowLeft: number }>({
    top: -9999,
    left: -9999,
    arrow: null,
    arrowLeft: 0,
  });

  // Kendi boyutumuzu ölçüp hedefe göre yerleş — alt tercih, sığmazsa üst.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = el.offsetWidth;
    const h = el.offsetHeight;

    if (!rect) {
      setPos({ top: (vh - h) / 2, left: (vw - w) / 2, arrow: null, arrowLeft: 0 });
      return;
    }

    const fitsBelow = rect.top + rect.height + GAP + h <= vh - MARGIN;
    const top = fitsBelow
      ? rect.top + rect.height + GAP
      : Math.max(MARGIN, rect.top - GAP - h);
    const idealLeft = rect.left + rect.width / 2 - w / 2;
    const left = Math.min(Math.max(MARGIN, idealLeft), Math.max(MARGIN, vw - w - MARGIN));
    // Ok hedef merkezini göstersin (tooltip içine clamp'li).
    const arrowLeft = Math.min(Math.max(18, rect.left + rect.width / 2 - left), w - 18);
    setPos({ top, left, arrow: fitsBelow ? 'up' : 'down', arrowLeft });
  }, [rect, text, stepNumber]);

  // İleri butonuna odak — klavye akışı tooltip içinde başlasın.
  useLayoutEffect(() => {
    nextRef.current?.focus({ preventScroll: true });
  }, [stepNumber]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-live="polite"
      aria-label={`${stepNumber}/${totalSteps}`}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex,
        width: Math.min(360, window.innerWidth - MARGIN * 2),
      }}
    >
      <Paper
        elevation={0}
        sx={{
          position: 'relative',
          p: 2,
          borderRadius: 2.4,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          boxShadow: (th) =>
            th.palette.mode === 'dark'
              ? '0 18px 48px rgba(0,0,0,0.55)'
              : '0 18px 48px rgba(43,30,14,0.18)',
        }}
      >
        {/* Ok — hedefe işaret eden döndürülmüş kare. Konum inline style (RTL). */}
        {pos.arrow && (
          <Box
            sx={{
              position: 'absolute',
              width: 12,
              height: 12,
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              transform: 'rotate(45deg)',
              ...(pos.arrow === 'up'
                ? { top: -7, borderBottom: 'none', borderRight: 'none' }
                : { bottom: -7, borderTop: 'none', borderLeft: 'none' }),
            }}
            style={{ left: pos.arrowLeft - 6, right: 'auto' }}
          />
        )}

        {/* Üst satır: sayaç pill + Atla */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.2 }}>
          <Box
            sx={{
              px: 1.1,
              py: 0.25,
              borderRadius: 999,
              bgcolor: (th) => alpha(th.palette.primary.main, 0.14),
              color: 'primary.main',
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.68rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
            }}
          >
            {stepNumber}/{totalSteps}
          </Box>
          <Button
            size="small"
            variant="text"
            color="inherit"
            onClick={onSkip}
            sx={{ fontSize: '0.78rem', color: 'text.secondary', minWidth: 0, py: 0.2 }}
          >
            {t('skip')}
          </Button>
        </Box>

        <Typography sx={{ fontSize: '0.9rem', lineHeight: 1.5, color: 'text.primary' }}>
          {text}
        </Typography>

        {/* Alt satır: Geri + İleri/Bitti */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, gap: 1.2 }}>
          {!isFirst ? (
            <Button
              size="small"
              variant="text"
              color="inherit"
              onClick={onPrev}
              sx={{ fontSize: '0.82rem', color: 'text.secondary', fontWeight: 600 }}
            >
              {t('back')}
            </Button>
          ) : (
            <Box />
          )}
          <Button
            ref={nextRef}
            size="small"
            variant="contained"
            color="primary"
            onClick={onNext}
            sx={{ borderRadius: 999, px: 2.2, fontSize: '0.82rem', fontWeight: 600 }}
          >
            {isLast ? t('finish') : t('next')}
          </Button>
        </Box>
      </Paper>
    </div>
  );
}
