import { useState } from 'react';
import { Box, Button, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { motion } from 'motion/react';
import { SectionHeader } from '@shared/components/SectionHeader';
import { PageTourTrigger } from '@features/onboarding';
import { SurfaceCard } from '@shared/components/SurfaceCard';
import { MonthlyPdfModal } from '../components/MonthlyPdfModal';
import { TransactionsXlsxModal } from '../components/TransactionsXlsxModal';

export function ExportsPage() {
  const { t } = useTranslation(['exports', 'common']);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [xlsxOpen, setXlsxOpen] = useState(false);

  return (
    <Box sx={{ p: { xs: 2, sm: 2.6, md: 4 }, maxWidth: 1100, mx: 'auto' }}>
      <SectionHeader
        eyebrow={t('page_eyebrow')}
        title={t('page_title')}
        description={t('page_description')}
      />

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 3 }}>
          <Box data-tour="exports-pdf" sx={{ flex: 1, display: 'flex' }}>
            <ExportCard
              icon="mdi:file-pdf-box"
              tone="#B0341E"
              title={t('card_monthlyPdf_title')}
              description={t('card_monthlyPdf_description')}
              actionLabel={t('card_action')}
              onClick={() => setPdfOpen(true)}
            />
          </Box>
          <Box data-tour="exports-xlsx" sx={{ flex: 1, display: 'flex' }}>
            <ExportCard
              icon="mdi:file-excel-box"
              tone="#0F8B6C"
              title={t('card_transactionsXlsx_title')}
              description={t('card_transactionsXlsx_description')}
              actionLabel={t('card_action')}
              onClick={() => setXlsxOpen(true)}
            />
          </Box>
        </Stack>
      </motion.div>

      <MonthlyPdfModal open={pdfOpen} onClose={() => setPdfOpen(false)} />
      <TransactionsXlsxModal open={xlsxOpen} onClose={() => setXlsxOpen(false)} />

      <PageTourTrigger page="exports" />
    </Box>
  );
}

interface CardProps {
  icon: string;
  tone: string;
  title: string;
  description: string;
  actionLabel: string;
  onClick: () => void;
}

function ExportCard({ icon, tone, title, description, actionLabel, onClick }: CardProps) {
  return (
    <SurfaceCard padding={0} sx={{ flex: 1, p: { xs: 2.4, sm: 3 } }}>
      <Stack spacing={1.6}>
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: 1.6,
            display: 'grid',
            placeItems: 'center',
            bgcolor: (th) => alpha(tone, th.palette.mode === 'dark' ? 0.18 : 0.12),
            color: tone,
          }}
        >
          <Icon icon={icon} width={28} />
        </Box>
        <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, fontSize: '1.2rem', lineHeight: 1.2 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {description}
        </Typography>
        <Box>
          <Button
            variant="contained"
            size="small"
            onClick={onClick}
            startIcon={<Icon icon="mdi:download" width={16} />}
            sx={{
              mt: 0.4,
              px: 2,
              py: 0.85,
              fontSize: '0.82rem',
              bgcolor: tone,
              '&:hover': { bgcolor: tone, filter: 'brightness(1.06)' },
            }}
          >
            {actionLabel}
          </Button>
        </Box>
      </Stack>
    </SurfaceCard>
  );
}
