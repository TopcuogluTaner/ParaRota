import { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Button, TextInput, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { AppModal } from '@shared/components/AppModal';
import { Body, Eyebrow } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import { formatCurrency } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { toast } from '@shared/lib/toast';
import { ASSET_GROUPS, ASSET_ICON, ASSET_COLOR, CLASS_ORDER, classOfAsset } from '@features/investments/lib/assetMeta';
import { useRatesQuery } from '@features/investments/api/useInvestments';
import { TefasFundPicker } from '@features/investments/components/TefasFundPicker';
import { CategoryScroller } from '@features/investments/components/CategoryScroller';
import { useCreatePriceAlarm, useUpdatePriceAlarm } from '@features/priceAlarms/api/usePriceAlarms';
import type { AlarmDirection, AssetClass, AssetType, PriceAlarmDto } from '@shared/api/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  /** Düzenleme modunda mevcut alarm; create için undefined. */
  alarm?: PriceAlarmDto;
}

const DIRECTIONS: AlarmDirection[] = ['above', 'below'];

export function PriceAlarmModal({ visible, onDismiss, alarm }: Props) {
  const { colors } = useAppTheme();
  const { t } = useTranslation('priceAlarms');
  const { t: tInv } = useTranslation('investments');
  const { t: tCommon } = useTranslation('common');
  const create = useCreatePriceAlarm();
  const update = useUpdatePriceAlarm();
  const isEdit = !!alarm;
  const pending = create.isPending || update.isPending;

  const ratesQ = useRatesQuery(visible);

  const [category, setCategory] = useState<AssetClass>('gold');
  const [assetType, setAssetType] = useState<AssetType>('goldGram');
  const [fundCode, setFundCode] = useState('');
  const [fundName, setFundName] = useState<string | null>(null);
  const [fundPrice, setFundPrice] = useState<number | null>(null);
  const [direction, setDirection] = useState<AlarmDirection>('above');
  const [threshold, setThreshold] = useState('');
  const [note, setNote] = useState('');
  const [attempted, setAttempted] = useState(false);

  const isTefas = assetType === 'tefasFund';

  useEffect(() => {
    if (!visible) return;
    const at = alarm?.assetType ?? 'goldGram';
    setCategory(classOfAsset(at));
    setAssetType(at);
    setFundCode(alarm?.fundCode ?? '');
    setFundName(alarm?.fundName ?? null);
    setFundPrice(null);
    setDirection(alarm?.direction ?? 'above');
    setThreshold(alarm ? formatAmountInput(String(alarm.thresholdPrice)) : '');
    setNote(alarm?.note ?? '');
    setAttempted(false);
  }, [visible, alarm]);

  const currentPrice = useMemo(() => {
    if (isTefas) return fundPrice;
    const row = ratesQ.data?.find((r) => r.assetType === assetType);
    return row?.sell ?? null;
  }, [ratesQ.data, assetType, isTefas, fundPrice]);

  const onPickCategory = (c: AssetClass) => {
    setCategory(c);
    setAssetType(ASSET_GROUPS[c][0]);
    setFundCode('');
    setFundName(null);
    setFundPrice(null);
  };

  const thresholdNum = parseAmount(threshold);
  const fundReady = !isTefas || (fundCode.trim().length > 0 && fundName !== null);
  const valid = Number.isFinite(thresholdNum) && thresholdNum > 0 && note.trim().length <= 200 && fundReady;

  const useCurrentPrice = () => {
    if (currentPrice != null) setThreshold(String(Math.round(currentPrice * 100) / 100));
  };

  const submit = async () => {
    if (pending) return;
    if (!valid) { setAttempted(true); toast.error(t('invalid')); return; }
    const trimmedNote = note.trim() ? note.trim() : null;
    try {
      if (isEdit) {
        await update.mutateAsync({ id: alarm.id, body: { direction, thresholdPrice: thresholdNum, note: trimmedNote } });
        toast.success(t('updated'));
      } else {
        await create.mutateAsync({ assetType, fundCode: isTefas ? fundCode.trim() : undefined, direction, thresholdPrice: thresholdNum, note: trimmedNote });
        toast.success(t('created'));
      }
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  return (
    <AppModal visible={visible} onDismiss={onDismiss} eyebrow={t('page_eyebrow')}
      title={isEdit ? t('edit_title') : t('create_title')} subtitle={isEdit ? t('edit_subtitle') : t('create_subtitle')}>
      {/* Varlık — düzenlemede kilitli */}
      <Eyebrow tone="mute" style={styles.lbl}>{t('field_asset')}</Eyebrow>
      {isEdit ? (
        <View style={[styles.assetReadonly, { borderColor: colors.line, backgroundColor: colors.bgAlt }]}>
          <View style={[styles.chipIcon, { backgroundColor: colorAlpha(ASSET_COLOR[assetType], 0.16) }]}>
            <Icon source={ASSET_ICON[assetType]} size={18} color={ASSET_COLOR[assetType]} />
          </View>
          <Body weight="bold">{isTefas ? (fundName || fundCode || tInv('asset_tefasFund')) : tInv(`asset_${assetType}`)}</Body>
        </View>
      ) : (
        <View>
          <CategoryScroller categories={CLASS_ORDER} value={category} onChange={(c) => onPickCategory(c as AssetClass)} />
          {isTefas ? (
            <View style={{ marginTop: 10 }}>
              <TefasFundPicker
                code={fundCode}
                name={fundName}
                onSelect={(c, n, p) => { setFundCode(c); setFundName(n); setFundPrice(p); }}
                error={attempted && !fundReady}
              />
            </View>
          ) : (
            <View style={[styles.assetRow, { marginTop: 10 }]}>
              {ASSET_GROUPS[category].map((a) => {
                const on = assetType === a;
                const accent = ASSET_COLOR[a];
                return (
                  <Pressable key={a} onPress={() => setAssetType(a)} accessibilityRole="button" accessibilityState={{ selected: on }}
                    style={[styles.assetChip, { borderColor: on ? accent : colors.line, backgroundColor: on ? colorAlpha(accent, 0.1) : colors.bgAlt }]}>
                    <View style={[styles.chipIcon, { backgroundColor: colorAlpha(accent, on ? 0.2 : 0.12) }]}>
                      <Icon source={ASSET_ICON[a]} size={18} color={accent} />
                    </View>
                    <Body size="xs" weight="bold" style={{ color: on ? colors.ink : colors.inkMute, marginTop: 4 }}>{tInv(`asset_short_${a}`)}</Body>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}
      {/* Güncel fiyat ipucu */}
      <View style={styles.priceHint}>
        {ratesQ.isLoading ? (
          <Body size="xs" tone="mute">{t('loading_price')}</Body>
        ) : currentPrice != null ? (
          <>
            <Body size="xs" tone="soft">{t('current_price')}: {formatCurrency(currentPrice)}</Body>
            <Pressable onPress={useCurrentPrice} accessibilityRole="button" accessibilityLabel={t('use_current')}
              style={[styles.useBtn, { backgroundColor: colorAlpha(colors.way, 0.12) }]}>
              <Body size="xs" weight="bold" style={{ color: colors.way }}>{t('use_current')}</Body>
            </Pressable>
          </>
        ) : null}
      </View>

      {/* Yön */}
      <Eyebrow tone="mute" style={styles.lbl}>{t('field_direction')}</Eyebrow>
      <View style={styles.row}>
        {DIRECTIONS.map((d) => {
          const on = direction === d;
          const isAbove = d === 'above';
          const accent = isAbove ? colors.go : colors.halt;
          return (
            <Pressable key={d} onPress={() => setDirection(d)} accessibilityRole="button" accessibilityState={{ selected: on }}
              style={[styles.dirChip, { borderColor: on ? accent : colors.line, backgroundColor: on ? colorAlpha(accent, 0.1) : 'transparent' }]}>
              <Icon source={isAbove ? 'trending-up' : 'trending-down'} size={20} color={on ? accent : colors.inkSoft} />
              <Body size="sm" weight="bold" style={{ color: on ? accent : colors.ink, marginTop: 4 }}>{t(`dir_${d}`)}</Body>
            </Pressable>
          );
        })}
      </View>

      {/* Eşik fiyat */}
      <TextInput mode="outlined" label={t('field_threshold')} value={threshold}
        onChangeText={(v) => setThreshold(formatAmountInput(v, threshold))} keyboardType="decimal-pad"
        error={attempted && !(thresholdNum > 0)} right={<TextInput.Affix text="₺" />} style={{ marginTop: 12 }} />
      <Body size="xs" tone="mute" style={{ marginTop: 6 }}>
        {t('threshold_hint', { asset: tInv(`asset_short_${assetType}`), dir: t(`dir_short_${direction}`) })}
      </Body>

      {/* Not */}
      <TextInput mode="outlined" label={t('field_note')} value={note} onChangeText={setNote} maxLength={200}
        placeholder={t('note_placeholder')} style={{ marginTop: 12 }} />

      <Button mode="contained" icon={pending ? undefined : 'check'} loading={pending} disabled={pending} onPress={submit}
        buttonColor={colors.go} textColor={colors.onAccent} style={{ borderRadius: 999, marginTop: 16 }}>
        {isEdit ? tCommon('save') : t('create_submit')}
      </Button>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  lbl: { marginTop: 14, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  assetReadonly: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  assetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  assetChip: { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, minWidth: 76 },
  chipIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dirChip: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  priceHint: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, minHeight: 22 },
  useBtn: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
});
