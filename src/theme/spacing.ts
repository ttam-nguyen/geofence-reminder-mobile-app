/**
 * Glass Layered spacing tokens.
 *
 * Design source: glass_layered_ui_concept_kit/spec/design_tokens.json
 *
 * 4dp base grid: 4, 8, 12, 16, 20, 24, 32, 40, 48.
 * Screen horizontal padding: 20 (16 on compact devices).
 * Section vertical gap: 24.
 */

import type { SpacingTokens } from './index';

export const spacing: SpacingTokens = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,    // Screen horizontal padding (Glass Layered)
  xxl: 24,   // Section vertical gap
  xxxl: 32,
  xxxxl: 40,
  xxxxxl: 48, // Minimum interactive target height
};

// Double scale for larger gaps (e.g., between sections)
export const spacingDouble: SpacingTokens = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 40,
  xxl: 48,
  xxxl: 64,
  xxxxl: 96,
  xxxxxl: 128,
};
