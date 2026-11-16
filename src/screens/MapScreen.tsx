// Map screen — full map view with user location, reminder markers, and zone circles.

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView as SafeArea } from 'react-native-safe-area-context';
import MapView, {
  Marker,
  Circle,
  PROVIDER_DEFAULT,
} from 'react-native-maps';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { store } from '../stores/reminderStore';
import { Reminder, ReminderStatus } from '../types/Reminder';

type PermissionState = 'granted' | 'denied' | 'unknown';

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

function getRegion(reminders: Reminder[], userLat: number | null, userLon: number | null) {
  const points: { latitude: number; longitude: number }[] = [];
  if (userLat !== null && userLon !== null) {
    points.push({ latitude: userLat, longitude: userLon });
  }
  for (const r of reminders) {
    if (r.latitude !== null && r.longitude !== null) {
      points.push({ latitude: r.latitude, longitude: r.longitude });
    }
  }
  if (points.length === 0) {
    return { latitude: 40.7128, longitude: -74.006, latitudeDelta: 0.01, longitudeDelta: 0.01 };
  }
  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLon = points[0].longitude;
  let maxLon = points[0].longitude;
  for (const p of points) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLon) minLon = p.longitude;
    if (p.longitude > maxLon) maxLon = p.longitude;
  }
  const latPad = (maxLat - minLat) * 1.3 || 0.005;
  const lonPad = (maxLon - minLon) * 1.3 || 0.005;
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLon + maxLon) / 2,
    latitudeDelta: latPad,
    longitudeDelta: lonPad,
  };
}

export function MapScreen() {
  const [reminders] = useState<Reminder[]>(store.findAll());
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [permission, setPermission] = useState<PermissionState>('unknown');

  useEffect(() => {
    // Request location permission on mount.
    const nav = (globalThis as any).navigator;
    if (!nav?.geolocation) {
      setPermission('denied');
      return;
    }

    nav.geolocation.getCurrentPosition(
      (pos: { coords: { latitude: number; longitude: number } }) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      () => {
        setPermission('denied');
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  const relevantReminders = useMemo(
    () => reminders.filter(r => isRelevantStatus(r.status)),
    [reminders],
  );

  const mapRegion = useMemo(
    () => getRegion(reminders, userLocation?.latitude ?? null, userLocation?.longitude ?? null),
    [reminders, userLocation],
  );

  const handleMarkerPress = useCallback(
    (reminder: Reminder) => {
      // Navigation to detail is handled by the parent navigator.
      // This is a placeholder for now — the MapScreen itself doesn't navigate.
    },
    [],
  );

  // Permission denied state.
  if (permission === 'denied') {
    return (
      <SafeArea style={styles.container}>
        <View style={styles.deniedContent}>
          <Text style={Typography.h3}>Location Access Required</Text>
          <Text style={[Typography.body, { marginTop: Spacing.md }]}>
            Map view needs your location to display reminders on the map.
          </Text>
          <Text style={[Typography.bodySmall, { marginTop: Spacing.sm }]}>
            Enable location access in your device settings to use this feature.
          </Text>
        </View>
      </SafeArea>
    );
  }

  return (
    <SafeArea style={styles.container}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={mapRegion}
        showsUserLocation
        showsMyLocationButton={false}
      >
        {/* Reminder markers */}
        {relevantReminders.map(reminder => (
          <Marker
            key={reminder.id}
            coordinate={{
              latitude: reminder.latitude,
              longitude: reminder.longitude,
            }}
            title={reminder.title}
            description={reminder.description || undefined}
            color={STATUS_COLORS[reminder.status]}
            onPress={() => handleMarkerPress(reminder)}
          />
        ))}

        {/* Zone circles for active reminders */}
        {relevantReminders.map(reminder => (
          <Circle
            key={`circle-${reminder.id}`}
            coordinate={{
              latitude: reminder.latitude,
              longitude: reminder.longitude,
            }}
            radius={reminder.radiusMeters}
            strokeColor={STATUS_COLORS[reminder.status]}
            strokeWidth={1.5}
            fillColor={`${STATUS_COLORS[reminder.status]}33`}
          />
        ))}
      </MapView>

      {/* Legend overlay */}
      <View style={styles.legend}>
        <Text style={[Typography.caption, { marginBottom: Spacing.xs }]}>Legend</Text>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: Colors.signalRed }]} />
          <Text style={Typography.caption}>Active</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: Colors.waitingAmber }]} />
          <Text style={Typography.caption}>Waiting</Text>
        </View>
        <View style={[styles.legendDot, styles.userDot]} />
        <Text style={Typography.caption}>You</Text>
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  deniedContent: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  legend: {
    ...Platform.select({
      ios: {
        position: 'absolute',
        bottom: Spacing.md,
        left: Spacing.md,
        backgroundColor: Colors.surfaceGlassStrong,
        borderRadius: BorderRadius.sm,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.borderGlass,
      },
    }),
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  userDot: {
    backgroundColor: Colors.infoBlue,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
});
