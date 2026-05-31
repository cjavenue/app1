import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { brandGradient, colors } from '../theme/colors';
import { CATEGORIES, STATUS_MAX_LENGTH, type CategoryKey } from '../lib/categories';
import { isMapConfigured, mapStyleUrl } from '../lib/config';
import type { Coords } from '../hooks/useLocation';
import type { PostResult } from '../hooks/useStatuses';

interface Props {
  visible: boolean;
  coords: Coords | null;
  onClose: () => void;
  onPost: (body: string, category: CategoryKey) => Promise<PostResult>;
}

/** "Create Status" composer — text + category + location preview. */
export function CreateStatusModal({ visible, coords, onClose, onPost }: Props) {
  const insets = useSafeAreaInsets();
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<CategoryKey>('food');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setBody('');
      setCategory('food');
      setError(null);
    }
  }, [visible]);

  const canPost = body.trim().length > 0 && !posting;

  const submit = async () => {
    setPosting(true);
    setError(null);
    const res = await onPost(body.trim(), category);
    setPosting(false);
    if (res.ok) onClose();
    else setError(res.message);
  };

  const point: GeoJSON.Feature<GeoJSON.Point> | null = coords
    ? {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [coords.longitude, coords.latitude] },
      }
    : null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Create Status</Text>
            <Text style={styles.subtitle}>Share what you're up to nearby</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>
        <View style={styles.headerDivider} />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <TextInput
              value={body}
              onChangeText={(t) => setBody(t.slice(0, STATUS_MAX_LENGTH))}
              placeholder="What's happening?"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              multiline
              maxLength={STATUS_MAX_LENGTH}
              autoFocus
            />
            <Text style={styles.counter}>
              {body.length}/{STATUS_MAX_LENGTH}
            </Text>

            {/* Category */}
            <Text style={styles.sectionLabel}>CATEGORY</Text>
            <View style={styles.chips}>
              {CATEGORIES.map((c) => {
                const active = c.key === category;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => setCategory(c.key)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Ionicons
                      name={c.icon}
                      size={16}
                      color={active ? colors.black : colors.textMuted}
                    />
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                      {c.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.helper}>Anyone nearby can ask to join.</Text>

            {/* Location preview */}
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={16} color={colors.textMuted} />
              <Text style={styles.sectionLabel}>LOCATION</Text>
            </View>
            <View style={styles.mapPreview}>
              {isMapConfigured() && point ? (
                <Map
                  style={StyleSheet.absoluteFill}
                  mapStyle={mapStyleUrl()}
                  compass={false}
                  logo={false}
                  attribution={false}
                  scaleBar={false}
                >
                  <Camera center={[coords!.longitude, coords!.latitude]} zoom={15} />
                  <GeoJSONSource id="status-loc" data={point}>
                    <Layer
                      type="circle"
                      id="status-loc-dot"
                      source="status-loc"
                      style={{
                        circleRadius: 7,
                        circleColor: colors.turquoise,
                        circleStrokeWidth: 2,
                        circleStrokeColor: colors.white,
                      }}
                    />
                  </GeoJSONSource>
                </Map>
              ) : (
                <View style={styles.mapFallback}>
                  <Ionicons name="location" size={22} color={colors.textMuted} />
                  <Text style={styles.mapFallbackText}>
                    {coords ? 'Your current location' : 'Waiting for location…'}
                  </Text>
                </View>
              )}
            </View>

            {error && <Text style={styles.error}>{error}</Text>}
          </ScrollView>

          {/* Post button */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
            <Pressable onPress={submit} disabled={!canPost} style={!canPost && styles.dim}>
              <LinearGradient
                colors={[brandGradient[0], brandGradient[1]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.postBtn}
              >
                {posting ? (
                  <ActivityIndicator color={colors.black} />
                ) : (
                  <Text style={styles.postLabel}>Post Status</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
  },
  title: { color: colors.text, fontSize: 24, fontWeight: '800' },
  subtitle: { color: colors.textMuted, fontSize: 14, marginTop: 4 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.sheetElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDivider: { height: 1, backgroundColor: colors.controlBorder },
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20 },
  input: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  counter: { color: colors.textFaint, fontSize: 14, textAlign: 'right', marginTop: 8 },
  sectionLabel: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 24,
    marginBottom: 14,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: colors.sheetElevated,
  },
  chipActive: { backgroundColor: colors.turquoiseLight },
  chipLabel: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  chipLabelActive: { color: colors.black },
  helper: { color: colors.textMuted, fontSize: 14, marginTop: 16 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  mapPreview: {
    height: 170,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.sheetElevated,
  },
  mapFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  mapFallbackText: { color: colors.textMuted, fontSize: 14 },
  error: { color: '#F87171', fontSize: 14, fontWeight: '600', marginTop: 16 },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.controlBorder,
  },
  postBtn: { height: 58, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  postLabel: { color: colors.black, fontSize: 18, fontWeight: '700' },
  dim: { opacity: 0.4 },
});
