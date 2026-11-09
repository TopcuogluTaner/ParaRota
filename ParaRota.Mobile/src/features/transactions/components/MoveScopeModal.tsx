import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Button, Menu, TouchableRipple } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { AppModal } from '@shared/components/AppModal';
import { Body } from '@shared/components/Typography';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { useMyHouseholdsQuery } from '@features/household/api/useHouseholds';
import { useCategoriesForScopeQuery } from '@features/categories/api/useCategories';
import { useMoveTransactionScope } from '@features/transactions/api/useTransactions';
import type { TransactionDto } from '@shared/api/types';

interface Props {
  visible: boolean;
  tx: TransactionDto | null;
  onDismiss: () => void;
}

export function MoveScopeModal({ visible, tx, onDismiss }: Props) {
  const { t } = useTranslation('household');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const move = useMoveTransactionScope();
  const { data: households } = useMyHouseholdsQuery();

  const isPersonalRecord = tx?.householdId == null;
  const [targetHouseholdId, setTargetHouseholdId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(tx?.categoryId ?? null);
  const [catMenu, setCatMenu] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!visible || !tx) return;
    setTargetHouseholdId(isPersonalRecord ? (households?.[0]?.id ?? null) : null);
    setAttempted(false);
  }, [visible, tx, isPersonalRecord, households]);

  const targetScopeId = isPersonalRecord ? targetHouseholdId : null;
  const { data: targetCategories } = useCategoriesForScopeQuery(
    targetScopeId,
    visible && (!isPersonalRecord || targetHouseholdId != null),
  );

  const eligible = useMemo(
    () => (targetCategories ?? []).filter((c) => c.type === tx?.type),
    [targetCategories, tx?.type],
  );

  useEffect(() => {
    if (!tx || eligible.length === 0) return;
    const stillValid = eligible.some((c) => c.id === tx.categoryId);
    setCategoryId(stillValid ? tx.categoryId : eligible[0].id);
  }, [eligible, tx]);

  if (!tx) return null;

  const noFamily = isPersonalRecord && (households?.length ?? 0) === 0;
  // Yapısal engel: aile yok ya da hedef kapsamda uygun kategori yok — buton disabled kalır.
  const structurallyBlocked =
    noFamily || eligible.length === 0 || (isPersonalRecord && targetHouseholdId == null);
  const categoryInvalid = categoryId == null;
  const selectedCat = eligible.find((c) => c.id === categoryId);

  const submit = async () => {
    if (structurallyBlocked) return;
    if (categoryInvalid || categoryId == null) {
      setAttempted(true);
      toast.error(tCommon('fillRequired'));
      return;
    }
    try {
      await move.mutateAsync({
        id: tx.id,
        body: { targetHouseholdId: isPersonalRecord ? targetHouseholdId : null, categoryId },
      });
      toast.success(t('move_toastSuccess'));
      onDismiss();
    } catch (err) {
      toast.error(getErrorMessage(err, tCommon('errorGeneric')));
    }
  };

  return (
    <AppModal
      visible={visible}
      onDismiss={onDismiss}
      eyebrow={t('move_action')}
      title={t('move_modalTitle')}
      subtitle={isPersonalRecord ? t('move_toFamily') : t('move_toPersonal')}
    >
          {noFamily ? (
            <Body size="sm" tone="soft">{t('move_noFamily')}</Body>
          ) : (
            <>
              <Body size="sm" weight="bold">{t('move_selectCategory')}</Body>
              <Menu
                visible={catMenu}
                onDismiss={() => setCatMenu(false)}
                anchor={
                  <TouchableRipple
                    onPress={() => setCatMenu(true)}
                    style={[
                      styles.select,
                      {
                        borderColor: attempted && categoryInvalid ? colors.halt : colors.line,
                        backgroundColor: colors.paper,
                      },
                    ]}
                  >
                    <Body>{selectedCat?.name ?? '—'}</Body>
                  </TouchableRipple>
                }
                contentStyle={{ backgroundColor: colors.paper }}
              >
                {/* Çok kategoride ekrana sığması için sınırlı, kaydırılabilir liste. */}
                <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                  {eligible.map((c) => (
                    <Menu.Item
                      key={c.id}
                      onPress={() => { setCategoryId(c.id); setCatMenu(false); }}
                      title={c.name}
                      leadingIcon={c.id === categoryId ? 'check' : undefined}
                    />
                  ))}
                </ScrollView>
              </Menu>
              {eligible.length === 0 && (
                <Body size="xs" tone="mute">{t('move_noCategory')}</Body>
              )}
              {attempted && categoryInvalid && (
                <Body size="xs" style={{ color: colors.halt }}>{tCommon('required')}</Body>
              )}
            </>
          )}

          <Button
            mode="contained"
            loading={move.isPending}
            disabled={move.isPending || structurallyBlocked}
            onPress={submit}
            buttonColor={colors.go}
            textColor={colors.onAccent}
            style={{ marginTop: 8 }}
          >
            {t('move_action')}
          </Button>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  select: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
});
