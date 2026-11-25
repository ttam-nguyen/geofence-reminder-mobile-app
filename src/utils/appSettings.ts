/**
 * Open the app's own settings screen.
 *
 * iOS: `Linking.openSettings()` opens the app-specific page, which is where Location and
 * Notifications live. iOS also accepts the private `App-Prefs:` scheme, which lands directly on
 * the Location Services list; it is tried first because it is one tap shorter, with the documented
 * API as the fallback (the private scheme is refused by some iOS builds).
 *
 * Android: `Linking.openSettings()` is the app's details page, which is what the user needs for
 * "Allow all the time" location.
 */

import { Linking, Platform } from 'react-native';
import { log } from '../services/logger';

const IOS_DEEP_LINKS = ['App-Prefs:Privacy&path=LOCATION'];

export async function openAppSettings(reason = 'user request'): Promise<void> {
  if (Platform.OS === 'ios') {
    for (const url of IOS_DEEP_LINKS) {
      try {
        await Linking.openURL(url);
        log.info('permission', 'Opened iOS location settings', { reason, url });
        return;
      } catch {
        // Scheme refused on this build — fall through to the public API.
      }
    }
  }

  try {
    await Linking.openSettings();
    log.info('permission', 'Opened app settings', { reason });
  } catch (error) {
    log.error('permission', 'Could not open app settings', { reason, error: String(error) });
  }
}
