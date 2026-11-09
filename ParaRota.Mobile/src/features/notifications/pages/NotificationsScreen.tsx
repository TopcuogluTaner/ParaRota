import { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { useAppTheme } from '@shared/theme/AppThemeProvider';
import { ActivityIndicator, Icon } from 'react-native-paper';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { AppHeader } from '@shared/components/AppHeader';
import { EmptyState } from '@shared/components/EmptyState';
import { ErrorState } from '@shared/components/ErrorState';
import { SwipeableRow } from '@shared/components/SwipeableRow';
import { Body, Eyebrow } from '@shared/components/Typography';
import {
  useNotificationsQuery,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useRemoveNotification,
} from '@features/notifications/api/useNotifications';
import { formatDateTime } from '@shared/lib/dateFormat';
import { colorAlpha } from '@shared/lib/colorAlpha';
import { toast } from '@shared/lib/toast';
import { getErrorMessage } from '@shared/lib/getErrorMessage';
import type { NotificationDto } from '@shared/api/types';

type Sev = NotificationDto['severity'];
const SEVERITY: Record<Sev, { tone: 'sky' | 'go' | 'way' | 'halt'; icon: string }> = {
  info: { tone: 'sky', icon: 'information-variant' },
  success: { tone: 'go', icon: 'check' },
  warning: { tone: 'way', icon: 'exclamation' },
  error: { tone: 'halt', icon: 'close' },
};

function parsePayload(p?: string): Record<string, unknown> {
  if (!p) return {};
  try {
    return JSON.parse(p) as Record<string, unknown>;
  } catch {
    return {};
  }
}

type FilterMode = 'all' | 'unread' | 'read';

export function NotificationsScreen() {
  const { colors } = useAppTheme();
  const { t } = useTranslation('notifications');
  const { t: tCommon } = useTranslation('common');
  const router = useRouter();
  const [filter, setFilter] = useState<FilterMode>('all');

  const { data, isLoading, isError, error, refetch, isFetching } = useNotificationsQuery(50);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const remove = useRemoveNotification();

  const all = data ?? [];
  const unreadCount = all.filter((n) => !n.isRead).length;
  const filtered = useMemo(() => {
    if (filter === 'unread') return all.filter((n) => !n.isRead);
    if (filter === 'read') return all.filter((n) => n.isRead);
    return all;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filter]);

  const counts: Record<FilterMode, number> = {
    all: all.length,
    unread: unreadCount,
    read: all.length - unreadCount,
  };

  const renderItem = ({ item, index }: { item: NotificationDto; index: number }) => {
    const interp = parsePayload(item.payload);
    const title = t(item.titleKey, { ...interp, defaultValue: item.titleKey });
    const body = t(item.messageKey, { ...interp, defaultValue: item.messageKey });
    const sev = SEVERITY[item.severity];
    const tone = colors[sev.tone];
    const unread = !item.isRead;
    const isLast = index === filtered.length - 1;
    // Aile daveti bildirimi: payload'daki token ile accept-invite ekranına gider.
    const inviteToken =
      item.refType === 'household-invite' && typeof interp.token === 'string' ? interp.token : null;

    const rightActions = unread
      ? [
          { icon: 'email-open-outline', label: t('markRead'), tone: 'sky' as const, onPress: () => markRead.mutate(item.id), accessibilityLabel: t('markRead') },
          { icon: 'trash-can-outline', label: t('delete'), tone: 'halt' as const, onPress: () => remove.mutate(item.id), accessibilityLabel: t('delete') },
        ]
      : [
          { icon: 'trash-can-outline', label: t('delete'), tone: 'halt' as const, onPress: () => remove.mutate(item.id), accessibilityLabel: t('delete') },
        ];

    return (
      <Animated.View entering={FadeIn.delay(Math.min(index * 28, 200)).duration(260)}>
        <SwipeableRow rightActions={rightActions}>
          <Pressable
            onPress={() => {
              if (unread) markRead.mutate(item.id);
              if (inviteToken) router.push({ pathname: '/(app)/accept-invite', params: { token: inviteToken } });
              // Ay sonu karnesi → pano (karnenin uzun hâli zaten orası)
              else if (item.refType === 'digest') router.push('/(app)/(tabs)');
            }}
            style={({ pressed }) => [styles.row, { opacity: pressed ? 0.92 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityState={{ selected: unread }}
          >
            {/* Rota rayı: dikey çizgi + önem düğümü */}
            <View style={styles.rail}>
              {!isLast ? <View style={[styles.railLine, { backgroundColor: colors.line }]} /> : null}
              <View
                style={[
                  styles.node,
                  unread
                    ? { backgroundColor: tone, borderColor: tone }
                    : { backgroundColor: colors.bg, borderColor: colorAlpha(colors.inkMute, 0.5) },
                ]}
              >
                <Icon source={sev.icon} size={13} color={unread ? colors.onAccent : colors.inkMute} />
              </View>
            </View>

            {/* Kart */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: unread ? colorAlpha(tone, 0.06) : 'transparent',
                  borderColor: unread ? colorAlpha(tone, 0.28) : colors.line,
                },
              ]}
            >
              <View style={styles.head}>
                <Eyebrow tone={sev.tone}>{tCommon(`alertTitle_${item.severity}` as never, { defaultValue: item.severity })}</Eyebrow>
                <Eyebrow tone="mute">{formatDateTime(item.createdDate)}</Eyebrow>
              </View>
              <Body weight={unread ? 'bold' : undefined} tone={unread ? 'ink' : 'soft'} style={{ marginTop: 5 }}>
                {title}
              </Body>
              {body ? (
                <Body size="sm" tone={unread ? 'soft' : 'mute'} style={{ marginTop: 2 }}>
                  {body}
                </Body>
              ) : null}
              {inviteToken ? (
                <View style={styles.inviteCta}>
                  <Eyebrow tone="go">{t('inviteAction')}</Eyebrow>
                  <Icon source="chevron-right" size={14} color={colors.go} />
                </View>
              ) : null}
            </View>
          </Pressable>
        </SwipeableRow>
      </Animated.View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <AppHeader title={t('page_eyebrow')} back />

      {/* Segmented filtre + tümünü okundu işaretle */}
      <View style={styles.toolbar}>
        <View style={[styles.segment, { borderColor: colors.line, backgroundColor: colors.paper }]}>
          {(['all', 'unread', 'read'] as const).map((mode) => {
            const on = filter === mode;
            return (
              <Pressable
                key={mode}
                onPress={() => setFilter(mode)}
                style={[styles.segmentItem, on && { backgroundColor: colors.ink }]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <Eyebrow style={{ color: on ? colors.paper : colors.inkSoft }} numberOfLines={1}>
                  {t(`filter_${mode}` as const)}
                  {counts[mode] > 0 ? `  ${counts[mode]}` : ''}
                </Eyebrow>
              </Pressable>
            );
          })}
        </View>

        {unreadCount > 0 ? (
          <Pressable
            onPress={async () => {
              try {
                await markAll.mutateAsync();
                toast.success(t('markAllRead'));
              } catch (err) {
                toast.error(getErrorMessage(err, tCommon('errorGeneric')));
              }
            }}
            hitSlop={6}
            style={styles.markAllBtn}
            accessibilityRole="button"
            accessibilityLabel={t('markAllRead')}
          >
            <Icon source="check-all" size={15} color={colors.go} />
            <Eyebrow tone="go">{t('markAllRead')}</Eyebrow>
          </Pressable>
        ) : null}
      </View>

      {isLoading ? (
        <View style={{ paddingTop: 64, alignItems: 'center' }}>
          <ActivityIndicator color={colors.go} />
        </View>
      ) : isError && !data ? (
        <View style={{ paddingTop: 48 }}>
          <ErrorState message={getErrorMessage(error, tCommon('error'))} onRetry={() => refetch()} />
        </View>
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          data={filtered}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={styles.list}
          refreshing={isFetching}
          onRefresh={() => refetch()}
          renderItem={renderItem}
          ListEmptyComponent={
            <EmptyState eyebrow={t('page_eyebrow')} icon="bell-off-outline" title={t('emptyTitle')} message={t('emptyDescription')} />
          }
        />
      )}
    </View>
  );
}

const RAIL_W = 40;
const NODE = 26;

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10, gap: 10 },
  segment: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
  },
  segmentItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 7, borderRadius: 999 },
  markAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end' },
  list: { paddingTop: 4, paddingBottom: 140, paddingRight: 16 },
  row: { flexDirection: 'row', alignItems: 'stretch' },
  rail: { width: RAIL_W, alignItems: 'center', paddingTop: 14 },
  railLine: {
    position: 'absolute',
    top: 14 + NODE / 2,
    bottom: -10,
    width: StyleSheet.hairlineWidth * 2,
  },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 13,
    marginBottom: 10,
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inviteCta: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 8 },
});
