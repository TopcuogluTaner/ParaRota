import { useState } from 'react';
import { Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Icon } from '@iconify/react';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ZoomModal } from '@shared/components/ZoomModal';
import { getErrorMessage } from '@shared/lib/getErrorMessage';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Davet token'ı — link bundan üretilir */
  token: string;
  /** Davetin gönderildiği e-posta (başlık alt yazısı) */
  email: string;
  /** Aile adı — native paylaşım metninde kullanılır */
  householdName: string;
}

function buildInviteUrl(token: string): string {
  return `${window.location.origin}/accept-invite?token=${encodeURIComponent(token)}`;
}

export function InviteShareModal({ open, onClose, token, email, householdName }: Props) {
  const { t } = useTranslation(['household', 'common']);
  const [copied, setCopied] = useState(false);

  const url = buildInviteUrl(token);
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t('invite_linkCopied'));
      window.setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(getErrorMessage(err, t('common:errorGeneric')));
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: t('invite_shareTitle'),
        text: t('invite_shareText', { name: householdName }),
        url,
      });
    } catch (err) {
      // Kullanıcı paylaşım sayfasını kapattıysa (AbortError) sessiz geç
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Native paylaşım başarısızsa kopyalamaya düş
      await handleCopy();
    }
  };

  return (
    <ZoomModal
      open={open}
      onClose={onClose}
      title={t('invite_shareTitle')}
      subtitle={t('invite_shareSubtitle', { email })}
      icon="mdi:share-variant-outline"
      maxWidth={420}
    >
      <Stack spacing={2.4}>
        {/* QR kod */}
        <Stack spacing={1.1} alignItems="center">
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.6rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              alignSelf: 'stretch',
              textAlign: 'center',
            }}
          >
            {t('invite_qrTitle')}
          </Typography>
          <Box
            sx={{
              p: 1.8,
              borderRadius: 2.4,
              bgcolor: '#fff',
              border: '1px solid',
              borderColor: 'divider',
              lineHeight: 0,
              boxShadow: (th) =>
                th.palette.mode === 'dark'
                  ? '0 8px 24px rgba(0,0,0,0.4)'
                  : '0 8px 24px rgba(43,30,14,0.1)',
            }}
          >
            <QRCodeSVG value={url} size={176} level="M" marginSize={0} fgColor="#1B130A" bgColor="#ffffff" />
          </Box>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', textAlign: 'center', maxWidth: 280, textTransform: 'none', letterSpacing: 0 }}
          >
            {t('invite_scanHint')}
          </Typography>
        </Stack>

        {/* Davet linki — belirgin + tek-tık kopyala */}
        <Box>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: '0.6rem',
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: 'text.disabled',
              mb: 0.7,
            }}
          >
            {t('invite_linkLabel')}
          </Typography>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              px: 1.4,
              py: 1,
              borderRadius: 1.6,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: (th) => alpha(th.palette.text.primary, th.palette.mode === 'dark' ? 0.05 : 0.03),
            }}
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                fontFamily: '"Geist Mono", monospace',
                fontSize: '0.74rem',
                color: 'text.secondary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                direction: 'ltr',
              }}
            >
              {url}
            </Box>
            <Tooltip title={t('invite_copyButton')} arrow>
              <IconButton
                size="small"
                onClick={handleCopy}
                aria-label={t('invite_copyButton')}
                sx={{ width: 30, height: 30, flexShrink: 0, color: copied ? 'success.main' : 'inherit' }}
              >
                <Icon icon={copied ? 'mdi:check' : 'mdi:content-copy'} width={15} />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Paylaş / Kopyala aksiyonları */}
        <Stack direction="row" spacing={1}>
          {canNativeShare && (
            <Button
              variant="contained"
              fullWidth
              startIcon={<Icon icon="mdi:share-variant" width={16} />}
              onClick={handleShare}
              sx={{ py: 0.9, fontSize: '0.82rem' }}
            >
              {t('invite_shareButton')}
            </Button>
          )}
          <Button
            variant={canNativeShare ? 'outlined' : 'contained'}
            fullWidth
            startIcon={<Icon icon={copied ? 'mdi:check' : 'mdi:content-copy'} width={16} />}
            onClick={handleCopy}
            sx={{ py: 0.9, fontSize: '0.82rem' }}
          >
            {t('invite_copyButton')}
          </Button>
        </Stack>
      </Stack>
    </ZoomModal>
  );
}
