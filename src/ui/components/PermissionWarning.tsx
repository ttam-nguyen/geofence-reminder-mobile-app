/**
 * PermissionWarning component — displays location permission warning.
 *
 * Shows when location access is required but not granted.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export interface PermissionWarningProps {
  /** Whether location permission is denied or restricted */
  isDenied?: boolean;
  /** Optional style override */
  style?: ViewStyle;
}

export function PermissionWarning({ isDenied = false, style }: PermissionWarningProps) {
  const { theme } = useTheme();

  if (!isDenied) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }, style]}>
      <Text style={[styles.text, { color: theme.colors.primary }]}>
        Location access is required for geofences. Enable in Settings.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
});
