import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapScreen } from './src/components/MapScreen';
import { OnlineBadge } from './src/components/OnlineBadge';
import { MapControls } from './src/components/MapControls';
import { PostStatusButton } from './src/components/PostStatusButton';
import { LocationPermissionSheet } from './src/components/LocationPermissionSheet';
import { useLocation } from './src/hooks/useLocation';
import { usePresence } from './src/hooks/usePresence';
import { colors } from './src/theme/colors';

function Root() {
  const insets = useSafeAreaInsets();
  const { permission, coords, requestAndStart, useManual } = useLocation();

  // We share presence while the user is visible. (A future "go invisible"
  // toggle flips this — the plumbing already respects it.)
  const [visible] = useState(true);
  const [recenterSignal, setRecenterSignal] = useState(0);

  const { onlineCount, nearby } = usePresence(coords, visible);

  const showPermissionSheet = permission === 'undetermined';

  const handleEnable = useCallback(() => {
    requestAndStart();
  }, [requestAndStart]);

  const handleManual = useCallback(() => {
    useManual();
  }, [useManual]);

  const recenter = useCallback(() => setRecenterSignal((n) => n + 1), []);

  // Count includes the current user once their location is known.
  const displayCount = useMemo(
    () => onlineCount + (coords ? 1 : 0),
    [onlineCount, coords]
  );

  return (
    <View style={styles.container}>
      <MapScreen coords={coords} nearby={nearby} recenterSignal={recenterSignal} />

      {/* Top-left presence badge */}
      <View style={[styles.topLeft, { top: insets.top + 8 }]}>
        <OnlineBadge count={displayCount} />
      </View>

      {/* Right-edge floating controls */}
      <View style={[styles.rightControls, { bottom: insets.bottom + 110 }]}>
        <MapControls onLayers={() => {}} onCompose={() => {}} onRecenter={recenter} />
      </View>

      {/* Bottom primary CTA (placeholder) */}
      <View style={[styles.bottomCta, { bottom: insets.bottom + 24 }]}>
        <PostStatusButton onPress={() => {}} />
      </View>

      {/* First-run location gate (blurs the map behind) */}
      <LocationPermissionSheet
        visible={showPermissionSheet}
        onEnable={handleEnable}
        onManual={handleManual}
      />

      <StatusBar style="light" />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <Root />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  topLeft: {
    position: 'absolute',
    left: 16,
  },
  rightControls: {
    position: 'absolute',
    right: 16,
  },
  bottomCta: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
