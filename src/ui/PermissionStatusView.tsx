/**
 * PermissionStatusView — displays notification + location permission status with recovery guidance.
 *
 * Shows the current state of notification and location permissions,
 * and displays recovery guidance when permissions are denied.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { NotificationPermissionStatus } from '../native/NotificationModule';
import { useTheme } from '../theme/ThemeContext';

/** Location permission status type (matches GeofencingModule). */
type LocationPermissionStatus = 'granted' | 'denied' | 'never_asked' | 'restricted';

export interface PermissionStatusViewProps {
  /** Notification permission status. */
  notificationPermission?: NotificationPermissionStatus | null;
  /** Location permission status. */
  locationPermission?: LocationPermissionStatus | null;
  /** Whether background location is allowed (iOS only). */
  backgroundLocationAllowed?: boolean;
  /** Callback to open app settings for permission recovery. */
  onOpenSettings?: () => void;
  /** Whether to show location permission status (default: true). */
  showLocationStatus?: boolean;
}

/** Permission icon based on status. */
function getPermissionIcon(status: string | null): string {
  switch (status) {
    case 'granted':
      return '✓';
    case 'denied':
    case 'restricted':
      return '✗';
    case 'never_asked':
      return '?';
    default:
      return '—';
  }
}

/** Recovery message for denied permissions. */
function getRecoveryMessage(permission: string, status: string | null): string {
  if (status === 'granted') {
    return `${permission} is enabled.`;
  }

  if (status === 'never_asked') {
    return `${permission} has not been requested yet. The app will ask when needed.`;
  }

  // denied or restricted
  return `${permission} is disabled. Enable it in Settings for geofences to work.`;
}

export function PermissionStatusView({
  notificationPermission = null,
  locationPermission = null,
  backgroundLocationAllowed = false,
  onOpenSettings,
  showLocationStatus = true,
}: PermissionStatusViewProps) {
  const theme = useTheme();

  const needsWarning =
    notificationPermission === 'denied' ||
    (showLocationStatus && (locationPermission === 'denied' || locationPermission === 'restricted'));

  return (
    <View style={styles.container}>
      {/* Notification permission status */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.colors.primaryText }]}>Notifications</Text>
        <Text style={[styles.icon, { color: notificationPermission === 'granted' ? theme.colors.success : theme.colors.signal }]}>
          {getPermissionIcon(notificationPermission)}
        </Text>
      </View>

      <Text style={styles.message}>
        {getRecoveryMessage('Notifications', notificationPermission)}
      </Text>

      {/* Location permission status (optional) */}
      {showLocationStatus && locationPermission !== null && (
        <>
          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.primaryText }]}>Location</Text>
            <Text style={[styles.icon, { color: locationPermission === 'granted' ? theme.colors.success : theme.colors.signal }]}>
              {getPermissionIcon(locationPermission)}
            </Text>
          </View>

          <Text style={styles.message}>
            {getRecoveryMessage('Location', locationPermission)}
          </Text>

          {/* iOS background location warning */}
          {showLocationStatus && !backgroundLocationAllowed && (
            <Text style={styles.subtext}>
              Background location access is required for geofences to work while the app is closed or in the background.
            </Text>
          )}
        </>
      )}

      {/* Recovery CTA when permissions are denied */}
      {needsWarning && onOpenSettings && (
        <TouchableOpacity style={styles.settingsButton} onPress={onOpenSettings}>
          <Text style={styles.settingsButtonText}>Open Settings</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
  icon: {
    fontSize: 17,
    fontWeight: '600',
  },
  message: {
    fontSize: 13,
    color: '#68747C',
    marginTop: 4,
  },
  subtext: {
    fontSize: 13,
    color: '#68747C',
    marginTop: 8,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    marginVertical: 12,
  },
  settingsButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 28,
    backgroundColor: 'rgba(245, 34, 50, 0.1)',
    alignItems: 'center',
  },
  settingsButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F52232',
  },
});
