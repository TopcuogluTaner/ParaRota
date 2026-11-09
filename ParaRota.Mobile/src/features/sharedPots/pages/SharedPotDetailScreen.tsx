import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Icon, ActivityIndicator, Button, IconButton, Menu } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { AppHeader } from '@shared/components/AppHeader';
import { Screen } from '@shared/components/Screen';
import { RouteCard } from '@shared/components/RouteCard';
import { Reveal } from '@shared/components/Reveal';
import { SwipeableRow } from '@shared/components/SwipeableRow';
import { EmptyState } from '@shared/components/EmptyState';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { Body, Money } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { formatCurrency, formatDate } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { toast } from '@shared/lib/toast';
import { AddExpenseModal } from '@features/sharedPots/components/AddExpenseModal';
import { SettleModal, type SettlePrefill } from '@features/sharedPots/components/SettleModal';
import { AddMemberModal } from '@features/sharedPots/components/AddMemberModal';
import { MembersModal } from '@features/sharedPots/components/MembersModal';
import { EditPotModal } from '@features/sharedPots/components/EditPotModal';
import { useSharedPotQuery, useDeleteSharedPot, useDeleteExpense, useDeleteSettlement, useRemovePotMember, useAddSettlement } from '@features/sharedPots/api/useSharedPots';
import type { SharedExpenseDto, SharedPotMemberDto, SharedSettlementDto } from '@shared/api/types';

type ColorSet = ReturnType<typeof useAppTheme>['colors'];

