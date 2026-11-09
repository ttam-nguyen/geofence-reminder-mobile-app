/**
 * HomeScreen — Dashboard showing active reminders, quick actions, and navigation.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ReminderListItem } from './components/ReminderListItem';
import { SafeAreaWrapper } from '../components/SafeAreaWrapper';
import type { ReminderStatus } from '../models/ReminderStatus';

export interface HomeScreenProps {
  /** Navigate to create reminder screen */
  onNavigateCreate: () => void;
  /** Navigate to full reminder list */
  onNavigateList: () => void;
  /** Navigate to detail screen for a specific reminder */
  onNavigateDetail: (reminderId: string) => void;
  /** Active reminders (ARMED + WAITING_FOR_EXIT) */
  activeReminders: Array<{ id: string; title: string; locationName: string | null; radiusMeters: number; status: ReminderStatus }>;
  /** Total reminder count */
  totalCount: number;
}

export function HomeScreen({
  onNavigateCreate,
  onNavigateList,
  onNavigateDetail,
  activeReminders,
  totalCount,
}: HomeScreenProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <SafeAreaWrapper>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <Text style={[styles.headerTitle, { color: colors.primaryText }]}>GPS Reminder</Text>
        <View style={styles.countBadge}>
          <Text style={[styles.countText, { color: colors.primaryText }]}>
            {activeReminders.length}/{totalCount} active
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Quick actions */}
        <View style={styles.actionsRow}>
          <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Quick Actions</Text>
          <View style={styles.actionButtons}>
            {/* Add Reminder FAB (as a styled button) */}
            <TouchableOpacity
              style={[styles.fab, { backgroundColor: '#F52232' }]}
              onPress={() => {
                console.log('[Home] FAB pressed: navigate to CreateReminder');
                onNavigateCreate();
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.fab, { color: '#FFFFFF', backgroundColor: 'transparent' }]}>
                + Add Reminder
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active reminders preview */}
        {activeReminders.length > 0 ? (
          <View style={styles.remindersSection}>
            <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Active Reminders</Text>
            {activeReminders.slice(0, 5).map((reminder) => (
              <ReminderListItem
                key={reminder.id}
                title={reminder.title}
                locationName={reminder.locationName}
                radiusMeters={reminder.radiusMeters}
                status={reminder.status}
                isActive
                onPress={() => onNavigateDetail(reminder.id)}
              />
            ))}
            {activeReminders.length > 5 && (
              <TouchableOpacity
                style={{ paddingVertical: 4 }}
                onPress={() => {
                  console.log('[Home] See all pressed: navigate to ReminderList, active count:', activeReminders.length);
                  onNavigateList();
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.seeAll, { textAlign: 'center' }]}>See all {activeReminders.length} reminders →</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.primaryText }]}>No active reminders</Text>
            <Text style={[styles.emptyBody, { color: colors.secondary }]}>
              Create a reminder by selecting a location and radius.
            </Text>
            <TouchableOpacity
              style={{ paddingVertical: 4 }}
              onPress={() => {
                console.log('[Home] Empty state action pressed: navigate to CreateReminder');
                onNavigateCreate();
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.emptyAction, { color: colors.primary }]}>Create your first reminder →</Text>
            </TouchableOpacity>
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '600',
  },
  countBadge: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: 'rgba(245, 34, 50, 0.1)',
    alignSelf: 'flex-start',
  },
  countText: {
    fontSize: 13,
    fontWeight: '500',
  },
  content: {
    padding: 20,
  },
  actionsRow: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionButtons: {
    gap: 8,
  },
  fab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
    backgroundColor: '#F52232',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 15,
  },
  remindersSection: {
    gap: 8,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 15,
    marginBottom: 16,
  },
  emptyAction: {
    fontSize: 15,
    fontWeight: '600',
  },
});
