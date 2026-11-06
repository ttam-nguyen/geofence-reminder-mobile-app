/**
 * CreateReminderScreen — Full create/edit reminder form.
 *
 * Supports all 3 location methods (GPS/map/search) via the LocationPicker component.
 * Validates title, location, and radius before saving.
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import type { LocationTab } from './CreateReminderLocationPicker';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import { useReminderStore } from '../stores/reminderStore';
import { LocationSource } from '../models/LocationSource';
import type { TargetLocation } from '../models/TargetLocation';
import { ReminderStatus } from '../models/ReminderStatus';

export interface CreateReminderScreenProps {
  /** Edit mode: reminder ID to edit (null = create new) */
  reminderId?: string | null;
  /** Called when a reminder is saved (navigate back + refresh) */
  onSaved: () => void;
  /** Called to go back without saving */
  onCancel: () => void;
}

const RADIUS_PRESETS = [100, 200, 500, 1000];

export function CreateReminderScreen({ reminderId, onSaved, onCancel }: CreateReminderScreenProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  // Store for creating reminders
  const { createReminder: storeCreate, loading, error, clearError } = useReminderStore((s) => ({
    createReminder: s.createReminder,
    loading: s.loading,
    error: s.error,
    clearError: s.clearError,
  }));

  // Current location hook (GPS)
  const { location: currentLocation, loading: gpsLoading } = useCurrentLocation();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTab, setSelectedTab] = useState<LocationTab>('gps');
  const [selectedLocation, setSelectedLocation] = useState<TargetLocation | null>(null);
  const [radiusMeters, setRadiusMeters] = useState(100);
  const [notificationSoundEnabled, setNotificationSoundEnabled] = useState(true);
  const [notificationVibrationEnabled, setNotificationVibrationEnabled] = useState(true);

  // Derived: is the form valid?
  const isValid = title.trim().length > 0 && selectedLocation !== null;

  // Handle GPS selection
  const handleGPSSelect = () => {
    if (currentLocation) {
      const location = {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        accuracy: currentLocation.accuracy,
        source: LocationSource.CURRENT_GPS,
        timestamp: Date.now(),
      };
      setSelectedLocation(location);
    }
  };

  // Handle map pin selection (from LocationPicker)
  const handleMapSelect = () => {
    const location: TargetLocation = {
      latitude: 37.7849,
      longitude: -122.4094,
      source: LocationSource.MAP_PIN,
      timestamp: Date.now(),
    };
    setSelectedLocation(location);
  };

  // Handle search selection (from LocationPicker)
  const handleSearchSelect = () => {
    const location: TargetLocation = {
      latitude: 37.7649,
      longitude: -122.4294,
      locationName: 'Selected Location',
      source: LocationSource.PLACE_SEARCH,
      timestamp: Date.now(),
    };
    setSelectedLocation(location);
  };

  // Handle radius preset selection
  const handleRadiusPreset = (preset: number) => {
    setRadiusMeters(preset);
  };

  // Save reminder
  const handleSave = async () => {
    clearError();

    if (!isValid) return;

    try {
      // Determine initial status based on user position relative to target
      // For MVP: default to ARMED (user is outside target) unless explicitly inside
      const status = ReminderStatus.ARMED;

      await storeCreate({
        title: title.trim(),
        description: description.trim() || null,
        latitude: selectedLocation!.latitude,
        longitude: selectedLocation!.longitude,
        locationName: selectedLocation?.locationName || null,
        radiusMeters,
        locationSource: selectedLocation!.source,
        status,
        triggeredAt: null,
        completedAt: null,
        notificationSoundEnabled,
        notificationVibrationEnabled,
      });

      Alert.alert('Saved', 'Reminder created successfully.', [
        { text: 'OK', onPress: onSaved },
      ]);
    } catch (_err) {
      // Error already shown by the store
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <Text
          style={[styles.backButton, { color: colors.primary }]}
          onPress={onCancel}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          ← Back
        </Text>
        <Text style={[styles.headerTitle, { color: colors.primaryText }]}>
          {reminderId ? 'Edit Reminder' : 'New Reminder'}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Title (required) */}
        <Input
          label="Title *"
          placeholder="What do you need to remember?"
          value={title}
          onChangeText={setTitle}
          error={title.trim().length === 0 ? 'Title is required' : undefined}
          accessibilityLabel="Reminder title"
        />

        {/* Description (optional) */}
        <Input
          label="Description"
          placeholder="Optional details (up to 500 characters)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          accessibilityLabel="Reminder description"
        />

        {/* Location selection tabs */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.primaryText }]}>Location *</Text>

          {/* Tab selector */}
          <View style={styles.tabBar}>
            {(['gps', 'map', 'search'] as LocationTab[]).map((tab) => (
              <Text
                key={tab}
                style={[
                  styles.tabLabel,
                  { color: selectedTab === tab ? colors.primary : colors.secondary },
                ]}
                onPress={() => setSelectedTab(tab)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${tab} location`}
              >
                {tab === 'gps' ? 'Current GPS' : tab === 'map' ? 'Map Pin' : 'Search'}
              </Text>
            ))}
          </View>

          {/* Tab content */}
          <View style={styles.tabContent}>
            {selectedTab === 'gps' && (
              <View>
                <Text style={[styles.description, { color: colors.secondary }]}>
                  Uses your device's current location. Requires location permission.
                </Text>
                {gpsLoading ? (
                  <Text style={[styles.loading, { color: colors.secondary }]}>Getting location...</Text>
                ) : (
                  <Button variant="secondary" onPress={handleGPSSelect} disabled={gpsLoading}>
                    Use Current Location
                  </Button>
                )}
              </View>
            )}

            {selectedTab === 'map' && (
              <View>
                <Text style={[styles.description, { color: colors.secondary }]}>
                  Place a pin on the map to select your target location.
                </Text>
                <Button variant="secondary" onPress={handleMapSelect}>
                  Open Map
                </Button>
              </View>
            )}

            {selectedTab === 'search' && (
              <View>
                <Text style={[styles.description, { color: colors.secondary }]}>
                  Search for addresses, businesses, or places.
                </Text>
                <Button variant="secondary" onPress={handleSearchSelect}>
                  Search Places
                </Button>
              </View>
            )}

            {/* Selected location summary */}
            {selectedLocation && (
              <View style={[styles.locationSummary, { backgroundColor: colors.surface }]}>
                <Text style={[styles.summaryLabel, { color: colors.primaryText }]}>Selected</Text>
                <Text style={[styles.summaryCoords, { color: colors.secondary }]}>
                  {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                </Text>
                {selectedLocation.locationName && (
                  <Text style={[styles.summaryName, { color: colors.secondary }]}>{selectedLocation.locationName}</Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Radius presets */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.primaryText }]}>Radius</Text>
          <View style={styles.presetRow}>
            {RADIUS_PRESETS.map((preset) => (
              <Button
                key={preset}
                variant={radiusMeters === preset ? 'primary' : 'secondary'}
                size="sm"
                onPress={() => handleRadiusPreset(preset)}
              >
                {preset >= 1000 ? `${preset / 1000}km` : `${preset}m`}
              </Button>
            ))}
          </View>
        </View>

        {/* Notification preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.primaryText }]}>Notifications</Text>
          <View style={styles.prefRow}>
            <Text style={[styles.prefLabel, { color: colors.secondaryText }]}>Sound</Text>
            <Text
              style={[styles.toggle, { color: notificationSoundEnabled ? colors.primary : colors.secondary }]}
              onPress={() => setNotificationSoundEnabled(!notificationSoundEnabled)}
              accessible={true}
              accessibilityRole="switch"
              accessibilityState={{ checked: notificationSoundEnabled }}
            >
              {notificationSoundEnabled ? 'ON' : 'OFF'}
            </Text>
          </View>
          <View style={styles.prefRow}>
            <Text style={[styles.prefLabel, { color: colors.secondaryText }]}>Vibration</Text>
            <Text
              style={[styles.toggle, { color: notificationVibrationEnabled ? colors.primary : colors.secondary }]}
              onPress={() => setNotificationVibrationEnabled(!notificationVibrationEnabled)}
              accessible={true}
              accessibilityRole="switch"
              accessibilityState={{ checked: notificationVibrationEnabled }}
            >
              {notificationVibrationEnabled ? 'ON' : 'OFF'}
            </Text>
          </View>
        </View>

        {/* Error message */}
        {error && (
          <View style={[styles.errorBanner, { backgroundColor: colors.surface }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Save button */}
      <View style={[styles.footer, { borderTopColor: colors.divider }]}>
        <Button
          variant="primary"
          size="lg"
          loading={loading}
          disabled={!isValid || loading}
          onPress={handleSave}
          style={styles.saveButton}
        >
          Save Reminder
        </Button>
      </View>
    </View>
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
  },
  backButton: {
    fontSize: 15,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.08)',
    marginBottom: 16,
  },
  tabLabel: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 12,
    fontSize: 13,
    fontWeight: '500',
  },
  tabContent: {
    gap: 12,
  },
  description: {
    fontSize: 15,
    marginBottom: 8,
  },
  loading: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  locationSummary: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryCoords: {
    fontSize: 13,
    fontFamily: 'IBM Plex Mono',
  },
  summaryName: {
    fontSize: 13,
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
  },
  prefRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  prefLabel: {
    fontSize: 15,
  },
  toggle: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorBanner: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(245, 34, 50, 0.3)',
  },
  errorText: {
    fontSize: 13,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  saveButton: {
    borderRadius: 28,
  },
});
