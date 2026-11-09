import { useEffect, useRef, useState } from 'react';
import { Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { resolveApiErrorWithFallback } from '@shared/lib/apiError';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { AVATAR_COLORS, AVATAR_ICONS, buildAvatar, parseAvatar, toIconifyName } from '../lib/avatar';
import { useSetAvatar } from '../api/useAvatar';

interface Props {
  open: boolean;
  onClose: () => void;
}

// ──────────────────────────────────────────────────────────
// Profil rozeti seçici — mobil AvatarPickerModal'ın web portu.
// Küratörlü ikon + renk (galeriden resim yok; DB'de yalnız "ikon|#RRGGBB").
// Canlı önizleme üstte; kaydet sunucuya yazar, store yerinde güncellenir.
// ──────────────────────────────────────────────────────────

export function AvatarPickerModal({ open, onClose }: Props) {
  const { t } = useTranslation(['pages', 'common']);
  const user = useAuthStore((s) => s.user);
  const mutation = useSetAvatar();
  const saving = mutation.isPending;

  const [icon, setIcon] = useState<string>(AVATAR_ICONS[0]);
  const [color, setColor] = useState<string>(AVATAR_COLORS[0]);

  // Her açılışta mevcut rozetten (ya da varsayılandan) başla.
  useEffect(() => {
    if (!open) return;
    const cur = parseAvatar(useAuthStore.getState().user?.avatar);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIcon(cur?.icon ?? AVATAR_ICONS[0]);
    setColor(cur?.color ?? AVATAR_COLORS[0]);
  }, [open]);

  // Senkron in-flight koruması: isPending state'i re-render'a kadar güncellenmez;
  // ref art arda tıklamaların çift POST üretmesini anında keser.
  const inFlight = useRef(false);
  const apply = (next: string | null) => {
    if (inFlight.current) return;
    inFlight.current = true;
    mutation.mutate(next, {
      onSettled: () => {
        inFlight.current = false;
      },
      onSuccess: () => {
        toast.success(t(next ? 'pages:profile.avatarSaved' : 'pages:profile.avatarRemoved'));
        onClose();
      },
      onError: (err) => {
        toast.error(resolveApiErrorWithFallback(err, t('common:errorGeneric')));
      },
    });
  };

  const sectionLabelSx = {
    fontFamily: '"Geist Mono", monospace',
    fontSize: '0.66rem',
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    color: 'text.disabled',
    fontWeight: 600,
  } as const;

  return (
    <ZoomModal
      open={open}
      onClose={onClose}
      icon="mdi:face-man-shimmer"
      title={t('pages:profile.avatarTitle')}
      subtitle={t('pages:profile.avatarSubtitle')}
      maxWidth={480}
      actions={
        <>
          {user?.avatar ? (
            <Button
              variant="text"
              color="inherit"
              disabled={saving}
              onClick={() => apply(null)}
              startIcon={<Icon icon="mdi:close-circle-outline" width={16} />}
              sx={{ color: 'text.secondary', fontSize: '0.82rem' }}
            >
              {t('pages:profile.avatarRemove')}
            </Button>
          ) : null}
          <Box sx={{ flex: 1 }} />
          <Button variant="text" color="inherit" onClick={onClose} disabled={saving} sx={{ fontSize: '0.82rem' }}>
            {t('common:cancel')}
          </Button>
          <Button
            variant="contained"
            disabled={saving}
            onClick={() => apply(buildAvatar(icon, color))}
            startIcon={
              saving ? <CircularProgress size={15} thickness={5} color="inherit" /> : <Icon icon="mdi:check" width={16} />
            }
            sx={{ borderRadius: 999, px: 2.4, fontWeight: 600 }}
          >
            {t('common:save')}
          </Button>
        </>
      }
    >
      <Stack spacing={2.4}>
        {/* Canlı önizleme — seçim anında yansır */}
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              display: 'grid',
              placeItems: 'center',
              bgcolor: color,
              color: '#FFFFFF',
              boxShadow: `0 0 0 4px ${alpha(color, 0.18)}`,
              transition: 'background-color .2s, box-shadow .2s',
            }}
          >
            <Icon icon={toIconifyName(icon)} width={34} color="#FFFFFF" />
          </Box>
        </Box>

        {/* Renkler */}
        <Box>
          <Typography sx={{ ...sectionLabelSx, mb: 1 }}>{t('pages:categories.formColorLabel')}</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.1 }}>
            {AVATAR_COLORS.map((c) => {
              const on = color === c;
              return (
                <Box
                  key={c}
                  component="button"
                  type="button"
                  onClick={() => setColor(c)}
                  aria-pressed={on}
                  aria-label={c}
                  sx={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: on ? 'text.primary' : 'transparent',
                    bgcolor: c,
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                    p: 0,
                    transition: 'transform .15s, border-color .15s',
                    '&:hover': { transform: 'scale(1.08)' },
                  }}
                >
                  {on ? <Icon icon="mdi:check" width={15} color="#FFFFFF" /> : null}
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* İkonlar */}
        <Box>
          <Typography sx={{ ...sectionLabelSx, mb: 1 }}>{t('pages:categories.formIconLabel')}</Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 1fr))',
              gap: 0.8,
            }}
          >
            {AVATAR_ICONS.map((ic) => {
              const on = icon === ic;
              return (
                <Box
                  key={ic}
                  component="button"
                  type="button"
                  onClick={() => setIcon(ic)}
                  aria-pressed={on}
                  aria-label={ic}
                  sx={{
                    aspectRatio: '1 / 1',
                    borderRadius: 1.4,
                    border: '1px solid',
                    borderColor: on ? color : 'divider',
                    bgcolor: on ? alpha(color, 0.16) : 'background.default',
                    color: on ? color : 'text.secondary',
                    cursor: 'pointer',
                    display: 'grid',
                    placeItems: 'center',
                    transition: 'all .15s',
                    '&:hover': { bgcolor: alpha(color, 0.1), color },
                  }}
                >
                  <Icon icon={toIconifyName(ic)} width={22} />
                </Box>
              );
            })}
          </Box>
        </Box>
      </Stack>
    </ZoomModal>
  );
}
