import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  Camera,
  type CameraRef,
  GeoJSONSource,
  Layer,
  Map,
  UserLocation,
} from '@maplibre/maplibre-react-native';
import { colors } from '../theme/colors';
import { config, isMapConfigured, mapStyleUrl } from '../lib/config';
import { circlePolygon } from '../lib/geo';
import type { Coords } from '../hooks/useLocation';
import type { NearbyUser } from '../hooks/usePresence';

interface Props {
  coords: Coords | null;
  nearby: NearbyUser[];
  recenterSignal: number; // bump to recenter the camera on the user
}

const DEFAULT_ZOOM = 13.5;

/**
 * The live map canvas: dark Stadia (MapLibre) style, the user's location puck,
 * a 5km radius ring, and markers for nearby online users.
 *
 * Falls back to a styled placeholder when no Stadia key is configured yet, so
 * the rest of the UI (overlays, sheet) remains demonstrable.
 */
export function MapScreen({ coords, nearby, recenterSignal }: Props) {
  const camera = useRef<CameraRef>(null);

  useEffect(() => {
    if (coords && camera.current) {
      camera.current.flyTo({
        center: [coords.longitude, coords.latitude],
        zoom: DEFAULT_ZOOM,
        duration: 700,
      });
    }
  }, [coords, recenterSignal]);

  if (!isMapConfigured()) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>Map preview</Text>
        <Text style={styles.fallbackHint}>
          Add EXPO_PUBLIC_STADIA_API_KEY to .env to render the live map here.
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
    <Map
      style={StyleSheet.absoluteFill}
      mapStyle={mapStyleUrl()}
      compass={false}
      logo={false}
      attribution={false}
      scaleBar={false}
    >
      <Camera
        ref={camera}
        center={coords ? [coords.longitude, coords.latitude] : [0, 0]}
        zoom={coords ? DEFAULT_ZOOM : 1}
      />

      {ring && (
        <GeoJSONSource id="radius" data={ring}>
          <Layer
            type="fill"
            id="radius-fill"
            source="radius"
            style={{ fillColor: colors.turquoise, fillOpacity: 0.06 }}
          />
          <Layer
            type="line"
            id="radius-line"
            source="radius"
            style={{ lineColor: colors.turquoise, lineWidth: 1.5, lineOpacity: 0.4 }}
          />
        </GeoJSONSource>
      )}

      {nearby.length > 0 && (
        <GeoJSONSource id="nearby" data={nearbyFeatures}>
          <Layer
            type="circle"
            id="nearby-glow"
            source="nearby"
            style={{ circleRadius: 14, circleColor: colors.green, circleOpacity: 0.18 }}
          />
          <Layer
            type="circle"
            id="nearby-dot"
            source="nearby"
            style={{
              circleRadius: 6,
              circleColor: colors.green,
              circleStrokeWidth: 2,
              circleStrokeColor: colors.bg,
            }}
          />
        </GeoJSONSource>
      )}

      <UserLocation animated accuracy heading />
    </Map>
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
