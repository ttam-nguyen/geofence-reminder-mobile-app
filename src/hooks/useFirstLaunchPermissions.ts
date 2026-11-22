// useFirstLaunchPermissions — one-time bootstrap of notification + location
// permissions on first launch, using the OS prompt instead of system settings.

import { useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from '../services/notificationService';
import { requestLocationPermission } from '../services/geofencingService';

const KEY = 'geofence.firstLaunchPermissionsShown';

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

        // Location permission.
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
