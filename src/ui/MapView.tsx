/**
 * MapView component — interactive map for location selection.
 *
 * Shows current location (if permission granted), reminder pins,
 * radius circle, and cached map indicator.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapViewComponent, { Marker, Circle } from 'react-native-maps';
import { useTheme } from '../theme/ThemeContext';

export interface MapViewProps {
  /** Current location to show (optional) */
  currentLocation?: { latitude: number; longitude: number } | null;
  /** Reminder pins to show */
  reminderPins?: Array<{ id: string; latitude: number; longitude: number }>;
  /** Radius circle to show (when creating/editing) */
  radiusCircle?: { latitude: number; longitude: number; radiusMeters: number };
  /** Whether map tiles are cached (offline indicator) */
  isOffline?: boolean;
  /** Callback when map is tapped (place pin) */
  onMapTap?: (position: { latitude: number; longitude: number }) => void;
  /** Custom children (actual map component) */
  children?: React.ReactNode;
}

export function MapView({
  currentLocation,
  reminderPins = [],
  radiusCircle,
  isOffline = false,
  onMapTap,
  children,
}: MapViewProps) {
  const theme = useTheme();

  // Count total overlays for accessibility label
  const overlayCount = useMemo(() => {
    let count = reminderPins.length;
    if (currentLocation) count++;
    if (radiusCircle) count++;
    return count;
  }, [currentLocation, reminderPins, radiusCircle]);

  // Default region: center of all reminders, or a default city if none exist
  const initialRegion = useMemo(() => {
    if (reminderPins.length > 0) {
      const avgLat = reminderPins.reduce((sum, p) => sum + p.latitude, 0) / reminderPins.length;
      const avgLon = reminderPins.reduce((sum, p) => sum + p.longitude, 0) / reminderPins.length;
      return {
        latitude: avgLat,
        longitude: avgLon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
    }
    // Default: San Francisco
    return {
      latitude: 37.7749,
      longitude: -122.4194,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [reminderPins]);

  return (
    <View style={styles.container}>
      <MapViewComponent
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        onMapReady={() => {}}
        onPress={(event: any) => {
          onMapTap?.({ latitude: event.coordinate.latitude, longitude: event.coordinate.longitude });
        }}
      >
        {/* Current location marker (blue dot) */}
        {currentLocation && (
          <Marker
            key="current-location"
            coordinate={{
              latitude: currentLocation.latitude,
              longitude: currentLocation.longitude,
            }}
            title="Your Location"
            pinColor={theme.colors.primary}
          />
        )}

        {/* Reminder pins */}
        {reminderPins.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={{
              latitude: pin.latitude,
              longitude: pin.longitude,
            }}
            title={pin.id}
            pinColor="#F52232"
          />
        ))}

        {/* Radius circle overlay */}
        {radiusCircle && (
          <Circle
            center={{
              latitude: radiusCircle.latitude,
              longitude: radiusCircle.longitude,
            }}
            radius={radiusCircle.radiusMeters}
            strokeColor={theme.colors.primary}
            fillColor="rgba(0, 0, 0, 0.1)"
          />
        )}

        {/* Pass-through children (custom map overlays, etc.) */}
        {children}
      </MapViewComponent>

      {/* Offline indicator */}
      {isOffline && (
        <View style={[styles.offlineBadge, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.offlineText, { color: theme.colors.secondaryText }]}>
            Offline — cached tiles
          </Text>
        </View>
      )}

      {/* Accessibility label */}
      <Text style={styles.accessibilityLabel} accessible={false}>
        Map with {overlayCount} overlays
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  offlineBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    opacity: 0.85,
  },
  offlineText: {
    fontSize: 11,
    fontWeight: '500',
  },
  accessibilityLabel: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
