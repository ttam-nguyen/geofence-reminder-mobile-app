// useFirstLaunchPermissions — one-time bootstrap of notification + location permissions
// on first launch, using the OS prompt instead of system settings.

import { useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../services/notificationService';
import {
  requestBackgroundLocationPermission,
  requestLocationPermission,
} from '../services/geofencingService';
import { log } from '../services/logger';

// Versioned key: v1 asked only for foreground location. Bumping the key re-runs onboarding once
// so existing installs are asked for background location, which geofencing needs on Android 10+.
const KEY = 'geofence.onboarding.v2';

export function useFirstLaunchPermissions() {
  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const flag = await AsyncStorage.getItem(KEY);
        if (flag === 'true' || cancelled) {
          return;
        }

        // Notification permission.
        const status = await notificationService.checkPermission();
        if (status === 'unspecified') {
          await notificationService.requestPermission();
        }

        // Foreground location permission.
        if (Platform.OS === 'android') {
          await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location permission',
              message:
                'GPS Reminder needs your location to detect when you arrive at your reminder zones.',
              buttonPositive: 'Allow',
              buttonNeutral: 'Ask me later',
              buttonNegative: 'Deny',
            },
          );
        } else {
          await requestLocationPermission();
        }

        // Background location: without it Android only reports geofence transitions while the
        // app is open. Android 11+ routes the user to the settings screen for "Allow all the
        // time", so the flag is only set once the OS has actually been asked.
        if (Platform.OS === 'android') {
          const background = await requestBackgroundLocationPermission();
          log.info('permission', 'Background location bootstrap', { result: background });
        }

        await AsyncStorage.setItem(KEY, 'true');
      } catch (err) {
        console.warn('[Permissions] First-launch bootstrap failed:', err);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);
}
