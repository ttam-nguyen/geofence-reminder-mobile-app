/**
 * GPS Reminder — React Native App Entry Point
 *
 * @format
 */

import { useEffect, useState } from "react";
import { StatusBar, StyleSheet, useColorScheme, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { initGeofencingService } from "./src/services/geofencingService";
import { useFirstLaunchPermissions } from "./src/hooks/useFirstLaunchPermissions";
import { useBackgroundLocationGuard } from "./src/hooks/useBackgroundLocationGuard";
import { initLogger, log } from "./src/services/logger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ONBOARDING_FLAG_KEY, shouldShowOnboarding } from "./src/onboarding/steps";
import { APP_VERSION } from "./src/config/version";

function App() {
  const isDarkMode = useColorScheme() === "dark";

  // null while the flag is being read: showing the tabs first and swapping to the introduction
  // would flash the app behind it.
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  // One-time OS permission bootstrap for notifications + foreground location.
  useFirstLaunchPermissions();

  // "Allow all the time" location: re-checked every launch and resume, because background
  // geofencing is silently disabled without it.
  useBackgroundLocationGuard();

  // Start the durable log first so every later startup step is recorded.
  useEffect(() => {
    void (async () => {
      await initLogger();
      log.info("app", `App started v${APP_VERSION}`);
      initGeofencingService();
    })();
  }, []);

  // Read the first-run flag once, before the navigator mounts.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(ONBOARDING_FLAG_KEY)
      .then(value => {
        if (!cancelled) {
          setOnboardingDone(!shouldShowOnboarding(value));
        }
      })
      .catch(() => {
        if (!cancelled) {
          // A storage failure must not hide the introduction: show it.
          setOnboardingDone(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const finishOnboarding = () => {
    setOnboardingDone(true);
    void AsyncStorage.setItem(ONBOARDING_FLAG_KEY, "done").catch(() => {
      // Worst case the introduction is shown once more on the next launch.
    });
  };

  if (onboardingDone === null) {
    return (
      <SafeAreaProvider style={styles.container}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={styles.container} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider style={styles.container}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View style={styles.container}>
        <AppNavigator
          initialRouteName={onboardingDone ? "Main" : "Onboarding"}
          onOnboardingDone={finishOnboarding}
        />
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
