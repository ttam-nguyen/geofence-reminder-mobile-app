/**
 * Glass Layered typography tokens.
 *
 * Design source: glass_layered_ui_concept_kit/spec/GLASS_LAYERED_TECHNICAL_DESIGN_SPEC.md
 *
 * Family pairing:
 * - Primary: Inter or Manrope (set fontFamily to use)
 * - Technical labels: IBM Plex Mono (coordinates, distances, GPS diagnostics)
 *
 * Sizes in React Native pixels (matches Flutter dp on 1:1 density devices).
 * Do not use all-caps or dot-matrix type for long content.
 */

import type { TypographyTokens } from './index';

export const typography: TypographyTokens = {
  fontFamily: 'Inter', // Change to 'Manrope' or '' for system default

  sizes: {
    screenTitle: 26,  // Screen title
    sectionTitle: 19, // Section title
    cardTitle: 17,    // Card title
    body: 15,         // Body text
    secondary: 13,    // Secondary text
    microLabel: 11,   // Micro label (minimum for essential info)
  },

  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  lineHeights: {
    screenTitle: 32,
    sectionTitle: 24,
    cardTitle: 22,
    body: 22,
    secondary: 18,
    microLabel: 14,
  },

  // Technical monospace for coordinates, distances, GPS data
  fontFamilyMono: 'IBM Plex Mono',
};
