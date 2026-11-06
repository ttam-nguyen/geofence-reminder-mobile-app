/**
 * Glass Layered design tokens — re-exports.
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

/** Typography token interface — Glass Layered (6 sizes + mono font). */
export interface TypographyTokens {
  fontFamily: string;
  fontFamilyMono?: string; // IBM Plex Mono for technical labels
  sizes: Record<string, number>;
  weights: Record<string, string>;
  lineHeights: Record<string, number>;
}

/** Spacing token interface — Glass Layered (includes 20, 40). */
export interface SpacingTokens {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;    // Screen horizontal padding (20)
  xxl: number;   // Section vertical gap (24)
  xxxl: number;
  xxxxl: number; // 40
  xxxxxl: number; // 48 (minimum interactive target)
}

/** Radius token interface — Glass Layered (small 10, input 14, card 20, large 24, pill 28). */
export interface RadiusTokens {
  none: number;
  small: number; // 10 (Glass Layered)
  input: number; // 14 (Glass Layered)
  md: number;    // 16 (legacy)
  card: number;  // 20 (Glass Layered)
  large: number; // 24 (Glass Layered)
  pill: number;  // 28 (Glass Layered — pill button / modal)
  full: number;  // Full capsule (9999)
}

/** Elevation token interface — Glass Layered (graphite shadow). */
export type ElevationTokens = Record<string, import('react-native').ViewStyle>;

/** Motion token interface — Glass Layered (includes reduced-motion). */
export interface MotionTokens {
  durationFast: number;
  durationNormal: number;
  durationSlow: number;
  easingEaseOut: string;
  easingEaseInOut: string;
  durationReduced: number; // Instant when reduced motion preferred
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
