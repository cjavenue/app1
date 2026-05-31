import React from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { categoryOf } from '../lib/categories';
import { useApp } from '../context/AppContext';
import type { NearbyStatus } from '../hooks/useStatuses';
import type { JoinActivity, JoinState } from '../hooks/useMeetups';

function distanceLabel(m: number): string {
  if (m < 950) return `${Math.max(1, Math.round(m / 10) * 10)} m away`;
  return `${(m / 1000).toFixed(1)} km away`;
}

function timeAgo(iso: string): string {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function JoinControl({
  state,
  onRequest,
}: {
  state: JoinState | undefined;
  onRequest: () => void;
}) {
  if (state === 'accepted') {
    return (
      <View style={[styles.joinBtn, styles.joinAccepted]}>
        <Ionicons name="checkmark" size={15} color={colors.green} />
        <Text style={[styles.joinLabel, { color: colors.green }]}>Joined</Text>
      </View>
    );
  }
  if (state === 'pending') {
    return (
      <View style={[styles.joinBtn, styles.joinPending]}>
        <Text style={[styles.joinLabel, { color: colors.textMuted }]}>Requested</Text>
      </View>
    );
  }
  if (state === 'declined') {
    return (
      <View style={[styles.joinBtn, styles.joinPending]}>
        <Text style={[styles.joinLabel, { color: colors.textFaint }]}>Declined</Text>
      </View>
    );
  }
  return (
    <Pressable style={[styles.joinBtn, styles.joinActive]} onPress={onRequest}>
      <Ionicons name="hand-right-outline" size={15} color={colors.black} />
      <Text style={[styles.joinLabel, { color: colors.black }]}>Ask to join</Text>
    </Pressable>
  );
}

function StatusCard({
  status,
  state,
  onRequest,
}: {
  status: NearbyStatus;
  state: JoinState | undefined;
  onRequest: () => void;
}) {
  const cat = categoryOf(status.category);
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.catBadge}>
          <Ionicons name={cat.icon} size={14} color={colors.turquoiseLight} />
          <Text style={styles.catLabel}>{cat.label}</Text>
        </View>
        <Text style={styles.time}>{timeAgo(status.createdAt)}</Text>
      </View>
      <Text style={styles.body}>{status.body}</Text>
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          <Text style={styles.name}>{status.isMine ? 'You' : status.nickname}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.distance}>{distanceLabel(status.distanceMeters)}</Text>
        </View>
        {!status.isMine && <JoinControl state={state} onRequest={onRequest} />}
      </View>
    </View>
  );
}

function IncomingRequest({
  req,
  onRespond,
}: {
  req: JoinActivity;
  onRespond: (accept: boolean) => void;
}) {
  return (
    <View style={styles.requestCard}>
      <Text style={styles.requestText}>
        <Text style={styles.requestName}>{req.requesterNickname}</Text> wants to join your status
      </Text>
      <Text style={styles.requestStatus} numberOfLines={1}>
        “{req.statusBody}”
      </Text>
      <View style={styles.requestActions}>
        <Pressable style={[styles.respBtn, styles.declineBtn]} onPress={() => onRespond(false)}>
          <Text style={styles.declineLabel}>Decline</Text>
        </Pressable>
        <Pressable style={[styles.respBtn, styles.acceptBtn]} onPress={() => onRespond(true)}>
          <Text style={styles.acceptLabel}>Accept</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function StatusesTab() {
  const insets = useSafeAreaInsets();
  const { statuses, meetups, profile } = useApp();

  const askToJoin = async (statusId: string) => {
    const res = await meetups.requestJoin(statusId);
    if (!res.ok) Alert.alert('Ask to join', res.message ?? 'Something went wrong.');
  };

  const respond = async (requestId: string, accept: boolean) => {
    const res = await meetups.respond(requestId, accept);
    if (res.ok) {
      if (accept) await profile.reload(); // refresh Meetups counter
    } else {
      Alert.alert('Request', res.message ?? 'Something went wrong.');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Statuses</Text>
      </View>
      <FlatList
        data={statuses.statuses}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <StatusCard
            status={item}
            state={meetups.outgoingState(item.id)}
            onRequest={() => askToJoin(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        onRefresh={statuses.refresh}
        refreshing={false}
        ListHeaderComponent={
          meetups.incoming.length > 0 ? (
            <View style={styles.incomingBlock}>
              <Text style={styles.incomingTitle}>Requests to join you</Text>
              {meetups.incoming.map((req) => (
                <IncomingRequest
                  key={req.id}
                  req={req}
                  onRespond={(accept) => respond(req.id, accept)}
                />
              ))}
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="radio-outline" size={28} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Nothing nearby yet</Text>
            <Text style={styles.emptyHint}>Be the first — tap “+ Post Status” on the map.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingVertical: 14 },
  headerTitle: { color: colors.text, fontSize: 28, fontWeight: '800' },
  list: { paddingHorizontal: 16, paddingBottom: 30, flexGrow: 1 },

  card: {
    backgroundColor: colors.sheet,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  catLabel: { color: colors.turquoiseLight, fontSize: 13, fontWeight: '700' },
  time: { color: colors.textFaint, fontSize: 13 },
  body: { color: colors.text, fontSize: 16, lineHeight: 22, marginTop: 12 },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  name: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  dot: { color: colors.textFaint },
  distance: { color: colors.textMuted, fontSize: 14 },

  joinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  joinActive: { backgroundColor: colors.turquoiseLight },
  joinPending: { backgroundColor: colors.sheetElevated },
  joinAccepted: { backgroundColor: 'rgba(52,211,153,0.15)' },
  joinLabel: { fontSize: 13, fontWeight: '700' },

  incomingBlock: { marginBottom: 8 },
  incomingTitle: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  requestCard: {
    backgroundColor: colors.sheet,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.3)',
    padding: 16,
    marginBottom: 12,
  },
  requestText: { color: colors.text, fontSize: 15 },
  requestName: { fontWeight: '800' },
  requestStatus: { color: colors.textMuted, fontSize: 14, marginTop: 6, fontStyle: 'italic' },
  requestActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  respBtn: { flex: 1, height: 44, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  declineBtn: { backgroundColor: colors.sheetElevated },
  declineLabel: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
  acceptBtn: { backgroundColor: colors.turquoiseLight },
  acceptLabel: { color: colors.black, fontSize: 15, fontWeight: '700' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 80 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.sheetElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700' },
  emptyHint: { color: colors.textFaint, fontSize: 14, textAlign: 'center', paddingHorizontal: 30 },
});
