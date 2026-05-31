import React, { useState } from 'react';
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

interface Props {
  visible: boolean;
  onClose: () => void;
  onSendCode: (email: string) => Promise<{ ok: boolean; message?: string }>;
  onConfirm: (email: string, code: string) => Promise<{ ok: boolean; message?: string }>;
}

/**
 * Email verification — the gate that makes an ephemeral profile permanent.
 * Step 1: enter email (Supabase sends a code). Step 2: enter the code.
 */
export function VerifyEmailModal({ visible, onClose, onSendCode, onConfirm }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep('email');
    setEmail('');
    setCode('');
    setError(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const res = await onSendCode(email.trim());
    setBusy(false);
    if (res.ok) setStep('code');
    else setError(res.message ?? 'Could not send the code.');
  };

  const confirm = async () => {
    setBusy(true);
    setError(null);
    const res = await onConfirm(email.trim(), code.trim());
    setBusy(false);
    if (res.ok) close();
    else setError(res.message ?? 'Invalid code.');
  };

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={close} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.grabber} />

          {step === 'email' ? (
            <>
              <Text style={styles.title}>Verify your email</Text>
              <Text style={styles.note}>
                Verify to keep your profile — unverified profiles are removed after 24 hours.
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={colors.textFaint}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {error && <Text style={styles.error}>{error}</Text>}
              <Pressable
                onPress={sendCode}
                disabled={!emailValid || busy}
                style={[styles.primaryBtn, (!emailValid || busy) && styles.disabled]}
              >
                {busy ? (
                  <ActivityIndicator color={colors.black} />
                ) : (
                  <Text style={styles.primaryLabel}>Send code</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>Enter the code</Text>
              <Text style={styles.note}>We sent a 6-digit code to {email}.</Text>
              <TextInput
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                placeholderTextColor={colors.textFaint}
                style={[styles.input, styles.codeInput]}
                keyboardType="number-pad"
                maxLength={6}
              />
              {error && <Text style={styles.error}>{error}</Text>}
              <Pressable
                onPress={confirm}
                disabled={code.trim().length < 6 || busy}
                style={[styles.primaryBtn, (code.trim().length < 6 || busy) && styles.disabled]}
              >
                {busy ? (
                  <ActivityIndicator color={colors.black} />
                ) : (
                  <Text style={styles.primaryLabel}>Verify</Text>
                )}
              </Pressable>
              <Pressable onPress={() => setStep('email')} style={styles.backLink}>
                <Text style={styles.backLabel}>Use a different email</Text>
              </Pressable>
            </>
          )}
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
  note: { color: colors.textMuted, fontSize: 14, marginBottom: 18, lineHeight: 20 },
  input: {
    backgroundColor: colors.sheetElevated,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
  },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 22 },
  error: { color: '#F87171', fontSize: 13, fontWeight: '600', marginTop: 8 },
  primaryBtn: {
    marginTop: 16,
    height: 54,
    borderRadius: 999,
    backgroundColor: colors.turquoiseLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
  primaryLabel: { color: colors.black, fontSize: 16, fontWeight: '700' },
  backLink: { marginTop: 16, alignItems: 'center' },
  backLabel: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
});
