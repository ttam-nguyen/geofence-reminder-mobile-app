// Home screen — list of reminders from the store, detail navigation, and overflow actions.

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, StyleSheet, SafeAreaView, Pressable, Alert } from "react-native";
import { SafeAreaView as SafeArea } from "react-native-safe-area-context";
import { ReminderCard } from "../components/ReminderCard";
import { Reminder, ReminderStatus } from "../types/Reminder";
import { Colors, Spacing, Typography, BorderRadius } from "../theme";
import { store, getStoreVersion } from "../stores/reminderStore";
import { useFocusEffect } from "@react-navigation/native";

// Re-export for use in other screens.
export { store, getStoreVersion };

interface HomeScreenProps {
  onNavigateToCreate: (reminderId?: string, reminder?: Reminder) => void;
  onNavigateToDetail?: (reminder: Reminder) => void;
}

export function HomeScreen({ onNavigateToCreate, onNavigateToDetail }: HomeScreenProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function loadReminders() {
        setLoading(true);
        const items = store.findAll();
        if (!cancelled) {
          setReminders(items);
          setLoading(false);
        }
      }
      loadReminders();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const handleCardPress = (id: string) => {
    const reminder = store.findById(id);
    if (reminder && onNavigateToDetail) {
      onNavigateToDetail(reminder);
    }
  };

  const handleOverflow = (id: string, action: "edit" | "complete" | "delete") => {
    const reminder = store.findById(id);
    if (!reminder) return;

    if (action === "edit") {
      onNavigateToCreate(reminder.id, reminder);
    } else if (action === "complete") {
      Alert.alert("Complete Reminder", `Mark "${reminder.title}" as completed?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: () => {
            const updated: Reminder = {
              ...reminder,
              status: ReminderStatus.COMPLETED,
              completedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            store
              .save(updated)
              .then(() => {
                setReminders(store.findAll()); // <--- Refresh list state
              })
              .catch(() => {});
          },
        },
      ]);
    } else if (action === "delete") {
      Alert.alert("Delete Reminder", `Are you sure you want to delete "${reminder.title}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            store
              .deleteById(id)
              .then(() => {
                setReminders(store.findAll()); // <--- Refresh list state
              })
              .catch(() => {});
          },
        },
      ]);
    }
  };

  return (
    <SafeArea style={styles.container} edges={["left", "right"]}>
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
        data={reminders}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ReminderCard reminder={item} onPress={handleCardPress} onOverflowPress={handleOverflow} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={Typography.bodySmall}>No reminders yet. Tap + to create one.</Text>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.signalRed,
    justifyContent: "center",
    alignItems: "center",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "300",
  },
  list: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  emptyState: {
    paddingVertical: Spacing.xxl,
    alignItems: "center",
  },
});
