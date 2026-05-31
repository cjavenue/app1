import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Mapbox, {
  Camera,
  FillLayer,
  LineLayer,
  LocationPuck,
  MapView,
  ShapeSource,
} from '@rnmapbox/maps';
import { colors } from '../theme/colors';
import { config, isMapboxConfigured } from '../lib/config';
import { circlePolygon } from '../lib/geo';
import type { Coords } from '../hooks/useLocation';
import type { NearbyUser } from '../hooks/usePresence';

if (isMapboxConfigured()) {
  Mapbox.setAccessToken(config.mapbox.accessToken);
}

interface Props {
  coords: Coords | null;
  nearby: NearbyUser[];
  recenterSignal: number; // bump to recenter the camera on the user
}

/**
 * The live map canvas: dark Mapbox style, the user's location puck, a 5km
 * radius ring, and markers for nearby online users.
 *
 * Falls back to a styled placeholder when no Mapbox token is configured yet,
 * so the rest of the UI (overlays, sheet) remains demonstrable.
 */
export function MapScreen({ coords, nearby, recenterSignal }: Props) {
  const camera = useRef<Camera>(null);

  useEffect(() => {
    if (coords && camera.current) {
      camera.current.setCamera({
        centerCoordinate: [coords.longitude, coords.latitude],
        zoomLevel: 13.5,
        animationDuration: 700,
      });
    }
  }, [coords, recenterSignal]);

  if (!isMapboxConfigured()) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Map preview</Text>
        <Text style={styles.fallbackHint}>
          Add EXPO_PUBLIC_MAPBOX_TOKEN to .env to render the live map here.
        </Text>
      </View>
    );
  }

  const ring = coords
    ? circlePolygon(coords.longitude, coords.latitude, config.nearbyRadiusMeters)
    : null;

  const nearbyFeatures: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: nearby.map((u) => ({
      type: 'Feature',
      id: u.id,
      properties: { id: u.id },
      geometry: { type: 'Point', coordinates: [u.longitude, u.latitude] },
    })),
  };

  return (
    <MapView
      style={StyleSheet.absoluteFill}
      styleURL={config.mapbox.styleUrl}
      scaleBarEnabled={false}
      logoEnabled={false}
      attributionEnabled={false}
      compassEnabled={false}
      pitchEnabled={false}
      rotateEnabled={false}
    >
      <Camera
        ref={camera}
        defaultSettings={{
          centerCoordinate: coords ? [coords.longitude, coords.latitude] : [0, 0],
          zoomLevel: coords ? 13.5 : 1,
        }}
      />

      {ring && (
        <ShapeSource id="radius" shape={ring}>
          <FillLayer
            id="radius-fill"
            style={{ fillColor: colors.turquoise, fillOpacity: 0.06 }}
          />
          <LineLayer
            id="radius-line"
            style={{ lineColor: colors.turquoise, lineWidth: 1.5, lineOpacity: 0.4 }}
          />
        </ShapeSource>
      )}

      {nearby.length > 0 && (
        <ShapeSource id="nearby" shape={nearbyFeatures}>
          <Mapbox.CircleLayer
            id="nearby-glow"
            style={{ circleRadius: 14, circleColor: colors.green, circleOpacity: 0.18 }}
          />
          <Mapbox.CircleLayer
            id="nearby-dot"
            style={{
              circleRadius: 6,
              circleColor: colors.green,
              circleStrokeWidth: 2,
              circleStrokeColor: colors.bg,
            }}
          />
        </ShapeSource>
      )}

      <LocationPuck
        visible
        puckBearing="heading"
        pulsing={{ isEnabled: true, color: colors.turquoise, radius: 28 }}
      />
    </MapView>
  );
}

const styles = StyleSheet.create({
  fallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  fallbackTitle: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  fallbackHint: {
    color: colors.textFaint,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
});
