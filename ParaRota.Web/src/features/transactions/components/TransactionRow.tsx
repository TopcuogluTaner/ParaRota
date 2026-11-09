import { useState } from 'react';
import {
  Box,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Money } from '@shared/components/Money';
import { SignalBadge } from '@shared/components/SignalBadge';
import { dayjs } from '@shared/lib/dateFormat';
import { useActiveHouseholdStore } from '@features/household/store/useActiveHouseholdStore';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import type { TransactionDto } from '@shared/api/types';

interface Props {
  tx: TransactionDto;
  index?: number;
  onEdit?: (tx: TransactionDto) => void;
  onDelete?: (tx: TransactionDto) => void;
  onMove?: (tx: TransactionDto) => void;
}

export function TransactionRow({ tx, index = 0, onEdit, onDelete, onMove }: Props) {
  const { t } = useTranslation(['common', 'household']);
  // Mobil (xs) overflow menüsü — masaüstündeki inline aksiyonlar gizli.
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(menuAnchor);
  const closeMenu = () => setMenuAnchor(null);
  const activeHouseholdId = useActiveHouseholdStore((s) => s.activeId);
  const currentUserId = useAuthStore((s) => s.user?.id);
  // Sahiplik: kişisel scope'ta her kayıt senindir; aile scope'unda yalnız oluşturduğun.
  const isOwner = activeHouseholdId === null || tx.userId === currentUserId;
  const date = dayjs(tx.transactionDate);
  const isPlanned = tx.status === 'planned';
  const color = tx.category.color ?? '#5A6E7C';
  // Backend amount hep pozitif; yön Type'tan geliyor.
  const signedValue = tx.type === 'expense' ? -tx.amount : tx.amount;
  // Scope badge: sadece household scope'ta gösterilir — kişisel modda gereksiz gürültü.
  const showHouseholdAttribution = activeHouseholdId !== null && tx.householdId != null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.4) }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        sx={{
          px: 2,
          py: 1.6,
          borderRadius: 1.5,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          transition: 'border-color .2s, transform .2s, box-shadow .2s',
          '&:hover': {
            borderColor: 'text.disabled',
            transform: 'translateY(-1px)',
            boxShadow: (th) =>
              th.palette.mode === 'dark'
                ? '0 4px 14px rgba(0,0,0,0.3)'
                : '0 4px 14px rgba(43,30,14,0.08)',
          },
          ...(isPlanned && {
            borderStyle: 'dashed',
            borderColor: (th) => alpha(th.palette.warning.main, 0.4),
          }),
        }}
      >
        {/* Date column */}
        <Box sx={{ width: 56, flexShrink: 0, textAlign: 'center', display: { xs: 'none', sm: 'block' } }}>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.62rem',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              lineHeight: 1,
            }}
          >
            {date.format('MMM')}
          </Typography>
          <Typography
            sx={{
              fontFamily: '"Fraunces", serif',
              fontSize: '1.4rem',
              fontWeight: 500,
              lineHeight: 1,
              mt: 0.4,
            }}
          >
            {date.format('D')}
          </Typography>
        </Box>

        {/* Category icon + name */}
        <Stack direction="row" spacing={1.4} alignItems="center" sx={{ flex: 1.6, minWidth: 0 }}>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 1.4,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              bgcolor: alpha(color, 0.14),
              color,
              fontSize: '1.2rem',
            }}
          >
            {tx.category.emoji ? tx.category.emoji : <Icon icon={tx.category.icon} width={20} />}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={0.6} alignItems="center">
              <Typography sx={{ fontWeight: 500, fontSize: '0.9rem' }} noWrap>
                {tx.notes || tx.category.name}
              </Typography>
              {tx.source === 'recurring' && (
                <Tooltip title={t('recurring')}>
                  <Icon icon="mdi:repeat" width={14} style={{ color: 'var(--pr-ink-mute)' }} />
                </Tooltip>
              )}
            </Stack>
            <Stack direction="row" spacing={0.6} alignItems="center" sx={{ minWidth: 0 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }} noWrap>
                {tx.category.name} · {date.format('HH:mm')}
              </Typography>
              {showHouseholdAttribution && tx.createdByName && (
                <Tooltip title={`${t('addedBy')}: ${tx.createdByName}`} arrow>
                  <Stack
                    direction="row"
                    spacing={0.3}
                    alignItems="center"
                    sx={{
                      flexShrink: 0,
                      px: 0.55,
                      py: 0.1,
                      borderRadius: 0.8,
                      bgcolor: (th) => alpha(th.palette.primary.main, th.palette.mode === 'dark' ? 0.12 : 0.08),
                      color: 'primary.main',
                    }}
                  >
                    <Icon icon="mdi:account-outline" width={11} />
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: '0.66rem',
                        fontWeight: 500,
                        letterSpacing: 0,
                        textTransform: 'none',
                        lineHeight: 1.2,
                      }}
                      noWrap
                    >
                      {tx.createdByName}
                    </Typography>
                  </Stack>
                </Tooltip>
              )}
            </Stack>
          </Box>
        </Stack>

        {/* Badges */}
        <Stack direction="row" spacing={0.8} sx={{ display: { xs: 'none', md: 'flex' } }}>
          <SignalBadge tone={tx.nature === 'fixed' ? 'sky' : 'neutral'} size="xs">
            {tx.nature === 'fixed' ? t('fixed') : t('variable')}
          </SignalBadge>
          <SignalBadge tone={isPlanned ? 'way' : 'go'} size="xs" variant={isPlanned ? 'soft' : 'outline'}>
            {isPlanned ? t('planned') : t('completed')}
          </SignalBadge>
        </Stack>

        {/* Amount */}
        <Box sx={{ minWidth: 110, textAlign: 'right' }}>
          <Money value={signedValue} currency={tx.currency} signed size="md" weight={600} />
        </Box>

        {/* Actions — yalnız kayıt sahibine gösterilir (aile kaydında başkasınınki salt-görür). */}
        <Stack direction="row" spacing={0.2} sx={{ display: { xs: 'none', sm: 'flex' } }}>
          {isOwner && onMove && (
            <Tooltip title={tx.householdId == null ? t('household:move_toFamily') : t('household:move_toPersonal')}>
              <IconButton
                size="small"
                onClick={() => onMove(tx)}
                aria-label={tx.householdId == null ? t('household:move_toFamily') : t('household:move_toPersonal')}
              >
                <Icon icon="mdi:swap-horizontal" width={16} />
              </IconButton>
            </Tooltip>
          )}
          {isOwner && onEdit && (
            <Tooltip title={t('common:edit')}>
              <IconButton size="small" onClick={() => onEdit(tx)} aria-label={t('common:edit')}>
                <Icon icon="mdi:pencil-outline" width={16} />
              </IconButton>
            </Tooltip>
          )}
          {isOwner && onDelete && (
            <Tooltip title={t('common:delete')}>
              <IconButton
                size="small"
                onClick={() => onDelete(tx)}
                aria-label={t('common:delete')}
                sx={{ '&:hover': { color: 'error.main' } }}
              >
                <Icon icon="mdi:trash-can-outline" width={16} />
              </IconButton>
            </Tooltip>
          )}
        </Stack>

        {/* Mobil (xs) overflow kebab — masaüstü inline aksiyonlar gizliyken
            mobil kullanıcı Düzenle/Sil/Taşı işlemlerine buradan erişir. */}
        {isOwner && (onEdit || onDelete || onMove) && (
          <Box sx={{ display: { xs: 'flex', sm: 'none' }, flexShrink: 0 }}>
            <IconButton
              size="small"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              aria-label={t('common:actions')}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Icon icon="mdi:dots-vertical" width={18} />
            </IconButton>
            <Menu
              anchorEl={menuAnchor}
              open={menuOpen}
              onClose={closeMenu}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
              {onEdit && (
                <MenuItem
                  onClick={() => {
                    closeMenu();
                    onEdit(tx);
                  }}
                >
                  <ListItemIcon>
                    <Icon icon="mdi:pencil-outline" width={18} />
                  </ListItemIcon>
                  <ListItemText>{t('common:edit')}</ListItemText>
                </MenuItem>
              )}
              {onMove && (
                <MenuItem
                  onClick={() => {
                    closeMenu();
                    onMove(tx);
                  }}
                >
                  <ListItemIcon>
                    <Icon icon="mdi:swap-horizontal" width={18} />
                  </ListItemIcon>
                  <ListItemText>
                    {tx.householdId == null ? t('household:move_toFamily') : t('household:move_toPersonal')}
                  </ListItemText>
                </MenuItem>
              )}
              {onDelete && (
                <MenuItem
                  onClick={() => {
                    closeMenu();
                    onDelete(tx);
                  }}
                  sx={{ color: 'error.main' }}
                >
                  <ListItemIcon sx={{ color: 'error.main' }}>
                    <Icon icon="mdi:trash-can-outline" width={18} />
                  </ListItemIcon>
                  <ListItemText>{t('common:delete')}</ListItemText>
                </MenuItem>
              )}
            </Menu>
          </Box>
        )}
      </Stack>
    </motion.div>
  );
}
