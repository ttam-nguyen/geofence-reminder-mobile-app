// CreateReminder screen — form to create or edit a reminder.

import React, { useState } from 'react';
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

interface CreateReminderScreenProps {
  onCancel?: () => void;
  onSave?: (data: {
    title: string;
    description?: string | null;
    soundEnabled: boolean;
    vibrationEnabled: boolean;
  }) => void;
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
  const reminder = editing ? (props.route.params.reminder as Reminder) : undefined;

  const cancel = props.onCancel ?? (() => navigation.goBack());
  const [title, setTitle] = useState(reminder?.title || '');
  const [description, setDescription] = useState(reminder?.description || '');
  const [titleError, setTitleError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  const handleSave = () => {
    if (!title.trim()) {
      setTitleError('Title is required');
      return;
    }
    setTitleError(null);
    const data = { title: title.trim(), description: description || null, soundEnabled, vibrationEnabled };
    if (props.onSave) {
      props.onSave(data);
    } else {
      navigation.goBack();
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
                  if (t.trim()) setTitleError(null);
                }}
                style={[
                  styles.input,
                  titleError && styles.inputError,
                ]}
                placeholder="e.g. Grocery Store"
                placeholderTextColor={Colors.textMuted}
              />
              {titleError ? (
                <Text style={styles.errorText}>{titleError}</Text>
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
              </View>
              <View style={styles.locationButtons}>
                <Pressable
                  testID="createReminder.location.current.button"
                  accessibilityLabel="Use current location"
                  accessibilityRole="button"
                  style={styles.locationButton}
                >
                  <Text style={styles.locationButtonText}>Current Location</Text>
                </Pressable>
                <Pressable
                  testID="createReminder.location.pin.button"
                  accessibilityLabel="Place a map pin"
                  accessibilityRole="button"
                  style={styles.locationButton}
                >
                  <Text style={styles.locationButtonText}>Place Pin</Text>
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
