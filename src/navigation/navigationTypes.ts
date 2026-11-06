/**
 * Navigation type definitions for all screens.
 */

export type RootStackParamList = {
  Onboarding: undefined;
  HomeTab: undefined;
  MapTab: { geofenceId?: string } | undefined;
  SettingsTab: undefined;
  CreateReminder: { reminderId?: string } | undefined;
  ReminderList: undefined;
  ReminderDetail: { reminderId: string };
};

export type TabParamList = {
  Home: undefined;
  Map: { geofenceId?: string } | undefined;
  Settings: undefined;
};

export const NavigationTypes = {
  RootStackParamList: {} as RootStackParamList,
  TabParamList: {} as TabParamList,
};
