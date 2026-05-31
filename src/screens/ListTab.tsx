import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brandGradient, colors } from '../theme/colors';
import { categoryOf } from '../lib/categories';
import { useApp } from '../context/AppContext';
import type { NearbyStatus } from '../hooks/useStatuses';

function initials(name: string): string {
  return name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
}

function distanceLabel(m: number): string {
  if (m < 950) return `${Math.max(1, Math.round(m / 10) * 10)} m away`;
  return `${Math.round(m / 1000)} km away`;
}

function timeLeft(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'expired';
  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Visual content of a single status card (shared by the top and peek cards). */
function CardFace({ status }: { status: NearbyStatus }) {
  const cat = categoryOf(status.category);
  return (
    <View style={styles.cardInner}>
      <Ionicons name={cat.icon} size={260} color={colors.white} style={styles.watermark} />

      <View style={styles.cardTop}>
        <View style={styles.catBadge}>
          <Ionicons name={cat.icon} size={22} color={colors.turquoiseLight} />
        </View>
        <Text style={styles.catLabel}>{cat.label.toUpperCase()}</Text>
        <View style={{ flex: 1 }} />
        <View style={styles.timePill}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={styles.timeText}>{timeLeft(status.expiresAt)}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.bodyText}>{status.body}</Text>
      </View>

      <View style={styles.distancePill}>
        <Ionicons name="navigate-outline" size={14} color={colors.textMuted} />
        <Text style={styles.distanceText}>{distanceLabel(status.distanceMeters)}</Text>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.hostRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(status.nickname)}</Text>
        </View>
        <View>
          <Text style={styles.hostName}>{status.nickname}</Text>
          <Text style={styles.hostLabel}>HOST</Text>
        </View>
      </View>
    </View>
  );
}

export function ListTab() {
  const insets = useSafeAreaInsets();
  const { statuses, meetups } = useApp();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Deck = nearby statuses that aren't mine and haven't been swiped away.
  const deck = useMemo(
    () => statuses.statuses.filter((s) => !s.isMine && !dismissed.has(s.id)),
    [statuses.statuses, dismissed]
  );
  const top = deck[0];
  const peek = deck[1];

  const position = useRef(new Animated.ValueXY()).current;
  const refs = useRef({ top, onSkip: (_: NearbyStatus) => {}, onConnect: (_: NearbyStatus) => {} });

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  }, []);

  const onSkip = useCallback((s: NearbyStatus) => dismiss(s.id), [dismiss]);
  const onConnect = useCallback(
    async (s: NearbyStatus) => {
      dismiss(s.id);
      const res = await meetups.requestJoin(s.id);
      if (res.ok) Alert.alert('Request sent', `You asked to join ${s.nickname}. You can chat once they accept.`);
      else Alert.alert('Ask to join', res.message ?? 'Something went wrong.');
    },
    [dismiss, meetups]
  );

  refs.current = { top, onSkip, onConnect };

  const animateOut = useCallback(
    (dir: 'left' | 'right') => {
      const cur = refs.current.top;
      if (!cur) return;
      Animated.timing(position, {
        toValue: { x: dir === 'right' ? 500 : -500, y: 0 },
        duration: 200,
        useNativeDriver: false,
      }).start(() => {
        position.setValue({ x: 0, y: 0 });
        if (dir === 'right') refs.current.onConnect(cur);
        else refs.current.onSkip(cur);
      });
    },
    [position]
  );

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6,
      onPanResponderMove: (_, g) => position.setValue({ x: g.dx, y: g.dy / 4 }),
      onPanResponderRelease: (_, g) => {
        if (g.dx > 120) animateOut('right');
        else if (g.dx < -120) animateOut('left');
        else Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  const rotate = position.x.interpolate({
    inputRange: [-300, 0, 300],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topBar}>
        <View style={styles.activePill}>
          <View style={styles.activeDot} />
          <Text style={styles.activeText}>{deck.length} active</Text>
        </View>
        {top && <Text style={styles.hint}>Swipe or tap a card</Text>}
      </View>

      <View style={styles.deck}>
        {!top ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="albums-outline" size={28} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No more cards nearby</Text>
            <Text style={styles.emptyHint}>New statuses appear here as people post them.</Text>
          </View>
        ) : (
          <>
            {peek && (
              <View style={[styles.card, styles.peekCard]}>
                <CardFace status={peek} />
              </View>
            )}
            <Animated.View
              key={top.id}
              {...panResponder.panHandlers}
              style={[
                styles.card,
                { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] },
              ]}
            >
              <CardFace status={top} />
            </Animated.View>
          </>
        )}
      </View>

      {top && (
        <View style={[styles.actions, { paddingBottom: insets.bottom + 8 }]}>
          <Pressable
            style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
            onPress={() => animateOut('left')}
            hitSlop={8}
          >
            <Ionicons name="close" size={28} color="#F87171" />
          </Pressable>
          <Pressable
            style={({ pressed }) => pressed && styles.pressed}
            onPress={() => animateOut('right')}
            hitSlop={8}
          >
            <LinearGradient
              colors={[brandGradient[0], brandGradient[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.connectBtn}
            >
              <Ionicons name="chatbubble" size={26} color={colors.black} />
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 36 },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.sheetElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.online },
  activeText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  hint: { color: colors.textMuted, fontSize: 14 },

  deck: { flex: 1, marginTop: 12, marginBottom: 8 },
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.sheet,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.controlBorder,
    overflow: 'hidden',
  },
  peekCard: { transform: [{ scale: 0.95 }, { translateY: 14 }], opacity: 0.5 },
  cardInner: { flex: 1, padding: 22 },
  watermark: { position: 'absolute', right: -40, bottom: -40, opacity: 0.04 },

  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(45,212,191,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catLabel: { color: colors.textMuted, fontSize: 15, fontWeight: '700', letterSpacing: 2 },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.sheetElevated,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  timeText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },

  cardBody: { flex: 1, justifyContent: 'center' },
  bodyText: { color: colors.text, fontSize: 36, fontWeight: '800', lineHeight: 42 },

  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.sheetElevated,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
  },
  distanceText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  cardDivider: { height: 1, backgroundColor: colors.controlBorder, marginVertical: 18 },

  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.black, fontSize: 15, fontWeight: '800' },
  hostName: { color: colors.text, fontSize: 17, fontWeight: '700' },
  hostLabel: { color: colors.textFaint, fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, paddingTop: 8 },
  skipBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.sheetElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectBtn: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7, transform: [{ scale: 0.96 }] },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
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
