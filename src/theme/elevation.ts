/**
 * Frosted Future elevation tokens.
 *
 * Shadow styles for light and dark modes.
 * Uses Platform-specific shadow properties (iOS: shadow*, Android: elevation).
 */

import { Platform } from 'react-native';
import type { ViewStyle } from 'react-native';

const baseShadow: Record<string, unknown> = {
  ...(Platform.OS === 'android'
    ? { elevation: 2 }
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      }),
};

const mediumShadow: Record<string, unknown> = {
  ...(Platform.OS === 'android'
    ? { elevation: 4 }
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      }),
};

const highShadow: Record<string, unknown> = {
  ...(Platform.OS === 'android'
    ? { elevation: 8 }
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 12,
      }),
};

export const elevation = {
  shadow0: {} as ViewStyle,
  shadow1: baseShadow as ViewStyle,
  shadow2: mediumShadow as ViewStyle,
  shadow3: highShadow as ViewStyle,
};
