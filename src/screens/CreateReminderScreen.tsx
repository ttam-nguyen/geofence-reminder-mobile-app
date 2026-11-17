// CreateReminder screen — form to create or edit a reminder.

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  SafeAreaView as RNSafeAreaView,
  ScrollView,
  Pressable,
  Switch,
  KeyboardAvoidingView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { Reminder, ReminderStatus } from '../types/Reminder';
import { SafeAreaView as SafeArea } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { store } from '../stores/reminderStore';
import { validateReminderPayload, clampRadius } from '../models/validation';

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

  useEffect(() => {
    // Try to get current location when creating a new reminder.
    if (!editing && !latitude) {
      const nav = (globalThis as any).navigator;
      nav?.geolocation?.getCurrentPosition(
        (pos: { coords: { latitude: number; longitude: number } }) => {
          setLatitude(pos.coords.latitude);
          setLongitude(pos.coords.longitude);
        },
        () => { /* silently ignore geolocation errors */ },
        { enableHighAccuracy: true, timeout: 5000 },
      );
    }
  }, [editing, latitude]);

  const handleSave = async () => {
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
      return;
    }
    setValidationErrors([]);

    const radiusMeters = clampRadius(200);
    const now = new Date().toISOString();

    try {
      if (editing && initialReminder) {
        // Update existing reminder.
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
          updatedAt: now,
          locationSource: initialReminder.locationSource ?? 'current',
        };
        await store.save(updated);
      } else {
        // Create new reminder.
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
          createdAt: now,
          updatedAt: now,
          triggeredAt: null,
          completedAt: null,
          locationSource: 'current',
        };
        await store.save(newReminder);
      }

      navigation.goBack();
    } catch (err) {
      console.error('[CreateReminderScreen] Save failed:', err);
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
              <View style={styles.locationButtons}>
                <Pressable
                  testID="createReminder.location.current.button"
                  accessibilityLabel="Use current location"
                  accessibilityRole="button"
                  style={styles.locationButton}
                  onPress={() => {
                    const nav = (globalThis as any).navigator;
                    nav?.geolocation?.getCurrentPosition(
                      (pos: { coords: { latitude: number; longitude: number } }) => {
                        setLatitude(pos.coords.latitude);
                        setLongitude(pos.coords.longitude);
                      },
                      () => {},
                      { enableHighAccuracy: true, timeout: 5000 },
                    );
                  }}
                >
                  <Text style={styles.locationButtonText}>Current Location</Text>
                </Pressable>
              </View>
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
              <Pressable
                testID="createReminder.cancel.button"
                accessibilityLabel="Cancel"
                accessibilityRole="button"
                onPress={cancel}
                style={[styles.button, styles.cancelButton]}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                testID="createReminder.save.button"
                accessibilityLabel="Save reminder"
                accessibilityRole="button"
                onPress={handleSave}
                style={[styles.button, styles.saveButton]}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
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
  locationButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  locationButton: {
    flex: 1,
    backgroundColor: Colors.surfaceGlassStrong,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    alignItems: 'center',
  },
  locationButtonText: {
    ...Typography.bodySmall,
    color: Colors.signalRed,
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
  saveButton: {
    backgroundColor: Colors.signalRed,
  },
  saveButtonText: {
    ...Typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 48,
  },
});
