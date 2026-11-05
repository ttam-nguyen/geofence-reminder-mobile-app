/**
 * Frosted Future color tokens — light and dark palettes.
 *
 * Design rules:
 * - Soft neutral backgrounds, white surfaces (light), dark neutrals (dark)
 * - Red accent (#E53E3E) for primary actions and triggered states
 * - High contrast text (WCAG AA minimum for body text)
 * - Glass effect via surfaceOverlay / glassBackground / glassBorder
 */

export const lightColors: Record<string, string> = {
  // Base neutrals
  background: '#F5F7FA',
  surface: '#FFFFFF',
  surfaceOverlay: 'rgba(255, 255, 255, 0.7)', // frosted glass layer
  primary: '#E53E3E',
  primaryText: '#FFFFFF',
  secondary: '#6B7280',
  secondaryText: '#4B5563',
  divider: 'rgba(0, 0, 0, 0.08)',
  error: '#E53E3E',
  warning: '#F6AD55',
  success: '#48BB78',

  // Overlay colors (glass effect)
  glassBackground: 'rgba(255, 255, 255, 0.65)',
  glassBorder: 'rgba(255, 255, 255, 0.3)',
};

export const darkColors: Record<string, string> = {
  // Base neutrals — darker surfaces, adjusted contrast
  background: '#1A1D23',
  surface: '#252830',
  surfaceOverlay: 'rgba(37, 40, 48, 0.7)',
  primary: '#FC8181', // lighter red for dark mode contrast
  primaryText: '#FFFFFF',
  secondary: '#9CA3AF',
  secondaryText: '#D1D5DB',
  divider: 'rgba(255, 255, 255, 0.1)',
  error: '#FC8181',
  warning: '#F6AD55',
  success: '#68D391',

  // Overlay colors (glass effect)
  glassBackground: 'rgba(37, 40, 48, 0.65)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
};
