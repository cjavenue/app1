import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

interface Props {
  visible: boolean;
  onEnable: () => void;
  onManual: () => void;
}

/**
 * First-run gate: blurs the map behind and asks for location permission.
 * Mirrors screen 2 — a docked bottom sheet over a blurred backdrop.
 */
export function LocationPermissionSheet({ visible, onEnable, onManual }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <BlurView intensity={40} tint="dark" style={styles.backdrop}>
        <View style={styles.scrim} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 28 }]}>
          <View style={styles.grabber} />

          <View style={styles.iconCircle}>
            <Ionicons name="location-outline" size={34} color={colors.white} />
          </View>

          <Text style={styles.title}>Enable your location</Text>
          <Text style={styles.subtitle}>
            See what's happening around you and connect with people nearby in real time
          </Text>

          <Pressable
            onPress={onEnable}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Text style={styles.primaryLabel}>Enable Location</Text>
          </Pressable>

          <Pressable onPress={onManual} hitSlop={10} style={styles.manualWrap}>
            <Text style={styles.manualLabel}>Set location manually</Text>
          </Pressable>
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.scrim,
  },
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginBottom: 28,
  },
  iconCircle: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: colors.sheetElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  primaryBtn: {
    width: '100%',
    height: 58,
    borderRadius: 999,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryLabel: {
    color: colors.black,
    fontSize: 17,
    fontWeight: '700',
  },
  manualWrap: {
    marginTop: 20,
  },
  manualLabel: {
    color: colors.textMuted,
    fontSize: 15,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
  },
});
