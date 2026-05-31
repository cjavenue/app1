import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

interface Props {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/** Generic "coming soon" screen for tabs we haven't built yet. */
export function PlaceholderTab({ title, icon }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={30} color={colors.textMuted} />
        </View>
        <Text style={styles.soon}>Coming soon</Text>
        <Text style={styles.hint}>We're building this piece by piece.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingVertical: 16 },
  headerTitle: { color: colors.text, fontSize: 28, fontWeight: '800' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.sheetElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  soon: { color: colors.text, fontSize: 18, fontWeight: '700' },
  hint: { color: colors.textFaint, fontSize: 14 },
});
