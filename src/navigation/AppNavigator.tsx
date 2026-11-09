/**
 * Root navigation shell — Stack + Bottom Tabs with all 7 screens.
 */

import React from 'react';
import { NavigationContainer, useNavigation, useRoute } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Alert, Image, View, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { useReminderStore } from '../stores/reminderStore';
import type { RootStackParamList, TabParamList } from './navigationTypes';
import { ReminderStatus } from '../models/ReminderStatus';

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

const HomeScreenContainer = (_props: any) => {
  const navigation = useNavigation<any>();
  const reminders = useReminderStore((state) => state.reminders);
  const activeReminders = React.useMemo(
    () => reminders.filter((r) => r.status === 'ARMED' || r.status === 'WAITING_FOR_EXIT'),
    [reminders],
  );
  const inactiveReminders = React.useMemo(
    () => reminders.filter((r) => r.status === 'PAUSED'),
    [reminders],
  );
  const transitionStatus = useReminderStore((state) => state.transitionStatus);
  return (
    <HomeScreen
      onNavigateCreate={() => navigation.navigate('CreateReminder' as never)}
      onNavigateList={() => navigation.navigate('ReminderList' as never)}
      onNavigateDetail={(reminderId: string) => navigation.navigate('ReminderDetail' as never, { reminderId })}
      onRemind={(reminderId: string) => {
        console.log('[HomeScreenContainer] Re-arming reminder:', reminderId);
        transitionStatus(reminderId, ReminderStatus.ARMED);
      }}
      activeReminders={activeReminders}
      inactiveReminders={inactiveReminders}
      totalCount={reminders.length}
    />
  );
};

const MapScreenContainer = (_props: any) => {
  const navigation = useNavigation<any>();
  return (
    <MapScreen
      onNavigateCreate={() => navigation.navigate('CreateReminder' as never)}
      reminders={[]}
    />
  );
};

const SettingsScreenContainer = (_props: any) => (
  <SettingsScreen
    onNavigateNotifications={() => {
      console.log('[Settings] Notification Preferences pressed - showing current settings');
      // For now, show an alert with notification status (MVP placeholder)
      Alert.alert(
        'Notification Preferences',
        'Local notifications are configured per reminder.\n\n• Sound: Enabled by default\n• Vibration: Enabled by default\n• No data sent to external servers',
        [{ text: 'OK' }]
      );
    }}
  />
);

const OnboardingContainer = (_props: any) => {
  const navigation = useNavigation<any>();
  const requestPermissions = async () => {
    try {
      const mod = await import('../native/GeofencingModule');
      await mod.requestLocationPermission();
      await mod.requestBackgroundPermission();
    } catch {
      // Native module not registered — skip permission requests gracefully
    }
  };

  const handleComplete = async () => {
    await requestPermissions();
    navigation.replace('HomeTab');
  };

  return <OnboardingScreen onComplete={handleComplete} />;
};

const CreateReminderContainer = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const reminderId = (route.params as { reminderId?: string } | undefined)?.reminderId ?? null;
  return (
    <CreateReminderScreen
      reminderId={reminderId}
      onSaved={() => {
        // Both create and edit modes: go back to previous screen (home/list)
        navigation.goBack();
      }}
      onCancel={() => navigation.goBack()}
    />
  );
};

const ReminderListContainer = (_props: any) => {
  const navigation = useNavigation<any>();
  return (
    <ReminderListScreen
      onNavigateCreate={() => navigation.navigate('CreateReminder' as never)}
      onNavigateDetail={(id: string) => navigation.navigate('ReminderDetail' as never, { reminderId: id })}
      reminders={[]}
    />
  );
};

const ReminderDetailContainer = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const reminderId = (route.params as { reminderId?: string } | undefined)?.reminderId ?? null;
  const reminder = useReminderStore((state) =>
    reminderId ? (state.getById(reminderId) ?? null) : null,
  );
  const transitionStatus = useReminderStore((state) => state.transitionStatus);
  const deleteReminder = useReminderStore((state) => state.deleteReminder);
  return (
    <ReminderDetailScreen
      onNavigateEdit={() => navigation.navigate('CreateReminder' as never, { reminderId: reminder?.id ?? null })}
      onNavigateBack={() => navigation.goBack()}
      onDelete={(id) => {
        console.log('[ReminderDetail] Deleting reminder:', id);
        deleteReminder(id).then((deleted) => {
          if (deleted) {
            console.log('[ReminderDetail] Reminder deleted successfully');
            navigation.goBack();
          } else {
            console.warn('[ReminderDetail] Reminder not found, could not delete');
          }
        });
      }}
      onToggleStatus={(id, newStatus) => {
        transitionStatus(id, newStatus).then((updated) => {
          if (updated) {
            console.log('[ReminderDetail] Status toggled:', updated.status);
          }
        });
      }}
      reminder={reminder}
    />
  );
};

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
      <View style={styles.backgroundImage}>
        <Image
          source={require('../../assets/backgrounds/glass_frosted_geometric_background.png')}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      </View>
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

        {/* Full-screen screens (no RN header — they have custom headers) */}
        <Stack.Screen name="CreateReminder" component={CreateReminderContainer} options={{ headerShown: false, title: 'New Reminder' }} />
        <Stack.Screen name="ReminderList" component={ReminderListContainer} options={{ headerShown: false, title: 'All Reminders' }} />
        <Stack.Screen name="ReminderDetail" component={ReminderDetailContainer} options={{ headerShown: false, title: 'Reminder Details' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
});
