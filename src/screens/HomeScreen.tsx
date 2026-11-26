// Home screen — list of reminders from the store, detail navigation, search, and status filter.

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, TextInput, FlatList, StyleSheet, SafeAreaView, Alert, Platform } from "react-native";
import { SafeAreaView as SafeArea } from "react-native-safe-area-context";
import { ReminderCard } from "../components/ReminderCard";
import { Icon } from "../components/Icon";
import { Reminder, ReminderStatus } from "../types/Reminder";
import { Colors, Spacing, Typography, BorderRadius } from "../theme";
import { PressableArea } from "../components/PressableArea";
import { store, getStoreVersion, storeReady } from "../stores/reminderStore";
import { haversineDistance } from "../models/haversine";
import { findSavedPlaceNear, listPlaces, type SavedPlace } from "../stores/placeStore";
import Geolocation from "@react-native-community/geolocation";
import { useFocusEffect } from "@react-navigation/native";

// Re-export for use in other screens.
export { store, getStoreVersion };

interface HomeScreenProps {
  onNavigateToCreate: (reminderId?: string, reminder?: Reminder) => void;
  onNavigateToDetail?: (reminder: Reminder) => void;
}

const FILTER_OPTIONS: { label: string; status: ReminderStatus | null }[] = [
  { label: "All", status: null },
  { label: "Waiting", status: ReminderStatus.WAITING_FOR_EXIT },
  { label: "Active", status: ReminderStatus.ARMED },
  { label: "Triggered", status: ReminderStatus.TRIGGERED },
];

/**
 * Home list order: what needs attention first.
 * 1. Waiting for Exit, then Active, then Triggered (the states the user acts on).
 * 2. Distance from the user, nearest first.
 * 3. Title, alphanumerically.
 */
const STATUS_PRIORITY: Record<ReminderStatus, number> = {
  [ReminderStatus.WAITING_FOR_EXIT]: 0,
  [ReminderStatus.ARMED]: 1,
  [ReminderStatus.ARRIVAL_PENDING]: 2,
  [ReminderStatus.TRIGGERED]: 3,
  [ReminderStatus.PAUSED]: 4,
  [ReminderStatus.DRAFT]: 5,
  [ReminderStatus.COMPLETED]: 6,
  [ReminderStatus.CANCELLED]: 7,
  [ReminderStatus.DELETED]: 8,
};

export interface SortContext {
  latitude: number;
  longitude: number;
}

function distanceOrInfinity(reminder: Reminder, origin: SortContext | null): number {
  if (!origin) {
    return Number.POSITIVE_INFINITY;
  }
  return haversineDistance(origin.latitude, origin.longitude, reminder.latitude, reminder.longitude);
}

/** Pure comparator so the ordering can be tested without rendering the screen. */
export function compareReminders(
  a: Reminder,
  b: Reminder,
  origin: SortContext | null,
): number {
  const byStatus = (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99);
  if (byStatus !== 0) {
    return byStatus;
  }

  const byDistance = distanceOrInfinity(a, origin) - distanceOrInfinity(b, origin);
  if (Number.isFinite(byDistance) && byDistance !== 0) {
    return byDistance;
  }

  return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" });
}

