import { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Icon, ActivityIndicator, Button, Menu, IconButton } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { AppHeader } from '@shared/components/AppHeader';
import { Screen } from '@shared/components/Screen';
import { RouteCard } from '@shared/components/RouteCard';
import { Reveal } from '@shared/components/Reveal';
import { EmptyState } from '@shared/components/EmptyState';
import { ConfirmDialog } from '@shared/components/ConfirmDialog';
import { Body, Eyebrow, Money } from '@shared/components/Typography';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { usePrivacyStore } from '@shared/store/usePrivacyStore';
import { formatCurrency, formatDate, formatNumber } from '@shared/lib/dateFormat';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import { toast } from '@shared/lib/toast';
import { GoldDayMembersModal } from '@features/goldDays/components/GoldDayMembersModal';
import { useGoldDayQuery, useSetContributionPaid, useSetMeetingCompleted, useDeleteGoldDay } from '@features/goldDays/api/useGoldDays';
import type { GoldDayDetailDto, GoldDayMeetingDto } from '@shared/api/types';

type ColorSet = ReturnType<typeof useAppTheme>['colors'];

const qty = (n: number, hide: boolean) => (hide ? '••' : n % 1 === 0 ? String(n) : formatNumber(n));

export function GoldDayDetailScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('goldDays');
  const { t: tCommon } = useTranslation('common');
  const router = useRouter();
  const hide = usePrivacyStore((s) => s.hideAmounts);
  const params = useLocalSearchParams<{ id?: string }>();
  const id = Number(params.id);

  const { data, isLoading, isError } = useGoldDayQuery(Number.isFinite(id) ? id : null);
  const setPaid = useSetContributionPaid();
  const setCompleted = useSetMeetingCompleted();
  const del = useDeleteGoldDay();
  const [expanded, setExpanded] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);

  const effectiveExpanded = expanded ?? data?.currentMeetingId ?? null;

  const contribLabel = (d: GoldDayDetailDto) =>
    d.contributionType === 'gold' ? `${qty(d.contributionAmount, hide)} ${t(`unit_${d.contributionUnit}`)}`
      : d.contributionUnit === 'TRY' ? (hide ? '••••' : formatCurrency(d.contributionAmount)) : `${qty(d.contributionAmount, hide)} ${d.contributionUnit}`;

  const goList = () => router.navigate('/(app)/gold-days');
  const handleDelete = async () => {
    try { await del.mutateAsync(id); toast.success(t('delete_success')); goList(); }
    catch (err) { toast.error(getErrorMessage(err, tCommon('errorGeneric'))); }
    finally { setConfirmDel(false); }
  };

  const current = data?.meetings.find((m) => m.id === data.currentMeetingId);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={data?.name ?? t('page_title')} back onBack={goList} />
      <Screen edges={['bottom']} contentStyle={{ paddingHorizontal: 16, paddingTop: 12 }}>
        {isLoading ? (
          <View style={{ paddingTop: 40, alignItems: 'center' }}><ActivityIndicator color={colors.way} /></View>
        ) : isError || !data ? (
          <EmptyState icon="alert-circle-outline" title={t('detail_notFound')} />
        ) : (
          <>
            {/* Özet */}
            <Reveal index={0}>
            <RouteCard
              eyebrow={t('summary_contribution')}
              title={`${contribLabel(data)} / ${t('per_meeting')}`}
              icon="gold"
              iconTone={colors.way}
              right={
                <Menu
                  visible={menuOpen}
                  onDismiss={() => setMenuOpen(false)}
                  anchor={<IconButton icon="dots-horizontal" size={20} iconColor={colors.inkMute} onPress={() => setMenuOpen(true)} style={{ margin: 0 }} accessibilityLabel={tCommon('more', { defaultValue: 'More' })} />}
                  contentStyle={{ backgroundColor: colors.paper, borderRadius: 12 }}
                >
                  <Menu.Item leadingIcon="trash-can-outline" title={t('delete_title')} onPress={() => { setMenuOpen(false); setConfirmDel(true); }} />
                </Menu>
              }
            >
              {data.potValueTry != null ? (
                <View style={styles.potRow}>
                  <Eyebrow tone="mute">{t('summary_pot')}</Eyebrow>
                  <Money size="md" style={{ color: colors.way }}>{formatCurrency(data.potValueTry)}</Money>
                </View>
              ) : null}
              {current ? (
                <View style={[styles.turn, { backgroundColor: colorAlpha(colors.way, 0.08), borderColor: colorAlpha(colors.way, 0.25) }]}>
                  <Icon source="account-star-outline" size={16} color={colors.way} />
                  <Body size="sm" style={{ flex: 1 }}><Body size="sm" weight="bold">{t('current_host')}: </Body>{current.hostName} · {formatDate(current.meetingDate)}</Body>
                </View>
              ) : <Body size="sm" weight="bold" style={{ color: colors.go, marginTop: 10 }}>{t('all_done')}</Body>}
            </RouteCard>

            </Reveal>

            <View style={{ height: 12 }} />

            {/* Üyeler — kompakt şerit; dokununca modalda rotasyon sırası açılır */}
            <Reveal index={1}>
              <Pressable
                onPress={() => setMembersOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`${t('members')} · ${data.members.length}`}
                style={({ pressed }) => [styles.membersStrip, { backgroundColor: colors.paper, borderColor: colors.line, boxShadow: colors.cardShadow, opacity: pressed ? 0.9 : 1 }]}
              >
                <View style={[styles.stripIcon, { backgroundColor: colorAlpha(colors.sky, 0.14) }]}>
                  <Icon source="account-group-outline" size={19} color={colors.sky} />
                </View>
                <Body size="sm" weight="bold">{t('members')} · {data.members.length}</Body>
                <View style={{ flex: 1 }} />
                <View style={styles.avatars}>
                  {data.members.slice(0, 5).map((m, i) => (
                    <GoldAvatar key={m.id} name={m.name} isSelf={m.isSelf} index={i} colors={colors} />
                  ))}
                  {data.members.length > 5 ? (
                    <View style={[styles.avatar, { backgroundColor: colors.bgAlt, borderColor: colors.paper, marginLeft: -9 }]}>
                      <Body size="xs" weight="bold" tone="mute">+{data.members.length - 5}</Body>
                    </View>
                  ) : null}
                </View>
                <Icon source="chevron-right" size={20} color={colors.inkMute} />
              </Pressable>
            </Reveal>

            <Eyebrow tone="mute" style={{ marginTop: 16, marginBottom: 8, marginLeft: 4 }}>{t('meetings')}</Eyebrow>
            {data.meetings.map((m) => (
              <MeetingCard key={m.id} meeting={m} expanded={effectiveExpanded === m.id} colors={colors} t={t}
                onToggle={() => setExpanded(effectiveExpanded === m.id ? -1 : m.id)}
                onPaid={(cid, paid) => setPaid.mutate({ contributionId: cid, isPaid: paid })}
                onComplete={(done) => setCompleted.mutate({ meetingId: m.id, isCompleted: done })}
                busy={(setCompleted.isPending && setCompleted.variables?.meetingId === m.id) || (setPaid.isPending && m.contributions.some((c) => c.id === setPaid.variables?.contributionId))} />
            ))}

            <View style={{ height: 24 }} />

            <GoldDayMembersModal visible={membersOpen} onDismiss={() => setMembersOpen(false)} members={data.members} />
          </>
        )}
      </Screen>
      <ConfirmDialog visible={confirmDel} title={t('delete_title')} message={data ? t('delete_body', { name: data.name }) : undefined} destructive loading={del.isPending} onConfirm={handleDelete} onCancel={() => setConfirmDel(false)} />
    </View>
  );
}

