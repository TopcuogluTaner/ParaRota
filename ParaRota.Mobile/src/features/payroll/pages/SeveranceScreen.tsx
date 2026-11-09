import { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Keyboard, Pressable } from 'react-native';
import { TextInput, Button, ActivityIndicator, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { AppHeader } from '@shared/components/AppHeader';
import { Screen } from '@shared/components/Screen';
import { RouteCard } from '@shared/components/RouteCard';
import { AppDateTimePicker } from '@shared/components/AppDateTimePicker';
import { Body, Eyebrow, Money } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import { formatCurrency, formatDate, dayjs } from '@shared/lib/dateFormat';
import { useMoneyFmt } from '@shared/lib/maskMoney';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useSeveranceQuery } from '@features/payroll/api/usePayroll';
import { useRecurringRulesQuery } from '@features/recurring/api/useRecurringRules';

/**
 * Kıdem & İhbar Tazminatı — SADE anlatım sözleşmesi:
 * sonuç tek kahraman rakamla başlar ("işten çıkarılırsan eline geçecek"),
 * hemen altında istifa/çıkarılma ayrımı uyarısı; her kalemin altında bir
 * cümlelik düz-dil açıklama. Teknik detay (brüt/damga/tavan) ikincil satırlarda.
 */
export function SeveranceScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { t } = useTranslation('payroll');
  const fmt = useMoneyFmt();

  // Maaş otomatiği kuruluysa brütü oradan öner (tek sefer tohumlanır).
  const rulesQuery = useRecurringRulesQuery(true);
  const salaryGross = (rulesQuery.data ?? []).find((r) => r.payrollGrossMonthly != null)?.payrollGrossMonthly;

  const [hireDate, setHireDate] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [grossInput, setGrossInput] = useState('');
  const [vacationInput, setVacationInput] = useState('');
  const [params, setParams] = useState<{ hire: string; gross: number; vacation: number } | null>(null);

  const { data, isFetching, error } = useSeveranceQuery(params?.hire ?? null, params?.gross ?? 0, params?.vacation ?? 0);

  const seededRef = useRef(false);
  useEffect(() => {
    if (!seededRef.current && !grossInput && salaryGross) {
      seededRef.current = true;
      setGrossInput(formatAmountInput(String(salaryGross)));
    }
  }, [salaryGross, grossInput]);
  const grossIsSeeded = !!salaryGross && grossInput === formatAmountInput(String(salaryGross));

  const compute = () => {
    Keyboard.dismiss();
    const g = parseAmount(grossInput);
    const v = parseInt(vacationInput, 10);
    if (!hireDate || !Number.isFinite(g) || g <= 0) return;
    setParams({
      hire: dayjs(hireDate).format('YYYY-MM-DD'),
      gross: g,
      vacation: Number.isFinite(v) && v > 0 ? v : 0,
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader eyebrow={t('severance.eyebrow')} title={t('severance.title')} back onBack={() => router.navigate('/(app)/calculators')} />
      <Screen edges={['bottom']} contentStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 }}>
        <Body size="sm" tone="soft" style={{ marginBottom: 14 }}>
          {t('severance.intro')}
        </Body>

        {/* Girdiler */}
        <RouteCard icon="briefcase-clock-outline" iconTone={colors.go} divider={false}>
          <Pressable
            onPress={() => setShowPicker(true)}
            accessibilityRole="button"
            accessibilityLabel={t('severance.hireDate')}
            style={[styles.dateField, { borderColor: colors.line }]}
          >
            <Icon source="calendar-start" size={18} color={colors.inkSoft} />
            <Body size="md" tone={hireDate ? 'ink' : 'mute'} style={{ flex: 1 }}>
              {hireDate ? formatDate(hireDate) : t('severance.hireDatePlaceholder')}
            </Body>
          </Pressable>

          <TextInput
            mode="outlined"
            label={t('severance.grossLabel')}
            value={grossInput}
            onChangeText={(v) => setGrossInput(formatAmountInput(v))}
            keyboardType="decimal-pad"
            left={<TextInput.Icon icon="cash" />}
            style={{ marginTop: 10 }}
          />
          {grossIsSeeded ? (
            <Body size="xs" tone="mute" style={{ marginTop: 4 }}>{t('severance.grossFromSalary')}</Body>
          ) : null}

          <TextInput
            mode="outlined"
            label={t('severance.vacationLabel')}
            value={vacationInput}
            onChangeText={(v) => {
              const digits = v.replace(/[^0-9]/g, '');
              const n = parseInt(digits, 10);
              setVacationInput(Number.isFinite(n) && n > 366 ? '366' : digits);
            }}
            keyboardType="number-pad"
            left={<TextInput.Icon icon="beach" />}
            style={{ marginTop: 10 }}
          />
          <Body size="xs" tone="mute" style={{ marginTop: 4 }}>{t('severance.vacationHelp')}</Body>

          <Button
            mode="contained"
            onPress={compute}
            disabled={!hireDate || parseAmount(grossInput) <= 0 || isFetching}
            buttonColor={colors.go}
            textColor={colors.onAccent}
            style={{ marginTop: 14, borderRadius: 12 }}
            contentStyle={{ height: 46 }}
          >
            {isFetching ? <ActivityIndicator size={18} color={colors.onAccent} /> : t('severance.compute')}
          </Button>
        </RouteCard>

        {error ? (
          <View style={[styles.noteBox, { backgroundColor: colorAlpha(colors.way, 0.1), marginTop: 14 }]}>
            <Icon source="alert-circle-outline" size={16} color={colors.way} />
            <Body size="xs" style={{ color: colors.way, flex: 1 }}>{getErrorMessage(error, t('severance.computeError'))}</Body>
          </View>
        ) : null}

        {data ? (
          <>
            {/* 1) KAHRAMAN: toplam + istifa/çıkarılma ayrımı */}
            <View style={{ height: 14 }} />
            <RouteCard eyebrow={t('severance.heroEyebrow')} title={t('severance.heroTitle')} icon="hand-coin-outline" iconTone={colors.go}>
              <Money size="xl" numberOfLines={1} style={{ color: colors.go }}>
                {formatCurrency(data.totalEstimated)}
              </Money>
              <Body size="xs" tone="mute" style={{ marginTop: 4 }}>
                {t('severance.serviceLine', { years: data.serviceYears, months: data.serviceMonths, days: data.serviceDays })}
              </Body>
              <View style={[styles.noteBox, { backgroundColor: colorAlpha(colors.sky, 0.08) }]}>
                <Icon source="information-outline" size={16} color={colors.sky} />
                <Body size="xs" tone="soft" style={{ flex: 1 }}>{t('severance.heroNote')}</Body>
              </View>
            </RouteCard>

            {/* 2) Kıdem — düz dil açıklama + net + ikincil detaylar */}
            <View style={{ height: 14 }} />
            <RouteCard eyebrow={t('severance.sevTitle')} title={fmt(data.severanceNet)} icon="shield-check-outline" iconTone={colors.go}>
              <Body size="sm" tone="soft">{t('severance.sevExplain')}</Body>
              {data.eligibleForSeverance ? (
                <View style={[styles.detailRows, { borderTopColor: colors.line }]}>
                  <Eyebrow tone="mute">{t('severance.sevNet')}</Eyebrow>
                  <DetailRow label={t('severance.sevGrossRow')} value={fmt(data.severanceGross)} />
                  <DetailRow label={t('severance.sevStampRow')} value={`−${fmt(data.severanceStamp)}`} />
                  {data.ceilingApplied ? (
                    <View style={[styles.noteBox, { backgroundColor: colorAlpha(colors.way, 0.1) }]}>
                      <Icon source="arrow-collapse-up" size={16} color={colors.way} />
                      <Body size="xs" style={{ color: colors.way, flex: 1 }}>
                        {t('severance.ceilingApplied', { ceiling: fmt(data.severanceCeiling) })}
                      </Body>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={[styles.noteBox, { backgroundColor: colorAlpha(colors.way, 0.1) }]}>
                  <Icon source="clock-alert-outline" size={16} color={colors.way} />
                  <Body size="xs" style={{ color: colors.way, flex: 1 }}>{t('severance.notEligible')}</Body>
                </View>
              )}
            </RouteCard>

            {/* 3) İhbar */}
            <View style={{ height: 14 }} />
            <RouteCard eyebrow={t('severance.noticeTitle')} title={fmt(data.noticeGross)} icon="bell-ring-outline" iconTone={colors.sky}>
              <Body size="sm" tone="soft">{t('severance.noticeExplain', { weeks: data.noticeWeeks })}</Body>
            </RouteCard>

            {/* 4) İzin (girildiyse) */}
            {data.vacationGross > 0 ? (
              <>
                <View style={{ height: 14 }} />
                <RouteCard eyebrow={t('severance.vacationTitle')} title={fmt(data.vacationGross)} icon="beach" iconTone={colors.sky}>
                  <Body size="sm" tone="soft">
                    {t('severance.vacationExplain', { days: params?.vacation ?? 0 })}
                  </Body>
                </RouteCard>
              </>
            ) : null}

            <Body size="xs" tone="mute" style={{ marginTop: 14 }}>
              {t('severance.taxNote')} {t('severance.disclaimer')}
            </Body>
          </>
        ) : null}

        <AppDateTimePicker
          visible={showPicker}
          value={hireDate ?? new Date(new Date().getFullYear() - 1, 0, 1, 12, 0, 0)}
          mode="date"
          onConfirm={(d) => { setShowPicker(false); setHireDate(d); }}
          onCancel={() => setShowPicker(false)}
        />
      </Screen>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Body size="sm" tone="soft" style={{ flexShrink: 1 }}>{label}</Body>
      <Money size="sm">{value}</Money>
    </View>
  );
}

const styles = StyleSheet.create({
  dateField: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 14,
  },
  detailRows: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 12, paddingTop: 10, gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  noteBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: 10, marginTop: 10 },
});
