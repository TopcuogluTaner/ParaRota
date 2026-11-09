import { useEffect, useState } from 'react';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { View, Pressable, ScrollView, Keyboard } from 'react-native';
import { Button, TextInput, Menu, HelperText, Divider } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { ScopeIndicator } from '@shared/components/ScopeIndicator';
import { AppModal } from '@shared/components/AppModal';
import { Body } from '@shared/components/Typography';
import { useCategoriesQuery } from '@features/categories/api/useCategories';
import { CategoryFormModal } from '@features/categories/components/CategoryFormModal';
import { useCreateBudget, useUpdateBudget } from '@features/budgets/api/useBudgets';
import { formatAmountInput, parseAmount } from '@shared/lib/parseAmount';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { normalizeIconName } from '@shared/lib/iconName';
import type { BudgetDto } from '@shared/api/types';

interface Props {
  visible: boolean;
  onDismiss: () => void;
  initial?: BudgetDto | null;
  month: number;
  year: number;
}

export function BudgetFormModal({ visible, onDismiss, initial, month, year }: Props) {
  const { t } = useTranslation('pages');
  const { t: tCommon } = useTranslation('common');
  const { colors } = useAppTheme();
  const create = useCreateBudget();
  const update = useUpdateBudget(initial?.id ?? 0);
  const cats = useCategoriesQuery();

  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [limit, setLimit] = useState('');
  const [warnPct, setWarnPct] = useState('80');
  const [catMenu, setCatMenu] = useState(false);
  const [catFormOpen, setCatFormOpen] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setAttempted(false);
    if (initial) {
      setCategoryId(initial.categoryId);
      setLimit(formatAmountInput(String(initial.monthlyLimit)));
      setWarnPct(String(initial.warnThreshold));
    } else {
      setCategoryId(null);
      setLimit('');
      setWarnPct('80');
    }
  }, [visible, initial]);

  const expenseCats = (cats.data ?? []).filter((c) => c.type === 'expense');
  const activeCat = expenseCats.find((c) => c.id === categoryId);
  const limitNum = parseAmount(limit);
  const warnNum = Number(warnPct);
  const categoryInvalid = !categoryId;
  const limitInvalid = !(Number.isFinite(limitNum) && limitNum > 0);
  const warnInvalid = !(Number.isFinite(warnNum) && warnNum >= 0 && warnNum <= 100);
  const canSubmit = !categoryInvalid && !limitInvalid && !warnInvalid;

  const submit = async () => {
    if (!canSubmit) {
      setAttempted(true);
      toast.error(tCommon('fillRequired'));
      return;
    }
    try {
      if (initial) {
        await update.mutateAsync({ monthlyLimit: limitNum, warnThreshold: warnNum });
        toast.success(t('budgets.toastUpdateSuccess'));
      } else {
        await create.mutateAsync({ categoryId: categoryId!, monthlyLimit: limitNum, warnThreshold: warnNum, month, year });
        toast.success(t('budgets.toastCreateSuccess'));
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
      eyebrow={t('budgets.eyebrow')}
      title={initial ? t('budgets.modalEditTitle') : t('budgets.modalCreateTitle')}
      subtitle={initial ? t('budgets.modalEditSubtitle') : t('budgets.modalCreateSubtitle')}
    >
          <ScopeIndicator />
          <Menu
            visible={catMenu}
            onDismiss={() => setCatMenu(false)}
            anchor={
              <Pressable onPress={() => { if (!initial) { Keyboard.dismiss(); setCatMenu(true); } }}>
                <View pointerEvents="none">
                  <TextInput
                    mode="outlined"
                    label={t('budgets.formCategoryLabel')}
                    value={activeCat ? activeCat.name : ''}
                    editable={false}
                    disabled={!!initial}
                    error={!initial && attempted && categoryInvalid}
                    right={<TextInput.Icon icon="menu-down" onPress={() => { if (!initial) { Keyboard.dismiss(); setCatMenu(true); } }} />}
                  />
                </View>
              </Pressable>
            }
          >
            {/* Hızlı kategori ekleme — bütçe hep gider kategorisine bağlanır */}
            <Menu.Item
              leadingIcon="plus"
              title={tCommon('quickAddCategory')}
              titleStyle={{ color: colors.go }}
              onPress={() => { setCatMenu(false); setCatFormOpen(true); }}
            />
            <Divider />
            {expenseCats.length === 0 ? (
              <Menu.Item title={t('budgets.emptyTitle')} disabled />
            ) : (
              /* Çok kategoride ekrana sığması için sınırlı, kaydırılabilir liste. */
              <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
                {expenseCats.map((c) => (
                  <Menu.Item
                    key={c.id}
                    title={c.name}
                    leadingIcon={normalizeIconName(c.icon)}
                    onPress={() => {
                      setCategoryId(c.id);
                      setCatMenu(false);
                    }}
                  />
                ))}
              </ScrollView>
            )}
          </Menu>
          {!initial && attempted && categoryInvalid ? (
            <HelperText type="error" visible style={{ marginTop: -10 }}>
              {tCommon('required')}
            </HelperText>
          ) : null}
          <TextInput
            mode="outlined"
            label={t('budgets.formLimitLabel')}
            value={limit}
            onChangeText={(v) => setLimit(formatAmountInput(v, limit))}
            keyboardType="decimal-pad"
            error={attempted && limitInvalid}
          />
          <HelperText type="error" visible={attempted && limitInvalid} style={{ marginTop: -10 }}>
            {tCommon('required')}
          </HelperText>
          <TextInput
            mode="outlined"
            label={t('budgets.formWarnThresholdLabel')}
            value={warnPct}
            onChangeText={setWarnPct}
            keyboardType="number-pad"
            error={attempted && warnInvalid}
          />
          <Body size="xs" tone="mute">
            {String(month).padStart(2, '0')}/{year}
          </Body>
          <Button mode="contained" loading={busy} disabled={busy} onPress={submit} buttonColor={colors.go} textColor={colors.onAccent}>
            {initial ? tCommon('save') : tCommon('add')}
          </Button>

          {/* Hızlı kategori ekleme — Portal'la üstte açılır; gider ön seçili
              (bütçe yalnız gider kategorisine bağlanabildiği için gelir
              seçilirse oluşturulur ama burada otomatik seçilmez). */}
          <CategoryFormModal
            visible={catFormOpen}
            onDismiss={() => setCatFormOpen(false)}
            presetType="expense"
            onCreated={(c) => { if (c.type === 'expense') setCategoryId(c.id); }}
          />
    </AppModal>
  );
}
