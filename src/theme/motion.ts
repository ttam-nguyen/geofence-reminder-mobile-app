/**
 * Frosted Future motion (animation) tokens.
 *
 * Durations in milliseconds, matching Material Design Motion guidelines:
 * - Fast: 100ms (micro-interactions, icon taps)
 * - Normal: 200ms (most UI transitions)
 * - Slow: 350ms (screen-level transitions)
 * 
 * Easing curves matching RN's Animated API.
 */

export const motion = {
  durationFast: 100,
  durationNormal: 200,
  durationSlow: 350,

  // RN Animated easing presets
  easingEaseOut: 'easeOut' as const,
  easingEaseInOut: 'easeInOut' as const,
} as const;
