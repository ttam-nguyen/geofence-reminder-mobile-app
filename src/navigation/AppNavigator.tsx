// Root navigation — bottom tabs with stack overlay for create/detail flows.

import React from "react";
import { Linking } from "react-native";
import { NavigationContainer, useNavigationContainerRef } from "@react-navigation/native";
import { setOnNotificationTap } from "../services/geofencingService";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { HomeScreen } from "../screens/HomeScreen";
import { MapScreen } from "../screens/MapScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { CreateReminderScreen } from "../screens/CreateReminderScreen";
import { ReminderDetailScreen } from "../screens/ReminderDetailScreen";
import { store } from "../stores/reminderStore";
import { Colors, Spacing, Typography } from "../theme";
import { enableScreens } from "react-native-screens";
import { Reminder, ReminderStatus } from "../types/Reminder";

export type RootStackParamList = {
  Main: undefined;
  CreateReminder: { reminderId?: string; reminder?: Reminder };
  Detail: { reminder: Reminder };
};

// Deep-link prefix for notification tap navigation.
const linkingPrefixes = ['gpsreminder://reminder/'];

/** Extract a reminderId from a notification deep link, or return null. */
function extractReminderIdFromLink(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/gpsreminder:\/\/reminder\/(.+)/);
  return match ? match[1] : null;
}

export type TabParamList = {
  Home: undefined;
  Map: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Tab bar metrics.
 * The system navigation inset is added to these, so the labels sit TAB_BAR_BOTTOM_GAP above the
 * gesture/navigation bar instead of flush against it.
 */
const TAB_BAR_CONTENT_HEIGHT = 52;
const TAB_BAR_TOP_PADDING = Spacing.xs;
/** Visible gap between the tab labels and the system navigation bar. */
const TAB_BAR_BOTTOM_GAP = Spacing.md;

function MainNavigator({ navigation }: NativeStackScreenProps<RootStackParamList, "Main">) {
  const insets = useSafeAreaInsets();

  const navigateToCreate = (reminderId?: string, reminder?: Reminder) => {
    if (reminderId && reminder) {
      navigation.navigate("CreateReminder", { reminderId, reminder });
    } else {
      navigation.navigate("CreateReminder", {});
    }
  };

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.signalRed,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.borderGlass,
          borderTopWidth: 1,
          // Explicit height: when `height` is set, React Navigation stops adding the bottom
          // inset itself, so both height and padding must account for it.
          height: TAB_BAR_CONTENT_HEIGHT + TAB_BAR_TOP_PADDING + insets.bottom + TAB_BAR_BOTTOM_GAP,
          paddingTop: TAB_BAR_TOP_PADDING,
          paddingBottom: insets.bottom + TAB_BAR_BOTTOM_GAP,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        headerStyle: {
          backgroundColor: Colors.background,
        },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: Typography.h3,
      }}
    >
      <Tab.Screen name="Home" options={{ title: "Reminders", tabBarLabel: "Home" }}>
        {() => (
          <HomeScreen
            onNavigateToCreate={navigateToCreate}
            onNavigateToDetail={reminder => navigation.navigate("Detail", { reminder })}
          />
        )}
      </Tab.Screen>
      <Tab.Screen name="Map" component={MapScreen} options={{ title: "Map", tabBarLabel: "Map" }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings", tabBarLabel: "Settings" }} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const navigationRef = useNavigationContainerRef();

  // Handle deep links from notification taps.
  const handleDeepLink = React.useCallback(
    async (url: string | null | undefined) => {
      const reminderId = extractReminderIdFromLink(url ?? null);
      if (!reminderId) return;

      // Look up the reminder from the store.
      const reminder = await store.findById(reminderId);
      if (reminder && reminder.status !== ReminderStatus.DELETED) {
        (navigationRef as any)?.navigate('Detail', { reminder });
      }
    },
    [navigationRef],
  );

  // Handle notification taps (foreground) — registered synchronously by initGeofencingService().
  React.useEffect(() => {
    setOnNotificationTap(async (tapData) => {
      const reminderId = tapData.reminderId;
      if (!reminderId) return;

      const reminder = await store.findById(reminderId);
      if (reminder && reminder.status !== ReminderStatus.DELETED) {
        (navigationRef as any)?.navigate('Detail', { reminder });
      }
    });
  }, [navigationRef]);

  const linking = {
    prefixes: linkingPrefixes,
    subscribe(listener: (url: string) => void) {
      Linking.addEventListener('url', (event) => listener(event.url));
      return () => {}; // no-op cleanup — notifee handles unsubscription above
    },
  };

  return (
    <NavigationContainer ref={navigationRef as any} linking={linking as any} onReady={() => {
      // Handle initial URL (app opened from notification).
      Linking.getInitialURL()?.then(handleDeepLink);
    }}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.textPrimary,
          headerTitleStyle: Typography.h3,
        }}
      >
        <Stack.Screen name="Main" component={MainNavigator} options={{ headerShown: false }} />
        <Stack.Screen
          name="CreateReminder"
          component={CreateReminderScreen}
          options={({ route }) => ({
            title: (route.params.reminder as Reminder)?.title ? "Edit Reminder" : "Create Reminder",
            presentation: "modal",
          })}
        />
        <Stack.Screen name="Detail" options={({ route }) => ({ title: route.params.reminder.title })}>
          {props => <ReminderDetailScreen {...props} />}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
