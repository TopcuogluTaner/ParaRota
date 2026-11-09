// ──────────────────────────────────────────────────────────
// Profil rozeti: galeriden resim YOK — küratörlü ikon + renk seti.
// DB'de yalnız "ikonAdı|#RRGGBB" metni tutulur (AppUser.Avatar, ≤64 karakter).
// Mobil ile birebir port: ParaRota.Mobile/src/features/profile/lib/avatar.ts
// — ikon adları MaterialCommunityIcons (= Iconify `mdi:` seti) sözlüğüdür;
// web render'da `mdi:` prefix'i eklenir (toIconifyName). Format ve sözlük iki
// platformda AYNI kalmalı ki rozet cihazlar arası tutarlı görünsün.
// ──────────────────────────────────────────────────────────

/** Beyaz ikonla okunaklı, hem aydınlık hem karanlık temada oturan 10 doygun ton. */
export const AVATAR_COLORS = [
  '#15803D', // emerald (marka go)
  '#14B8A6', // teal
  '#0EA5E9', // sky
  '#6366F1', // indigo
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#EF4444', // red
  '#F97316', // orange
  '#B45309', // amber (koyu — beyaz ikon okunur)
  '#64748B', // slate
] as const;

/** MDI ikon adları (mobilde Paper `Icon`, webde Iconify `mdi:` ile çizilir) —
    insan/karakter odaklı set: illüstrasyon avatarların ikon karşılığı
    (yüzler, meslekler, karakterler). Hayvan/yemek gibi alakasız ikonlar bilinçli olarak yok.
    Tüm adların Iconify mdi setinde var olduğu doğrulandı (api.iconify.design). */
export const AVATAR_ICONS = [
  'face-man',
  'face-woman',
  'face-man-shimmer',
  'face-woman-shimmer',
  'face-man-profile',
  'face-woman-profile',
  'baby-face-outline',
  'account',
  'account-tie',
  'account-cowboy-hat',
  'account-hard-hat',
  'account-school',
  'account-music',
  'account-heart',
  'face-agent',
  'incognito',
  'ninja',
  'glasses',
  'sunglasses',
  'mustache',
  'crown',
  'wizard-hat',
  'robot-happy',
  'alien',
] as const;

const AVATAR_RE = /^([a-z0-9-]{1,40})\|(#[0-9A-Fa-f]{6})$/;

export interface AvatarParts {
  icon: string;
  color: string;
}

/** "ikon|#RRGGBB" → {icon, color}; boş/bozuk değerde null (istemci baş harflere döner). */
export function parseAvatar(avatar: string | null | undefined): AvatarParts | null {
  if (!avatar) return null;
  const m = AVATAR_RE.exec(avatar);
  return m ? { icon: m[1], color: m[2] } : null;
}

export const buildAvatar = (icon: string, color: string): string => `${icon}|${color}`;

/** Çıplak MDI adını Iconify formuna çevirir: "face-man" → "mdi:face-man".
    DB'de DAİMA çıplak ad saklanır (mobil uyumluluğu); prefix yalnız render içindir. */
export const toIconifyName = (icon: string): string => `mdi:${icon}`;
