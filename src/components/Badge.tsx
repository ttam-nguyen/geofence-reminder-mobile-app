/**
 * Frosted Future Badge component.
 *
 * Status colors: armed (blue), triggered (red), completed (green),
 * waiting_for_exit (orange), draft (gray), cancelled (dark gray).
 */

import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export type BadgeStatus =
  | 'armed'
  | 'triggered'
  | 'completed'
  | 'waiting_for_exit'
  | 'draft'
  | 'cancelled'
  | 'paused';

export interface BadgeProps {
  status: BadgeStatus;
  children: React.ReactNode;
  style?: ViewStyle;
}

const statusColors: Record<BadgeStatus, string> = {
  armed: '#3B82F6',
  triggered: '#E53E3E',
  completed: '#48BB78',
  waiting_for_exit: '#F6AD55',
  draft: '#9CA3AF',
  cancelled: '#6B7280',
  paused: '#A78BFA',
};

export const Badge: React.FC<BadgeProps> = ({ status, children, style }) => {
  const { theme } = useTheme();
  const { radii } = theme;

  return (
    <View style={[styles.base, { backgroundColor: statusColors[status], borderRadius: radii.full }, style]}>
      <Text style={[styles.text, { color: '#FFFFFF' }]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
  },
});

// Re-export for test modules
export const BadgeStatusValues = ['armed', 'triggered', 'completed', 'waiting_for_exit', 'draft', 'cancelled', 'paused'] as const;
