/**
 * Frosted Future spacing tokens.
 *
 * 4px base grid: 4, 8, 12, 16, 24, 32, 48, 64.
 */

import type { SpacingTokens } from './index';

export const spacing: SpacingTokens = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

// Double scale for larger gaps (e.g., between sections)
export const spacingDouble: SpacingTokens = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64,
  xxxl: 96,
};
