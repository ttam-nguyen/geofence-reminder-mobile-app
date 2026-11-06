/**
 * Glass Layered elevation tokens.
 *
 * Design source: glass_layered_ui_concept_kit/spec/GLASS_LAYERED_TECHNICAL_DESIGN_SPEC.md
 *
 * Glass surface shadow: rgba(23,29,34,0.10), blur 18, offset (0, 6).
 * Adjust for contrast and background complexity.
 */

import { Platform } from 'react-native';
import type { ViewStyle } from 'react-native';

const baseShadow: Record<string, unknown> = {
  ...(Platform.OS === 'android'
    ? { elevation: 2 }
    : {
        shadowColor: '#171D22', // Graphite
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 18,
      }),
};

const mediumShadow: Record<string, unknown> = {
  ...(Platform.OS === 'android'
    ? { elevation: 4 }
    : {
        shadowColor: '#171D22',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      }),
};

const highShadow: Record<string, unknown> = {
  ...(Platform.OS === 'android'
    ? { elevation: 8 }
    : {
        shadowColor: '#171D22',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.14,
        shadowRadius: 30,
      }),
};

export const elevation = {
  shadow0: {} as ViewStyle,
  shadow1: baseShadow as ViewStyle,
  shadow2: mediumShadow as ViewStyle,
  shadow3: highShadow as ViewStyle,
};
