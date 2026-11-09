import type { DimensionValue } from 'react-native';

interface Props {
  color: string;
  size?: number;
  top?: DimensionValue;
  bottom?: DimensionValue;
  left?: DimensionValue;
  right?: DimensionValue;
}

// Calm Ledger: no decorative glow on a finance surface. Kept as a no-op so
// existing call sites in auth/dashboard heroes don't need touching.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function GlowOrb(_props: Props) {
  return null;
}
