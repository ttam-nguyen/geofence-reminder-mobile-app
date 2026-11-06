/**
 * ReminderDetailScreen — Full reminder details with map preview and actions.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ReminderListItem } from './components/ReminderListItem';
import { ReminderMapView } from './components/ReminderMapView';
import { PermissionStatusView } from './PermissionStatusView';

export interface ReminderDetailScreenProps {
  /** Navigate to edit the reminder */
  onNavigateEdit: () => void;
  /** Navigate back */
  onNavigateBack: () => void;
  /** Delete this reminder (with confirmation) */
  onDelete: (reminderId: string) => void;
  /** The reminder to display */
  reminder: {
    id: string;
    title: string;
    description: string | null;
    latitude: number;
    longitude: number;
    locationName: string | null;
    radiusMeters: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    triggeredAt: string | null;
    completedAt: string | null;
  } | null;
}

export function ReminderDetailScreen({
  onNavigateEdit,
  onNavigateBack,
  onDelete,
  reminder,
}: ReminderDetailScreenProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  if (!reminder) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.primaryText }]}>Reminder not found</Text>
        <Text style={[styles.backLink, { color: colors.primary }]} onPress={onNavigateBack}>
          ← Back to list
        </Text>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Reminder',
      `Are you sure you want to delete "${reminder.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete(reminder.id),
        },
      ],
    );
  };

  const formatTimestamp = (ts: string | null) => {
    if (!ts) return '—';
    return new Date(ts).toLocaleString();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <Text
          style={[styles.backLink, { color: colors.primary }]}
          onPress={onNavigateBack}
          accessible={true}
          accessibilityRole="button"
        >
          ← Back
        </Text>
        <View style={styles.headerActions}>
          <Text
            style={[styles.editLink, { color: colors.primary }]}
            onPress={onNavigateEdit}
            accessible={true}
            accessibilityRole="button"
          >
            Edit
          </Text>
          <Text
            style={[styles.deleteLink, { color: colors.error }]}
            onPress={handleDelete}
            accessible={true}
            accessibilityRole="button"
          >
            Delete
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Map preview */}
        <ReminderMapView
          latitude={reminder.latitude}
          longitude={reminder.longitude}
          radiusMeters={reminder.radiusMeters}
          style={styles.mapPreview}
        />

        {/* Reminder info */}
        <View style={styles.infoSection}>
          <Text style={[styles.title, { color: colors.primaryText }]}>{reminder.title}</Text>

          {reminder.description && (
            <Text style={[styles.description, { color: colors.secondaryText }]}>{reminder.description}</Text>
          )}

          <View style={styles.metaRow}>
            {reminder.locationName && (
              <Text style={[styles.meta, { color: colors.secondary }]}>{reminder.locationName}</Text>
            )}
            <Text style={[styles.meta, { color: colors.secondary }]}>±{reminder.radiusMeters}m</Text>
          </View>

          {/* Status */}
          <ReminderListItem
            title={reminder.title}
            locationName={reminder.locationName}
            radiusMeters={reminder.radiusMeters}
            status={reminder.status as any}
          />

          {/* Timestamps */}
          <View style={styles.timestamps}>
            <Text style={[styles.timestampLabel, { color: colors.primaryText }]}>Created</Text>
            <Text style={[styles.timestamp, { color: colors.secondary }]}>{formatTimestamp(reminder.createdAt)}</Text>
            <Text style={[styles.timestampLabel, { color: colors.primaryText }]}>Updated</Text>
            <Text style={[styles.timestamp, { color: colors.secondary }]}>{formatTimestamp(reminder.updatedAt)}</Text>
            {reminder.triggeredAt && (
              <>
                <Text style={[styles.timestampLabel, { color: colors.primaryText }]}>Triggered</Text>
                <Text style={[styles.timestamp, { color: colors.secondary }]}>{formatTimestamp(reminder.triggeredAt)}</Text>
              </>
            )}
          </View>

          {/* Permission status */}
          <PermissionStatusView
            notificationPermission={null}
            locationPermission={null}
            showLocationStatus
          />
        </View>
      </ScrollView>
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
  backLink: {
    fontSize: 15,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  editLink: {
    fontSize: 15,
    fontWeight: '600',
  },
  deleteLink: {
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  mapPreview: {
    marginBottom: 20,
  },
  infoSection: {
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
  },
  description: {
    fontSize: 15,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  meta: {
    fontSize: 13,
  },
  timestamps: {
    gap: 4,
  },
  timestampLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
  },
  timestamp: {
    fontSize: 13,
  },
  errorTitle: {
    fontSize: 26,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 40,
  },
});
