/**
 * Glass Layered color tokens — light and dark palettes.
 *
 * Design source: glass_layered_ui_concept_kit/spec/design_tokens.json
 *
 * Design rules:
 * - Signal red (#F52232) used selectively — not as general background fill
 * - Status always communicated with text/icon, not color alone
 * - Glass surfaces: 72% opacity cards over geometric background
 * - Dark mode uses explicit tokens (not inverted light)
 */

export const lightColors: Record<string, string> = {
  // Base neutrals — Glass Layered palette
  background: '#E5EAED',    // Frost (main bg base)
  surface: '#FFFFFF',       // White (surfaces)
  surfaceOverlay: 'rgba(255, 255, 255, 0.72)', // Light glass fill (default card)
  primary: '#F52232',       // Signal red (primary action, selected tab, pin)
  primaryText: '#171D22',   // Graphite (high-contrast text on light)
  secondary: '#68747C',     // Steel grey (secondary text, inactive icons)
  secondaryText: '#27323A', // Text primary (on glass surfaces)
  divider: 'rgba(0, 0, 0, 0.08)',
  error: '#F52232',         // Signal red (error/triggered state)
  warning: '#D99A42',       // Waiting amber (waiting-for-exit status)
  success: '#3C8D70',       // Success green (completed/success state)

  // Overlay colors (glass effect)
  glassBackground: 'rgba(255, 255, 255, 0.65)', // Floating control level
  glassBorder: 'rgba(255, 255, 255, 0.58)',     // Glass edge highlight
};

export const darkColors: Record<string, string> = {
  // Base neutrals — Glass Layered dark palette
  background: '#11171C',       // Dark mode background
  surface: '#202A31',          // Elevated graphite
  surfaceOverlay: 'rgba(34, 43, 50, 0.78)', // Dark glass fill
  primary: '#F52232',          // Signal red (same as light — accent color)
  primaryText: '#F3F6F7',      // Light text on dark glass
  secondary: '#B5C0C6',        // Secondary text (dark mode)
  secondaryText: '#F3F6F7',    // Text primary (dark mode)
  divider: 'rgba(255, 255, 255, 0.1)',
  error: '#F52232',            // Signal red (error/triggered state)
  warning: '#D99A42',          // Waiting amber (waiting-for-exit status)
  success: '#3C8D70',          // Success green (completed/success state)

  // Overlay colors (glass effect)
  glassBackground: 'rgba(34, 43, 50, 0.72)', // Dark glass fill
  glassBorder: 'rgba(255, 255, 255, 0.14)',  // Dark mode glass border
};
