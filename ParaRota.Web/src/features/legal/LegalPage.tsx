import { Box, Stack, Typography, Button, Divider } from '@mui/material';
import { Icon } from '@iconify/react';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Yayın/yürürlük tarihi (mağaza + kullanıcı için sabit referans).
const EFFECTIVE = '2026-06-04';
const CONTACT = 'info@pararotam.com';

// Metinler "legal" namespace'inde numaralı key'lerde durur (privacy.s1_h, privacy.s1_p1, ...).
// Aşağıdaki diziler bölüm başına paragraf sayısını tanımlar; bölüm eklenirse/çıkarılırsa
// 5 dilin legal.json'u ile birlikte burası da güncellenmeli.
const PRIVACY_PARAGRAPHS = [5, 4, 6, 2, 3, 2, 1, 1, 1];
const TERMS_PARAGRAPHS = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

type Section = { h: string; p: string[] };
type Doc = { title: string; intro: string; sections: Section[] };

function useLegalDoc(docKey: 'privacy' | 'terms', paragraphCounts: number[]): Doc {
  const { t } = useTranslation('legal');
  return {
    title: t(`${docKey}.title`),
    intro: t(`${docKey}.intro`, { contact: CONTACT }),
    sections: paragraphCounts.map((count, i) => ({
      h: t(`${docKey}.s${i + 1}_h`),
      p: Array.from({ length: count }, (_, j) => t(`${docKey}.s${i + 1}_p${j + 1}`, { contact: CONTACT })),
    })),
  };
}

function LegalLayout({ doc }: { doc: Doc }) {
  const { t } = useTranslation('legal');
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: { xs: 4, md: 7 } }}>
      <Box sx={{ maxWidth: 760, mx: 'auto', px: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 4 }}>
          <Typography sx={{ fontFamily: '"Fraunces", serif', fontWeight: 600, fontSize: '1.3rem' }}>ParaRotam</Typography>
          <Button component={RouterLink} to="/login" size="small" startIcon={<Icon icon="mdi:arrow-left" width={16} />}>
            {t('backToApp')}
          </Button>
        </Stack>

        <Typography variant="h4" sx={{ fontFamily: '"Fraunces", serif', fontWeight: 500, mb: 1 }}>{doc.title}</Typography>
        <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: '"Geist Mono", monospace' }}>
          {t('effective', { date: EFFECTIVE })}
        </Typography>
        <Typography sx={{ color: 'text.secondary', mt: 2, lineHeight: 1.6 }}>{doc.intro}</Typography>
        <Divider sx={{ my: 3 }} />

        <Stack spacing={3}>
          {doc.sections.map((s) => (
            <Box key={s.h}>
              <Typography sx={{ fontWeight: 600, mb: 1 }}>{s.h}</Typography>
              <Stack spacing={0.8}>
                {s.p.map((para, i) => (
                  <Typography key={i} variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.6 }}>{para}</Typography>
                ))}
              </Stack>
            </Box>
          ))}
        </Stack>

        <Divider sx={{ my: 4 }} />
        <Stack direction="row" spacing={3}>
          <Button component={RouterLink} to="/privacy" size="small">{t('links.privacy')}</Button>
          <Button component={RouterLink} to="/terms" size="small">{t('links.terms')}</Button>
        </Stack>
      </Box>
    </Box>
  );
}

export function PrivacyPage() {
  const doc = useLegalDoc('privacy', PRIVACY_PARAGRAPHS);
  return <LegalLayout doc={doc} />;
}

export function TermsPage() {
  const doc = useLegalDoc('terms', TERMS_PARAGRAPHS);
  return <LegalLayout doc={doc} />;
}
