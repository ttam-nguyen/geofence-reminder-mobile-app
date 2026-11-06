/**
 * CreateReminderLocationPicker screen.
 *
 * Tab between GPS/map/search methods for location selection.
 * Shows radius preset selector + custom radius input.
 * Displays offline/unavailable states clearly.
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { LocationSource } from '../models/LocationSource';
import { createTargetLocation } from '../models/TargetLocation';
import type { TargetLocation } from '../models/TargetLocation';

export type LocationTab = 'gps' | 'map' | 'search';

export interface CreateReminderLocationPickerProps {
  /** Current selection (if any) */
  selectedLocation?: TargetLocation | null;
  /** Called when user confirms a location */
  onLocationSelected: (location: TargetLocation) => void;
  /** Whether the device is offline */
  isOffline?: boolean;
}

const RADIUS_PRESETS = [100, 200, 500, 1000];

export function CreateReminderLocationPicker({
  selectedLocation,
  onLocationSelected,
  isOffline = false,
}: CreateReminderLocationPickerProps) {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<LocationTab>('gps');

  // Handle GPS selection
  const handleGPSSelect = () => {
    // TODO: Replace with actual GPS call.
    const location = createTargetLocation({
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
      source: LocationSource.CURRENT_GPS,
    });
    onLocationSelected(location);
  };

  // Handle map pin selection
  const handleMapSelect = () => {
    // TODO: Replace with map pin placement.
    const location = createTargetLocation({
      latitude: 37.7849,
      longitude: -122.4094,
      source: LocationSource.MAP_PIN,
    });
    onLocationSelected(location);
  };

  // Handle search selection
  const handleSearchSelect = () => {
    if (isOffline) {
      // Show offline error — do nothing
      return;
    }
    // TODO: Replace with actual search.
    const location = createTargetLocation({
      latitude: 37.7649,
      longitude: -122.4294,
      locationName: 'Mock Search Result',
      source: LocationSource.PLACE_SEARCH,
    });
    onLocationSelected(location);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Tab selector */}
      <View style={styles.tabBar}>
        {(['gps', 'map', 'search'] as LocationTab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && { borderBottomColor: theme.colors.primary },
            ]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[
                styles.tabLabel,
                { color: activeTab === tab ? theme.colors.primary : theme.colors.secondaryText },
              ]}
            >
              {tab === 'gps' ? 'Current GPS' : tab === 'map' ? 'Map Pin' : 'Search'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === 'gps' && (
        <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Current GPS</Text>
          <Text style={styles.description}>
            Uses your device's current location. Requires location permission.
          </Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleGPSSelect}>
            <Text style={styles.actionButtonText}>Use Current Location</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'map' && (
        <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Map Pin</Text>
          <Text style={styles.description}>
            Place a pin on the map to select your target location.
          </Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleMapSelect}>
            <Text style={styles.actionButtonText}>Open Map</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'search' && (
        <View style={styles.tabContent}>
          <Text style={styles.sectionTitle}>Place Search</Text>
          {isOffline ? (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineText}>
                Location search requires an internet connection.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.description}>
                Search for addresses, businesses, or places.
              </Text>
              <TouchableOpacity style={styles.actionButton} onPress={handleSearchSelect}>
                <Text style={styles.actionButtonText}>Search Places</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* Radius presets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Radius</Text>
        <View style={styles.presetRow}>
          {RADIUS_PRESETS.map((preset) => (
            <TouchableOpacity key={preset} style={styles.presetButton}>
              <Text style={styles.presetLabel}>{preset >= 1000 ? `${preset / 1000}km` : `${preset}m`}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Selected location summary */}
      {selectedLocation && (
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Selected Location</Text>
          <Text style={styles.summaryText}>
            {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
          </Text>
          {selectedLocation.locationName && (
            <Text style={styles.summarySubtext}>{selectedLocation.locationName}</Text>
          )}
          {selectedLocation.accuracy && (
            <Text style={styles.summarySubtext}>Accuracy: ±{Math.round(selectedLocation.accuracy)}m</Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  tabContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
    backgroundColor: 'rgba(245, 34, 50, 0.1)',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F52232',
  },
  offlineBanner: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(217, 154, 66, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(217, 154, 66, 0.3)',
  },
  offlineText: {
    fontSize: 13,
    color: '#D99A42',
  },
  section: {
    padding: 16,
    paddingTop: 24,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.12)',
  },
  presetLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  summary: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 15,
    fontFamily: 'IBM Plex Mono',
  },
  summarySubtext: {
    fontSize: 13,
    color: '#68747C',
  },
});
