// Map screen — interactive map view showing reminder locations with markers.

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { SafeAreaView as SafeArea } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { store, storeReady } from '../stores/reminderStore';
import { useFocusEffect } from '@react-navigation/native';
import { Reminder, ReminderStatus } from '../types/Reminder';

const STATUS_LABELS: Record<ReminderStatus, string> = {
  [ReminderStatus.DRAFT]: 'Draft',
  [ReminderStatus.WAITING_FOR_EXIT]: 'Waiting for Exit',
  [ReminderStatus.ARMED]: 'Armed',
  [ReminderStatus.ARRIVAL_PENDING]: 'Arrival Pending',
  [ReminderStatus.TRIGGERED]: 'Triggered',
  [ReminderStatus.COMPLETED]: 'Completed',
  [ReminderStatus.PAUSED]: 'Paused',
  [ReminderStatus.CANCELLED]: 'Cancelled',
  [ReminderStatus.DELETED]: 'Deleted',
};

const STATUS_COLORS: Record<ReminderStatus, string> = {
  [ReminderStatus.DRAFT]: Colors.textMuted,
  [ReminderStatus.WAITING_FOR_EXIT]: Colors.waitingAmber,
  [ReminderStatus.ARMED]: Colors.signalRed,
  [ReminderStatus.ARRIVAL_PENDING]: Colors.infoBlue,
  [ReminderStatus.TRIGGERED]: Colors.danger,
  [ReminderStatus.COMPLETED]: Colors.successGreen,
  [ReminderStatus.PAUSED]: Colors.textMuted,
  [ReminderStatus.CANCELLED]: Colors.textMuted,
  [ReminderStatus.DELETED]: Colors.textMuted,
};

function isRelevantStatus(status: ReminderStatus): boolean {
  return status !== ReminderStatus.DRAFT &&
    status !== ReminderStatus.CANCELLED &&
    status !== ReminderStatus.DELETED;
}

const DEFAULT_REGION = {
  latitude: 0,
  longitude: 0,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export function MapScreen() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [region, setRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function loadReminders() {
        await storeReady;
        const items = await store.findAll();
        if (!cancelled) {
          setReminders(items);
          const active = items.filter(r => isRelevantStatus(r.status));
          if (active.length > 0) {
            setRegion({
              latitude: active[0].latitude,
              longitude: active[0].longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            });
          }
        }
      }
      loadReminders();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const relevantReminders = reminders.filter(r => isRelevantStatus(r.status));

  return (
    <SafeArea style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={Typography.h2}>Map</Text>
      </View>

      {region ? (
        <MapView
          provider={Platform.OS === 'android' ? PROVIDER_DEFAULT : undefined}
          style={styles.map}
          initialRegion={{ ...DEFAULT_REGION, ...region }}
        >
          {relevantReminders.map(r => (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.latitude, longitude: r.longitude }}
              title={r.title}
              description={STATUS_LABELS[r.status]}
              pinColor={STATUS_COLORS[r.status]}
            />
          ))}
        </MapView>
      ) : (
        <View style={styles.placeholder}>
          <Text style={[Typography.bodySmall, { marginBottom: Spacing.md }]}>
            No active reminders to display.
          </Text>
        </View>
      )}
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  map: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
