// Map screen — map preview (top ~2/3) + reminder list (bottom ~1/3), sorted by
// distance from the user's current location.

import React, { useState, useCallback, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Platform, FlatList } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import Geolocation from "@react-native-community/geolocation";
import { SafeAreaView as SafeArea } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Spacing, Typography } from "../theme";
import { store, storeReady } from "../stores/reminderStore";
import { Reminder, ReminderStatus } from "../types/Reminder";
import { ReminderCard } from "../components/ReminderCard";
import { haversineDistance } from "../models/haversine";
import type { RootStackParamList } from "../navigation/AppNavigator";

const STATUS_LABELS: Record<ReminderStatus, string> = {
  [ReminderStatus.DRAFT]: "Draft",
  [ReminderStatus.WAITING_FOR_EXIT]: "Waiting for Exit",
  [ReminderStatus.ARMED]: "Armed",
  [ReminderStatus.ARRIVAL_PENDING]: "Arrival Pending",
  [ReminderStatus.TRIGGERED]: "Triggered",
  [ReminderStatus.COMPLETED]: "Completed",
  [ReminderStatus.PAUSED]: "Paused",
  [ReminderStatus.CANCELLED]: "Cancelled",
  [ReminderStatus.DELETED]: "Deleted",
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

const DEFAULT_REGION = {
  latitude: 0,
  longitude: 0,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

export function MapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);
  const lastTapRef = useRef<{ id: string; time: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function loadReminders() {
        await storeReady;
        const items = await store.findAll();
        if (!cancelled) {
          setReminders(items);
        }
      }
      loadReminders();

      Geolocation.getCurrentPosition(
        coords => {
          if (!cancelled) {
            setUserLocation({ latitude: coords.coords.latitude, longitude: coords.coords.longitude });
          }
        },
        () => {
          if (!cancelled) {
            setUserLocation(null);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 },
      );

      return () => {
        cancelled = true;
      };
    }, []),
  );

  const visibleReminders = useMemo(() => {
    const items = reminders.filter(r => r.status !== ReminderStatus.DELETED);
    if (!userLocation) {
      return items;
    }
    return [...items].sort(
      (a, b) =>
        haversineDistance(userLocation.latitude, userLocation.longitude, a.latitude, a.longitude) -
        haversineDistance(userLocation.latitude, userLocation.longitude, b.latitude, b.longitude),
    );
  }, [reminders, userLocation]);

  const initialRegion = useMemo(() => {
    const first = visibleReminders[0];
    if (first) {
      return {
        latitude: first.latitude,
        longitude: first.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return DEFAULT_REGION;
  }, [visibleReminders]);

  // Remount the map once the first (nearest) reminder changes so `initialRegion`
  // takes effect after the async load / location fix, then stays interactive.
  const mapKey = visibleReminders.length > 0 ? visibleReminders[0].id : "empty";

  const handleCardPress = (id: string) => {
    const reminder = visibleReminders.find(r => r.id === id);
    if (!reminder) {
      return;
    }

    const now = Date.now();
    if (
      lastTapRef.current &&
      lastTapRef.current.id === id &&
      now - lastTapRef.current.time < 300
    ) {
      lastTapRef.current = null;
      navigation.navigate("Detail", { reminder });
      return;
    }

    mapRef.current?.animateToRegion(
      {
        latitude: reminder.latitude,
        longitude: reminder.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      600,
    );
    lastTapRef.current = { id, time: now };
  };

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={Typography.h2}>Map</Text>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          key={mapKey}
          ref={mapRef}
          provider={Platform.OS === "android" ? PROVIDER_DEFAULT : undefined}
          style={styles.map}
          initialRegion={initialRegion}
        >
          {visibleReminders.map(r => (
            <Marker
              key={r.id}
              coordinate={{ latitude: r.latitude, longitude: r.longitude }}
              title={r.title}
              description={STATUS_LABELS[r.status]}
              pinColor={STATUS_COLORS[r.status]}
            />
          ))}
        </MapView>
      </View>

      <View style={styles.listContainer}>
        <FlatList
          data={visibleReminders}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ReminderCard reminder={item} onPress={handleCardPress} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={Typography.bodySmall}>No reminders to display.</Text>
            </View>
          }
        />
      </View>
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
  mapContainer: {
    flex: 2,
  },
  map: {
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
  list: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  emptyState: {
    paddingVertical: Spacing.xxl,
    alignItems: "center",
  },
});
