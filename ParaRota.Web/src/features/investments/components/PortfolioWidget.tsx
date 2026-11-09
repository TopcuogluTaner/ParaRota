import { Box, Button, Stack, Typography } from '@mui/material';
import { Icon } from '@iconify/react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { useEntitlement } from '@features/subscription/hooks/useEntitlement';
import { usePortfolioQuery } from '../api/useInvestments';

// Dashboard'da kompakt portföy özeti. Yatırımı olmayan kullanıcıda hiç render olmaz.
// Premium değilse endpoint premium-korumalı (403) — istek hiç atılmaz, widget gizli.
export function PortfolioWidget() {
  const { t } = useTranslation('investments');
  const navigate = useNavigate();
  const fmtMoney = useMoneyFmt(); // gizlilik modunda tutarları maskeler (yüzde maskelenmez)
  const { isPremium } = useEntitlement();
  const { data } = usePortfolioQuery(isPremium);

  if (!data || data.items.length === 0) return null;

  const positive = data.totalProfitLoss >= 0;
  const pnlColor = positive ? 'var(--pr-go)' : 'var(--pr-halt)';

  return (
    <SurfaceCard padding={3}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Icon icon="mdi:chart-line-variant" width={20} />
          <Typography sx={{ fontWeight: 600 }}>{t('title')}</Typography>
        </Stack>
        <Button size="small" endIcon={<Icon icon="mdi:arrow-right" width={16} />} onClick={() => navigate('/investments')}>
          {t('card_cta')}
        </Button>
      </Stack>
      <Stack direction="row" spacing={5} flexWrap="wrap">
        <Box>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('stat_value')}</Typography>
          <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 600, fontSize: '1.3rem' }}>
            {fmtMoney(data.totalCurrentValue)}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{t('stat_pnl')}</Typography>
          <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 600, fontSize: '1.3rem', color: pnlColor }}>
            {positive ? '+' : ''}{fmtMoney(data.totalProfitLoss)} ({data.totalProfitLossPct.toFixed(1)}%)
          </Typography>
        </Box>
      </Stack>
    </SurfaceCard>
  );
}
