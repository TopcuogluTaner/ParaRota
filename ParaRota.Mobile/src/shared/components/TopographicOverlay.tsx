interface Props {
  opacity?: number;
  tint?: string;
}

// Calm Ledger: the cartographic contour pattern was decorative and read as
// noise behind numeric data. Kept as a no-op so existing call sites compile.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function TopographicOverlay(_props: Props) {
  return null;
}
