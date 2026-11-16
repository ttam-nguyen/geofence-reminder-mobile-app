// ReminderDetail screen — hero summary, map preview, metadata, Edit/Delete.

import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView as SafeArea } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/AppNavigator";
import { Reminder, ReminderStatus } from "../types/Reminder";
import { Colors, Spacing, Typography, BorderRadius } from "../theme";
import { store } from "../stores/reminderStore";

type Props = NativeStackScreenProps<RootStackParamList, "Detail">;

const statusLabels: Record<ReminderStatus, string> = {
  [ReminderStatus.DRAFT]: "Draft",
  [ReminderStatus.WAITING_FOR_EXIT]: "Waiting for Exit",
  [ReminderStatus.ARMED]: "Active",
  [ReminderStatus.ARRIVAL_PENDING]: "Arriving…",
  [ReminderStatus.TRIGGERED]: "Triggered",
  [ReminderStatus.COMPLETED]: "Completed",
  [ReminderStatus.PAUSED]: "Paused",
  [ReminderStatus.CANCELLED]: "Cancelled",
  [ReminderStatus.DELETED]: "Deleted",
};

export function ReminderDetailScreen({ navigation, route }: Props) {
  const [reminder, setReminder] = useState<Reminder>(route.params.reminder);

  useFocusEffect(
    useCallback(() => {
      const latest = store.findById(route.params.reminder.id);
      if (latest) {
        setReminder(latest);
      }
    }, [route.params.reminder.id]),
  );

  const statusColor = statusColors[reminder.status] || Colors.textMuted;
  const isTriggered = reminder.status === ReminderStatus.TRIGGERED;

  const handleEdit = () => {
    navigation.navigate("CreateReminder", { reminderId: reminder.id, reminder });
  };

  const handleDelete = () => {
    Alert.alert("Delete Reminder", `Are you sure you want to delete "${reminder.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          store.deleteById(reminder.id).catch(() => {});
          navigation.goBack();
        },
      },
    ]);
  };

  const handleComplete = () => {
    Alert.alert("Complete Reminder", `Mark "${reminder.title}" as completed? This is irreversible.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete",
        style: "destructive",
        onPress: () => {
          const updated: Reminder = {
            ...reminder,
            status: ReminderStatus.COMPLETED,
            completedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          store.save(updated).catch(() => {});
          navigation.goBack();
        },
      },
    ]);
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <SafeArea style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Hero summary */}
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <Text style={Typography.h2} numberOfLines={2}>
              {reminder.title}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{statusLabels[reminder.status]}</Text>
            </View>
          </View>

          {reminder.locationName ? <Text style={Typography.bodySmall}>{reminder.locationName}</Text> : null}

          <Text style={Typography.caption}>
            {reminder.latitude.toFixed(4)}, {reminder.longitude.toFixed(4)}
          </Text>
        </View>

        {/* Map preview placeholder */}
        <View style={styles.mapPreview}>
          <Text style={Typography.caption}>Map preview</Text>
          <View style={styles.mapCircle} />
          <View style={styles.mapPin} />
        </View>

        {/* Description */}
        {reminder.description ? (
          <View style={styles.section}>
            <Text style={Typography.bodySmall}>Description</Text>
            <Text style={[Typography.body, { marginTop: Spacing.xs }]}>{reminder.description}</Text>
          </View>
        ) : null}

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={Typography.bodySmall}>Details</Text>
          <View style={styles.metaRow}>
            <Text style={Typography.caption}>Arrival zone</Text>
            <Text style={Typography.caption}>{reminder.radiusMeters}m (fixed)</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={Typography.caption}>Created</Text>
            <Text style={Typography.caption}>{formatDateTime(reminder.createdAt)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={Typography.caption}>Updated</Text>
            <Text style={Typography.caption}>{formatDateTime(reminder.updatedAt)}</Text>
          </View>
          {reminder.triggeredAt ? (
            <View style={styles.metaRow}>
              <Text style={Typography.caption}>Triggered</Text>
              <Text style={Typography.caption}>{formatDateTime(reminder.triggeredAt)}</Text>
            </View>
          ) : null}
          {reminder.completedAt ? (
            <View style={styles.metaRow}>
              <Text style={Typography.caption}>Completed</Text>
              <Text style={Typography.caption}>{formatDateTime(reminder.completedAt)}</Text>
            </View>
          ) : null}
        </View>

        {/* Arrival behavior */}
        <View style={styles.infoBox}>
          <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
            Notify after 2 minutes stationary inside the arrival zone
          </Text>
        </View>

        {/* Bottom actions */}
        <View style={styles.buttonRow}>
          <Pressable
            testID="detail.edit.button"
            accessibilityLabel="Edit reminder"
            accessibilityRole="button"
            onPress={handleEdit}
            style={[styles.button, styles.editButton]}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
          {!isTriggered && (
            <Pressable
              testID="detail.complete.button"
              accessibilityLabel="Complete reminder"
              accessibilityRole="button"
              onPress={handleComplete}
              style={[styles.button, styles.completeButton]}
            >
              <Text style={styles.completeButtonText}>Complete</Text>
            </Pressable>
          )}
          <Pressable
            testID="detail.delete.button"
            accessibilityLabel="Delete reminder"
            accessibilityRole="button"
            onPress={handleDelete}
            style={[styles.button, styles.deleteButton]}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeArea>
  );
}

const statusColors: Record<ReminderStatus, string> = {
  [ReminderStatus.DRAFT]: Colors.textMuted,
  [ReminderStatus.WAITING_FOR_EXIT]: Colors.waitingAmber,
  [ReminderStatus.ARMED]: Colors.successGreen,
  [ReminderStatus.ARRIVAL_PENDING]: Colors.signalRed,
  [ReminderStatus.TRIGGERED]: Colors.danger,
  [ReminderStatus.COMPLETED]: Colors.textMuted,
  [ReminderStatus.PAUSED]: Colors.waitingAmber,
  [ReminderStatus.CANCELLED]: Colors.danger,
  [ReminderStatus.DELETED]: Colors.danger,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  hero: {
    marginBottom: Spacing.lg,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  mapPreview: {
    height: 160,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  mapCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.signalRed,
    opacity: 0.4,
    position: "absolute",
  },
  mapPin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.signalRed,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.xs,
  },
  infoBox: {
    backgroundColor: Colors.signalRedSoft,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  buttonRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  button: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    minHeight: 48,
  },
  editButton: {
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
  },
  editButtonText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: "600",
  },
  completeButton: {
    backgroundColor: Colors.waitingAmber,
  },
  completeButtonText: {
    ...Typography.body,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: Colors.danger,
  },
  deleteButtonText: {
    ...Typography.body,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
