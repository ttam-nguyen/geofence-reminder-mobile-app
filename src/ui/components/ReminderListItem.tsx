/**
 * ReminderListItem component — displays a reminder in list view.
 *
 * Shows title, location name, radius, and status badge.
 */

import React from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { Badge } from '../../components/Badge';
import type { ReminderStatus } from '../../models/ReminderStatus';

export interface ReminderListItemProps {
  /** The reminder to display */
  title: string;
  /** Location name (nullable) */
  locationName?: string | null;
  /** Radius in meters */
  radiusMeters: number;
  /** Current status (maps to BadgeStatus) */
  status: ReminderStatus;
  /** Whether the reminder is active (ARMED or WAITING_FOR_EXIT) */
  isActive?: boolean;
  /** Optional style override */
  style?: ViewStyle;
  /** Callback when the item is pressed */
  onPress?: () => void;
}

/** Maps ReminderStatus to BadgeStatus string */
function statusToBadge(status: ReminderStatus): import('../../components/Badge').BadgeStatus {
  switch (status) {
    case 'ARMED': return 'armed';
    case 'WAITING_FOR_EXIT': return 'waiting_for_exit';
    case 'TRIGGERED': return 'triggered';
    case 'COMPLETED': return 'completed';
    case 'DRAFT': return 'draft';
    case 'CANCELLED': return 'cancelled';
    case 'PAUSED': return 'paused';
  }
  return 'draft';
}

export function ReminderListItem({
  title,
  locationName,
  radiusMeters,
  status,
  isActive = false,
  style,
  onPress,
}: ReminderListItemProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <Pressable
      onPress={() => {
        console.log('[ReminderListItem] Tapped:', title, 'status:', status, 'radius:', radiusMeters);
        onPress?.();
      }}
      style={[styles.container, { backgroundColor: colors.surface }, isActive && styles.activeItem, style]}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Reminder: ${title}, status: ${status}, radius: ${radiusMeters} meters`}
    >
      <View style={styles.content}>
        {/* Title row */}
        <Text style={[styles.title, { color: colors.primaryText }]} numberOfLines={1}>
          {title}
        </Text>

        {/* Meta info */}
        <View style={styles.metaRow}>
          {locationName && (
            <Text style={[styles.meta, { color: colors.secondary }]} numberOfLines={1}>
              {locationName}
            </Text>
          )}
          <Text style={[styles.meta, { color: colors.secondary }]}>
            ±{radiusMeters}m
          </Text>
        </View>

        {/* Status badge */}
        <Badge status={statusToBadge(status)}>
          {status}
        </Badge>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    marginBottom: 8,
  },
  activeItem: {
    borderLeftWidth: 3,
    borderLeftColor: '#F52232',
  },
  content: {
    gap: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  meta: {
    fontSize: 13,
  },
});
