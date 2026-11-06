/**
 * Glass Layered motion (animation) tokens.
 *
 * Design source: glass_layered_ui_concept_kit/spec/GLASS_LAYERED_TECHNICAL_DESIGN_SPEC.md
 *
 * Radius changes: 180–260ms (gentle).
 * Respect system reduced-motion settings.
 */

export const motion = {
  durationFast: 100,    // Micro-interactions, icon taps
  durationNormal: 200,  // Most UI transitions (radius changes ~180–260ms)
  durationSlow: 350,    // Screen-level transitions

  // RN Animated easing presets
  easingEaseOut: 'easeOut' as const,
  easingEaseInOut: 'easeInOut' as const,

  // Reduced-motion durations (when user prefers reduced motion)
  durationReduced: 0,   // Instant — no animation
} as const;