function MeetingCard({ meeting, expanded, colors, t, onToggle, onPaid, onComplete, busy }: {
  meeting: GoldDayMeetingDto; expanded: boolean; colors: ReturnType<typeof useAppTheme>['colors'];
  t: (k: string, o?: Record<string, unknown>) => string; onToggle: () => void;
  onPaid: (cid: number, paid: boolean) => void; onComplete: (done: boolean) => void; busy: boolean;
}) {
  // Tüm katkılar ödendiyse "tamamla" butonu yeşile döner (görsel ipucu).
  const allPaid = meeting.contributionCount > 0 && meeting.paidCount >= meeting.contributionCount;
  return (
    <View style={[styles.meeting, { backgroundColor: colors.paper, borderColor: colors.line, opacity: meeting.isCompleted ? 0.75 : 1 }]}>
      <Pressable onPress={onToggle} style={styles.meetingHead} accessibilityRole="button" accessibilityState={{ expanded }}>
        <View style={[styles.seqDot, { backgroundColor: meeting.isCompleted ? colors.go : colorAlpha(colors.way, 0.13) }]}>
          {meeting.isCompleted ? <Icon source="check" size={15} color={colors.onAccent} /> : <Body size="xs" weight="bold" style={{ color: colors.way }}>{meeting.sequenceNo}</Body>}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Body size="sm" weight="bold" numberOfLines={1}>{meeting.hostName}</Body>
          <Body size="xs" tone="mute">{formatDate(meeting.meetingDate)} · {t('paid_count', { paid: meeting.paidCount, total: meeting.contributionCount })}</Body>
        </View>
        <Icon source={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.inkSoft} />
      </Pressable>
      {expanded ? (
        <View style={[styles.meetingBody, { borderTopColor: colors.line }]}>
          {meeting.contributions.map((c) => (
            <Pressable key={c.id} onPress={() => !busy && onPaid(c.id, !c.isPaid)} style={styles.contribRow} accessibilityRole="checkbox" accessibilityState={{ checked: c.isPaid }} accessibilityLabel={c.memberName}>
              <Icon source={c.isPaid ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={c.isPaid ? colors.go : colors.inkMute} />
              <Body size="sm" style={{ flex: 1, color: c.isPaid ? colors.inkMute : colors.ink, textDecorationLine: c.isPaid ? 'line-through' : 'none' }}>{c.memberName}</Body>
            </Pressable>
          ))}
          <Button mode={meeting.isCompleted ? 'outlined' : 'contained'} icon={meeting.isCompleted ? 'undo-variant' : 'flag-checkered'} loading={busy} disabled={busy}
            onPress={() => onComplete(!meeting.isCompleted)} buttonColor={meeting.isCompleted ? undefined : (allPaid ? colors.go : colors.sky)} textColor={meeting.isCompleted ? colors.go : colors.onAccent}
            style={{ borderRadius: 999, marginTop: 8 }}>
            {meeting.isCompleted ? t('meeting_reopen') : t('meeting_complete')}
          </Button>
        </View>
      ) : null}
    </View>
  );
}

// Gün üye avatarı — ad baş harfi, çakışık dizilim. Self yeşil, diğerleri altın (way).
function GoldAvatar({ name, isSelf, index, colors }: { name: string; isSelf: boolean; index: number; colors: ColorSet }) {
  const initial = (name.trim().charAt(0) || '?').toLocaleUpperCase('tr-TR');
  const tone = isSelf ? colors.go : colors.way;
  return (
    <View style={[styles.avatar, { backgroundColor: colorAlpha(tone, 0.2), borderColor: colors.paper, marginLeft: index === 0 ? 0 : -9 }]}>
      <Body size="xs" weight="bold" style={{ color: tone }}>{initial}</Body>
    </View>
  );
}

const styles = StyleSheet.create({
  potRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  turn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  membersStrip: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  stripIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 30, height: 30, borderRadius: 999, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  meeting: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, marginBottom: 8, overflow: 'hidden' },
  meetingHead: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  seqDot: { width: 30, height: 30, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  meetingBody: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth },
  contribRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
});
