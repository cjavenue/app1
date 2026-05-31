import React, { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brandGradient, colors } from '../theme/colors';
import { useApp } from '../context/AppContext';
import { EditNicknameModal } from '../components/EditNicknameModal';
import { VerifyEmailModal } from '../components/VerifyEmailModal';
import { linkGoogle } from '../services/oauth';

function initials(name: string): string {
  const clean = name.replace(/[^A-Za-z0-9]/g, '');
  return clean.slice(0, 2).toUpperCase() || '?';
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

export function ProfileTab() {
  const insets = useSafeAreaInsets();
  const { profile: p } = useApp();
  const profile = p.profile;

  const [renameOpen, setRenameOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  const connectGoogle = async () => {
    setLinkingGoogle(true);
    const res = await linkGoogle();
    setLinkingGoogle(false);
    if (res.ok) {
      await p.reload();
      Alert.alert('Connected', 'Google is now linked — you can use it to sign in next time.');
    } else {
      Alert.alert('Google sign-in', res.message);
    }
  };

  const appleInfo = () =>
    Alert.alert(
      'Apple sign-in',
      'Sign in with Apple needs an Apple Developer account ($99/year). We’ll enable it once that’s set up.'
    );

  if (!profile) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.loading}>
          {p.loading ? 'Loading your profile…' : 'Share your location to create a profile.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <Ionicons name="ellipsis-vertical" size={20} color={colors.textMuted} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar + name */}
        <View style={styles.avatarBlock}>
          <LinearGradient
            colors={[brandGradient[0], brandGradient[1]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initials(profile.nickname)}</Text>
          </LinearGradient>
          <Text style={styles.name}>{profile.nickname}</Text>
        </View>

        {/* Verification banner */}
        {profile.emailVerified ? (
          <View style={[styles.verifyCard, styles.verifiedCard]}>
            <Ionicons name="shield-checkmark" size={20} color={colors.green} />
            <View style={{ flex: 1 }}>
              <Text style={styles.verifyTitle}>Email verified</Text>
              <Text style={styles.verifySub}>{profile.email}</Text>
            </View>
          </View>
        ) : (
          <Pressable style={[styles.verifyCard, styles.warnCard]} onPress={() => setVerifyOpen(true)}>
            <Ionicons name="alert-circle" size={20} color="#FBBF24" />
            <View style={{ flex: 1 }}>
              <Text style={styles.verifyTitle}>Verify your email</Text>
              <Text style={styles.verifySub}>Unverified profiles are removed after 24 hours.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
        )}

        {/* Stat cards */}
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Ionicons name="flash" size={22} color={colors.green} />
            <Text style={styles.statValue}>{profile.meetups}</Text>
            <Text style={styles.statLabel}>Meetups</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
            <Text style={[styles.statValue, !profile.gender && styles.statValueMuted]}>
              {profile.gender ?? 'Not set'}
            </Text>
            <Text style={styles.statLabel}>Gender</Text>
          </View>
        </View>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.fieldLabel}>NICKNAME</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldValue}>{profile.nickname}</Text>
            {!profile.nicknameChanged && (
              <Pressable onPress={() => setRenameOpen(true)} hitSlop={8} style={styles.changeBtn}>
                <Ionicons name="pencil" size={14} color={colors.turquoiseLight} />
                <Text style={styles.changeLabel}>Change</Text>
              </Pressable>
            )}
          </View>
          <View style={styles.divider} />

          <Text style={styles.fieldLabel}>INTERESTS</Text>
          <Text style={[styles.fieldValue, styles.fieldMuted]}>
            {profile.interests.length ? profile.interests.join(', ') : 'None set'}
          </Text>
          <View style={styles.divider} />

          <View style={styles.memberRow}>
            <View style={styles.memberLeft}>
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
              <Text style={styles.memberLabel}>Member since</Text>
            </View>
            <Text style={styles.memberDate}>{formatDate(profile.createdAt)}</Text>
          </View>
        </View>

        {/* Cross-device sign-in (enabled after verification) */}
        {profile.emailVerified && (
          <View style={styles.signinBlock}>
            <Text style={styles.signinHint}>Sign in faster next time</Text>
            <Pressable
              style={[styles.oauthBtn, linkingGoogle && styles.oauthBtnBusy]}
              onPress={connectGoogle}
              disabled={linkingGoogle}
            >
              {linkingGoogle ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color={colors.text} />
                  <Text style={styles.oauthLabel}>Continue with Google</Text>
                </>
              )}
            </Pressable>
            <Pressable style={[styles.oauthBtn, styles.oauthBtnDisabled]} onPress={appleInfo}>
              <Ionicons name="logo-apple" size={20} color={colors.textMuted} />
              <Text style={[styles.oauthLabel, styles.oauthLabelMuted]}>Apple — needs dev account</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      <EditNicknameModal
        visible={renameOpen}
        current={profile.nickname}
        onClose={() => setRenameOpen(false)}
        checkNickname={p.checkNickname}
        onSubmit={p.rename}
      />
      <VerifyEmailModal
        visible={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        onSendCode={p.startEmailVerification}
        onConfirm={p.confirmEmail}
      />
    </View>
  );
}

const CARD = {
  backgroundColor: colors.sheet,
  borderRadius: 18,
  borderWidth: 1,
  borderColor: colors.controlBorder,
} as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  loading: { color: colors.textMuted, fontSize: 15, paddingHorizontal: 40, textAlign: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: { color: colors.text, fontSize: 28, fontWeight: '800' },
  scroll: { paddingHorizontal: 16, paddingBottom: 40 },
  avatarBlock: { alignItems: 'center', marginTop: 18, marginBottom: 22 },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: { color: colors.white, fontSize: 38, fontWeight: '800' },
  name: { color: colors.text, fontSize: 26, fontWeight: '800' },

  verifyCard: {
    ...CARD,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    marginBottom: 16,
  },
  warnCard: { borderColor: 'rgba(251,191,36,0.35)' },
  verifiedCard: { borderColor: 'rgba(52,211,153,0.35)' },
  verifyTitle: { color: colors.text, fontSize: 15, fontWeight: '700' },
  verifySub: { color: colors.textMuted, fontSize: 13, marginTop: 2 },

  statRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { ...CARD, flex: 1, alignItems: 'center', paddingVertical: 20, gap: 6 },
  statValue: { color: colors.text, fontSize: 22, fontWeight: '800' },
  statValueMuted: { color: colors.textFaint, fontSize: 18 },
  statLabel: { color: colors.textMuted, fontSize: 13 },

  infoCard: { ...CARD, padding: 18 },
  fieldLabel: { color: colors.textFaint, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldValue: { color: colors.text, fontSize: 16, marginTop: 6 },
  fieldMuted: { color: colors.textMuted },
  changeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  changeLabel: { color: colors.turquoiseLight, fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.controlBorder, marginVertical: 16 },
  memberRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberLabel: { color: colors.textMuted, fontSize: 15 },
  memberDate: { color: colors.textMuted, fontSize: 15 },

  signinBlock: { marginTop: 20, gap: 10 },
  signinHint: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 4 },
  oauthBtn: {
    ...CARD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 52,
  },
  oauthBtnBusy: { opacity: 0.7 },
  oauthBtnDisabled: { opacity: 0.6 },
  oauthLabel: { color: colors.text, fontSize: 15, fontWeight: '600' },
  oauthLabelMuted: { color: colors.textMuted },
});
