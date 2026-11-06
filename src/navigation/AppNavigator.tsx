/**
 * Root navigation shell — Stack + Bottom Tabs with all 7 screens.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import type { RootStackParamList, TabParamList } from './navigationTypes';

// Import all screens
import { OnboardingScreen } from '../ui/OnboardingScreen';
import { HomeScreen } from '../ui/HomeScreen';
import { CreateReminderScreen } from '../ui/CreateReminderScreen';
import { ReminderListScreen } from '../ui/ReminderListScreen';
import { ReminderDetailScreen } from '../ui/ReminderDetailScreen';
import { MapScreen } from '../ui/MapScreen';
import { SettingsScreen } from '../ui/SettingsScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/** Container components that bridge navigation props to screen props. */

const HomeScreenContainer = (_props: any) => (
  <HomeScreen
    onNavigateCreate={() => {}}
    onNavigateList={() => {}}
    activeReminders={[]}
    totalCount={0}
  />
);

const MapScreenContainer = (_props: any) => (
  <MapScreen onNavigateCreate={() => {}} reminders={[]} />
);

const SettingsScreenContainer = (_props: any) => (
  <SettingsScreen onNavigateNotifications={() => {}} />
);

const OnboardingContainer = (_props: any) => (
  <OnboardingScreen onComplete={() => {}} />
);

const CreateReminderContainer = (_props: any) => (
  <CreateReminderScreen reminderId={null} onSaved={() => {}} onCancel={() => {}} />
);

const ReminderListContainer = (_props: any) => (
  <ReminderListScreen onNavigateCreate={() => {}} onNavigateDetail={() => {}} reminders={[]} />
);

const ReminderDetailContainer = (_props: any) => (
  <ReminderDetailScreen onNavigateEdit={() => {}} onNavigateBack={() => {}} onDelete={() => {}} reminder={null} />
);

/** Bottom tab navigator with Home, Map, Settings tabs. */
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
      <Tab.Screen name="Home" component={HomeScreenContainer} options={{ title: 'Reminders' }} />
      <Tab.Screen name="Map" component={MapScreenContainer} options={{ title: 'Map' }} />
      <Tab.Screen name="Settings" component={SettingsScreenContainer} options={{ title: 'Settings' }} />
    </Tab.Navigator>
  );
};

/** Root navigation container with all screens. */
export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#E5EAED' },
          headerTintColor: '#171D22',
        }}
      >
        {/* Onboarding (shown first, then replaced) */}
        <Stack.Screen
          name="Onboarding"
          component={OnboardingContainer}
          options={{ headerShown: false }}
        />

        {/* Main app (tab-based) */}
        <Stack.Screen name="HomeTab" component={TabNavigator} options={{ headerShown: false }} />

        {/* Full-screen screens */}
        <Stack.Screen name="CreateReminder" component={CreateReminderContainer} options={{ title: 'New Reminder' }} />
        <Stack.Screen name="ReminderList" component={ReminderListContainer} options={{ title: 'All Reminders' }} />
        <Stack.Screen name="ReminderDetail" component={ReminderDetailContainer} options={{ title: 'Reminder Details' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
