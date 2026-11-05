/**
 * Frosted Future ThemeContext provider and useTheme hook.
 *
 * Wraps the app in a context that provides theme tokens.
 * Detects dark mode via React Native's useColorScheme().
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import type { ColorSchemeName } from 'react-native';
import { lightColors, darkColors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radii } from './radii';
import { elevation } from './elevation';
import { motion } from './motion';
import type { Theme, ColorKey } from './index';

interface ThemeContextValue {
  theme: Theme;
  colorScheme: ColorSchemeName;
  colors: Record<ColorKey, string>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const colorScheme = useColorScheme(); // 'light', 'dark', or null
  const isDark = colorScheme === 'dark';

  const colors = useMemo(
    () => (isDark ? darkColors : lightColors),
    [isDark],
  );

  const theme: Theme = useMemo(
    () => ({
      colors,
      typography,
      spacing,
      radii,
      elevation,
      motion,
      isDark,
    }),
    [colors, isDark],
  );

  const value: ThemeContextValue = useMemo(
    () => ({ theme, colorScheme, colors, isDark }),
    [theme, colorScheme, colors, isDark],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};
