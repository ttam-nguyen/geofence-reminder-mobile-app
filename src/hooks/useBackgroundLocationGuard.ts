/**
 * useBackgroundLocationGuard — asks for "Allow all the time" location.
 *
 * Why this exists: on Android 10+ `ACCESS_BACKGROUND_LOCATION` is the permission the OS uses to
 * decide whether geofence transitions are reported while the app is not in the foreground. Without
 * it the app still receives nothing in the background, which looks like "it only tracks when I open
 * the app". Android 11+ forbids requesting it from code, so the only correct flow is an explicit
 * prompt that sends the user to the app's settings screen.
 *
 * The check re-runs on every launch and every resume, because a user can revoke it later. The
 * dialog is raised at most once per app session to avoid nagging.
 */

import { useEffect, useRef } from 'react';
import { Alert, AppState, PermissionsAndroid, Platform } from 'react-native';
import { store, storeReady } from '../stores/reminderStore';
import { ReminderStatus } from '../types/Reminder';
import { requestBackgroundLocationPermission } from '../services/geofencingService';
import { log } from '../services/logger';

const MONITORED_STATUSES: ReminderStatus[] = [
  ReminderStatus.ARMED,
  ReminderStatus.WAITING_FOR_EXIT,
  ReminderStatus.ARRIVAL_PENDING,
];

export function useBackgroundLocationGuard(): void {
  const promptedThisSession = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    let cancelled = false;

    async function check() {
      try {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
        );

        if (granted || cancelled) {
          return;
        }

        // Do not ask when nothing is being monitored: the permission is only meaningful then.
        await storeReady;
        const activeReminders = (await store.findAll()).filter(reminder =>
          MONITORED_STATUSES.includes(reminder.status),
        );

        log.warn('permission', 'Background location is not granted', {
          activeReminders: activeReminders.length,
          prompted: promptedThisSession.current,
        });

        if (activeReminders.length === 0 || promptedThisSession.current || cancelled) {
          return;
        }

        promptedThisSession.current = true;

        Alert.alert(
          'Allow location all the time',
          'Arrival alerts only work while the app is closed if location is set to "Allow all the time". ' +
            'Open the app settings and choose that option.',
          [
            { text: 'Not now', style: 'cancel' },
            {
              text: 'Open settings',
              onPress: () => {
                void requestBackgroundLocationPermission();
              },
            },
          ],
        );
      } catch (error) {
        log.warn('permission', 'Background location check failed', { error: String(error) });
      }
    }

    void check();

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') {
        void check();
      }
    });

    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, []);
}
