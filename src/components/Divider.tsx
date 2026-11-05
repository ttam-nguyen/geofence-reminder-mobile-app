/**
 * Frosted Future Divider component.
 *
 * Thin line separator using token-based color.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface DividerProps {
  horizontal?: boolean;
  style?: ViewStyle;
}

export const Divider: React.FC<DividerProps> = ({ horizontal = true, style }) => {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View
      style={[
        horizontal ? styles.horizontal : styles.vertical,
        { backgroundColor: colors.divider },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  horizontal: {
    height: 1,
    width: '100%',
  },
  vertical: {
    width: 1,
    height: '100%',
  },
});
