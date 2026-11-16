// Map screen — static placeholder showing reminder coordinates and status.
// Live map integration is deferred until a native-compatible library is available.

import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView as SafeArea } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { store } from '../stores/reminderStore';
import { Reminder, ReminderStatus } from '../types/Reminder';

const STATUS_LABELS: Record<ReminderStatus, string> = {
  [ReminderStatus.DRAFT]: 'Draft',
  [ReminderStatus.WAITING_FOR_EXIT]: 'Waiting for Exit',
  [ReminderStatus.ARMED]: 'Armed',
  [ReminderStatus.ARRIVAL_PENDING]: 'Arrival Pending',
  [ReminderStatus.TRIGGERED]: 'Triggered',
  [ReminderStatus.COMPLETED]: 'Completed',
  [ReminderStatus.PAUSED]: 'Paused',
  [ReminderStatus.CANCELLED]: 'Cancelled',
  [ReminderStatus.DELETED]: 'Deleted',
};

const STATUS_COLORS: Record<ReminderStatus, string> = {
  [ReminderStatus.DRAFT]: Colors.textMuted,
  [ReminderStatus.WAITING_FOR_EXIT]: Colors.waitingAmber,
  [ReminderStatus.ARMED]: Colors.signalRed,
  [ReminderStatus.ARRIVAL_PENDING]: Colors.infoBlue,
  [ReminderStatus.TRIGGERED]: Colors.danger,
  [ReminderStatus.COMPLETED]: Colors.successGreen,
  [ReminderStatus.PAUSED]: Colors.textMuted,
  [ReminderStatus.CANCELLED]: Colors.textMuted,
  [ReminderStatus.DELETED]: Colors.textMuted,
};

function isRelevantStatus(status: ReminderStatus): boolean {
  return status !== ReminderStatus.DRAFT &&
    status !== ReminderStatus.CANCELLED &&
    status !== ReminderStatus.DELETED;
}

function formatCoord(value: number | null): string {
  if (value === null) return '—';
  return value.toFixed(4);
}

function ReminderRow({ reminder }: { reminder: Reminder }) {
  return (
    <View style={styles.row}>
      <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[reminder.status] }]} />
      <View style={styles.rowContent}>
        <Text style={Typography.body}>{reminder.title}</Text>
        <Text style={Typography.caption}>
          {formatCoord(reminder.latitude)}, {formatCoord(reminder.longitude)}
        </Text>
        <Text style={[Typography.caption, { color: STATUS_COLORS[reminder.status] }]}>
          {STATUS_LABELS[reminder.status]}
        </Text>
      </View>
    </View>
  );
}

export function MapScreen() {
  const [reminders] = useState<Reminder[]>(store.findAll());

  const relevantReminders = useMemo(
    () => reminders.filter(r => isRelevantStatus(r.status)),
    [reminders],
  );

  return (
    <SafeArea style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={Typography.h2}>Map</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={[Typography.bodySmall, { marginBottom: Spacing.md }]}>
          Interactive map view is not yet available.
        </Text>
        <Text style={[Typography.caption, { marginBottom: Spacing.sm }]}>
          Below are your active reminders with their coordinates and status.
        </Text>
      </View>

      <FlatList
        data={relevantReminders}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <ReminderRow reminder={item} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={Typography.bodySmall}>No active reminders to display.</Text>
          </View>
        }
      />
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  placeholder: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  list: {
    paddingHorizontal: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  rowContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  emptyState: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
});
