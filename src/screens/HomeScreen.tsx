// Home screen — list of reminders with mock data.

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Platform,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { mockReminders } from '../data/mockReminders';
import { ReminderCard } from '../components/ReminderCard';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';

interface HomeScreenProps {
  onNavigateToCreate: () => void;
}

export function HomeScreen({ onNavigateToCreate }: HomeScreenProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleCardPress = (id: string) => {
    // Navigate to detail/edit — placeholder for now
    console.log('Navigate to reminder:', id);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={Typography.h1}>Reminders</Text>
        <Pressable
          testID="home.createReminder.button"
          accessibilityLabel="Create new reminder"
          accessibilityRole="button"
          onPress={onNavigateToCreate}
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
    </SafeAreaView>
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
    borderRadius: 22,
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
