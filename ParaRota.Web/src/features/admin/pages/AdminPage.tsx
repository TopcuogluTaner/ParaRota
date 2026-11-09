import { useState } from 'react';
import { Box, Button, Grid, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { motion, AnimatePresence } from 'motion/react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@features/auth/store/useAuthStore';
import { ModuleCard } from '../components/ModuleCard';
import { ComingSoonPanel } from '../components/ComingSoonPanel';
import { SendNotificationForm } from '../components/SendNotificationForm';
import { SubscriptionCatalogAdmin } from '../components/SubscriptionCatalogAdmin';
import { SeveranceCeilingAdmin } from '../components/SeveranceCeilingAdmin';
import { SystemLogsAdmin } from '../components/SystemLogsAdmin';
import { SystemStatusAdmin } from '../components/SystemStatusAdmin';

type ModuleId = 'notifications' | 'subscriptionCatalog' | 'severanceCeiling' | 'users' | 'roles' | 'audit' | 'system' | 'db';

interface ModuleDef {
  id: ModuleId;
  icon: string;
  tone: 'primary' | 'success' | 'warning' | 'error' | 'info';
  available: boolean;
}

const MODULES: ModuleDef[] = [
  { id: 'notifications', icon: 'mdi:radio-tower', tone: 'primary', available: true },
  { id: 'subscriptionCatalog', icon: 'mdi:autorenew', tone: 'success', available: true },
  { id: 'severanceCeiling', icon: 'mdi:scale-balance', tone: 'warning', available: true },
  { id: 'users', icon: 'mdi:account-multiple-outline', tone: 'info', available: false },
  { id: 'roles', icon: 'mdi:shield-key-outline', tone: 'warning', available: false },
  { id: 'audit', icon: 'mdi:clipboard-text-search-outline', tone: 'success', available: true },
  { id: 'system', icon: 'mdi:pulse', tone: 'error', available: true },
  { id: 'db', icon: 'mdi:database-cog-outline', tone: 'info', available: false },
];

export function AdminPage() {
  const { t } = useTranslation(['pages', 'common']);
  const isAdmin = useAuthStore((s) => s.hasRole('Admin'));
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [activeModuleId, setActiveModuleId] = useState<ModuleId | null>(null);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;

  const activeModule = MODULES.find((m) => m.id === activeModuleId);
  const moduleLabel = (id: ModuleId, suffix: 'title' | 'description' | 'eyebrow') =>
    t(`admin.module_${id}_${suffix}`);

  return (
    <Box sx={{ p: { xs: 2.5, md: 4 }, maxWidth: 1180, mx: 'auto', position: 'relative' }}>
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
          justifyContent="space-between"
          spacing={2}
          sx={{ mb: 3 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.68rem',
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                mb: 0.6,
              }}
            >
              {t('admin.eyebrow')}
            </Typography>
            <Typography
              sx={{
                fontFamily: '"Fraunces", serif',
                fontWeight: 400,
                fontSize: { xs: '1.9rem', md: '2.4rem' },
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
              }}
            >
              {t('admin.title')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, maxWidth: 540 }}>
              {t('admin.description')}
            </Typography>
          </Box>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.8,
              px: 1.3,
              py: 0.7,
              borderRadius: 999,
              border: '1px solid',
              borderColor: (th) => alpha(th.palette.warning.main, 0.5),
              bgcolor: (th) => alpha(th.palette.warning.main, th.palette.mode === 'dark' ? 0.12 : 0.07),
              color: 'warning.main',
              flexShrink: 0,
            }}
          >
            <Icon icon="mdi:shield-crown-outline" width={16} />
            <Typography
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.66rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              {t('admin.eyebrow')}
            </Typography>
          </Box>
        </Stack>
      </motion.div>

      <Box className="pr-route-line" sx={{ mb: 3.5, opacity: 0.55 }} />

      {/* Module grid header */}
      <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 1.8 }}>
        <Box>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.64rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              mb: 0.4,
            }}
          >
            {t('admin.modules_eyebrow')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'none', letterSpacing: 0 }}>
            {t('admin.modules_hint')}
          </Typography>
        </Box>
        {activeModule && (
          <Button
            variant="text"
            size="small"
            startIcon={<Icon icon="mdi:arrow-left" width={16} />}
            onClick={() => setActiveModuleId(null)}
            sx={{ fontFamily: '"Geist Mono", monospace', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.14em' }}
          >
            {t('admin.back').replace(/^←\s*/, '')}
          </Button>
        )}
      </Stack>

      {/* Module grid — xs:1col, sm:2col, lg:3col */}
      <Grid container spacing={{ xs: 1.4, sm: 2 }}>
        {MODULES.map((m, i) => (
          <Grid key={m.id} size={{ xs: 12, sm: 6, lg: 4 }}>
            <ModuleCard
              id={m.id}
              icon={m.icon}
              eyebrow={moduleLabel(m.id, 'eyebrow')}
              title={moduleLabel(m.id, 'title')}
              description={moduleLabel(m.id, 'description')}
              tone={m.tone}
              active={activeModuleId === m.id}
              disabled={!m.available}
              onClick={(id) => setActiveModuleId(id as ModuleId)}
              index={i}
            />
          </Grid>
        ))}
      </Grid>

      {/* Detail panel — seçilen modülün içeriği */}
      <AnimatePresence mode="wait">
        {activeModule && (
          <motion.div
            key={activeModule.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.2, 0.7, 0.3, 1] }}
            style={{ marginTop: 24 }}
          >
            <Box className="pr-route-line" sx={{ mb: 2.5, opacity: 0.55 }} />
            {activeModule.id === 'notifications' ? (
              <SendNotificationForm />
            ) : activeModule.id === 'subscriptionCatalog' ? (
              <SubscriptionCatalogAdmin />
            ) : activeModule.id === 'severanceCeiling' ? (
              <SeveranceCeilingAdmin />
            ) : activeModule.id === 'audit' ? (
              <SystemLogsAdmin />
            ) : activeModule.id === 'system' ? (
              <SystemStatusAdmin />
            ) : (
              <ComingSoonPanel
                icon={activeModule.icon}
                eyebrow={moduleLabel(activeModule.id, 'eyebrow')}
                title={moduleLabel(activeModule.id, 'title')}
                description={moduleLabel(activeModule.id, 'description')}
                tone={activeModule.tone}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Box>
  );
}
