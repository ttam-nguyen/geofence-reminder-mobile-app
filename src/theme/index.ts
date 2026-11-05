/**
 * Frosted Future design tokens — re-exports.
 *
 * Import individual tokens from their modules, or use the combined Theme type.
 */

export { lightColors, darkColors } from './colors';
export { typography } from './typography';
export { spacing, spacingDouble } from './spacing';
export { radii } from './radii';
export { elevation } from './elevation';
export { blurStyles, blurRadius, supportsNativeBlur } from './blur';
export { motion } from './motion';

/** Color token keys for validation. */
export type ColorKey = string;

/** Typography token interface. */
export interface TypographyTokens {
  fontFamily: string;
  sizes: Record<string, number>;
  weights: Record<string, string>;
  lineHeights: Record<string, number>;
}

/** Spacing token interface. */
export interface SpacingTokens {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
  xxxl: number;
}

/** Radius token interface. */
export interface RadiusTokens {
  none: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  full: number;
}

/** Elevation token interface. */
export type ElevationTokens = Record<string, import('react-native').ViewStyle>;

/** Motion token interface. */
export interface MotionTokens {
  durationFast: number;
  durationNormal: number;
  durationSlow: number;
  easingEaseOut: string;
  easingEaseInOut: string;
}

/** Combined theme interface. */
export interface Theme {
  colors: Record<string, string>;
  typography: TypographyTokens;
  spacing: SpacingTokens;
  radii: RadiusTokens;
  elevation: ElevationTokens;
  motion: MotionTokens;
  isDark: boolean;
}
