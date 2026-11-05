/**
 * Frosted Future navigation shell.
 *
 * Root navigator with Stack + Bottom Tabs structure.
 * Placeholder screens for Home, Map, and Settings tabs.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../theme/ThemeContext';

// Placeholder screen components
const HomeScreen = () => null; // Placeholder — no content yet

const MapScreen = () => null; // Placeholder — no content yet

const SettingsScreen = () => null; // Placeholder — no content yet

const Tab = createBottomTabNavigator();

/** Bottom tab navigator with placeholder screens. */
const TabNavigator = () => {
  const { theme } = useTheme();
  const isDark = theme.isDark;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.secondary,
        tabBarStyle: {
          backgroundColor: isDark ? theme.colors.surface : theme.colors.surface,
          borderTopColor: theme.colors.divider,
        },
        headerStyle: {
          backgroundColor: isDark ? theme.colors.surface : theme.colors.surface,
        },
        headerTintColor: theme.colors.secondaryText,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};

/** Root navigation container. */
export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <TabNavigator />
    </NavigationContainer>
  );
};

// Placeholder navigation prop — real types come from React Navigation
export const AppNavigationProp = {
  navigate: () => {},
  goBack: () => {},
};
