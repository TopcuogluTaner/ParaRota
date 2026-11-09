import { useEffect, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet, Pressable } from 'react-native';
import { Button, TextInput, HelperText, Icon } from 'react-native-paper';
import { AppDateTimePicker as DateTimePicker } from '@shared/components/AppDateTimePicker';
import { useTranslation } from 'react-i18next';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { AppModal } from '@shared/components/AppModal';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { Body, Eyebrow, Money } from '@shared/components/Typography';
import { useCreateDebt, useUpdateDebt } from '@features/debts/api/useDebts';
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import { CURRENCIES } from '@shared/constants/currencies';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { formatDate } from '@shared/lib/dateFormat';
import type { DebtDto, DebtFrequency, DebtKind, DebtStatus, PaymentMode } from '@shared/api/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  initial?: DebtDto | null;
}

const FREQS: DebtFrequency[] = ['monthly', 'weekly', 'biweekly', 'yearly'];

export function DebtFormModal({ visible, onDismiss, initial }: Props) {
  const { t } = useTranslation('debts');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const create = useCreateDebt();
  const update = useUpdateDebt(initial?.id ?? 0);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<DebtKind>('payable');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [counterpartyName, setCounterparty] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [installmentCount, setInstallmentCount] = useState('');
  const [installmentFrequency, setInstallmentFreq] = useState<DebtFrequency>('monthly');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('manual');
  const [status, setStatus] = useState<DebtStatus>('active');
  const [showStart, setShowStart] = useState(false);
  const [showDue, setShowDue] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAttempted(false);
    if (initial) {
      setTitle(initial.title);
      setDescription(initial.description ?? '');
      setKind(initial.kind);
      setAmount(formatAmountInput(String(initial.amount)));
      setCurrency(initial.currency);
      setCounterparty(initial.counterpartyName);
      setInterestRate(initial.interestRate != null ? String(initial.interestRate) : '');
      setStartDate(new Date(initial.startDate));
      setDueDate(initial.dueDate ? new Date(initial.dueDate) : null);
      setInstallmentCount(initial.installmentCount != null ? String(initial.installmentCount) : '');
      setInstallmentFreq(initial.installmentFrequency ?? 'monthly');
      setPaymentMode(initial.paymentMode);
      setStatus(initial.status);
    } else {
      setTitle('');
      setDescription('');
      setKind('payable');
      setAmount('');
      setCurrency('TRY');
      setCounterparty('');
      setInterestRate('');
      setStartDate(new Date());
      setDueDate(null);
      setInstallmentCount('');
      setInstallmentFreq('monthly');
      setPaymentMode('manual');
      setStatus('active');
    }
  }, [visible, initial]);

  const amt = parseAmount(amount);
  const intr = interestRate ? Number(interestRate) : undefined;
  const installNum = installmentCount ? Number(installmentCount) : undefined;
  const titleInvalid = !title;
  const counterpartyInvalid = !counterpartyName;
  const amtInvalid = !(Number.isFinite(amt) && amt > 0);
  const canSubmit = !titleInvalid && !counterpartyInvalid && !amtInvalid;

  // Live breakdown preview (create mode only): simple interest applied by backend.
  const showBreakdown = !initial && amt > 0 && ((intr ?? 0) > 0 || installNum != null);
  const total = Math.round(amt * (1 + (intr ?? 0) / 100) * 100) / 100;
  const perInstallment = installNum ? Math.round((total / installNum) * 100) / 100 : 0;

  const submit = async () => {
    if (!canSubmit) {
      setAttempted(true);
      toast.error(tCommon('fillRequired'));
      return;
    }
    try {
      if (initial) {
        await update.mutateAsync({
          title,
          description: description || undefined,
          counterpartyName,
          interestRate: intr,
          dueDate: dueDate ? dueDate.toISOString() : undefined,
          status,
        });
        toast.success(t('form_toastUpdated'));
      } else {
        await create.mutateAsync({
          title,
          description: description || undefined,
          kind,
          amount: amt,
          currency,
          counterpartyName,
          interestRate: intr,
          startDate: startDate.toISOString(),
          dueDate: dueDate ? dueDate.toISOString() : undefined,
          installmentCount: installNum,
          installmentFrequency: installNum ? installmentFrequency : undefined,
          paymentMode,
        });
        toast.success(t('form_toastCreated'));
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
      eyebrow={t('page_eyebrow')}
      title={initial ? t('form_modalTitle_edit') : t('form_modalTitle_create')}
      subtitle={t('form_modalSubtitle')}
    >
          <ScopeIndicator />

          {!initial ? (
            <View>
              <Body size="sm" weight="bold" style={styles.sectionLabel}>{t('form_kindLabel')}</Body>
              <View style={styles.optRow}>
                <OptCard icon="arrow-top-right" title={t('kind_payable')} active={kind === 'payable'} tone={colors.halt} onPress={() => setKind('payable')} colors={colors} />
                <OptCard icon="arrow-bottom-left" title={t('kind_receivable')} active={kind === 'receivable'} tone={colors.go} onPress={() => setKind('receivable')} colors={colors} />
              </View>
            </View>
          ) : null}

          <View>
            <TextInput mode="outlined" label={t('form_titleLabel')} placeholder={t('form_titlePlaceholder')} value={title} onChangeText={setTitle} error={attempted && titleInvalid} />
            <HelperText type="error" visible={attempted && titleInvalid}>{tCommon('required')}</HelperText>
          </View>
          <View>
            <TextInput mode="outlined" label={t('form_counterpartyLabel')} placeholder={t('form_counterpartyPlaceholder')} value={counterpartyName} onChangeText={setCounterparty} error={attempted && counterpartyInvalid} />
            <HelperText type="error" visible={attempted && counterpartyInvalid}>{tCommon('required')}</HelperText>
          </View>

          <View>
            <TextInput mode="outlined" label={t('form_amountLabel')} value={amount} onChangeText={(v) => setAmount(formatAmountInput(v, amount))} keyboardType="decimal-pad" right={<TextInput.Affix text={currency} />} disabled={!!initial} error={attempted && amtInvalid} />
            {/* Para birimi — Menu yerine pill'ler: Android'de klavye açıkken Modal
                içindeki Paper Menu konumunu sürekli yeniden ölçüp titriyordu. */}
            {!initial ? (
              <View style={[styles.pillRow, { marginTop: 8 }]}>
                {CURRENCIES.map((c) => {
                  const on = currency === c.code;
                  return (
                    <Pressable key={c.code} onPress={() => setCurrency(c.code)} style={({ pressed }) => [styles.pill, { borderColor: on ? colors.go : colors.line, backgroundColor: on ? colorAlpha(colors.go, 0.1) : 'transparent', opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                      <Body size="sm" weight={on ? 'bold' : 'medium'} style={{ color: on ? colors.go : colors.inkSoft }}>{`${c.symbol} ${c.code}`}</Body>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
            <HelperText type="error" visible={attempted && amtInvalid}>{tCommon('required')}</HelperText>
          </View>

          <TextInput mode="outlined" label={t('form_interestRateLabel')} value={interestRate} onChangeText={setInterestRate} keyboardType="decimal-pad" disabled={!!initial} />

          {showBreakdown ? (
            <View style={[styles.breakdown, { backgroundColor: colors.paper, borderColor: colors.line }]}>
              <View style={styles.breakdownRow}>
                <Eyebrow tone="mute">{t('form_totalWithInterest')}</Eyebrow>
                <View style={{ flex: 1 }} />
                <Money size="md" tone="ink">{total} {currency}</Money>
              </View>
              {installNum ? (
                <View style={styles.breakdownRow}>
                  <Body size="xs" tone="mute">{installNum} ×</Body>
                  <View style={{ flex: 1 }} />
                  <Money size="sm" tone="ink">{perInstallment} {currency}</Money>
                </View>
              ) : null}
            </View>
          ) : null}

          {!initial ? (
            <Pressable onPress={() => setShowStart(true)}>
              <View pointerEvents="none">
                <TextInput mode="outlined" label={t('form_startDateLabel')} value={formatDate(startDate)} editable={false} right={<TextInput.Icon icon="calendar-outline" />} />
              </View>
            </Pressable>
          ) : null}
          <DateTimePicker
            visible={showStart}
            value={startDate}
            mode="date"
            onConfirm={(d) => { setStartDate(d); setShowStart(false); }}
            onCancel={() => setShowStart(false)}
          />

          <Pressable onPress={() => setShowDue(true)}>
            <View pointerEvents="none">
              <TextInput mode="outlined" label={t('form_dueDateLabel')} value={dueDate ? formatDate(dueDate) : ''} editable={false} right={<TextInput.Icon icon="calendar-outline" />} />
            </View>
          </Pressable>
          <DateTimePicker
            visible={showDue}
            value={dueDate ?? new Date()}
            mode="date"
            onConfirm={(d) => { setDueDate(d); setShowDue(false); }}
            onCancel={() => setShowDue(false)}
          />

          {!initial ? (
            <>
              <View>
                <Body size="sm" weight="bold" style={styles.sectionLabel}>{t('form_paymentModeLabel')}</Body>
                <View style={styles.optRow}>
                  <OptCard icon="gesture-tap" title={t('paymentMode_manual')} desc={t('paymentMode_manual_hint')} active={paymentMode === 'manual'} tone={colors.go} onPress={() => setPaymentMode('manual')} colors={colors} />
                  <OptCard icon="autorenew" title={t('paymentMode_auto')} desc={t('paymentMode_auto_hint')} active={paymentMode === 'auto'} tone={colors.go} onPress={() => setPaymentMode('auto')} colors={colors} />
                </View>
              </View>
              <TextInput mode="outlined" label={t('form_installmentCountLabel')} value={installmentCount} onChangeText={setInstallmentCount} keyboardType="number-pad" />
              {/* Sıklık — Menu yerine pill'ler: klavye açıkken Paper Menu titreme hatası. */}
              {installmentCount ? (
                <View>
                  <Body size="sm" weight="bold" style={styles.sectionLabel}>{t('form_installmentFrequencyLabel')}</Body>
                  <View style={styles.pillRow}>
                    {FREQS.map((f) => {
                      const on = installmentFrequency === f;
                      return (
                        <Pressable key={f} onPress={() => setInstallmentFreq(f)} style={({ pressed }) => [styles.pill, { paddingHorizontal: 4, borderColor: on ? colors.go : colors.line, backgroundColor: on ? colorAlpha(colors.go, 0.1) : 'transparent', opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                          <Body size="sm" weight={on ? 'bold' : 'medium'} numberOfLines={1} style={{ color: on ? colors.go : colors.inkSoft }}>{t(`freq_${f}` as any)}</Body>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
            </>
          ) : null}

          {initial ? (
            <View>
              <Body size="sm" weight="bold" style={styles.sectionLabel}>{t('form_statusLabel')}</Body>
              <View style={styles.pillRow}>
                {([
                  { value: 'active' as DebtStatus, label: t('status_active'), tone: colors.go },
                  { value: 'completed' as DebtStatus, label: t('status_completed'), tone: colors.sky },
                  { value: 'cancelled' as DebtStatus, label: t('status_cancelled'), tone: colors.inkMute },
                ]).map((o) => {
                  const on = status === o.value;
                  return (
                    <Pressable key={o.value} onPress={() => setStatus(o.value)} style={({ pressed }) => [styles.pill, { borderColor: on ? o.tone : colors.line, backgroundColor: on ? colorAlpha(o.tone, 0.12) : 'transparent', opacity: pressed ? 0.7 : 1 }]} accessibilityRole="button" accessibilityState={{ selected: on }}>
                      <View style={[styles.pillDot, { backgroundColor: o.tone, opacity: on ? 1 : 0.4 }]} />
                      <Body size="sm" weight={on ? 'bold' : 'medium'} style={{ color: on ? o.tone : colors.inkSoft }}>{o.label}</Body>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <TextInput mode="outlined" label={t('form_descriptionLabel')} value={description} onChangeText={setDescription} multiline numberOfLines={2} />

          <Button
            mode="contained"
            icon={busy ? undefined : (initial ? 'content-save-outline' : 'plus')}
            loading={busy}
            disabled={busy}
            onPress={submit}
            buttonColor={colors.go}
            textColor={colors.onAccent}
            style={{ borderRadius: 999, marginTop: 14 }}
            contentStyle={{ paddingVertical: 6 }}
          >
            {initial ? t('form_submit_edit') : t('form_submit_create')}
          </Button>
    </AppModal>
  );
}

interface OptCardProps {
  icon: string;
  title: string;
  desc?: string;
  active: boolean;
  tone: string;
  onPress: () => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
}

// Açıklamalı seçim kartı (tip / ödeme yönetimi): ikon + başlık + opsiyonel açıklama.
function OptCard({ icon, title, desc, active, tone, onPress, colors }: OptCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.optCard, { borderColor: active ? tone : colors.line, backgroundColor: active ? colorAlpha(tone, 0.1) : 'transparent', opacity: pressed ? 0.75 : 1 }]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Icon source={icon} size={20} color={active ? tone : colors.inkSoft} />
      <Body size="sm" weight="bold" style={{ color: active ? tone : colors.ink, marginTop: 6, textAlign: 'center' }}>{title}</Body>
      {desc ? <Body size="xs" tone="mute" style={styles.optDesc} numberOfLines={3}>{desc}</Body> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  breakdown: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12, gap: 6 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center' },
  sectionLabel: { marginBottom: 8 },
  optRow: { flexDirection: 'row', gap: 8 },
  optCard: { flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth },
  optDesc: { textAlign: 'center', marginTop: 4, lineHeight: 15 },
  pillRow: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  pillDot: { width: 7, height: 7, borderRadius: 999 },
});
