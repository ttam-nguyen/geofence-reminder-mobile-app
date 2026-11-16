// Settings screen — full settings with notifications, permissions, privacy, and about sections.

import React, { useState, useCallback } from "react";
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

  React.useEffect(() => {
    const unsub = subscribe(() => setSettings(getSettings()));
    return unsub;
  }, []);

  const openSystemSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  return (
    <SafeArea style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={Typography.h2}>Settings</Text>

        {/* Notifications section */}
        <View style={styles.section}>
          <SectionTitle>Notifications</SectionTitle>
          <SettingRow
            label="Enable notifications"
            enabled={settings.notificationsEnabled}
            onToggle={() => setNotificationsEnabled(!settings.notificationsEnabled)}
          />
          <SettingRow
            label="Sound"
            enabled={settings.notificationSoundEnabled}
            onToggle={() => setNotificationSoundEnabled(!settings.notificationSoundEnabled)}
          />
          <SettingRow
            label="Vibration"
            enabled={settings.notificationVibrationEnabled}
            onToggle={() => setNotificationVibrationEnabled(!settings.notificationVibrationEnabled)}
          />
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
});
