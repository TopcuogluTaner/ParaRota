import { Avatar } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import type { AuthUser } from '@features/auth/types/auth.types';
import { parseAvatar, toIconifyName } from '../lib/avatar';

// ──────────────────────────────────────────────────────────
// Kullanıcı kimlik görseli — tek doğruluk noktası.
// avatar ("ikon|#RRGGBB") varsa: seçilen renk zemin + beyaz MDI ikonu.
// Yoksa/bozuksa: baş harfler (mevcut davranış birebir korunur).
// ProfilePage başlığı ve UserMenu (topbar) buradan beslenir.
// ──────────────────────────────────────────────────────────

interface Props {
  user: Pick<AuthUser, 'firstName' | 'lastName' | 'email' | 'avatar'> | null;
  /** Çap (px). İkon boyutu orantılı türetilir. */
  size?: number;
  /** Kullanıcı yokken gösterilecek baş harf(ler). */
  fallback?: string;
  sx?: SxProps<Theme>;
}

export function UserAvatar({ user, size = 40, fallback = 'PR', sx }: Props) {
  const parsed = parseAvatar(user?.avatar);

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}` ||
      user.email?.[0]?.toUpperCase() ||
      fallback
    : fallback;

  return (
    <Avatar
      sx={[
        {
          width: size,
          height: size,
          bgcolor: parsed?.color ?? 'primary.main',
          color: parsed ? '#FFFFFF' : 'primary.contrastText',
          fontFamily: '"Geist", sans-serif',
          fontWeight: 600,
          fontSize: `${Math.round(size * 0.36)}px`,
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {parsed ? (
        <Icon icon={toIconifyName(parsed.icon)} width={Math.round(size * 0.55)} color="#FFFFFF" />
      ) : (
        initials
      )}
    </Avatar>
  );
}
