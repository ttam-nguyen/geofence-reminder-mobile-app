/**
 * OfflineBanner component — displays offline state.
 *
 * Shows when the device has no internet connection.
 * Core features (create/view/delete reminders) still work; only search is unavailable.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

export interface OfflineBannerProps {
  /** Whether the device is offline */
  isOffline?: boolean;
}

export function OfflineBanner({ isOffline = false }: OfflineBannerProps) {
  const { theme } = useTheme();

  if (!isOffline) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.text, { color: theme.colors.warning }]}>
        You are offline. Core features work, search unavailable.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
  },
});
