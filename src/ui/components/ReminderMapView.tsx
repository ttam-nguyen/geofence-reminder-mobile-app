/**
 * ReminderMapView component — inline map view for detail screens.
 *
 * Shows a reminder's target location with radius circle.
 * Uses the MapView component from Plan 5 as its base.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { MapView } from '../MapView';

export interface ReminderMapViewProps {
  /** Target latitude */
  latitude: number;
  /** Target longitude */
  longitude: number;
  /** Radius in meters (10–500) */
  radiusMeters: number;
  /** Optional style override */
  style?: ViewStyle;
}

export function ReminderMapView({
  latitude,
  longitude,
  radiusMeters,
  style,
}: ReminderMapViewProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }, style]}>
      <MapView
        currentLocation={null}
        reminderPins={[{ id: 'target', latitude, longitude }]}
        radiusCircle={{ latitude, longitude, radiusMeters }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
  },
});
