import { useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, StyleSheet } from 'react-native';
import { Button, TextInput, RadioButton, Card, HelperText } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { AppModal } from '@shared/components/AppModal';
import { Body } from '@shared/components/Typography';
import { useCreateHousehold } from '@features/household/api/useHouseholds';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { HouseholdTransferMode } from '@shared/api/types';
import type { HouseholdTransferMode as HouseholdTransferModeType } from '@shared/api/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

export function CreateHouseholdModal({ visible, onDismiss }: Props) {
  const { t } = useTranslation('household');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const create = useCreateHousehold();
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('TRY');
  const [mode, setMode] = useState<HouseholdTransferModeType>(HouseholdTransferMode.None);
  const [attempted, setAttempted] = useState(false);

  const nameError = !name.trim();

  const submit = async () => {
    if (nameError) {
      setAttempted(true);
      toast.error(tCommon('fillRequired'));
      return;
    }
    try {
      await create.mutateAsync({ name, currency, transferMode: mode });
      toast.success(t('create_toastSuccess'));
      setName('');
      setMode(HouseholdTransferMode.None);
      setAttempted(false);
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  const options = [
    { value: HouseholdTransferMode.None, title: t('create_transferOption_none'), desc: t('create_transferHint_none') },
    { value: HouseholdTransferMode.Move, title: t('create_transferOption_move'), desc: t('create_transferHint_move') },
  ];

  return (
    <AppModal
      visible={visible}
      onDismiss={onDismiss}
      eyebrow={t('page_eyebrow')}
      title={t('create_modalTitle')}
      subtitle={t('create_modalSubtitle')}
    >
          <View>
            <TextInput mode="outlined" label={t('create_nameLabel')} placeholder={t('create_namePlaceholder')} value={name} onChangeText={setName} error={attempted && nameError} />
            <HelperText type="error" visible={attempted && nameError}>{tCommon('required')}</HelperText>
          </View>
          <TextInput mode="outlined" label={tCommon('currency', { defaultValue: 'Para birimi' })} value={currency} onChangeText={setCurrency} autoCapitalize="characters" maxLength={3} />

          <Body size="sm" weight="bold" style={{ marginTop: 8 }}>{t('create_transferQuestion')}</Body>
          <RadioButton.Group onValueChange={(v) => setMode(Number(v) as HouseholdTransferModeType)} value={String(mode)}>
            {options.map((opt) => {
              const selected = mode === opt.value;
              return (
                <Card
                  key={opt.value}
                  onPress={() => setMode(opt.value)}
                  mode={selected ? 'elevated' : 'outlined'}
                  style={[styles.optCard, selected ? { borderColor: colors.go, borderWidth: 1.5 } : { borderColor: colors.line }]}
                >
                  <Card.Content style={styles.optRow}>
                    <RadioButton value={String(opt.value)} onPress={() => setMode(opt.value)} color={colors.go} />
                    <View style={{ flex: 1 }}>
                      <Body weight="bold">{opt.title}</Body>
                      <Body size="xs" tone="soft" style={{ marginTop: 2 }}>{opt.desc}</Body>
                    </View>
                  </Card.Content>
                </Card>
              );
            })}
          </RadioButton.Group>

          <Button mode="contained" loading={create.isPending} disabled={create.isPending} onPress={submit} buttonColor={colors.go} textColor={colors.onAccent}>
            {t('create_submit')}
          </Button>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  optCard: { marginVertical: 4 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
