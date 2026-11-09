import { useEffect, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable, Keyboard } from 'react-native';
import { Button, TextInput, SegmentedButtons, HelperText, Switch, Icon } from 'react-native-paper';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { AppDateTimePicker as DateTimePicker } from '@shared/components/AppDateTimePicker';
import { useTranslation } from 'react-i18next';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { AppModal } from '@shared/components/AppModal';
import { Body, Eyebrow } from '@shared/components/Typography';
import { parseAmount } from '@shared/lib/parseAmount';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { formatDate } from '@shared/lib/dateFormat';
import { useCreateHolding, useUpdateHolding } from '@features/investments/api/useInvestments';
import { TefasFundPicker } from './TefasFundPicker';
import { CategoryScroller } from './CategoryScroller';
import type { AssetType, HoldingDto } from '@shared/api/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  initial?: HoldingDto | null;
}

type EntryMode = 'amount' | 'quantity';

type AssetCat = 'gold' | 'currency' | 'crypto' | 'stock' | 'tefasFund';

const ASSET_GROUPS: Record<AssetCat, AssetType[]> = {
  gold: ['goldGram', 'goldQuarter', 'goldHalf', 'goldFull', 'goldRepublic'],
  currency: ['usd', 'eur', 'gbp', 'chf', 'jpy', 'cad', 'aud', 'sar'],
  crypto: ['btc', 'eth', 'usdt', 'bnb', 'sol', 'xrp', 'ada', 'doge', 'trx', 'avax', 'dot', 'link'],
  stock: ['thyao', 'garan', 'akbnk', 'asels', 'kchol', 'sise', 'eregl', 'bimas', 'tuprs', 'sahol', 'froto', 'tcell'],
  tefasFund: ['tefasFund'],
};
const CAT_ORDER: AssetCat[] = ['gold', 'currency', 'crypto', 'stock', 'tefasFund'];

function catOf(asset: AssetType): AssetCat {
  return (Object.keys(ASSET_GROUPS) as AssetCat[]).find((c) => ASSET_GROUPS[c].includes(asset)) ?? 'gold';
}

const ASSET_ICON: Record<AssetType, string> = {
  goldGram: 'gold',
  goldQuarter: 'gold',
  goldHalf: 'gold',
  goldFull: 'gold',
  goldRepublic: 'gold',
  usd: 'currency-usd',
  cad: 'currency-usd',
  aud: 'currency-usd',
  eur: 'currency-eur',
  gbp: 'currency-gbp',
  jpy: 'currency-jpy',
  chf: 'cash',
  sar: 'cash',
  btc: 'bitcoin',
  eth: 'ethereum',
  usdt: 'hexagon-multiple',
  bnb: 'hexagon-multiple',
  sol: 'hexagon-multiple',
  xrp: 'hexagon-multiple',
  ada: 'hexagon-multiple',
  doge: 'hexagon-multiple',
  trx: 'hexagon-multiple',
  avax: 'hexagon-multiple',
  dot: 'hexagon-multiple',
  link: 'hexagon-multiple',
  thyao: 'chart-line',
  garan: 'chart-line',
  akbnk: 'chart-line',
  asels: 'chart-line',
  kchol: 'chart-line',
  sise: 'chart-line',
  eregl: 'chart-line',
  bimas: 'chart-line',
  tuprs: 'chart-line',
  sahol: 'chart-line',
  froto: 'chart-line',
  tcell: 'chart-line',
  tefasFund: 'chart-box-outline',
};

// Dashboard donut paletiyle uyumlu varlık aksanları.
const ASSET_COLOR: Record<AssetType, string> = {
  goldGram: '#C99846',
  goldQuarter: '#C99846',
  goldHalf: '#C99846',
  goldFull: '#C99846',
  goldRepublic: '#C99846',
  usd: '#5B8A72',
  eur: '#4A6D8C',
  gbp: '#7E6C97',
  chf: '#B05F47',
  jpy: '#9C5A8A',
  cad: '#6E8B3D',
  aud: '#3D7E8C',
  sar: '#8A7240',
  btc: '#E8A33D',
  eth: '#6E7BB8',
  usdt: '#7E6C97',
  bnb: '#7E6C97',
  sol: '#7E6C97',
  xrp: '#7E6C97',
  ada: '#7E6C97',
  doge: '#7E6C97',
  trx: '#7E6C97',
  avax: '#7E6C97',
  dot: '#7E6C97',
  link: '#7E6C97',
  thyao: '#3D7E8C',
  garan: '#3D7E8C',
  akbnk: '#3D7E8C',
  asels: '#3D7E8C',
  kchol: '#3D7E8C',
  sise: '#3D7E8C',
  eregl: '#3D7E8C',
  bimas: '#3D7E8C',
  tuprs: '#3D7E8C',
  sahol: '#3D7E8C',
  froto: '#3D7E8C',
  tcell: '#3D7E8C',
  tefasFund: '#A0566E',
};

