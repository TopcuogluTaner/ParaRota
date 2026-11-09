import { useState } from 'react';
import { Box, Stack, Typography, Switch, Select, MenuItem, Divider, Avatar } from '@mui/material';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '@shared/store/useThemeStore';
import { usePrivacyStore } from '@shared/store/usePrivacyStore';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { SectionHeader } from '@shared/components/SectionHeader';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { SUPPORTED_LANGS } from '@shared/i18n';
import { authApi } from '@features/auth/api/authApi';
import { notifyError } from '@shared/lib/apiError';

export function SettingsPage() {
  const { t, i18n } = useTranslation(['pages', 'common']);
  const mode = useThemeStore((s) => s.mode);
  const toggle = useThemeStore((s) => s.toggle);
  const hideAmounts = usePrivacyStore((s) => s.hideAmounts);
  const togglePrivacy = usePrivacyStore((s) => s.toggle);
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const [pdfSaving, setPdfSaving] = useState(false);
  const currentLang =
    SUPPORTED_LANGS.find((l) => i18n.language?.startsWith(l.code))?.code ?? 'tr';

  const togglePdfEmail = async (enabled: boolean) => {
    setPdfSaving(true);
    try {
      await authApi.setMonthlyPdfEmail(enabled);
      await fetchUser(); // /auth/me yetkili kaynak — store oradan tazelenir
    } catch (err) {
      notifyError(err);
    } finally {
      setPdfSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 900, mx: 'auto' }}>
      <SectionHeader
        eyebrow={t('settings.eyebrow')}
        title={t('settings.title')}
        description={t('settings.description')}
      />

      <Stack spacing={2.5}>
        <SurfaceCard padding={3}>
          <Stack direction="row" spacing={2.5} alignItems="center">
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: 'primary.main',
                fontFamily: '"Geist", sans-serif',
                fontWeight: 600,
                fontSize: '1.4rem',
              }}
            >
              {(user?.firstName?.[0] ?? '') + (user?.lastName?.[0] ?? '') || 'P'}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500 }}>
                {user ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email : t('userMenu.guest')}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {user?.email ?? t('settings.notLoggedIn')}
              </Typography>
            </Box>
          </Stack>
        </SurfaceCard>

        <SurfaceCard padding={0}>
          <SettingRow
            icon={mode === 'dark' ? 'mdi:weather-night' : 'mdi:weather-sunny'}
            title={t('settings.themeTitle')}
            subtitle={mode === 'dark' ? t('settings.themeDark') : t('settings.themeLight')}
          >
            <Switch checked={mode === 'dark'} onChange={toggle} color="primary" />
          </SettingRow>
          <Divider />

          {/* Gizlilik modu — Topbar'daki göz ikonuyla aynı store'u kullanır. */}
          <SettingRow
            icon={hideAmounts ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}
            title={t('common:privacyModeTitle')}
            subtitle={t('common:privacyModeSubtitle')}
          >
            <Switch
              checked={hideAmounts}
              onChange={togglePrivacy}
              color="primary"
              slotProps={{
                input: {
                  'aria-label': t('common:privacyModeTitle'),
                },
              }}
            />
          </SettingRow>
          <Divider />

          {/* Aylık özet PDF e-postası — opt-in; otorite /auth/me, Hangfire ay başında gönderir. */}
          <SettingRow
            icon="mdi:email-newsletter"
            title={t('settings.monthlyPdfLabel')}
            subtitle={t('settings.monthlyPdfHelp')}
          >
            <Switch
              checked={!!user?.sendMonthlyPdfEmail}
              disabled={pdfSaving}
              onChange={(_, v) => void togglePdfEmail(v)}
              color="primary"
              slotProps={{
                input: {
                  'aria-label': t('settings.monthlyPdfLabel'),
                },
              }}
            />
          </SettingRow>
          <Divider />

          <SettingRow icon="mdi:translate" title={t('settings.languageTitle')} subtitle={t('settings.languageSubtitle')}>
            <Select
              size="small"
              value={currentLang}
              onChange={(e) => void i18n.changeLanguage(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              {SUPPORTED_LANGS.map((l) => (
                <MenuItem key={l.code} value={l.code}>
                  <Box component="span" sx={{ display: 'inline-flex', verticalAlign: 'middle', mr: 1, borderRadius: '50%', overflow: 'hidden' }}>
                    <Icon icon={l.flag} width={18} height={18} />
                  </Box>
                  {l.label}
                </MenuItem>
              ))}
            </Select>
          </SettingRow>
        </SurfaceCard>
      </Stack>
    </Box>
  );
}

function SettingRow({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Stack direction="row" spacing={2} alignItems="center" sx={{ px: 3, py: 2.2 }}>
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 1.4,
          display: 'grid',
          placeItems: 'center',
          bgcolor: (th) => (th.palette.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(15,139,108,0.08)'),
          color: 'primary.main',
        }}
      >
        <Icon icon={icon} width={20} />
      </Box>
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontWeight: 500, fontSize: '0.95rem' }}>{title}</Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {children}
    </Stack>
  );
}