interface CollapsibleGroupProps {
  title: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

/** A finished-work group: header with a count, closed by default, one tap to reveal the cards. */
function CollapsibleGroup({ title, count, expanded, onToggle, children }: CollapsibleGroupProps) {
  if (count === 0) {
    return null;
  }

  return (
    <View style={styles.group}>
      <PressableArea
        testID={`home.group.${title.toLowerCase()}`}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${count} ${count === 1 ? "reminder" : "reminders"}`}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={styles.groupHeader}
      >
        <Icon name={expanded ? "chevron-down" : "chevron-right"} size={16} color={Colors.textMuted} />
        <Text style={Typography.bodySmall}>{title}</Text>
        <Text style={styles.groupCount}>{count}</Text>
      </PressableArea>

      {expanded ? <View style={styles.groupBody}>{children}</View> : null}
    </View>
  );
}

export function HomeScreen({ onNavigateToCreate, onNavigateToDetail }: HomeScreenProps) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReminderStatus | null>(null);
  const [userLocation, setUserLocation] = useState<SortContext | null>(null);
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  // Finished work is grouped and closed by default, so the list shows what needs attention.
  const [showTriggered, setShowTriggered] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function loadReminders() {
        setLoading(true);
        await storeReady;
        const items = await store.findAll();
        if (!cancelled) {
          setReminders(items);
          setLoading(false);
        }
      }
      loadReminders();

      // Nicknames for saved places, so a card can show "Home" instead of a full address.
      listPlaces()
        .then(items => {
          if (!cancelled) {
            setPlaces(items);
          }
        })
        .catch(() => {
          // A failure here only costs the nickname.
        });

      // Distance ordering needs a position; a failure just falls back to title order.
      Geolocation.getCurrentPosition(
        position => {
          if (!cancelled) {
            setUserLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          }
        },
        () => {
          if (!cancelled) {
            setUserLocation(null);
          }
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
      );

      return () => {
        cancelled = true;
      };
    }, []),
  );

  const handleCardPress = async (id: string) => {
    const reminder = await store.findById(id);
    if (reminder && onNavigateToDetail) {
      onNavigateToDetail(reminder);
    }
  };

  // Derive filtered reminders from search + status filter.
  /** Search + status pill applied to every group. */
  const matchingReminders = useMemo(() => {
    let items = reminders.filter(r => r.status !== ReminderStatus.DELETED);

    if (statusFilter === ReminderStatus.TRIGGERED) {
      items = items.filter(r => r.status === ReminderStatus.TRIGGERED);
    } else if (statusFilter === ReminderStatus.COMPLETED) {
      items = items.filter(r => r.status === ReminderStatus.COMPLETED);
    } else if (statusFilter) {
      items = items.filter(r => r.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter(
        r => r.title.toLowerCase().includes(q) || (r.description?.toLowerCase().includes(q) ?? false),
      );
    }

    return [...items].sort((a, b) => compareReminders(a, b, userLocation));
  }, [reminders, statusFilter, searchQuery, userLocation]);

  /** Everything the user still has to act on. */
  const activeReminders = useMemo(
    () =>
      matchingReminders.filter(
        reminder =>
          reminder.status !== ReminderStatus.TRIGGERED &&
          reminder.status !== ReminderStatus.COMPLETED,
      ),
    [matchingReminders],
  );

  const triggeredReminders = useMemo(
    () => matchingReminders.filter(reminder => reminder.status === ReminderStatus.TRIGGERED),
    [matchingReminders],
  );

  const completedReminders = useMemo(
    () => matchingReminders.filter(reminder => reminder.status === ReminderStatus.COMPLETED),
    [matchingReminders],
  );

  const getEmptyMessage = (): string => {
    if (reminders.length === 0) {
      return "No reminders yet. Tap + to create one.";
    }
    if (matchingReminders.length === 0) {
      return statusFilter ? "No reminders match the selected filter." : "No reminders match your search.";
    }
    return "";
  };

  const handleOverflow = async (id: string, action: "edit" | "complete" | "delete") => {
    const reminder = await store.findById(id);
    if (!reminder) return;

    if (action === "edit") {
      onNavigateToCreate(reminder.id, reminder);
    } else if (action === "complete") {
      Alert.alert("Complete Reminder", `Mark "${reminder.title}" as completed?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete",
          onPress: async () => {
            const updated: Reminder = {
              ...reminder,
              status: ReminderStatus.COMPLETED,
              completedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            await store.save(updated);
            setReminders(await store.findAll()); // <--- Refresh list state
          },
        },
      ]);
    } else if (action === "delete") {
      Alert.alert("Delete Reminder", `Are you sure you want to delete "${reminder.title}"?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await store.deleteById(id);
            setReminders(await store.findAll());
          },
        },
      ]);
    }
  };

  return (
    <SafeArea style={styles.container} edges={["left", "right"]}>
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
          <PressableArea
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
          </PressableArea>
        ))}
      </View>

      <FlatList
        data={activeReminders}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <ReminderCard
            reminder={item}
            locationLabel={findSavedPlaceNear(places, item.latitude, item.longitude)?.name}
            onPress={handleCardPress}
            onOverflowPress={handleOverflow}
          />
        )}
        ListFooterComponent={
          <View>
            <CollapsibleGroup
              title="Triggered"
              count={triggeredReminders.length}
              expanded={showTriggered}
              onToggle={() => setShowTriggered(value => !value)}
            >
              {triggeredReminders.map(reminder => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  locationLabel={findSavedPlaceNear(places, reminder.latitude, reminder.longitude)?.name}
                  onPress={handleCardPress}
                  onOverflowPress={handleOverflow}
                />
              ))}
            </CollapsibleGroup>

            <CollapsibleGroup
              title="Completed"
              count={completedReminders.length}
              expanded={showCompleted}
              onToggle={() => setShowCompleted(value => !value)}
            >
              {completedReminders.map(reminder => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  locationLabel={findSavedPlaceNear(places, reminder.latitude, reminder.longitude)?.name}
                  onPress={handleCardPress}
                  onOverflowPress={handleOverflow}
                />
              ))}
            </CollapsibleGroup>
          </View>
        }
        ListEmptyComponent={
          // Only claim "nothing here" when the collapsed groups are empty too.
          matchingReminders.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={Typography.bodySmall}>{getEmptyMessage()}</Text>
            </View>
          ) : undefined
        }
      />

      {/* Create button floats in the lower half: reachable with one thumb, unlike a header icon. */}
      <View style={styles.fabContainer} pointerEvents="box-none">
        <PressableArea
          testID="home.createReminder.button"
          accessibilityLabel="Create new reminder"
          accessibilityRole="button"
          onPress={() => onNavigateToCreate()}
          style={styles.fab}
        >
          <Icon name="plus" size={26} color="#FFFFFF" />
        </PressableArea>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  fabContainer: {
    position: "absolute",
    right: Spacing.md,
    bottom: Spacing.lg,
    alignItems: "flex-end",
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.signalRed,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.35,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
      android: {
        elevation: 8,
      },
    }),
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
    // Room for the floating button so the last card is never covered.
    paddingBottom: 56 + Spacing.lg * 2,
  },
  group: {
    marginTop: Spacing.md,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    minHeight: 44,
    paddingHorizontal: Spacing.xs,
  },
  groupCount: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  groupBody: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  emptyState: {
    paddingVertical: Spacing.xxl,
    alignItems: "center",
  },
});
