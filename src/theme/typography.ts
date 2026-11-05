/**
 * Frosted Future typography tokens.
 *
 * Uses system fonts (SF Pro for iOS, Roboto for Android) via RN's default.
 * Size scale: 10px to 32px in ~1.2x steps.
 * Weights: regular (400), medium (500), semibold (600), bold (700).
 */

import type { TypographyTokens } from './index';

export const typography: TypographyTokens = {
  fontFamily: '', // empty string = use RN default (SF Pro / Roboto)

  sizes: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
    xxl: 24,
  },

  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
};
