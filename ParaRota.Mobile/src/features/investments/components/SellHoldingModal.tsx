import { useEffect, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { View, StyleSheet, Pressable } from 'react-native';
import { Button, TextInput, HelperText, Switch, Icon } from 'react-native-paper';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { AppDateTimePicker as DateTimePicker } from '@shared/components/AppDateTimePicker';
import { useTranslation } from 'react-i18next';
import { AppModal } from '@shared/components/AppModal';
import { Body, Eyebrow } from '@shared/components/Typography';
import { parseAmount } from '@shared/lib/parseAmount';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { formatDate, formatCurrency } from '@shared/lib/dateFormat';
import { useSellHolding } from '@features/investments/api/useInvestments';
import type { HoldingDto } from '@shared/api/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  holding: HoldingDto | null;
}

export function SellHoldingModal({ visible, onDismiss, holding }: Props) {
  const { t } = useTranslation('investments');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const fmtMoney = useMoneyFmt(); // gizlilik modunda tutarlari maskeler
  const sell = useSellHolding(holding?.id ?? 0);

  const [saleDate, setSaleDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [linkToCashFlow, setLinkToCashFlow] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setSaleDate(new Date());
    setQuantity('');
    setLinkToCashFlow(true); // varsayılan AÇIK — satış geliri hesaba eklensin
  }, [visible, holding?.id]);

  const qtyNum = parseAmount(quantity);
  const qtyInvalid = quantity.trim().length > 0 && !(Number.isFinite(qtyNum) && qtyNum > 0);
  const busy = sell.isPending;

  const submit = async () => {
    if (!holding || qtyInvalid) return;
    try {
      const result = await sell.mutateAsync({
        saleDate: saleDate.toISOString(),
        quantity: quantity.trim().length > 0 ? qtyNum : null,
        linkToCashFlow,
      });
      toast.success(t('toast_sell', { pnl: formatCurrency(result.realizedProfitLoss) }));
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  return (
    <AppModal visible={visible} onDismiss={onDismiss} eyebrow={t('eyebrow')} title={t('sell_title')} subtitle={t('sell_subtitle')}>
      {holding ? (
        <Body weight="bold">{holding.assetType === 'tefasFund' ? (holding.fundName || holding.fundCode || t('asset_tefasFund')) : t(`asset_${holding.assetType}`)} · {fmtMoney(holding.currentValue)}</Body>
      ) : null}

      <Pressable onPress={() => setShowDate(true)}>
        <View pointerEvents="none">
          <TextInput mode="outlined" label={t('form_purchaseDate')} value={formatDate(saleDate)} editable={false} right={<TextInput.Icon icon="calendar-outline" />} />
        </View>
      </Pressable>
      <DateTimePicker
        visible={showDate}
        value={saleDate}
        mode="date"
        onConfirm={(d) => { setSaleDate(d); setShowDate(false); }}
        onCancel={() => setShowDate(false)}
      />

      <View>
        <TextInput mode="outlined" label={t('sell_quantity')} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" error={qtyInvalid} />
        <HelperText type={qtyInvalid ? 'error' : 'info'} visible>
          {qtyInvalid ? tCommon('required') : t('sell_quantityHint')}
        </HelperText>
      </View>

      <Pressable
        onPress={() => setLinkToCashFlow((v) => !v)}
        style={[
          styles.linkCard,
          {
            borderColor: linkToCashFlow ? colorAlpha(colors.go, 0.45) : colors.line,
            backgroundColor: linkToCashFlow ? colorAlpha(colors.go, 0.08) : colors.bgAlt,
          },
        ]}
      >
        <View style={[styles.linkIcon, { backgroundColor: colorAlpha(colors.go, 0.14) }]}>
          <Icon source="cash-plus" size={20} color={colors.go} />
        </View>
        <View style={{ flex: 1 }}>
          <Body weight="bold">{t('sell_linkCashFlow')}</Body>
          <Eyebrow tone="mute" style={{ marginTop: 2 }}>{t('sell_linkCashFlowHint')}</Eyebrow>
        </View>
        {/* Sadece görsel — dokunuş kartın Pressable'ında (çift toggle olmasın). */}
        <View pointerEvents="none">
          <Switch value={linkToCashFlow} color={colors.go} />
        </View>
      </Pressable>

      <Button mode="contained" loading={busy} disabled={busy || qtyInvalid} onPress={submit} buttonColor={colors.go} textColor={colors.onAccent}>
        {t('sell_button')}
      </Button>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  linkIcon: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
});
