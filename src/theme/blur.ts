/**
 * Frosted Future blur/translucency tokens.
 *
 * iOS: UIBlurStyle (regular, systemChromeMaterial, etc.)
 * Android: RenderEffect with blur (API 31+) or manual blur via renderScript.
 *
 * For MVP, we use opacity-based frosted glass (surfaceOverlay colors)
 * and native blur style for the status bar / tab bar.
 */

import { Platform } from 'react-native';

export const blurStyles = {
  light: 'systemChromeMaterial' as const,
  dark: 'systemChromeMaterial' as const, // RN Maps uses this for overlay
} as const;

/** Blur radius in dp (Android RenderEffect). 0 = no blur. */
export const blurRadius = 20;

/** Whether native blur is supported (Android API 31+). */
export const supportsNativeBlur = Platform.OS === 'android'
  ? false // MVP: use opacity-based frosted glass for all platforms
  : true; // iOS always supports blur
