import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Box, Tooltip, useTheme } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { QuickEntryModal } from '@features/transactions/components/QuickEntryModal';
import { useEntitlement } from '@features/subscription/hooks/useEntitlement';
import { usePaywallStore } from '@features/subscription/store/usePaywallStore';

// ──────────────────────────────────────────────────────────
// QuickActionDock — uygulamadaki her authenticated ekranın sağ alt
// köşesinde sabit duran "pusula" FAB. Tıklayınca iki rota-ticket
// açılır: Fiş Okut (file picker → OCR + modal) ve Gider Gir (modal).
//
// Tasarım dili: brand'in "Cartographic Finance" teması; parşömen + ink +
// rota işaretleri. Stagger reveal, route-line connector, route-stamp eyebrow.
// RTL'de yatay yön mirror'lanır (Arapça).
// ──────────────────────────────────────────────────────────

type DockMode = 'closed' | 'open';

const ALLOWED_TYPES =
  'image/jpeg,image/png,image/heic,image/heif,application/pdf';

export function QuickActionDock() {
  const { t } = useTranslation('common');
  const theme = useTheme();
  const isRtl = theme.direction === 'rtl';

  const [mode, setMode] = useState<DockMode>('closed');
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggle = useCallback(() => setMode((m) => (m === 'open' ? 'closed' : 'open')), []);
  const close = useCallback(() => setMode('closed'), []);

  const { isPremium } = useEntitlement();
  const showPaywall = usePaywallStore((s) => s.show);

  // ESC ile kapat
  useEffect(() => {
    if (mode !== 'open') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, close]);

  const handleScanClick = () => {
    close();
    // Fiş tarama premium — değilse paywall aç (backend de [RequirePremium] ile korur).
    if (!isPremium) {
      showPaywall('receipts');
      return;
    }
    fileInputRef.current?.click();
  };

  const handleScanFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPendingFile(file);
    setModalOpen(true);
  };

  const handleManualClick = () => {
    close();
    setPendingFile(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setPendingFile(null);
  };

  // Stagger için aksiyon-kart konfig
  const actions = useMemo(
    () => [
      {
        id: 'scan' as const,
        eyebrow: t('quickDock_scanEyebrow'),
        title: t('quickDock_scanTitle'),
        caption: t('quickDock_scanCaption'),
        icon: 'mdi:receipt-text-outline',
        accent: 'primary' as const,
        onClick: handleScanClick,
      },
      {
        id: 'manual' as const,
        eyebrow: t('quickDock_manualEyebrow'),
        title: t('quickDock_manualTitle'),
        caption: t('quickDock_manualCaption'),
        icon: 'mdi:lightning-bolt-outline',
        accent: 'secondary' as const,
        onClick: handleManualClick,
      },
    ],
    // isPremium deps'te OLMALI — yoksa canlı satın alma sonrası handleScanClick eski
    // isPremium closure'ını tutar ve premium kullanıcıya tekrar paywall açar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, isPremium, showPaywall],
  );

  // Anchor offset — mobilde daha sıkı, masaüstünde rahat
  const anchorEnd = { xs: 16, sm: 22, md: 28 };
  const anchorBottom = { xs: 18, sm: 24, md: 28 };

  // #root (z-index:1) bir stacking context yarattığı için bu fixed dock o context'e
  // hapsoluyordu; body'ye portallayarak diğer body-seviye katmanlarla (modal/toast) doğru
  // sıralanmasını sağlıyoruz. (Toast'la aynı sınıf düzeltme.)
  return createPortal(
    <>
      {/* Backdrop scrim */}
      <AnimatePresence>
        {mode === 'open' && (
          <Box
            component={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            onClick={close}
            sx={{
              position: 'fixed',
              inset: 0,
              zIndex: 1198,
              bgcolor: (th) =>
                th.palette.mode === 'dark'
                  ? alpha('#000', 0.42)
                  : alpha('#1B130A', 0.18),
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* Hidden file input — "Fiş Okut" ticket'ı bunu programatik açar */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ALLOWED_TYPES}
        style={{ display: 'none' }}
        onChange={handleScanFile}
        aria-hidden
        tabIndex={-1}
      />

      {/* Dock container — anchor bottom-end */}
      <Box
        sx={{
          position: 'fixed',
          insetInlineEnd: anchorEnd,
          bottom: anchorBottom,
          zIndex: 1199,
          display: 'flex',
          flexDirection: 'column',
          alignItems: isRtl ? 'flex-start' : 'flex-end',
          gap: 1.4,
          pointerEvents: 'none', // children kendi pointer-events'ini açar
        }}
      >
        {/* Action tickets */}
        <AnimatePresence>
          {mode === 'open' && (
            <Box
              component={motion.div}
              initial={false}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.2,
                alignItems: isRtl ? 'flex-start' : 'flex-end',
                pointerEvents: 'auto',
              }}
            >
              {/* eslint-disable-next-line react-hooks/refs --
                  False positive: `actions` useMemo'su `fileInputRef`'i sadece
                  onClick callback'leri içinden transitif olarak kullanıyor;
                  render sırasında .current okunmuyor. */}
              {actions.map(({ id, ...rest }, i) => (
                <ActionTicket
                  key={id}
                  index={i}
                  total={actions.length}
                  isRtl={isRtl}
                  {...rest}
                />
              ))}
            </Box>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <Tooltip
          title={mode === 'open' ? t('quickDock_close') : t('quickDock_toggle')}
          placement={isRtl ? 'right' : 'left'}
          arrow
        >
          <Box
            component={motion.button}
            type="button"
            onClick={toggle}
            aria-label={mode === 'open' ? t('quickDock_close') : t('quickDock_toggle')}
            aria-expanded={mode === 'open'}
            data-tour="quick-dock"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
            sx={{
              pointerEvents: 'auto',
              width: { xs: 56, md: 62 },
              height: { xs: 56, md: 62 },
              border: 0,
              cursor: 'pointer',
              borderRadius: 2.4,
              display: 'grid',
              placeItems: 'center',
              color: '#FBF5E5',
              background: (th) =>
                `linear-gradient(140deg, ${th.palette.primary.light} 0%, ${th.palette.primary.main} 100%)`,
              boxShadow: (th) =>
                th.palette.mode === 'dark'
                  ? `0 14px 38px ${alpha(th.palette.primary.main, 0.45)}, inset 0 1px 0 ${alpha('#fff', 0.12)}`
                  : `0 16px 40px ${alpha(th.palette.primary.main, 0.32)}, inset 0 1px 0 ${alpha('#fff', 0.2)}`,
              outline: 'none',
              transition: 'box-shadow .25s ease',
              '&:focus-visible': {
                boxShadow: (th) =>
                  `0 0 0 3px ${alpha(th.palette.primary.main, 0.45)}, 0 16px 40px ${alpha(th.palette.primary.main, 0.32)}`,
              },
              // Idle compass-pulse — çok hafif, dikkat çekmesin
              '@media (prefers-reduced-motion: no-preference)': {
                animation: mode === 'closed' ? 'pr-dock-pulse 6.5s ease-in-out infinite' : 'none',
              },
              '@keyframes pr-dock-pulse': {
                '0%, 100%': { transform: 'translateY(0)' },
                '50%': { transform: 'translateY(-2px)' },
              },
            }}
          >
            <Box
              component={motion.span}
              animate={{ rotate: mode === 'open' ? 135 : 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              sx={{ display: 'inline-flex', lineHeight: 0 }}
            >
              <Icon icon="mdi:plus" width={28} />
            </Box>
          </Box>
        </Tooltip>
      </Box>

      <QuickEntryModal
        open={modalOpen}
        onClose={handleModalClose}
        initialScanFile={pendingFile}
      />
    </>,
    document.body,
  );
}

// ──────────────────────────────────────────────────────────
// ActionTicket — rota durak kartı. Sol: numara + eyebrow + Fraunces başlık
// + caption. Sağ: ikon-çipi. Hover'da hafif slide.
// ──────────────────────────────────────────────────────────

interface TicketProps {
  index: number;
  total: number;
  isRtl: boolean;
  eyebrow: string;
  title: string;
  caption: string;
  icon: string;
  accent: 'primary' | 'secondary';
  onClick: () => void;
}

function ActionTicket({
  index,
  total,
  isRtl,
  eyebrow,
  title,
  caption,
  icon,
  accent,
  onClick,
}: TicketProps) {
  // Üstteki kart önce çıksın — total - index sırasıyla stagger
  const delay = (total - 1 - index) * 0.06;
  const slideDir = isRtl ? -14 : 14;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, x: slideDir, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.96, transition: { duration: 0.14 } }}
      transition={{ delay, type: 'spring', stiffness: 360, damping: 28 }}
      style={{ display: 'flex' }}
    >
      <Box
        component="button"
        type="button"
        onClick={onClick}
        sx={{
          display: 'inline-flex',
          alignItems: 'stretch',
          gap: 0,
          minWidth: 248,
          maxWidth: 304,
          textAlign: isRtl ? 'right' : 'left',
          cursor: 'pointer',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          boxShadow: (th) =>
            th.palette.mode === 'dark'
              ? `0 18px 40px ${alpha('#000', 0.5)}`
              : `0 18px 40px ${alpha('#1B130A', 0.14)}`,
          transition: 'transform .18s ease, border-color .18s ease, box-shadow .18s ease',
          '&:hover': {
            transform: isRtl ? 'translateX(4px)' : 'translateX(-4px)',
            borderColor: `${accent}.main`,
            boxShadow: (th) =>
              th.palette.mode === 'dark'
                ? `0 22px 50px ${alpha(th.palette[accent].main, 0.32)}`
                : `0 22px 50px ${alpha(th.palette[accent].main, 0.22)}`,
          },
          '&:focus-visible': {
            outline: 'none',
            borderColor: `${accent}.main`,
            boxShadow: (th) => `0 0 0 3px ${alpha(th.palette[accent].main, 0.35)}`,
          },
        }}
      >
        {/* Text column */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.3,
            px: 1.8,
            py: 1.3,
            minWidth: 0,
          }}
        >
          {/* Eyebrow — numara + tag, Geist Mono */}
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.6,
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.6rem',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              fontWeight: 600,
            }}
          >
            <Box
              component="span"
              sx={{
                px: 0.55,
                py: 0.05,
                borderRadius: 0.6,
                bgcolor: (th) => alpha(th.palette[accent].main, 0.12),
                color: `${accent}.main`,
              }}
            >
              {String(index + 1).padStart(2, '0')}
            </Box>
            <Box component="span">·</Box>
            <Box component="span">{eyebrow}</Box>
          </Box>

          {/* Title — Fraunces serif */}
          <Box
            sx={{
              fontFamily: '"Fraunces", serif',
              fontSize: '1.05rem',
              fontWeight: 500,
              lineHeight: 1.15,
              color: 'text.primary',
              letterSpacing: '-0.01em',
            }}
          >
            {title}
          </Box>

          {/* Caption */}
          <Box
            sx={{
              fontSize: '0.74rem',
              color: 'text.secondary',
              lineHeight: 1.35,
            }}
          >
            {caption}
          </Box>
        </Box>

        {/* Icon chip column */}
        <Box
          sx={{
            width: 64,
            display: 'grid',
            placeItems: 'center',
            borderInlineStart: '1px dashed',
            borderColor: 'divider',
            bgcolor: (th) => alpha(th.palette[accent].main, 0.07),
            color: `${accent}.main`,
            position: 'relative',
            '&::before, &::after': {
              content: '""',
              position: 'absolute',
              insetInlineStart: -5,
              width: 10,
              height: 10,
              borderRadius: '50%',
              bgcolor: 'background.default',
              border: '1px solid',
              borderColor: 'divider',
            },
            '&::before': { top: -5 },
            '&::after': { bottom: -5 },
          }}
        >
          <Icon icon={icon} width={26} />
        </Box>
      </Box>
    </motion.div>
  );
}
