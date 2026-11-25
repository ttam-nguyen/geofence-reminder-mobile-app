/**
 * DeveloperGeofenceControls — simulated geofence controls for testing.
 *
 * Only visible when GPS_REMINDER_DEV_MODE is enabled AND __DEV__ === true.
 * Provides simulated ENTER/EXIT buttons and a diagnostic readout for the
 * current geofence state.
 *
 * IMPORTANT: This component must NOT be reachable in a Release build.
 */

import React, { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import { Typography, Colors, Spacing, BorderRadius } from "../theme";
import { PressableArea } from "./PressableArea";
import * as geofencingService from "../services/geofencingService";
import type { GeofenceInfo, GeofenceEvent } from "../services/geofencingService";
import type { StationaryCandidate } from "../services/stationaryService";

interface DeveloperGeofenceControlsProps {
  /** Called when a simulated event is triggered (for testing). */
  onSimulatedEvent?: (event: GeofenceEvent) => void;
}

/** Check if Developer Mode is enabled (build-time check). */
function isDeveloperMode(): boolean {
  // In production builds, this must always return false.
  // The actual check is done at build time via GPS_REMINDER_DEV_MODE env var.
  // For now, we check a runtime flag that is set by the build system.
  if (!__DEV__) {
    return false;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (globalThis as any).process?.env;
    return env && (env as any).GPS_REMINDER_DEV_MODE === "1";
  } catch {
    return false;
  }
}

function DeveloperGeofenceControls({ onSimulatedEvent }: DeveloperGeofenceControlsProps) {
  const [registeredGeofences, setRegisteredGeofences] = useState<GeofenceInfo[]>([]);
  const [candidates, setCandidates] = useState<StationaryCandidate[]>([]);
  const [lastEvent, setLastEvent] = useState<string>("No events yet");
  const [permissionStatus, setPermissionStatus] = useState<string>("unknown");

  const refreshData = useCallback(async () => {
    try {
      const geofences = await geofencingService.listRegisteredGeofences();
      setRegisteredGeofences(geofences);

      const active = geofencingService.getActiveCandidates();
      setCandidates(active);

      setPermissionStatus(await geofencingService.getAuthorizationStatus());
    } catch (err) {
      console.error("[DeveloperGeofenceControls] Failed to refresh data:", err);
    }
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 2000); // Refresh every 2 seconds.
    return () => clearInterval(interval);
  }, [refreshData]);

  const handleSimulateEnter = useCallback(
    (reminderId: string) => {
      const event: GeofenceEvent = { reminderId, transitionType: 1 }; // ENTER
      setLastEvent(`SIMULATED ENTER for ${reminderId}`);
      if (onSimulatedEvent) onSimulatedEvent(event);
      refreshData();
    },
    [onSimulatedEvent, refreshData],
  );

  const handleSimulateExit = useCallback(
    (reminderId: string) => {
      const event: GeofenceEvent = { reminderId, transitionType: 2 }; // EXIT
      setLastEvent(`SIMULATED EXIT for ${reminderId}`);
      if (onSimulatedEvent) onSimulatedEvent(event);
      refreshData();
    },
    [onSimulatedEvent, refreshData],
  );

  return (
    <ScrollView style={styles.container}>
      {/* DEV Badge */}
      <View style={styles.devBadge}>
        <Text style={styles.devBadgeText}>DEV BUILD — TEST VALUES ONLY</Text>
      </View>

      {/* Permission Status */}
      <View style={styles.section}>
        <Text style={Typography.bodySmall}>Permission: {permissionStatus}</Text>
      </View>

      {/* Registered Geofences */}
      <View style={styles.section}>
        <Text style={[Typography.bodySmall, { marginBottom: Spacing.xs }]}>
          Registered Geofences ({registeredGeofences.length})
        </Text>
        {registeredGeofences.length === 0 ? (
          <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
            No geofences registered.
          </Text>
        ) : (
          registeredGeofences.map((gf) => (
            <View key={gf.reminderId} style={styles.geofenceCard}>
              <Text style={Typography.caption}>
                {gf.reminderId} — ({gf.latitude.toFixed(4)}, {gf.longitude.toFixed(4)})
              </Text>
              <View style={styles.geofenceActions}>
                <PressableArea
                  testID={`dev.simulateEnter.${gf.reminderId}`}
                  onPress={() => handleSimulateEnter(gf.reminderId)}
                  style={[styles.simButton, styles.enterButton]}
                >
                  <Text style={styles.simButtonText}>Simulate ENTER</Text>
                </PressableArea>
                <PressableArea
                  testID={`dev.simulateExit.${gf.reminderId}`}
                  onPress={() => handleSimulateExit(gf.reminderId)}
                  style={[styles.simButton, styles.exitButton]}
                >
                  <Text style={styles.simButtonText}>Simulate EXIT</Text>
                </PressableArea>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Active Candidates */}
      <View style={styles.section}>
        <Text style={[Typography.bodySmall, { marginBottom: Spacing.xs }]}>
          Active Arrival Candidates ({candidates.length})
        </Text>
        {candidates.length === 0 ? (
          <Text style={[Typography.caption, { color: Colors.textSecondary }]}>
            No active arrival candidates.
          </Text>
        ) : (
          candidates.map((c) => (
            <View key={c.reminderId} style={styles.geofenceCard}>
              <Text style={Typography.caption}>{c.reminderId}</Text>
              <Text style={Typography.caption}>
                Stationary time: {Math.floor(c.accumulatedStationaryTimeMs / 1000)}s / 120s
              </Text>
            </View>
          ))
        )}
      </View>

      {/* Last Event */}
      <View style={styles.section}>
        <Text style={[Typography.bodySmall, { marginBottom: Spacing.xs }]}>Last Event</Text>
        <View style={[styles.eventBadge, styles.simulatedBadge]}>
          <Text style={styles.eventText}>{lastEvent}</Text>
        </View>
      </View>

      {/* Warning */}
      <View style={styles.warning}>
        <Text style={[Typography.caption, { color: Colors.waitingAmber }]}>
          Simulated events are labeled and do not satisfy physical-device acceptance criteria.
        </Text>
      </View>
    </ScrollView>
  );
}

export { DeveloperGeofenceControls, isDeveloperMode };

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
  },
  devBadge: {
    backgroundColor: Colors.waitingAmber,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.md,
  },
  devBadgeText: {
    ...Typography.bodySmall,
    color: "#000000",
    fontWeight: "bold",
    textAlign: "center",
  },
  section: {
    marginBottom: Spacing.md,
  },
  geofenceCard: {
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  geofenceActions: {
    flexDirection: "row",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  simButton: {
    flex: 1,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  enterButton: {
    backgroundColor: "#34C759",
  },
  exitButton: {
    backgroundColor: "#FF3B30",
  },
  simButtonText: {
    ...Typography.caption,
    color: "#FFFFFF",
  },
  eventBadge: {
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
  },
  simulatedBadge: {
    borderStyle: "dashed",
    borderColor: Colors.waitingAmber,
  },
  eventText: {
    ...Typography.caption,
    color: Colors.waitingAmber,
  },
  warning: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
  },
});