export function SharedPotDetailScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('sharedPots');
  const { t: tCommon } = useTranslation('common');
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number(params.id);

  const { data: pot, isLoading, isError } = useSharedPotQuery(Number.isFinite(id) ? id : null);
  const delPot = useDeleteSharedPot();
  const delExpense = useDeleteExpense();
  const delSettlement = useDeleteSettlement();
  const removeMember = useRemovePotMember();
  const addSettlement = useAddSettlement();

  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [memberOpen, setMemberOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [settleOpen, setSettleOpen] = useState(false);
  const [prefill, setPrefill] = useState<SettlePrefill | null>(null);
  const [confirmDelPot, setConfirmDelPot] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<SharedExpenseDto | null>(null);
  const [settlementToDelete, setSettlementToDelete] = useState<SharedSettlementDto | null>(null);

  const openSettle = (p: SettlePrefill | null) => { setPrefill(p); setSettleOpen(true); };
  const goList = () => router.navigate('/(app)/shared-pots');

  // Öneriyi tek dokunuşla kaydet (modal açmadan). Geri-alma: ödeme satırını sola çek → sil.
  const settleSuggestion = async (s: { fromMemberId: number; toMemberId: number; amount: number }) => {
    if (addSettlement.isPending) return;
    try { await addSettlement.mutateAsync({ id, body: { fromMemberId: s.fromMemberId, toMemberId: s.toMemberId, amount: s.amount } }); toast.success(t('settle_added')); }
    catch (err) { toast.error(getErrorMessage(err, tCommon('errorGeneric'))); }
  };

  const doDelPot = async () => {
    try { await delPot.mutateAsync(id); toast.success(t('deleted')); goList(); }
    catch (err) { toast.error(getErrorMessage(err, tCommon('errorGeneric'))); }
    finally { setConfirmDelPot(false); }
  };
  const doDelExpense = async () => {
    if (!expenseToDelete) return;
    try { await delExpense.mutateAsync({ id, expenseId: expenseToDelete.id }); toast.success(t('expense_deleted')); }
    catch (err) { toast.error(getErrorMessage(err, tCommon('errorGeneric'))); }
    finally { setExpenseToDelete(null); }
  };
  const doDelSettlement = async () => {
    if (!settlementToDelete) return;
    try { await delSettlement.mutateAsync({ id, settlementId: settlementToDelete.id }); toast.success(t('settle_deleted')); }
    catch (err) { toast.error(getErrorMessage(err, tCommon('errorGeneric'))); }
    finally { setSettlementToDelete(null); }
  };
  const removeMemberNow = async (m: SharedPotMemberDto) => {
    try { await removeMember.mutateAsync({ id, memberId: m.id }); toast.success(t('member_removed')); }
    catch (err) { toast.error(getErrorMessage(err, tCommon('errorGeneric'))); }
  };

  const myBalance = pot?.members.find((m) => m.id === pot.myMemberId)?.balance ?? null;
  const balColor = (bal: number) => (Math.abs(bal) < 0.01 ? colors.inkMute : bal > 0 ? colors.go : colors.halt);
  const balText = (bal: number) => (Math.abs(bal) < 0.01 ? t('settled_up') : `${bal > 0 ? '+' : ''}${formatCurrency(bal)}`);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={pot?.name ?? t('page_title')} back onBack={goList} />
      <Screen edges={['bottom']} contentStyle={{ paddingHorizontal: 16, paddingTop: 12 }}>
        {isLoading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}><ActivityIndicator color={colors.sky} /></View>
        ) : isError || !pot ? (
          <EmptyState icon="alert-circle-outline" title={t('detail_notFound')} />
        ) : (
          <>
            {/* Özet — toplam + senin durumun; owner aksiyonları üç-nokta menüde */}
            <Reveal index={0}>
              <RouteCard
                eyebrow={t('totalSpent')}
                icon="account-cash-outline"
                iconTone={colors.sky}
                right={pot.isOwner ? (
                  <Menu
                    visible={menuOpen}
                    onDismiss={() => setMenuOpen(false)}
                    anchor={<IconButton icon="dots-horizontal" size={20} iconColor={colors.inkMute} onPress={() => setMenuOpen(true)} style={{ margin: 0 }} accessibilityLabel={tCommon('more', { defaultValue: 'More' })} />}
                    contentStyle={{ backgroundColor: colors.paper, borderRadius: 12 }}
                  >
                    <Menu.Item leadingIcon="pencil-outline" title={tCommon('edit')} onPress={() => { setMenuOpen(false); setEditOpen(true); }} />
                    <Menu.Item leadingIcon="trash-can-outline" title={tCommon('delete')} onPress={() => { setMenuOpen(false); setConfirmDelPot(true); }} />
                  </Menu>
                ) : undefined}
              >
                <Money size="lg">{formatCurrency(pot.totalSpent)}</Money>
                {pot.note ? <Body size="sm" tone="soft" style={{ marginTop: 4 }}>{pot.note}</Body> : null}
                {myBalance !== null ? (
                  <View style={[styles.balBanner, { backgroundColor: colorAlpha(balColor(myBalance), 0.1), borderColor: colorAlpha(balColor(myBalance), 0.3) }]}>
                    <Body size="sm" weight="bold">{t('your_balance')}: </Body>
                    <Body size="sm" weight="bold" style={{ color: balColor(myBalance) }}>{balText(myBalance)}</Body>
                  </View>
                ) : null}
              </RouteCard>
            </Reveal>

            <View style={{ height: 12 }} />

            {/* Kim kime borçlu */}
            <Reveal index={1}>
              <RouteCard eyebrow={t('whoOwesWhom')} icon="swap-horizontal-bold" iconTone={colors.way}>
                {pot.suggestions.length === 0 ? (
                  <View style={styles.settledRow}>
                    <Icon source="check-circle-outline" size={18} color={colors.go} />
                    <Body size="sm" weight="bold" style={{ color: colors.go }}>{t('all_settled')}</Body>
                  </View>
                ) : (
                  pot.suggestions.map((s, i) => (
                    <View key={i} style={[styles.sugRow, { backgroundColor: colors.bgAlt }]}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <View style={styles.sugNames}>
                          <Body size="sm" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>{s.fromName}</Body>
                          <Icon source="arrow-right" size={14} color={colors.inkMute} />
                          <Body size="sm" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>{s.toName}</Body>
                        </View>
                        <Money size="sm" tone="soft">{formatCurrency(s.amount)}</Money>
                      </View>
                      <Button mode="contained-tonal" compact loading={addSettlement.isPending} disabled={addSettlement.isPending} onPress={() => settleSuggestion(s)} style={{ borderRadius: 999 }}>
                        {t('mark_paid')}
                      </Button>
                    </View>
                  ))
                )}
                <Button mode="text" icon="cash-plus" onPress={() => openSettle(null)} compact style={{ alignSelf: 'flex-start', marginTop: pot.suggestions.length ? 6 : 10 }}>{t('record_payment')}</Button>
              </RouteCard>
            </Reveal>

            <View style={{ height: 12 }} />

            {/* Üyeler — kompakt şerit; dokununca modalda tam liste açılır */}
            <Reveal index={2}>
              <Pressable
                onPress={() => setMembersOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`${t('members')} · ${pot.members.length}`}
                style={({ pressed }) => [styles.membersStrip, { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow, opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={[styles.stripIcon, { backgroundColor: colorAlpha(colors.sky, 0.14) }]}>
                  <Icon source="account-group-outline" size={19} color={colors.sky} />
                </View>
                <Body size="sm" weight="bold">{t('members')} · {pot.members.length}</Body>
                <View style={{ flex: 1 }} />
                <View style={styles.avatars}>
                  {pot.members.slice(0, 5).map((m, i) => (
                    <Avatar key={m.id} name={m.name} isSelf={m.isSelf} index={i} colors={colors} />
                  ))}
                  {pot.members.length > 5 ? (
                    <View style={[styles.avatar, { backgroundColor: colors.bgAlt, borderColor: colors.paper, marginLeft: -9 }]}>
                      <Body size="xs" weight="bold" tone="mute">+{pot.members.length - 5}</Body>
                    </View>
                  ) : null}
                </View>
                <Icon source="chevron-right" size={20} color={colors.inkMute} />
              </Pressable>
            </Reveal>

            <View style={{ height: 12 }} />

            {/* Masraflar */}
            <Reveal index={3}>
              <RouteCard
                eyebrow={t('expenses')}
                icon="receipt-text-outline"
                iconTone={colors.go}
                right={<HeaderBtn icon="plus" label={t('add_expense')} tone={colors.go} onPress={() => setExpenseOpen(true)} colors={colors} solid />}
              >
                {pot.expenses.length === 0 ? (
                  <Body size="sm" tone="mute">{t('no_expenses')}</Body>
                ) : (
                  pot.expenses.map((e, i, arr) => (
                    <SwipeableRow
                      key={e.id}
                      background="transparent"
                      rightActions={e.canEdit ? [{ icon: 'trash-can-outline', tone: 'halt', onPress: () => setExpenseToDelete(e), accessibilityLabel: tCommon('delete') }] : []}
                    >
                      <View style={[styles.row, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }]}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Body size="sm" weight="bold" numberOfLines={1}>{e.description}</Body>
                          <Body size="xs" tone="mute" numberOfLines={1}>{t('paid_by', { name: e.payerName })} · {formatDate(e.expenseDate)} · {e.splitType === 'equal' ? t('split_equal_n', { count: e.shares.length }) : t('split_exact')}</Body>
                        </View>
                        <Money size="sm">{formatCurrency(e.amount)}</Money>
                      </View>
                    </SwipeableRow>
                  ))
                )}
              </RouteCard>
            </Reveal>

            {/* Ödemeler */}
            {pot.settlements.length > 0 ? (
              <>
                <View style={{ height: 12 }} />
                <Reveal index={4}>
                  <RouteCard eyebrow={t('payments')} icon="cash-multiple" iconTone={colors.go}>
                    {pot.settlements.map((s, i, arr) => (
                      <SwipeableRow
                        key={s.id}
                        background="transparent"
                        rightActions={s.canEdit ? [{ icon: 'trash-can-outline', tone: 'halt', onPress: () => setSettlementToDelete(s), accessibilityLabel: tCommon('delete') }] : []}
                      >
                        <View style={[styles.row, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line }]}>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Body size="sm" weight="bold" numberOfLines={1}>{s.fromName} → {s.toName}</Body>
                            <Body size="xs" tone="mute" numberOfLines={1}>{formatDate(s.settledOn)}{s.note ? ` · ${s.note}` : ''}</Body>
                          </View>
                          <Money size="sm" style={{ color: colors.go }}>{formatCurrency(s.amount)}</Money>
                        </View>
                      </SwipeableRow>
                    ))}
                  </RouteCard>
                </Reveal>
              </>
            ) : null}

            <View style={{ height: 24 }} />

            {/* Modallar */}
            <EditPotModal visible={editOpen} onDismiss={() => setEditOpen(false)} potId={pot.id} initialName={pot.name} initialNote={pot.note} />
            <AddMemberModal visible={memberOpen} onDismiss={() => setMemberOpen(false)} potId={pot.id} existing={pot.members} />
            <MembersModal visible={membersOpen} onDismiss={() => setMembersOpen(false)} members={pot.members} isOwner={pot.isOwner} onRemove={removeMemberNow} onAdd={() => { setMembersOpen(false); setMemberOpen(true); }} />
            <AddExpenseModal visible={expenseOpen} onDismiss={() => setExpenseOpen(false)} potId={pot.id} members={pot.members} currency={pot.currency} defaultPayerId={pot.myMemberId} />
            <SettleModal visible={settleOpen} onDismiss={() => setSettleOpen(false)} potId={pot.id} members={pot.members} currency={pot.currency} prefill={prefill} />
          </>
        )}
      </Screen>

      <ConfirmDialog visible={confirmDelPot} title={t('delete_title')} message={pot ? t('delete_body', { name: pot.name }) : undefined} destructive loading={delPot.isPending} onConfirm={doDelPot} onCancel={() => setConfirmDelPot(false)} />
      <ConfirmDialog visible={!!expenseToDelete} title={t('expense_delete_title')} message={t('expense_delete_body')} destructive loading={delExpense.isPending} onConfirm={doDelExpense} onCancel={() => setExpenseToDelete(null)} />
      <ConfirmDialog visible={!!settlementToDelete} title={t('settle_delete_title')} message={t('settle_delete_body')} destructive loading={delSettlement.isPending} onConfirm={doDelSettlement} onCancel={() => setSettlementToDelete(null)} />
    </View>
  );
}

