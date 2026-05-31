import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface Props {
  onLayers: () => void;
  onCompose: () => void;
  onRecenter: () => void;
}

function RoundButton({
  children,
  onPress,
  variant = 'dark',
}: {
  children: React.ReactNode;
  onPress: () => void;
  variant?: 'dark' | 'light';
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        variant === 'light' ? styles.btnLight : styles.btnDark,
        pressed && styles.pressed,
      ]}
      hitSlop={8}
    >
      {children}
    </Pressable>
  );
}

/** Stacked floating controls on the right edge: layers, compose, recenter. */
export function MapControls({ onLayers, onCompose, onRecenter }: Props) {
  return (
    <View style={styles.col}>
      <RoundButton onPress={onLayers}>
        <Ionicons name="layers-outline" size={22} color={colors.white} />
      </RoundButton>
      <RoundButton onPress={onCompose}>
        <Ionicons name="pencil" size={20} color={colors.white} />
      </RoundButton>
      <RoundButton onPress={onRecenter} variant="light">
        <Ionicons name="navigate" size={20} color={colors.black} />
      </RoundButton>
    </View>
  );
}

const styles = StyleSheet.create({
  col: {
    gap: 14,
    alignItems: 'center',
  },
  btn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDark: {
    backgroundColor: colors.control,
    borderWidth: 1,
    borderColor: colors.controlBorder,
  },
  btnLight: {
    backgroundColor: colors.white,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.96 }],
  },
});
