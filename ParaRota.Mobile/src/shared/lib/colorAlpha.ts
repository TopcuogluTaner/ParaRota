// Safe alpha overlay for category-tinted backgrounds.
//
// We used to write `accent + '22'` to get a hex-with-alpha string, but accent
// can be (a) a Calm Ledger token like #15803D, (b) a user-defined category
// color from the backend (any format), or (c) already an rgba string from a
// glow token. The concat approach silently produced invalid colors in cases
// (b) and (c). This helper parses common forms and emits a clean rgba.

const HEX_SHORT = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i;
const HEX_LONG = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const HEX_LONG_ALPHA = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const RGB_FN = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;

export function colorAlpha(color: string | undefined | null, alpha: number): string {
  const fallback = `rgba(0,0,0,${alpha})`;
  if (!color) return fallback;
  const a = Math.max(0, Math.min(1, alpha));

  const long = HEX_LONG.exec(color);
  if (long) {
    return `rgba(${parseInt(long[1], 16)},${parseInt(long[2], 16)},${parseInt(long[3], 16)},${a})`;
  }
  const longAlpha = HEX_LONG_ALPHA.exec(color);
  if (longAlpha) {
    return `rgba(${parseInt(longAlpha[1], 16)},${parseInt(longAlpha[2], 16)},${parseInt(longAlpha[3], 16)},${a})`;
  }
  const short = HEX_SHORT.exec(color);
  if (short) {
    return `rgba(${parseInt(short[1] + short[1], 16)},${parseInt(short[2] + short[2], 16)},${parseInt(short[3] + short[3], 16)},${a})`;
  }
  const rgb = RGB_FN.exec(color);
  if (rgb) {
    return `rgba(${rgb[1]},${rgb[2]},${rgb[3]},${a})`;
  }
  return fallback;
}
