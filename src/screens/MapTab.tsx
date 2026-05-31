import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapScreen } from '../components/MapScreen';
import { OnlineBadge } from '../components/OnlineBadge';
import { MapControls } from '../components/MapControls';
import { PostStatusButton } from '../components/PostStatusButton';
import { CreateStatusModal } from '../components/CreateStatusModal';
import { useApp } from '../context/AppContext';

/** The map experience: live canvas plus floating overlays. */
export function MapTab() {
  const insets = useSafeAreaInsets();
  const { coords, nearby, displayCount, statuses } = useApp();
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);

  const recenter = useCallback(() => setRecenterSignal((n) => n + 1), []);

  return (
    <View style={styles.container}>
      <MapScreen
        coords={coords}
        nearby={nearby}
        statuses={statuses.statuses}
        recenterSignal={recenterSignal}
      />

      <View style={[styles.topLeft, { top: insets.top + 8 }]}>
        <OnlineBadge count={displayCount} />
      </View>

      <View style={styles.rightControls}>
        <MapControls onLayers={() => {}} onCompose={() => setComposerOpen(true)} onRecenter={recenter} />
      </View>

      <View style={styles.bottomCta}>
        <PostStatusButton onPress={() => setComposerOpen(true)} />
      </View>

      <CreateStatusModal
        visible={composerOpen}
        coords={coords}
        onClose={() => setComposerOpen(false)}
        onPost={statuses.post}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topLeft: { position: 'absolute', left: 16 },
  rightControls: { position: 'absolute', right: 16, bottom: 96 },
  bottomCta: { position: 'absolute', left: 0, right: 0, bottom: 20, alignItems: 'center' },
});
