import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { Display } from './Typography';

interface Props {
  size?: number;
  variant?: 'full' | 'compact';
  tone?: 'go' | 'paper';
}

// Calm Ledger wordmark: zarif italik Fraunces ile "Para Rotam". Pusula/ok
// süsü yok — marka tek bir tipografik jestte taşınır. tone='paper' koyu
// zeminlerde (auth) açık metin verir.
export function BrandMark({ size = 32, tone = 'go' }: Props) {
  const { colors } = useAppTheme();
  // tone='paper' → koyu hero paneli üstünde; heroFg her iki temada da açık
  // (colors.paper karanlık temada koyu olup görünmez kalırdı).
  const color = tone === 'paper' ? colors.heroFg : colors.ink;
  const fontSize = Math.round(size * 0.66);
  return (
    <Display
      italic
      bold
      size="md"
      style={{ color, fontSize, lineHeight: Math.round(fontSize * 1.12), letterSpacing: 0.2 }}
    >
      Para Rotam
    </Display>
  );
}
