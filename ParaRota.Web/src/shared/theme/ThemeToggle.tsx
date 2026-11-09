import { IconButton, Tooltip } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@shared/store/useThemeStore';

export function ThemeToggle() {
  const { t } = useTranslation('common');
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);
  const isDark = mode === 'dark';

  return (
    <Tooltip title={isDark ? t('lightTheme') : t('darkTheme')}>
      <IconButton onClick={toggle} size="small">
        <Icon icon={isDark ? 'mdi:weather-sunny' : 'mdi:weather-night'} width={20} />
      </IconButton>
    </Tooltip>
  );
}
