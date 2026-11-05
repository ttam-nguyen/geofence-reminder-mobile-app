/**
 * Frosted Future navigation type definitions.
 *
 * TypeScript route param types for React Navigation 6.x.
 */

export type RootStackParamList = {
  Home: undefined;
  Map: { geofenceId?: string } | undefined;
  Settings: undefined;
};

export type TabParamList = {
  Home: undefined;
  Map: { geofenceId?: string } | undefined;
  Settings: undefined;
};

// Re-export for navigationTypes import in tests
export const NavigationTypes = {
  RootStackParamList: {} as RootStackParamList,
  TabParamList: {} as TabParamList,
};
