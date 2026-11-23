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
import { initLogger, log } from "./src/services/logger";

function App() {
  const isDarkMode = useColorScheme() === "dark";

  // One-time OS permission bootstrap for notification + location.
  useFirstLaunchPermissions();

  // Start the durable log first so every later startup step is recorded.
  useEffect(() => {
    void (async () => {
      await initLogger();
      log.info("app", "App started");
      initGeofencingService();
    })();
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
