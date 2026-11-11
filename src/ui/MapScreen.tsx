/**
 * MapScreen — Full interactive map showing current location, all reminders, and radius circles.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { MapView } from './MapView';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';
import type { ReminderStatus } from '../models/ReminderStatus';

export interface MapScreenProps {
  /** Navigate to create a reminder */
  onNavigateCreate: () => void;
  /** All reminders to display on the map */
  reminders: Array<{ id: string; title: string; latitude: number; longitude: number; radiusMeters: number; status: ReminderStatus }>;
  /** Current GPS location (from container via useCurrentLocation) */
  currentLocation?: { latitude: number; longitude: number } | null;
}

export function MapScreen({ onNavigateCreate, reminders, currentLocation }: MapScreenProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  // Convert reminders to pins and radius circles
  const reminderPins = reminders.map((r) => ({ id: r.id, latitude: r.latitude, longitude: r.longitude }));

  // Use the last reminder's location as a reference for radius (or center of all)
  const lastReminder = reminders[reminders.length - 1];

  return (
    <SafeAreaWrapper>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <Text style={[styles.headerTitle, { color: colors.primaryText }]}>Map</Text>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: '#F52232' }]}
          onPress={() => {
            console.log('[Map] + Add pressed: navigate to CreateReminder');
            onNavigateCreate();
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.fab, { color: '#FFFFFF', backgroundColor: 'transparent' }]}>
            + Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* Map */}
      <MapView
        currentLocation={currentLocation}
        reminderPins={reminderPins}
        radiusCircle={lastReminder ? { latitude: lastReminder.latitude, longitude: lastReminder.longitude, radiusMeters: lastReminder.radiusMeters } : undefined}
      />

      {/* Reminder count */}
      <View style={[styles.countBadge, { backgroundColor: colors.surface }]}>
        <Text style={[styles.countText, { color: colors.secondaryText }]}>
          {reminders.length} reminder{reminders.length !== 1 ? 's' : ''} on map
        </Text>
      </View>
    </View>
    </SafeAreaWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    zIndex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '600',
  },
  fab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 28,
    backgroundColor: '#F52232',
    fontSize: 15,
    fontWeight: '600',
  },
  countBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    opacity: 0.85,
  },
  countText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
