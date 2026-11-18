// Settings screen — full settings with notifications, permissions, privacy, and about sections.

import React, { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Linking } from "react-native";
import { SafeAreaView as SafeArea } from "react-native-safe-area-context";
import { Colors, Spacing, Typography, BorderRadius, PlatformConstants } from "../theme";
import {
  getSettings,
  subscribe,
  setNotificationsEnabled,
  setNotificationSoundEnabled,
  setNotificationVibrationEnabled,
} from "../stores/settingsStore";
import { notificationService, AuthorizationStatus } from "../services/notificationService";
import { DeveloperGeofenceControls, isDeveloperMode } from "../components/DeveloperGeofenceControls";

type SwitchProps = {
  enabled: boolean;
  onToggle: () => void;
};

function Switch({ enabled, onToggle }: SwitchProps) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ selected: enabled }}
      accessibilityLabel={enabled ? "Enabled" : "Disabled"}
      onPress={onToggle}
      style={[styles.switchTrack, enabled && styles.switchTrackOn]}
    >
      <View style={[styles.switchThumb, enabled && styles.switchThumbOn]} />
    </Pressable>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={Typography.bodySmall}>{children}</Text>;
}

function SettingRow({ label, enabled, onToggle }: { label: string; enabled: boolean; onToggle: () => void }) {
  return (
    <View style={styles.toggleRow}>
      <Text style={Typography.body}>{label}</Text>
      <Switch enabled={enabled} onToggle={onToggle} />
    </View>
  );
}

function SectionDivider() {
  return <View style={styles.sectionDivider} />;
}

