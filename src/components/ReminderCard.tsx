// ReminderCard — glass-styled card showing a reminder's summary with status badge and overflow menu.

import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { Reminder, ReminderStatus } from '../types/Reminder';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';

interface ReminderCardProps {
  reminder: Reminder;
  onPress?: (id: string) => void;
  onExpand?: (id: string) => void;
  onOverflowPress?: (id: string, action: 'edit' | 'complete' | 'delete') => void;
  expanded?: boolean;
}

const statusLabels: Record<ReminderStatus, string> = {
  [ReminderStatus.DRAFT]: 'Draft',
  [ReminderStatus.WAITING_FOR_EXIT]: 'Waiting for Exit',
  [ReminderStatus.ARMED]: 'Active',
  [ReminderStatus.ARRIVAL_PENDING]: 'Arriving…',
  [ReminderStatus.TRIGGERED]: 'Triggered',
  [ReminderStatus.COMPLETED]: 'Completed',
  [ReminderStatus.PAUSED]: 'Paused',
  [ReminderStatus.DELETED]: 'Deleted',
};

const statusColors: Record<ReminderStatus, string> = {
  [ReminderStatus.DRAFT]: Colors.textMuted,
  [ReminderStatus.WAITING_FOR_EXIT]: Colors.waitingAmber,
  [ReminderStatus.ARMED]: Colors.successGreen,
  [ReminderStatus.ARRIVAL_PENDING]: Colors.signalRed,
  [ReminderStatus.TRIGGERED]: Colors.danger,
  [ReminderStatus.COMPLETED]: Colors.textMuted,
  [ReminderStatus.PAUSED]: Colors.waitingAmber,
  [ReminderStatus.DELETED]: Colors.danger,
};

export function ReminderCard({
  reminder,
  onPress,
  onExpand,
  onOverflowPress,
  expanded,
}: ReminderCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const statusColor = statusColors[reminder.status] || Colors.textMuted;
  const isTriggered = reminder.status === ReminderStatus.TRIGGERED;

  return (
    <Pressable
      testID={`home.reminder.card.${reminder.id}`}
      accessibilityLabel={`${reminder.title} — ${statusLabels[reminder.status]}`}
      accessibilityRole="button"
      onPress={() => onPress?.(reminder.id)}
      style={styles.card}
    >
      {/* Header: title + status badge + overflow */}
      <View style={styles.header}>
        <Text style={Typography.h3} numberOfLines={1}>
          {reminder.title}
        </Text>
        <View style={styles.headerRight}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{statusLabels[reminder.status]}</Text>
          </View>
          <TouchableOpacity
            testID={`home.reminder.overflow.${reminder.id}`}
            accessibilityLabel="More options"
            accessibilityRole="button"
            onPress={() => setShowMenu(true)}
            style={styles.overflowButton}
          >
            <Text style={styles.overflowIcon}>⋮</Text>
          </TouchableOpacity>
        </View>
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
        {onExpand ? (
          <Pressable
            testID={`home.reminder.expand.${reminder.id}`}
            accessibilityLabel={expanded ? 'Collapse reminder' : 'Expand reminder'}
            accessibilityRole="button"
            onPress={() => onExpand?.(reminder.id)}
            style={styles.expandButton}
          >
            <Text style={[Typography.caption, styles.expandIcon]}>
              {expanded ? '▲' : '▼'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {expanded && reminder.description ? (
        <Text style={styles.description}>{reminder.description}</Text>
      ) : null}

      {/* Overflow menu */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setShowMenu(false)}>
          <View style={styles.menu}>
            {!isTriggered && (
              <Pressable
                testID={`home.reminder.overflow.edit.${reminder.id}`}
                accessibilityLabel="Edit reminder"
                accessibilityRole="button"
                onPress={() => {
                  onOverflowPress?.(reminder.id, 'edit');
                  setShowMenu(false);
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuItemText}>Edit</Text>
              </Pressable>
            )}
            {!isTriggered && (
              <Pressable
                testID={`home.reminder.overflow.complete.${reminder.id}`}
                accessibilityLabel="Complete reminder"
                accessibilityRole="button"
                onPress={() => {
                  onOverflowPress?.(reminder.id, 'complete');
                  setShowMenu(false);
                }}
                style={styles.menuItem}
              >
                <Text style={styles.menuItemText}>Complete</Text>
              </Pressable>
            )}
            <Pressable
              testID={`home.reminder.overflow.delete.${reminder.id}`}
              accessibilityLabel="Delete reminder"
              accessibilityRole="button"
              onPress={() => {
                onOverflowPress?.(reminder.id, 'delete');
                setShowMenu(false);
              }}
              style={styles.menuItem}
            >
              <Text style={[styles.menuItemText, styles.deleteText]}>Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
        WebKitBackdropFilter: 'blur(10px)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  overflowButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  overflowIcon: {
    fontSize: 18,
    color: Colors.textMuted,
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
  expandIcon: {
    color: Colors.signalRed,
  },
  description: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderGlass,
    ...Typography.caption,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menu: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    margin: Spacing.md,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  menuItem: {
    padding: Spacing.md,
  },
  menuItemText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },
  deleteText: {
    color: Colors.danger,
  },
});
