// ReminderCard — glass-styled card showing a reminder's summary.

import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { Reminder, ReminderStatus } from '../types/Reminder';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';

interface ReminderCardProps {
  reminder: Reminder;
  onPress?: (id: string) => void;
  onExpand?: (id: string) => void;
  expanded?: boolean;
}

const statusColors: Record<ReminderStatus, string> = {
  [ReminderStatus.DRAFT]: Colors.textMuted,
  [ReminderStatus.WAITING_FOR_EXIT]: Colors.waitingAmber,
  [ReminderStatus.ARMED]: Colors.successGreen,
  [ReminderStatus.ARRIVAL_PENDING]: Colors.signalRed,
  [ReminderStatus.TRIGGERED]: Colors.textMuted,
  [ReminderStatus.COMPLETED]: Colors.textMuted,
  [ReminderStatus.PAUSED]: Colors.waitingAmber,
  [ReminderStatus.DELETED]: Colors.danger,
};

export function ReminderCard({
  reminder,
  onPress,
  onExpand,
  expanded,
}: ReminderCardProps) {
  const statusColor = statusColors[reminder.status] || Colors.textMuted;

  return (
    <Pressable
      testID={`home.reminder.card.${reminder.id}`}
      accessibilityLabel={`${reminder.title} — ${reminder.status}`}
      accessibilityRole="button"
      onPress={() => onPress?.(reminder.id)}
      style={styles.card}
    >
      <View style={styles.header}>
        <Text style={Typography.h3} numberOfLines={1}>
          {reminder.title}
        </Text>
        <View
          style={[styles.statusDot, { backgroundColor: statusColor }]}
        />
      </View>

      <Text style={Typography.bodySmall} numberOfLines={2}>
        {reminder.locationName || 'No location name'}
      </Text>

      {reminder.description ? (
        <Text style={Typography.caption} numberOfLines={1}>
          {reminder.description}
        </Text>
      ) : null}

      <View style={styles.footer}>
        <Text style={Typography.caption}>{reminder.radiusMeters}m radius</Text>
        {expanded && onExpand ? (
          <Pressable
            testID={`home.reminder.expand.${reminder.id}`}
            accessibilityLabel="Collapse reminder"
            accessibilityRole="button"
            onPress={() => onExpand?.(reminder.id)}
            style={styles.expandButton}
          >
            <Text style={Typography.caption}>▲</Text>
          </Pressable>
        ) : null}
      </View>

      {expanded && reminder.description ? (
        <Text style={styles.description}>{reminder.description}</Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    ...Platform.select({
      ios: {
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  expandButton: {
    padding: Spacing.xs,
  },
  description: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderGlass,
    ...Typography.caption,
  },
});
