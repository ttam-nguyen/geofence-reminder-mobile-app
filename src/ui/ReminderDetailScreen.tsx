/**
 * ReminderDetailScreen — Full reminder details with map preview and actions.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ReminderListItem } from './components/ReminderListItem';
import { ReminderMapView } from './components/ReminderMapView';
import { PermissionStatusView } from './PermissionStatusView';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';
import { ReminderStatus } from '../models/ReminderStatus';

export interface ReminderDetailScreenProps {
  /** Navigate to edit the reminder */
  onNavigateEdit: () => void;
  /** Navigate back */
  onNavigateBack: () => void;
  /** Delete this reminder (with confirmation) */
  onDelete: (reminderId: string) => void;
  /** Toggle between ARMED and PAUSED (arming/disarming) */
  onToggleStatus?: (reminderId: string, newStatus: ReminderStatus) => void;
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
  onToggleStatus,
  reminder,
}: ReminderDetailScreenProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  if (!reminder) {
    return (
      <SafeAreaWrapper>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorTitle, { color: colors.primaryText }]}>Reminder not found</Text>
        <TouchableOpacity style={{ paddingVertical: 4 }} onPress={() => {
          console.log('[ReminderDetail] Back to list pressed (reminder not found)');
          onNavigateBack();
        }} activeOpacity={0.7}>
          <Text style={[styles.backLink, { color: colors.primary }]}>← Back to list</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaWrapper>
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

  // Determine toggleable states: ARMED, DRAFT, WAITING_FOR_EXIT (disarm), PAUSED (re-arm)
  const isToggleable = reminder.status === ReminderStatus.ARMED
    || reminder.status === ReminderStatus.DRAFT
    || reminder.status === ReminderStatus.WAITING_FOR_EXIT
    || reminder.status === ReminderStatus.PAUSED;

  const handleToggleStatus = () => {
    if (!onToggleStatus || !isToggleable) return;
    const targetStatus = reminder.status === ReminderStatus.ARMED
      ? ReminderStatus.PAUSED
      : ReminderStatus.ARMED;
    console.log('[ReminderDetail] Toggling status:', reminder.status, '→', targetStatus);
    onToggleStatus(reminder.id, targetStatus);
  };

  const toggleLabel = reminder.status === ReminderStatus.PAUSED ? 'Activate' : 'Deactivate';

  return (
    <SafeAreaWrapper>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <TouchableOpacity style={{ paddingVertical: 4 }} onPress={() => {
          console.log('[ReminderDetail] Back pressed');
          onNavigateBack();
        }} activeOpacity={0.7}>
          <Text style={[styles.backLink, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={{ paddingVertical: 4 }} onPress={() => {
            console.log('[ReminderDetail] Edit pressed, reminderId:', reminder.id);
            onNavigateEdit();
          }} activeOpacity={0.7}>
            <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ paddingVertical: 4 }} onPress={() => {
            console.log('[ReminderDetail] Delete pressed, reminderId:', reminder.id);
            handleDelete();
          }} activeOpacity={0.7}>
            <Text style={[styles.deleteLink, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
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

          {/* Toggle: Arm / Disarm (only for toggleable states) */}
          {isToggleable && onToggleStatus && (
            <TouchableOpacity
              style={[styles.toggleButton, { backgroundColor: reminder.status === ReminderStatus.PAUSED ? '#48BB78' : '#F52232' }]}
              onPress={handleToggleStatus}
              activeOpacity={0.7}
            >
              <Text style={styles.toggleButtonText}>
                {toggleLabel}
              </Text>
            </TouchableOpacity>
          )}



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
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    gap: 8,
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
