// CreateReminder screen — form to create or edit a reminder.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  SafeAreaView as RNSafeAreaView,
  ScrollView,
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import type { Region } from 'react-native-maps';
import { useNavigation } from '@react-navigation/native';
import { PressableArea, PrimaryActionButton } from "../components/PressableArea";
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { Reminder, ReminderStatus, LocationSource } from '../types/Reminder';
import { SafeAreaView as SafeArea } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { store, updateReminder } from '../stores/reminderStore';
import { validateReminderPayload, clampRadius } from '../models/validation';
import { reverseGeocode, forwardGeocode } from '../utils/geocoding';

interface CreateReminderScreenProps {
  onCancel?: () => void;
  /** Pass a reminder to edit; omit for create mode. */
  reminder?: Reminder;
}

type Props = NativeStackScreenProps<RootStackParamList, 'CreateReminder'> &
  CreateReminderScreenProps;

const isEditing = (props: Props): boolean => {
  return 'reminder' in props.route.params && !!props.route.params.reminder;
};

const DEFAULT_REGION: Region = {
  latitude: 0,
  longitude: 0,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export function CreateReminderScreen(props: Props) {
  const navigation = useNavigation<NativeStackScreenProps<RootStackParamList>['navigation']>();
  const editing = isEditing(props);
  const initialReminder = editing ? (props.route.params.reminder as Reminder) : undefined;

  const cancel = props.onCancel ?? (() => navigation.goBack());
  const [title, setTitle] = useState(initialReminder?.title || '');
  const [description, setDescription] = useState(initialReminder?.description || '');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(initialReminder?.notificationSoundEnabled ?? true);
  const [vibrationEnabled, setVibrationEnabled] = useState(initialReminder?.notificationVibrationEnabled ?? true);
  const [latitude, setLatitude] = useState<number | undefined>(initialReminder?.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(initialReminder?.longitude);
  const [locationName, setLocationName] = useState<string | null>(initialReminder?.locationName ?? null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Location mode state
  const [locationMode, setLocationMode] = useState<LocationSource>(
    initialReminder?.locationSource ?? 'current',
  );
  const [mapRegion, setMapRegion] = useState<Region | null>(null);
  const [pinCoordinate, setPinCoordinate] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Ref to prevent duplicate geolocation calls between handleCurrentLocation and useEffect.
  const geolocationInProgress = useRef(false);

  // Android permission check + @react-native-community/geolocation.
  const getCurrentLocation = useCallback(async (): Promise<{ lat: number; lon: number } | null> => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        { title: 'Location Access', message: 'This app needs location access.', buttonPositive: 'OK' },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        return null;
      }
    }

    return new Promise<{ lat: number; lon: number } | null>((resolve) => {
      Geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => {
          console.error('[CreateReminderScreen] Geolocation error:', err);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 },
      );
    });
  }, []);

  // Auto-fetch current location on new reminder creation (only if no location set yet).
  useEffect(() => {
    if (!editing && !latitude && !geolocationInProgress.current) {
      geolocationInProgress.current = true;
      getCurrentLocation().then((loc) => {
        geolocationInProgress.current = false;
        if (loc) {
          setLatitude(loc.lat);
          setLongitude(loc.lon);
          setLocationName('Current location');
        }
      }).catch((err) => {
        geolocationInProgress.current = false;
        console.error('[CreateReminderScreen] Geolocation error:', err);
      });
    }
  }, [editing, latitude, getCurrentLocation]);

  const handleCurrentLocation = useCallback(async () => {
    if (geolocationInProgress.current) return;

    geolocationInProgress.current = true;
    setIsGettingLocation(true);
    try {
      const loc = await getCurrentLocation();
      geolocationInProgress.current = false;
      if (!loc) return;

      setLatitude(loc.lat);
      setLongitude(loc.lon);
      setLocationName('Current location');

      // Reverse geocode to get place name.
      const address = await reverseGeocode(loc.lat, loc.lon);
      if (address) {
        setLocationName(address);
      }

      // Center map on current location.
      setMapRegion({
        latitude: loc.lat,
        longitude: loc.lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (err) {
      geolocationInProgress.current = false;
      console.error('[CreateReminderScreen] handleCurrentLocation error:', err);
    } finally {
      setIsGettingLocation(false);
    }
  }, [getCurrentLocation]);

  const handleMapPress = useCallback(
    (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
      const coord = e.nativeEvent.coordinate;
      setPinCoordinate(coord);
      setLatitude(coord.latitude);
      setLongitude(coord.longitude);

      // Reverse geocode the selected pin.
      reverseGeocode(coord.latitude, coord.longitude).then((address) => {
        if (address) {
          setLocationName(address);
        }
      });
    },
    [],
  );

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();
    if (!query) {
      setSearchError('Enter an address to search.');
      return;
    }
    setIsSearching(true);
    setSearchError(null);
    try {
      const result = await forwardGeocode(query);
      if (!result) {
        setSearchError('No results found for that address.');
        return;
      }
      setLatitude(result.latitude);
      setLongitude(result.longitude);
      setLocationName(result.displayName);
      setMapRegion({
        latitude: result.latitude,
        longitude: result.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
    } catch (err) {
      console.error('[CreateReminderScreen] handleSearch error:', err);
      setSearchError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    // Guard against double taps while the GPS fix and the write are in flight.
    if (isSaving) {
      return;
    }
    setIsSaving(true);

    // Skip lat/lon validation when not yet available (geolocation pending).
    const validation = validateReminderPayload(
      title,
      description,
      latitude ?? undefined,
      longitude ?? undefined,
      200,
    );
    if (!validation.valid) {
      setValidationErrors(validation.errors.map((e) => e.message));
      setIsSaving(false);
      return;
    }
    setValidationErrors([]);

    const radiusMeters = clampRadius(200);
    const now = new Date().toISOString();

    try {
      // Fetch the user's actual current position (used only to determine the
      // reminder's initial status). Never block save on a slow/failed GPS fix.
      const userLocation = await getCurrentLocation();
      const userPosition = userLocation
        ? { latitude: userLocation.lat, longitude: userLocation.lon }
        : undefined;

      if (editing && initialReminder) {
        // Update existing reminder — use updateReminder to preserve status
        // while recalculating based on the user's actual GPS position.
        const updated: Reminder = {
          ...initialReminder,
          title: title.trim(),
          description: description || null,
          latitude: latitude ?? initialReminder.latitude,
          longitude: longitude ?? initialReminder.longitude,
          locationName: locationName || initialReminder.locationName,
          radiusMeters,
          notificationSoundEnabled: soundEnabled,
          notificationVibrationEnabled: vibrationEnabled,
          notificationId: initialReminder?.notificationId ?? null,
          lastStationaryReadingAt: null,
          lastStationaryReadingLat: null,
          lastStationaryReadingLon: null,
          updatedAt: now,
          locationSource: locationMode,
        };

        await updateReminder(updated, userPosition);
      } else {
        // Create new reminder.
        const locationSource: LocationSource = locationMode;
        const newReminder: Reminder = {
          id: `reminder-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          title: title.trim(),
          description: description || null,
          latitude: latitude ?? 0,
          longitude: longitude ?? 0,
          locationName,
          radiusMeters,
          status: ReminderStatus.DRAFT,
          notificationSoundEnabled: soundEnabled,
          notificationVibrationEnabled: vibrationEnabled,
          notificationId: null,
          createdAt: now,
          updatedAt: now,
          triggeredAt: null,
          completedAt: null,
          locationSource,
          lastStationaryReadingAt: null,
          lastStationaryReadingLat: null,
          lastStationaryReadingLon: null,
        };

        await store.save(newReminder, userPosition);
      }

      navigation.goBack();
    } catch (err) {
      console.error('[CreateReminderScreen] Save failed:', err);
      setValidationErrors(['Could not save the reminder. Please try again.']);
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <SafeArea edges={['bottom']} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Text style={Typography.h2}>
              {editing ? 'Edit Reminder' : 'Create Reminder'}
            </Text>

            <View style={styles.field}>
              <Text style={Typography.bodySmall}>Title</Text>
              <TextInput
                testID="createReminder.title.input"
                accessibilityLabel="Reminder title"
                value={title}
                onChangeText={(t) => {
                  setTitle(t);
                  if (validationErrors.length > 0) {
                    setValidationErrors(validationErrors.filter((e) => !e.startsWith('Title')));
                  }
                }}
                style={[
                  styles.input,
                  validationErrors.some((e) => e.startsWith('Title')) && styles.inputError,
                ]}
                placeholder="e.g. Grocery Store"
                placeholderTextColor={Colors.textMuted}
              />
              {validationErrors.length > 0 ? (
                <View style={styles.errorList}>
                  {validationErrors.map((err, i) => (
                    <Text key={i} style={styles.errorText}>{err}</Text>
                  ))}
                </View>
              ) : null}
            </View>

            <View style={styles.field}>
              <Text style={Typography.bodySmall}>Description (optional)</Text>
              <TextInput
                testID="createReminder.description.input"
                accessibilityLabel="Reminder description"
                value={description || ''}
                onChangeText={setDescription}
                style={[styles.input, styles.textArea]}
                placeholder="e.g. Buy eggs and milk"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Location section */}
            <View style={styles.locationSection}>
              <Text style={Typography.bodySmall}>Location</Text>



              <View style={styles.locationInfo}>
                <Text style={Typography.caption}>200m radius (fixed)</Text>
                {latitude && longitude ? (
                  <Text style={Typography.caption}>
                    {latitude.toFixed(4)}, {longitude.toFixed(4)}
                    {locationName ? ` — ${locationName}` : ''}
                  </Text>
                ) : (
                  <Text style={Typography.caption}>No location set</Text>
                )}
              </View>

              {/* Mode toggle */}
              <View style={styles.modeToggle}>
                <PressableArea
                  testID="createReminder.location.current.button"
                  accessibilityLabel="Use current location"
                  accessibilityRole="button"
                  style={[
                    styles.modeButton,
                    locationMode === 'current' && styles.modeButtonActive,
                  ]}
                  onPress={() => {
                    setLocationMode('current');
                    setPinCoordinate(null);
                  }}
                >
                  <Text style={styles.modeButtonText}>
                    Current Location
                  </Text>
                </PressableArea>
                <PressableArea
                  testID="createReminder.location.pin.button"
                  accessibilityLabel="Drop pin on map"
                  accessibilityRole="button"
                  style={[
                    styles.modeButton,
                    locationMode === 'pin' && styles.modeButtonActive,
                  ]}
                  onPress={() => {
                    setLocationMode('pin');
                    setPinCoordinate(null);
                  }}
                >
                  <Text style={styles.modeButtonText}>Drop Pin</Text>
                </PressableArea>
                <PressableArea
                  testID="createReminder.location.search.button"
                  accessibilityLabel="Search address"
                  accessibilityRole="button"
                  style={[
                    styles.modeButton,
                    locationMode === 'search' && styles.modeButtonActive,
                  ]}
                  onPress={() => {
                    setLocationMode('search');
                    setPinCoordinate(null);
                  }}
                >
                  <Text style={styles.modeButtonText}>Search</Text>
                </PressableArea>
              </View>

              {/* Inline map for pin mode */}
              {locationMode === 'pin' && (
                <View style={styles.inlineMapContainer}>
                  <MapView
                    provider={Platform.OS === 'android' ? PROVIDER_DEFAULT : undefined}
                    style={styles.inlineMap}
                    initialRegion={mapRegion ?? DEFAULT_REGION}
                    onRegionChangeComplete={(newRegion: Region) => setMapRegion(newRegion)}
                    onPress={handleMapPress}
                  >
                    {pinCoordinate && (
                      <Marker
                        coordinate={pinCoordinate}
                        title="Selected"
                        pinColor={Colors.signalRed}
                      />
                    )}
                  </MapView>
                </View>
              )}

              {/* Current location button (non-pin mode) */}
              {locationMode === 'current' && (
                <PressableArea
                  testID="createReminder.location.getCurrent.button"
                  accessibilityLabel="Get current location"
                  style={[styles.getLocationButton, isGettingLocation && styles.getLocationButtonDisabled]}
                  onPress={handleCurrentLocation}
                  disabled={isGettingLocation}
                >
                  <Text style={styles.getLocationButtonText}>
                    {isGettingLocation ? 'Getting location...' : 'Get Current Location'}
                  </Text>
                </PressableArea>
              )}

              {/* Address search mode */}
              {locationMode === 'search' && (
                <View style={styles.searchContainer}>
                  <TextInput
                    testID="createReminder.location.search.input"
                    accessibilityLabel="Search address"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    style={styles.input}
                    placeholder="e.g. 123 Main St, Springfield"
                    placeholderTextColor={Colors.textMuted}
                  />
                  <PressableArea
                    testID="createReminder.location.search.submit"
                    accessibilityLabel="Search address"
                    accessibilityRole="button"
                    style={[styles.getLocationButton, isSearching && styles.getLocationButtonDisabled]}
                    onPress={handleSearch}
                    disabled={isSearching}
                  >
                    <Text style={styles.getLocationButtonText}>
                      {isSearching ? 'Searching...' : 'Search Address'}
                    </Text>
                  </PressableArea>
                  {searchError ? (
                    <Text style={styles.errorText}>{searchError}</Text>
                  ) : null}
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={Typography.bodySmall}>Notifications</Text>
              <View style={styles.toggleRow}>
                <Text style={Typography.body}>Sound</Text>
                <Switch
                  testID="createReminder.notification.sound.toggle"
                  accessibilityLabel="Toggle notification sound"
                  accessibilityRole="switch"
                  value={soundEnabled}
                  onValueChange={setSoundEnabled}
                  trackColor={{ false: Colors.disabledFill, true: Colors.signalRed }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <View style={styles.toggleRow}>
                <Text style={Typography.body}>Vibration</Text>
                <Switch
                  testID="createReminder.notification.vibration.toggle"
                  accessibilityLabel="Toggle notification vibration"
                  accessibilityRole="switch"
                  value={vibrationEnabled}
                  onValueChange={setVibrationEnabled}
                  trackColor={{ false: Colors.disabledFill, true: Colors.signalRed }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Bottom action buttons — pinned to bottom with padding */}
            <View style={styles.buttonRow}>
              <PressableArea
                testID="createReminder.cancel.button"
                accessibilityLabel="Cancel"
                accessibilityRole="button"
                onPress={cancel}
                style={[styles.button, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </PressableArea>
              <PrimaryActionButton
                testID="createReminder.save.button"
                accessibilityLabel="Save reminder"
                label={editing ? 'Save changes' : 'Save reminder'}
                loadingLabel="Saving…"
                loading={isSaving}
                disabled={isSaving}
                onPress={handleSave}
              />
            </View>

            {/* Spacer: ensures buttons stay above keyboard */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </SafeArea>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  field: {
    marginBottom: Spacing.md,
  },
  input: {
    backgroundColor: Colors.surfaceGlassStrong,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    color: Colors.textPrimary,
    fontSize: 16,
    minHeight: 48,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorList: {
    marginTop: Spacing.xs,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 12,
    marginTop: Spacing.xs,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  locationSection: {
    marginBottom: Spacing.md,
  },
  locationInfo: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  modeButton: {
    flex: 1,
    backgroundColor: Colors.surfaceGlassStrong,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    alignItems: 'center',
  },
  modeButtonActive: {
    borderColor: Colors.signalRed,
    backgroundColor: Colors.signalRedSoft,
  },
  modeButtonText: {
    ...Typography.bodySmall,
    color: Colors.signalRed,
  },
  getLocationButton: {
    backgroundColor: Colors.surfaceGlassStrong,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    alignItems: 'center',
  },
  getLocationButtonDisabled: {
    opacity: 0.6,
  },
  getLocationButtonText: {
    ...Typography.bodySmall,
    color: Colors.signalRed,
  },
  searchContainer: {
    gap: Spacing.sm,
  },
  inlineMapContainer: {
    height: 200,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  inlineMap: {
    width: '100%',
    height: '100%',
  },

  section: {
    marginBottom: Spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    minHeight: 48,
  },
  cancelButton: {
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  cancelButtonText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  bottomSpacer: {
    height: 48,
  },
});
