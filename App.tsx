/**
 * GPS Reminder — React Native App Entry Point
 *
 * @format
 */

import { useEffect } from "react";
import { StatusBar, StyleSheet, useColorScheme, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { initGeofencingService } from "./src/services/geofencingService";
import { useFirstLaunchPermissions } from "./src/hooks/useFirstLaunchPermissions";

function App() {
  const isDarkMode = useColorScheme() === "dark";

  // One-time OS permission bootstrap for notification + location.
  useFirstLaunchPermissions();

  // Initialize native geofence listeners + re-register active geofences on startup.
  // Run once after mount so native modules are ready and no side effects fire
  // during render (which could be re-invoked in React StrictMode).
  useEffect(() => {
    initGeofencingService();
  }, []);

  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View style={styles.container}>
        <AppNavigator />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
