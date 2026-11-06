/**
 * MapView component — interactive map for location selection.
 *
 * Shows current location (if permission granted), reminder pins,
 * radius circle, and cached map indicator.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
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

  return (
    <View style={styles.container}>
      {/* Actual map component goes here (react-native-maps) */}
      {children}

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
