/**
 * Frosted Future SafeAreaWrapper component.
 *
 * Wraps content with safe area insets (notch, status bar, home indicator).
 */

import React from 'react';
import { SafeAreaView, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export interface SafeAreaWrapperProps {
  children: React.ReactNode;
  mode?: 'edges' | 'none';
}

export const SafeAreaWrapper: React.FC<SafeAreaWrapperProps> = ({ children, mode: _mode }) => {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