export function AddHoldingModal({ visible, onDismiss, initial }: Props) {
  const { t } = useTranslation('investments');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const create = useCreateHolding();
  const update = useUpdateHolding(initial?.id ?? 0);

  const [assetType, setAssetType] = useState<AssetType>('goldGram');
  const [category, setCategory] = useState<AssetCat>('gold');
  const [fundCode, setFundCode] = useState('');
  const [fundName, setFundName] = useState<string | null>(null);
  const [purchaseDate, setPurchaseDate] = useState(new Date());
  const [showDate, setShowDate] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>('amount');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [linkToCashFlow, setLinkToCashFlow] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAttempted(false);
    if (initial) {
      setAssetType(initial.assetType);
      setCategory(catOf(initial.assetType));
      setFundCode(initial.fundCode ?? '');
      setFundName(initial.fundName ?? null);
      setPurchaseDate(new Date(initial.purchaseDate));
      setEntryMode('quantity');
      setAmount(String(initial.investedAmount));
      setQuantity(String(initial.quantity));
      setNote(initial.note ?? '');
      setLinkToCashFlow(false);
    } else {
      setAssetType('goldGram');
      setCategory('gold');
      setFundCode('');
      setFundName(null);
      setPurchaseDate(new Date());
      setEntryMode('amount');
      setAmount('');
      setQuantity('');
      setNote('');
      setLinkToCashFlow(true); // varsayılan AÇIK — alım hesaptan gider olarak düşülsün
    }
  }, [visible, initial]);

  const isTefas = assetType === 'tefasFund';

  const onPickCategory = (c: AssetCat) => {
    setCategory(c);
    setAssetType(ASSET_GROUPS[c][0]);
    setFundCode('');
    setFundName(null);
  };

  const amountNum = parseAmount(amount);
  const quantityNum = parseAmount(quantity);
  const valueInvalid =
    entryMode === 'amount'
      ? !(Number.isFinite(amountNum) && amountNum > 0)
      : !(Number.isFinite(quantityNum) && quantityNum > 0);
  const fundReady = !isTefas || (fundCode.trim().length > 0 && fundName !== null);

  const isGoldGram = assetType === 'goldGram';
  const isGoldCoin = assetType === 'goldQuarter' || assetType === 'goldHalf' || assetType === 'goldFull' || assetType === 'goldRepublic';
  const quantityHint = isGoldGram ? t('unit_gram') : isGoldCoin ? t('unit_piece') : t('unit_unit');
  // Miktar birimi varlığa göre: gram altın→Gram, döviz→Birim, diğer (çeyrek altın/kripto/hisse)→Adet.
  const qtyWord = isGoldGram ? t('qty_gram') : category === 'currency' ? t('qty_unit') : t('qty_piece');

  const submit = async () => {
    if (valueInvalid || !fundReady) {
      setAttempted(true);
      toast.error(tCommon('fillRequired'));
      return;
    }
    const investedAmount = entryMode === 'amount' ? amountNum : undefined;
    const qty = entryMode === 'quantity' ? quantityNum : undefined;
    try {
      if (initial) {
        await update.mutateAsync({
          purchaseDate: purchaseDate.toISOString(),
          investedAmount,
          quantity: qty,
          note: note.trim() || undefined,
        });
        toast.success(t('toast_update'));
      } else {
        await create.mutateAsync({
          assetType,
          fundCode: isTefas ? fundCode.trim() : undefined,
          purchaseDate: purchaseDate.toISOString(),
          investedAmount,
          quantity: qty,
          linkToCashFlow,
          note: note.trim() || undefined,
        });
        toast.success(t('toast_create'));
      }
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  const busy = create.isPending || update.isPending;

  return (
    <AppModal
      visible={visible}
      onDismiss={onDismiss}
      eyebrow={t('eyebrow')}
      title={initial ? t('modalEditTitle') : t('modalCreateTitle')}
      subtitle={initial ? t('modalEditSubtitle') : t('modalCreateSubtitle')}
    >
      {!initial ? <ScopeIndicator /> : null}

      <View>
        <Eyebrow tone="mute" style={{ marginBottom: 8 }}>{t('form_asset')}</Eyebrow>
        {initial ? (
          <View style={styles.assetReadonly}>
            <View style={[styles.assetChipIcon, { backgroundColor: colorAlpha(ASSET_COLOR[assetType], 0.16) }]}>
              <Icon source={ASSET_ICON[assetType]} size={18} color={ASSET_COLOR[assetType]} />
            </View>
            <Body weight="bold">{isTefas ? (fundName || fundCode || t('asset_tefasFund')) : t(`asset_${assetType}`)}</Body>
          </View>
        ) : (
          <View>
            <CategoryScroller categories={CAT_ORDER} value={category} onChange={(c) => onPickCategory(c as AssetCat)} />
            {isTefas ? (
              <View style={{ marginTop: 10 }}>
                <TefasFundPicker
                  code={fundCode}
                  name={fundName}
                  onSelect={(c, n) => { setFundCode(c); setFundName(n); }}
                  error={attempted && !fundReady}
                />
              </View>
            ) : (
              <View style={[styles.assetRow, { marginTop: 10 }]}>
                {ASSET_GROUPS[category].map((a) => {
                  const on = assetType === a;
                  const accent = ASSET_COLOR[a];
                  return (
                    <Pressable
                      key={a}
                      onPress={() => setAssetType(a)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={[
                        styles.assetChip,
                        { borderColor: on ? accent : colors.line, backgroundColor: on ? colorAlpha(accent, 0.1) : colors.bgAlt },
                      ]}
                    >
                      <View style={[styles.assetChipIcon, { backgroundColor: colorAlpha(accent, on ? 0.2 : 0.12) }]}>
                        <Icon source={ASSET_ICON[a]} size={18} color={accent} />
                      </View>
                      <Body size="xs" weight="bold" style={{ color: on ? colors.ink : colors.inkMute, marginTop: 4 }}>
                        {t(`asset_short_${a}`)}
                      </Body>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </View>

      <Pressable onPress={() => { Keyboard.dismiss(); setShowDate(true); }}>
        <View pointerEvents="none">
          <TextInput
            mode="outlined"
            label={t('form_purchaseDate')}
            value={formatDate(purchaseDate)}
            editable={false}
            right={<TextInput.Icon icon="calendar-outline" />}
          />
        </View>
      </Pressable>
      <DateTimePicker
        visible={showDate}
        value={purchaseDate}
        mode="date"
        onConfirm={(d) => { setPurchaseDate(d); setShowDate(false); }}
        onCancel={() => setShowDate(false)}
      />

      <View>
        <Eyebrow tone="mute" style={{ marginBottom: 8 }}>{t('form_entryMode')}</Eyebrow>
        <SegmentedButtons
          value={entryMode}
          onValueChange={(v) => setEntryMode(v as EntryMode)}
          buttons={[
            { value: 'amount', label: t('entry_amount'), icon: 'cash' },
            { value: 'quantity', label: qtyWord, icon: 'scale-balance' },
          ]}
        />
        <Eyebrow tone="mute" style={{ marginTop: 6 }}>{t('entry_hint')}</Eyebrow>
      </View>

      {entryMode === 'amount' ? (
        <View>
          <TextInput mode="outlined" label={t('form_amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" left={<TextInput.Affix text="₺" />} error={attempted && valueInvalid} contentStyle={{ fontSize: 18, fontWeight: '700' }} />
          <HelperText type="error" visible={attempted && valueInvalid}>{tCommon('required')}</HelperText>
        </View>
      ) : (
        <View>
          <TextInput mode="outlined" label={qtyWord} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" error={attempted && valueInvalid} contentStyle={{ fontSize: 18, fontWeight: '700' }} />
          <HelperText type={attempted && valueInvalid ? 'error' : 'info'} visible>
            {attempted && valueInvalid ? tCommon('required') : quantityHint}
          </HelperText>
        </View>
      )}

      <TextInput mode="outlined" label={t('form_note')} value={note} onChangeText={setNote} maxLength={280} />

      {!initial ? (
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
          <View style={[styles.linkIcon, { backgroundColor: colorAlpha(colors.halt, 0.14) }]}>
            <Icon source="cash-minus" size={20} color={colors.halt} />
          </View>
          <View style={{ flex: 1 }}>
            <Body weight="bold">{t('form_linkCashFlow')}</Body>
            <Eyebrow tone="mute" style={{ marginTop: 2 }}>{t('form_linkCashFlowHint')}</Eyebrow>
          </View>
          {/* Sadece görsel — dokunuş kartın Pressable'ında (çift toggle olmasın). */}
          <View pointerEvents="none">
            <Switch value={linkToCashFlow} color={colors.go} />
          </View>
        </Pressable>
      ) : null}

      <Button mode="contained" loading={busy} disabled={busy} onPress={submit} buttonColor={colors.go} textColor={colors.onAccent}>
        {initial ? tCommon('save') : tCommon('add')}
      </Button>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  assetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  assetChip: {
    flexBasis: '22%',
    flexGrow: 1,
    minWidth: 64,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  assetChipIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  assetReadonly: { flexDirection: 'row', alignItems: 'center', gap: 10 },
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
