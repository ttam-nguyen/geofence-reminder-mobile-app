/**
 * Frosted Future Card component.
 *
 * Supports frosted glass variant (translucent background, subtle shadow).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface CardProps {
  glass?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({ glass = false, children }) => {
  const { theme } = useTheme();
  const { colors, radii } = theme;

  return (
    <View
      style={[
        styles.base,
        { borderRadius: radii.lg },
        glass ? styles.glass : { backgroundColor: colors.surface },
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    padding: 16,
  },
  glass: {
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
});
