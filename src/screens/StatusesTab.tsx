import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { categoryOf } from '../lib/categories';
import { useApp } from '../context/AppContext';
import type { NearbyStatus } from '../hooks/useStatuses';

function distanceLabel(m: number): string {
  if (m < 950) return `${Math.max(1, Math.round(m / 10) * 10)} m away`;
  return `${(m / 1000).toFixed(1)} km away`;
}

function timeAgo(iso: string): string {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

function StatusCard({ status }: { status: NearbyStatus }) {
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
        <Text style={styles.name}>{status.isMine ? 'You' : status.nickname}</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.distance}>{distanceLabel(status.distanceMeters)}</Text>
      </View>
    </View>
  );
}

export function StatusesTab() {
  const insets = useSafeAreaInsets();
  const { statuses } = useApp();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Statuses</Text>
      </View>
      <FlatList
        data={statuses.statuses}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => <StatusCard status={item} />}
        contentContainerStyle={styles.list}
        onRefresh={statuses.refresh}
        refreshing={false}
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
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
  name: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  dot: { color: colors.textFaint },
  distance: { color: colors.textMuted, fontSize: 14 },
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
