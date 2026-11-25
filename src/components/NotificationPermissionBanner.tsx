// NotificationPermissionBanner — displays notification permission status with actionable UI.
// Used in Settings and Onboarding screens to educate users about notification permissions.

import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Linking } from 'react-native';
import { Colors, Spacing, Typography, BorderRadius } from '../theme';
import { PressableArea } from './PressableArea';
import { notificationService, AuthorizationStatus } from '../services/notificationService';

interface NotificationPermissionBannerProps {
  /** Called when permission status changes (e.g., after user grants/denies). */
  onStatusChange?: (status: AuthorizationStatus) => void;
}

export function NotificationPermissionBanner({
  onStatusChange,
}: NotificationPermissionBannerProps) {
  const [status, setStatus] = useState<AuthorizationStatus>('unspecified');
  const [loading, setLoading] = useState(false);

  const refreshStatus = useCallback(async () => {
    const s = await notificationService.checkPermission();
    setStatus(s);
    onStatusChange?.(s);
  }, [onStatusChange]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const handleRequestPermission = useCallback(async () => {
    setLoading(true);
    try {
      const s = await notificationService.requestPermission();
      setStatus(s);
      onStatusChange?.(s);
    } catch (err) {
      console.warn('[NotificationPermissionBanner] requestPermission failed:', err);
    } finally {
      setLoading(false);
    }
  }, [onStatusChange]);

  const handleOpenSettings = useCallback(async () => {
    await Linking.openSettings();
  }, []);

  // Determine what to show based on current status.
  if (status === 'authorized') {
    return (
      <View style={styles.banner}>
        <Text style={styles.bannerText}>✓ Notifications enabled</Text>
      </View>
    );
  }

  if (status === 'denied') {
    return (
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Notifications are disabled. Open system settings to enable them.
        </Text>
        <PressableArea
          testID="notification-permission-banner.openSettings"
          accessibilityRole="button"
          onPress={handleOpenSettings}
          style={[styles.actionButton, styles.glassButton]}
        >
          <Text style={styles.actionButtonText}>Open Settings</Text>
        </PressableArea>
      </View>
    );
  }

  // unspecified (not yet asked) or other.
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>
        We need permission to send reminders when you arrive at locations.
      </Text>
      <PressableArea
        testID="notification-permission-banner.request"
        accessibilityRole="button"
        onPress={handleRequestPermission}
        disabled={loading}
        style={[styles.actionButton, styles.primaryButton]}
      >
        <Text style={styles.actionButtonText}>
          {loading ? 'Requesting...' : 'Enable Notifications'}
        </Text>
      </PressableArea>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 1,
    borderColor: Colors.borderGlass,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  bannerText: {
    ...Typography.bodySmall,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  actionButton: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.signalRed,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  glassButton: {
    alignSelf: 'flex-end',
  },
  actionButtonText: {
    ...Typography.caption,
    color: '#FFFFFF',
  },
});
