// Home screen — list of reminders with mock data, detail navigation, and overflow actions.

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView as SafeArea } from 'react-native-safe-area-context';
import { mockReminders } from '../data/mockReminders';
import { ReminderCard } from '../components/ReminderCard';
import { Reminder, ReminderStatus } from '../types/Reminder';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';

interface HomeScreenProps {
  onNavigateToCreate: (reminderId?: string, reminder?: Reminder) => void;
  onNavigateToDetail?: (reminder: Reminder) => void;
}

export function HomeScreen({ onNavigateToCreate, onNavigateToDetail }: HomeScreenProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleCardPress = (id: string) => {
    const reminder = mockReminders.find((r) => r.id === id);
    if (reminder && onNavigateToDetail) {
      onNavigateToDetail(reminder);
    }
  };

  const handleOverflow = (id: string, action: 'edit' | 'complete' | 'delete') => {
    const reminder = mockReminders.find((r) => r.id === id);
    if (!reminder) return;

    if (action === 'edit') {
      onNavigateToCreate(reminder.id, reminder);
    } else if (action === 'complete') {
      Alert.alert(
        'Complete Reminder',
        `Mark "${reminder.title}" as completed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete', onPress: () => {} },
        ],
      );
    } else if (action === 'delete') {
      Alert.alert(
        'Delete Reminder',
        `Are you sure you want to delete "${reminder.title}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => {} },
        ],
      );
    }
  };

  return (
    <SafeArea style={styles.container}>
      <View style={styles.header}>
        <Text style={Typography.h1}>Reminders</Text>
        <Pressable
          testID="home.createReminder.button"
          accessibilityLabel="Create new reminder"
          accessibilityRole="button"
          onPress={() => onNavigateToCreate()}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      <FlatList
        data={mockReminders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ReminderCard
            reminder={item}
            onPress={handleCardPress}
            onExpand={toggleExpand}
            onOverflowPress={handleOverflow}
            expanded={expandedId === item.id}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={Typography.bodySmall}>
              No reminders yet. Tap + to create one.
            </Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.signalRed,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
  },
  list: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  emptyState: {
    paddingVertical: Spacing.xxl,
    alignItems: 'center',
  },
});
