/**
 * ReminderListScreen — Full reminder list with search and filtering.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { ReminderListItem } from './components/ReminderListItem';
import type { ReminderStatus } from '../models/ReminderStatus';

export interface ReminderListScreenProps {
  /** Navigate to create a new reminder */
  onNavigateCreate: () => void;
  /** Navigate to reminder details */
  onNavigateDetail: (reminderId: string) => void;
  /** All reminders to display */
  reminders: Array<{ id: string; title: string; locationName: string | null; radiusMeters: number; status: ReminderStatus }>;
}

type FilterTab = 'all' | 'active' | 'completed' | 'cancelled';

export function ReminderListScreen({
  onNavigateCreate,
  onNavigateDetail,
  reminders,
}: ReminderListScreenProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  const [filter, setFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter reminders
  const filteredReminders = reminders.filter((r) => {
    // Status filter
    if (filter === 'active' && r.status !== 'ARMED' && r.status !== 'WAITING_FOR_EXIT') {
      return false;
    }
    if (filter === 'completed' && r.status !== 'COMPLETED') {
      return false;
    }
    if (filter === 'cancelled' && r.status !== 'CANCELLED') {
      return false;
    }

    // Search filter (title or location name)
    if (searchQuery.trim().length > 0) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = r.title.toLowerCase().includes(query);
      const matchesLocation = r.locationName?.toLowerCase().includes(query) ?? false;
      return matchesTitle || matchesLocation;
    }

    return true;
  });

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'completed', label: 'Done' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <Text style={[styles.headerTitle, { color: colors.primaryText }]}>Reminders</Text>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: '#F52232' }]}
          onPress={() => {
            console.log('[ReminderList] FAB pressed: navigate to CreateReminder');
            onNavigateCreate();
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.fab, { color: '#FFFFFF', backgroundColor: 'transparent' }]}>
            + Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.divider }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.primaryText }]}
          placeholder="Search reminders..."
          placeholderTextColor={colors.secondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search reminders"
        />
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {filterTabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, { borderBottomColor: filter === tab.key ? colors.primary : 'transparent' }]}
            onPress={() => {
              console.log('[ReminderList] Filter tab pressed:', tab.key);
              setFilter(tab.key);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTab, { color: filter === tab.key ? colors.primary : colors.secondary }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Reminder list */}
      <ScrollView contentContainerStyle={styles.content}>
        {filteredReminders.length > 0 ? (
          filteredReminders.map((reminder) => (
            <ReminderListItem
              key={reminder.id}
              title={reminder.title}
              locationName={reminder.locationName}
              radiusMeters={reminder.radiusMeters}
              status={reminder.status}
              onPress={() => {
                console.log('[ReminderList] Reminder tapped:', reminder.id, reminder.title);
                onNavigateDetail(reminder.id);
              }}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.primaryText }]}>
              {searchQuery ? 'No matching reminders' : 'No reminders yet'}
            </Text>
            <Text style={[styles.emptyBody, { color: colors.secondary }]}>
              {searchQuery ? 'Try a different search term.' : 'Create your first reminder to get started.'}
            </Text>
          </View>
        )}
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
  headerTitle: {
    fontSize: 26,
    fontWeight: '600',
  },
  fab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 28,
    backgroundColor: '#F52232',
    fontSize: 15,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
  filterRow: {
    paddingHorizontal: 16,
    gap: 24,
    paddingBottom: 8,
  },
  filterTab: {
    fontSize: 15,
    fontWeight: '500',
    paddingBottom: 8,
    borderBottomWidth: 2,
  },
  content: {
    padding: 16,
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
  },
});