export function SettingsScreen() {
  const [settings, setSettings] = useState(getSettings());
  const [notificationStatus, setNotificationStatus] = useState<AuthorizationStatus>("unspecified");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const unsub = subscribe(() => setSettings(getSettings()));
    return unsub;
  }, []);

  // Check notification permission status on mount and when settings change.
  const refreshPermissionStatus = useCallback(async () => {
    const status = await notificationService.checkPermission();
    setNotificationStatus(status);
  }, []);

  useEffect(() => {
    refreshPermissionStatus();
  }, [refreshPermissionStatus]);

  const openSystemSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  // Request notification permission.
  const handleRequestPermission = useCallback(async () => {
    setLoading(true);
    try {
      const status = await notificationService.requestPermission();
      setNotificationStatus(status);
      if (status === "authorized") {
        // Update the notification channel with current preferences.
        await updateNotificationChannel();
      }
    } catch (err) {
      console.warn("[Settings] Failed to request permission:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update the Android notification channel when sound/vibration toggles change.
  const updateNotificationChannel = useCallback(async () => {
    const currentSettings = getSettings();
    await notificationService.createChannel({
      id: "gps_reminder_default",
      name: "GPS Reminders",
      sound: currentSettings.notificationSoundEnabled ? "default" : null,
      vibrationPattern: currentSettings.notificationVibrationEnabled
        ? [200, 100, 200]
        : undefined,
      importance: 3, // AndroidImportance.HIGH
    });
  }, []);

  // Wire sound/vibration toggles to update the channel.
  const handleSoundToggle = useCallback(
    async (enabled: boolean) => {
      setNotificationSoundEnabled(enabled);
      await updateNotificationChannel();
    },
    [updateNotificationChannel],
  );

  const handleVibrationToggle = useCallback(
    async (enabled: boolean) => {
      setNotificationVibrationEnabled(enabled);
      await updateNotificationChannel();
    },
    [updateNotificationChannel],
  );

  // Send a test notification.
  const handleTestNotification = useCallback(async () => {
    setLoading(true);
    try {
      await notificationService.displayNotification({
        id: `test_${Date.now()}`,
        title: "Test Reminder",
        body: "This is a test notification. Geofence notifications work the same way.",
        data: { source: "test" },
        trigger: "immediate",
        android: {
          channelId: "gps_reminder_default",
          importance: 3,
        },
        ios: {
          sound: "default",
        },
      });
    } catch (err) {
      console.warn("[Settings] Test notification failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Permission status label.
  const getPermissionLabel = (): string => {
    switch (notificationStatus) {
      case "authorized":
        return "Notifications On";
      case "denied":
        return "Notifications Off — tap to enable";
      case "unspecified":
        return "Request Notifications";
      default:
        return "Notifications Off";
    }
  };

  const getPermissionStatusText = (): string => {
    switch (notificationStatus) {
      case "authorized":
        return "You will receive reminders when you arrive at your locations.";
      case "denied":
        return "Notifications are disabled. Tap 'Open Settings' to enable them.";
      case "unspecified":
        return "We need your permission to send reminders when you arrive at locations.";
      default:
        return "";
    }
  };

  const isPermissionGranted = notificationStatus === "authorized";

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={Typography.h2}>Settings</Text>

        {/* Notifications section */}
        <View style={styles.section}>
          <SectionTitle>Notifications</SectionTitle>

          {/* Permission status */}
          <View style={styles.permissionStatusRow}>
            <Text style={[Typography.bodySmall, { flex: 1 }]}>
              {getPermissionStatusText()}
            </Text>
          </View>

          {/* Permission request / status button */}
          {notificationStatus === "denied" ? (
            <Pressable
              testID="settings.notifications.openSystemSettings"
              accessibilityLabel="Open system settings for notifications"
              accessibilityRole="button"
              onPress={openSystemSettings}
              style={[styles.permissionButton, styles.glassButton]}
            >
              <Text style={styles.permissionButtonText}>Open Settings</Text>
            </Pressable>
          ) : notificationStatus === "unspecified" ? (
            <Pressable
              testID="settings.notifications.requestPermission"
              accessibilityLabel="Request notification permission"
              accessibilityRole="button"
              onPress={handleRequestPermission}
              disabled={loading}
              style={[
                styles.permissionButton,
                styles.glassButton,
                loading && styles.disabledButton,
              ]}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? "Requesting..." : getPermissionLabel()}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.permissionButton}>
              <Text style={styles.primaryButtonText}>✓ {getPermissionLabel()}</Text>
            </View>
          )}

          <SettingRow
            label="Enable notifications"
            enabled={settings.notificationsEnabled}
            onToggle={() => {
              const newVal = !settings.notificationsEnabled;
              setNotificationsEnabled(newVal);
              if (newVal && notificationStatus === "authorized") {
                updateNotificationChannel();
              }
            }}
          />
          <SettingRow
            label="Sound"
            enabled={settings.notificationSoundEnabled}
            onToggle={() => handleSoundToggle(!settings.notificationSoundEnabled)}
          />
          <SettingRow
            label="Vibration"
            enabled={settings.notificationVibrationEnabled}
            onToggle={() => handleVibrationToggle(!settings.notificationVibrationEnabled)}
          />

          {/* Test notification button */}
          <Pressable
            testID="settings.notifications.sendTest"
            onPress={handleTestNotification}
            disabled={loading || !isPermissionGranted}
            style={[
              styles.testButton,
              (!loading && !isPermissionGranted) && styles.disabledButton,
            ]}
          >
            <Text style={styles.testButtonText}>
              {loading ? "Sending..." : "Send Test Notification"}
            </Text>
          </Pressable>
        </View>

        <SectionDivider />

        {/* Permissions section */}
        <View style={styles.section}>
          <SectionTitle>Permissions</SectionTitle>
          <View style={styles.permissionRow}>
            <Text style={Typography.body}>Location permission</Text>
            <Pressable
              testID="settings.permissions.openSystemSettings"
              accessibilityLabel="Open system settings"
              accessibilityRole="button"
              onPress={openSystemSettings}
              style={[styles.permissionButton, styles.glassButton]}
            >
              <Text style={styles.permissionButtonText}>Open Settings</Text>
            </Pressable>
          </View>
        </View>

        <SectionDivider />

        {/* Privacy section */}
        <View style={styles.section}>
          <SectionTitle>Privacy</SectionTitle>
          <Text style={[Typography.bodySmall, { marginBottom: Spacing.sm }]}>
            This app collects location data only to determine when you enter your reminder zones. Location data is
            stored locally on your device and is never sent to any server. Notifications are delivered locally through
            the operating system.
          </Text>
        </View>

        <SectionDivider />

        {/* Developer Tools section (visible only in Developer Mode) */}
        {isDeveloperMode() && (
          <>
            <SectionDivider />
            <View style={styles.section}>
              <Text style={[Typography.bodySmall, { marginBottom: Spacing.sm }]}>Developer Tools</Text>
              <DeveloperGeofenceControls />
            </View>
            <SectionDivider />
          </>
        )}

        {/* About section */}
        <View style={styles.section}>
          <SectionTitle>About</SectionTitle>
          <Text style={[Typography.caption, { marginTop: Spacing.xs }]}>GPS Reminder v0.0.1</Text>
        </View>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.borderGlass,
    marginBottom: Spacing.lg,
  },
  permissionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  permissionButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  glassButton: {
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    borderRadius: BorderRadius.sm,
  },
  permissionButtonText: {
    ...Typography.bodySmall,
    color: Colors.signalRed,
  },
  switchTrack: {
    width: 48,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.disabledFill,
    padding: 3,
  },
  switchTrackOn: {
    backgroundColor: Colors.signalRed,
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
  },
  switchThumbOn: {
    alignSelf: "flex-end",
  },
  permissionStatusRow: {
    marginBottom: Spacing.sm,
  },
  disabledButton: {
    opacity: 0.5,
  },
  primaryButtonText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
  },
  testButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: '#34C759',
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  testButtonText: {
    ...Typography.bodySmall,
    color: '#FFFFFF',
  },
});
