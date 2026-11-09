import { Box, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { Money } from '@shared/components/Money';
import type { SubscriptionCatalogItemDto } from '@shared/api/types';
import { useSubscriptionCatalogQuery } from '../api/useSubscriptionCatalog';

interface Props {
  onSelect: (item: SubscriptionCatalogItemDto, categoryId: number) => void;
}

/**
 * "Popüler abonelikler" — Tekrarlayanlar sayfasında opsiyonel hızlı ekleme bölümü.
 * Tık yalnızca formu önceden doldurulmuş açar; kullanıcı onaylamadan kayıt oluşmaz.
 * Katalog yüklenemezse bölüm sessizce gizlenir (nice-to-have, sayfayı bloklamaz).
 */
export function PopularSubscriptions({ onSelect }: Props) {
  const { t } = useTranslation('pages');
  const { data } = useSubscriptionCatalogQuery();

  if (!data || data.items.length === 0) return null;

  return (
    <Box sx={{ mb: 3 }}>
      <Typography
        sx={{
          fontFamily: '"Geist Mono", monospace',
          fontSize: '0.64rem',
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'text.disabled',
          mb: 1.2,
        }}
      >
        {t('recurring.popularTitle')}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {data.items.map((item) => (
          <Box
            key={item.key}
            component="button"
            type="button"
            onClick={() => onSelect(item, data.categoryId)}
            aria-label={item.name}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.9,
              px: 1.3,
              py: 0.8,
              borderRadius: 999,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
              cursor: 'pointer',
              font: 'inherit',
              transition: 'border-color .15s, transform .15s, box-shadow .15s',
              '&:hover': {
                borderColor: alpha(item.color, 0.6),
                transform: 'translateY(-1px)',
                boxShadow: (th) => `0 4px 14px ${alpha(th.palette.common.black, 0.08)}`,
              },
            }}
          >
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                bgcolor: alpha(item.color, 0.14),
                color: item.color,
                flexShrink: 0,
              }}
            >
              <Icon icon={item.icon} width={15} />
            </Box>
            <Stack alignItems="flex-start" spacing={0}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.15 }}>
                {item.name}
              </Typography>
              <Money value={item.suggestedAmount} currency={item.currency} size="sm" />
            </Stack>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
