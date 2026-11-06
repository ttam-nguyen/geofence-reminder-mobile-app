/**
 * Glass Layered corner radius tokens.
 *
 * Design source: glass_layered_ui_concept_kit/spec/design_tokens.json
 *
 * Small radius: 10, Input: 14, Card: 20, Large card: 24, Pill/modal: 28.
 * Use consistent radii — avoid mixing many unrelated corner shapes.
 */

import type { RadiusTokens } from './index';

export const radii: RadiusTokens = {
  none: 0,
  small: 10,    // Small radius (Glass Layered)
  input: 14,    // Input radius (Glass Layered)
  md: 16,       // Medium (legacy, kept for compatibility)
  card: 20,     // Standard card radius (Glass Layered)
  large: 24,    // Large feature card radius (Glass Layered)
  pill: 28,     // Pill button / modal radius (Glass Layered)
  full: 9999,   // Pill/round (full capsule)
};
