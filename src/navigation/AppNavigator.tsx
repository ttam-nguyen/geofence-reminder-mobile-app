// Root navigation — bottom tabs with stack overlay for create flow.

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { HomeScreen } from "../screens/HomeScreen";
import { MapScreen } from "../screens/MapScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { CreateReminderScreen } from "../screens/CreateReminderScreen";
import { Colors, Typography } from "../theme";
import { enableScreens } from "react-native-screens";

export type RootStackParamList = {
  Main: undefined;
  CreateReminder: { reminderId?: string };
};

export type TabParamList = {
  Home: undefined;
  Map: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainNavigator({ navigation }: NativeStackScreenProps<RootStackParamList, "Main">) {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: Colors.signalRed,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.borderGlass,
          borderTopWidth: 1,
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
        {() => <HomeScreen onNavigateToCreate={() => navigation.navigate("CreateReminder", {})} />}
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
          options={{ title: "Create Reminder", presentation: "modal" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