// Kart başlığı sağ aksiyonu — küçük tinted pill (solid: dolu yeşil). Tüm kartlarda tutarlı.
function HeaderBtn({ icon, label, tone, onPress, colors, solid }: { icon: string; label: string; tone: string; onPress: () => void; colors: ColorSet; solid?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.headerBtn, { backgroundColor: solid ? tone : colorAlpha(tone, pressed ? 0.2 : 0.12), opacity: pressed && solid ? 0.85 : 1 }]}
    >
      <Icon source={icon} size={14} color={solid ? colors.onAccent : tone} />
      <Body size="xs" weight="bold" style={{ color: solid ? colors.onAccent : tone }}>{label}</Body>
    </Pressable>
  );
}

// Üye avatarı — ad baş harfi, çakışık (overlap) dizilim. Self yeşil, diğerleri sky.
function Avatar({ name, isSelf, index, colors }: { name: string; isSelf: boolean; index: number; colors: ColorSet }) {
  const initial = (name.trim().charAt(0) || '?').toLocaleUpperCase('tr-TR');
  const tone = isSelf ? colors.go : colors.sky;
  return (
    <View style={[styles.avatar, { backgroundColor: colorAlpha(tone, 0.2), borderColor: colors.paper, marginLeft: index === 0 ? 0 : -9 }]}>
      <Body size="xs" weight="bold" style={{ color: tone }}>{initial}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  balBanner: { flexDirection: 'row', alignItems: 'center', marginTop: 12, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  membersStrip: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  stripIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 30, height: 30, borderRadius: 999, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  settledRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  sugRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, marginBottom: 8 },
  sugNames: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 11 },
  headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
});
