/**
 * SettingsScreen — App preferences, privacy info, and permissions.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface SettingsScreenProps {
  /** Navigate to notification permissions screen */
  onNavigateNotifications: () => void;
  /** Version string (e.g., "0.1.0") */
  appVersion?: string;
}

export function SettingsScreen({ onNavigateNotifications, appVersion = '0.1.0' }: SettingsScreenProps) {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.divider }]}>
        <Text style={[styles.headerTitle, { color: colors.primaryText }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Notification preferences */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Notifications</Text>
          <TouchableOpacity style={{ paddingVertical: 4 }} onPress={onNavigateNotifications} activeOpacity={0.7}>
            <Text style={[styles.settingItem, { color: colors.primary }]}>Notification Preferences →</Text>
          </TouchableOpacity>
          <Text style={[styles.settingDesc, { color: colors.secondary }]}>
            Configure alert sound and vibration settings.
          </Text>
        </View>

        {/* Theme (placeholder for MVP) */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Theme</Text>
          <View style={[styles.themePreview, { backgroundColor: colors.surface }]}>
            <Text style={[styles.themeLabel, { color: colors.primaryText }]}>Frosted Future (default)</Text>
            <Text style={[styles.themeDesc, { color: colors.secondary }]}>
              Free dark-mode theme with glass cards and signal-red accents.
            </Text>
          </View>
        </View>

        {/* Privacy & permissions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>Privacy & Permissions</Text>

          <View style={styles.privacyItem}>
            <Text style={[styles.privacyLabel, { color: colors.primaryText }]}>Location</Text>
            <Text style={[styles.privacyDesc, { color: colors.secondary }]}>
              Used to monitor geofence boundaries. Works in background. Revocable in OS settings.
            </Text>
          </View>

          <View style={styles.privacyItem}>
            <Text style={[styles.privacyLabel, { color: colors.primaryText }]}>Notifications</Text>
            <Text style={[styles.privacyDesc, { color: colors.secondary }]}>
              Local notifications only. No data sent to external servers.
            </Text>
          </View>

          <View style={styles.privacyItem}>
            <Text style={[styles.privacyLabel, { color: colors.primaryText }]}>Data Storage</Text>
            <Text style={[styles.privacyDesc, { color: colors.secondary }]}>
              All reminder data stored locally on your device. No cloud sync, no account required.
            </Text>
          </View>
        </View>

        {/* App information */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>About</Text>
          <View style={[styles.aboutCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.aboutTitle, { color: colors.primaryText }]}>GPS Reminder</Text>
            <Text style={[styles.aboutVersion, { color: colors.secondary }]}>Version {appVersion}</Text>
            <Text style={[styles.aboutTagline, { color: colors.secondary }]}>
              Remember what you need when you arrive — not at an arbitrary time.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '600',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingItem: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 13,
  },
  themePreview: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  themeLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeDesc: {
    fontSize: 13,
  },
  privacyItem: {
    marginBottom: 16,
  },
  privacyLabel: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  privacyDesc: {
    fontSize: 13,
  },
  aboutCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    alignItems: 'center',
  },
  aboutTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
  },
  aboutVersion: {
    fontSize: 13,
    marginBottom: 8,
  },
  aboutTagline: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
