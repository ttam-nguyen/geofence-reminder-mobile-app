// Home screen — list of reminders from the store, detail navigation, search, and status filter.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, TextInput, FlatList, StyleSheet, SafeAreaView, Pressable, Alert } from "react-native";
import { SafeAreaView as SafeArea } from "react-native-safe-area-context";
import { ReminderCard } from "../components/ReminderCard";
import { Reminder, ReminderStatus } from "../types/Reminder";
import { Colors, Spacing, Typography, BorderRadius } from "../theme";
import { store, getStoreVersion, storeReady } from "../stores/reminderStore";
import { useFocusEffect } from "@react-navigation/native";

// Re-export for use in other screens.
export { store, getStoreVersion };

interface HomeScreenProps {
  onNavigateToCreate: (reminderId?: string, reminder?: Reminder) => void;
  onNavigateToDetail?: (reminder: Reminder) => void;
}

const FILTER_OPTIONS: { label: string; status: ReminderStatus | null }[] = [
  { label: "All", status: null },
  { label: "Active", status: ReminderStatus.ARMED },
  { label: "Waiting", status: ReminderStatus.WAITING_FOR_EXIT },
  { label: "Triggered", status: ReminderStatus.TRIGGERED },
  { label: "Completed", status: ReminderStatus.COMPLETED },
];

export function HomeScreen({ onNavigateToCreate, onNavigateToDetail }: HomeScreenProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReminderStatus | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function loadReminders() {
        setLoading(true);
        await storeReady;
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

  // Derive filtered reminders from search + status filter.
  const filteredReminders = useMemo(() => {
    let items = reminders;
    if (statusFilter) {
      items = items.filter(r => r.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter(
        r => r.title.toLowerCase().includes(q) || (r.description?.toLowerCase().includes(q) ?? false),
      );
    }
    return items;
  }, [reminders, statusFilter, searchQuery]);

  const getEmptyMessage = (): string => {
    if (reminders.length === 0) {
      return "No reminders yet. Tap + to create one.";
    }
    if (filteredReminders.length === 0) {
      return statusFilter ? "No reminders match the selected filter." : "No reminders match your search.";
    }
    return "";
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

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          testID="reminders.search.input"
          accessibilityLabel="Search reminders"
          accessibilityRole="search"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search reminders…"
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
        />
      </View>

      {/* Status filter segmented control */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map(opt => (
          <Pressable
            key={opt.label}
            testID={`reminders.filter.${opt.label.toLowerCase()}`}
            accessibilityLabel={`Filter: ${opt.label}`}
            accessibilityRole="button"
            accessibilityState={{ selected: statusFilter === opt.status }}
            onPress={() => setStatusFilter(opt.status)}
            style={[styles.filterButton, statusFilter === opt.status && styles.filterButtonActive]}
          >
            <Text style={[styles.filterButtonText, statusFilter === opt.status && styles.filterButtonTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredReminders}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ReminderCard reminder={item} onPress={handleCardPress} onOverflowPress={handleOverflow} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={Typography.bodySmall}>{getEmptyMessage()}</Text>
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
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  searchInput: {
    backgroundColor: Colors.surfaceGlassStrong,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    color: Colors.textPrimary,
    fontSize: 16,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  filterButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  filterButtonActive: {
    backgroundColor: Colors.signalRedSoft,
    borderColor: Colors.signalRed,
  },
  filterButtonText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  filterButtonTextActive: {
    color: Colors.signalRed,
    fontWeight: "600",
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
