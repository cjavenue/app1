import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import type { RenameResult } from '../hooks/useProfile';

interface Props {
  visible: boolean;
  current: string;
  onClose: () => void;
  checkNickname: (name: string) => Promise<boolean>;
  onSubmit: (name: string) => Promise<RenameResult>;
}

/**
 * One-time nickname change. Live-validates length, charset, and uniqueness
 * before allowing submit. (The server re-enforces all of this.)
 */
export function EditNicknameModal({ visible, current, onClose, checkNickname, onSubmit }: Props) {
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(current);
  const [status, setStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>(
    'idle'
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setValue(current);
      setStatus('idle');
      setError(null);
    }
  }, [visible, current]);

  // Debounced availability check.
  useEffect(() => {
    const name = value.trim();
    if (name === current || name.length === 0) {
      setStatus('idle');
      return;
    }
    const valid = /^[A-Za-z0-9 _]{4,20}$/.test(name);
    if (!valid) {
      setStatus('invalid');
      return;
    }
    setStatus('checking');
    const t = setTimeout(async () => {
      const ok = await checkNickname(name);
      setStatus(ok ? 'available' : 'taken');
    }, 400);
    return () => clearTimeout(t);
  }, [value, current, checkNickname]);

  const canSubmit = status === 'available' && !submitting;

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const result = await onSubmit(value.trim());
    setSubmitting(false);
    if (result.ok) {
      onClose();
    } else {
      const map: Record<string, string> = {
        invalid: 'That name isn’t allowed. Use 4–20 letters, numbers, spaces or _.',
        taken: 'That name is already taken.',
        already_changed: 'You can only change your name once.',
        error: 'Something went wrong. Try again.',
      };
      setError(map[result.reason]);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.grabber} />
          <Text style={styles.title}>Change your name</Text>
          <Text style={styles.note}>You can only do this once, so choose carefully.</Text>

          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Pick a unique name"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            autoCapitalize="words"
            maxLength={20}
          />

          <View style={styles.statusRow}>
            {status === 'checking' && <Text style={styles.statusMuted}>Checking…</Text>}
            {status === 'available' && <Text style={styles.statusOk}>✓ Available</Text>}
            {status === 'taken' && <Text style={styles.statusBad}>Already taken</Text>}
            {status === 'invalid' && (
              <Text style={styles.statusBad}>4–20 letters, numbers, spaces or _</Text>
            )}
          </View>

          {error && <Text style={styles.statusBad}>{error}</Text>}

          <Pressable
            onPress={submit}
            disabled={!canSubmit}
            style={[styles.primaryBtn, !canSubmit && styles.primaryDisabled]}
          >
            {submitting ? (
              <ActivityIndicator color={colors.black} />
            ) : (
              <Text style={styles.primaryLabel}>Save name</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: colors.sheet,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  grabber: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '800', marginBottom: 6 },
  note: { color: colors.textMuted, fontSize: 14, marginBottom: 18 },
  input: {
    backgroundColor: colors.sheetElevated,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  statusRow: { minHeight: 22, justifyContent: 'center', marginTop: 8 },
  statusMuted: { color: colors.textMuted, fontSize: 13 },
  statusOk: { color: colors.green, fontSize: 13, fontWeight: '600' },
  statusBad: { color: '#F87171', fontSize: 13, fontWeight: '600' },
  primaryBtn: {
    marginTop: 14,
    height: 54,
    borderRadius: 999,
    backgroundColor: colors.turquoiseLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: { opacity: 0.4 },
  primaryLabel: { color: colors.black, fontSize: 16, fontWeight: '700' },
});
