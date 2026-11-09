/**
 * Web ile paylaşılan veritabanından gelen kategori ikonu adları "mdi:" prefix'iyle
 * (Iconify formatı) gelebilir. React Native Paper'ın MaterialCommunityIcons set'i
 * prefix'siz isimler bekler (örn. "cart-outline").
 */
export function normalizeIconName(icon: string | null | undefined, fallback = 'help-circle-outline'): string {
  if (!icon) return fallback;
  const trimmed = icon.trim();
  if (!trimmed) return fallback;
  if (trimmed.startsWith('mdi:')) return trimmed.slice(4);
  return trimmed;
}
