/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import React from 'react';
import { ThemeProvider, useTheme } from '../../theme/ThemeContext';

// Mock React Native's useColorScheme
vi.mock('react-native', () => ({
  useColorScheme: vi.fn(() => 'light'),
  Platform: { OS: 'ios' },
}));

describe('ThemeContext', () => {
  it('ThemeProvider provides theme context', () => {
    const TestComponent = () => {
      const { theme, colors, isDark } = useTheme();
      expect(theme).toBeDefined();
      expect(colors).toBeDefined();
      expect(typeof isDark).toBe('boolean');
      return null;
    };

    const wrapper = React.createElement(ThemeProvider, null, React.createElement(TestComponent));
    // Should not throw
    expect(() => { React.createElement(wrapper.type, wrapper.props); }).not.toThrow();
  });

  it('ThemeContext provides all theme modules', () => {
    const TestComponent = () => {
      const { theme } = useTheme();
      expect(theme.colors).toBeDefined();
      expect(theme.typography).toBeDefined();
      expect(theme.spacing).toBeDefined();
      expect(theme.radii).toBeDefined();
      expect(theme.elevation).toBeDefined();
      expect(theme.motion).toBeDefined();
      return null;
    };

    const wrapper = React.createElement(ThemeProvider, null, React.createElement(TestComponent));
    expect(() => { React.createElement(wrapper.type, wrapper.props); }).not.toThrow();
  });
});
