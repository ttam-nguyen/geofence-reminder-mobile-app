// Root navigation — bottom tabs with stack overlay for create/detail flows.

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { HomeScreen } from "../screens/HomeScreen";
import { MapScreen } from "../screens/MapScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { CreateReminderScreen } from "../screens/CreateReminderScreen";
import { ReminderDetailScreen } from "../screens/ReminderDetailScreen";
import { Colors, Typography } from "../theme";
import { enableScreens } from "react-native-screens";
import { Reminder } from "../types/Reminder";

export type RootStackParamList = {
  Main: undefined;
  CreateReminder: { reminderId?: string; reminder?: Reminder };
  Detail: { reminder: Reminder };
};

export type TabParamList = {
  Home: undefined;
  Map: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainNavigator({ navigation }: NativeStackScreenProps<RootStackParamList, "Main">) {
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
          marginBottom: 10,
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
  return (
    <NavigationContainer>
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
