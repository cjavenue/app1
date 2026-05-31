import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../theme/colors';

interface Props {
  count: number;
}

/** Top-left "● 19 | Online" pill that surfaces live nearby presence. */
export function OnlineBadge({ count }: Props) {
  return (
    <BlurView intensity={30} tint="dark" style={styles.wrap}>
      <View style={styles.dot} />
      <Text style={styles.count}>{count}</Text>
      <Text style={styles.divider}>|</Text>
      <Text style={styles.label}>Online</Text>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.controlBorder,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.online,
  },
  count: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  divider: {
    color: colors.textFaint,
    fontSize: 13,
    marginHorizontal: 1,
  },
  label: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
});
