import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { brandGradient, colors } from '../theme/colors';

interface Props {
  onPress: () => void;
}

/**
 * Primary CTA pinned to the bottom of the map.
 * Placeholder for now — wired to the status composer in a later step.
 */
export function PostStatusButton({ onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.shadow, pressed && styles.pressed]}>
      <LinearGradient
        colors={[brandGradient[0], brandGradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pill}
      >
        <View style={styles.row}>
          <Ionicons name="add" size={24} color={colors.black} />
          <Text style={styles.label}>Post Status</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: colors.turquoise,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    borderRadius: 999,
  },
  pill: {
    height: 58,
    borderRadius: 999,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    color: colors.black,
    fontSize: 18,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
});
