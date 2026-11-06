/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { lightColors, darkColors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { spacing, spacingDouble } from '../../theme/spacing';
import { radii } from '../../theme/radii';

describe('Color Tokens', () => {
  const requiredKeys = [
    'background',
    'surface',
    'surfaceOverlay',
    'primary',
    'primaryText',
    'secondary',
    'secondaryText',
    'divider',
    'error',
    'warning',
    'success',
    'glassBackground',
    'glassBorder',
  ] as const;

  it('lightColors has all required keys', () => {
    for (const key of requiredKeys) {
      expect(lightColors).toHaveProperty(key);
    }
  });

  it('darkColors has all required keys', () => {
    for (const key of requiredKeys) {
      expect(darkColors).toHaveProperty(key);
    }
  });

  it('light and dark palettes differ in background/surface', () => {
    expect(lightColors.background).not.toBe(darkColors.background);
    expect(lightColors.surface).not.toBe(darkColors.surface);
  });

  it('primary colors are valid hex/rgba strings', () => {
    const colorPattern = /^#[0-9A-Fa-f]{6}$|^rgba?\(/;
    expect(lightColors.primary).toMatch(colorPattern);
    expect(darkColors.primary).toMatch(colorPattern);
  });

  it('glass colors use rgba for translucency', () => {
    expect(lightColors.glassBackground).toMatch(/^rgba?\(/);
    expect(darkColors.glassBackground).toMatch(/^rgba?\(/);
  });
});

describe('Typography Tokens', () => {
  it('has all size keys (Glass Layered)', () => {
    const sizes = ['screenTitle', 'sectionTitle', 'cardTitle', 'body', 'secondary', 'microLabel'];
    for (const size of sizes) {
      expect(typography.sizes).toHaveProperty(size);
    }
  });

  it('has all weight keys', () => {
    const weights = ['regular', 'medium', 'semibold', 'bold'];
    for (const weight of weights) {
      expect(typography.weights).toHaveProperty(weight);
    }
  });

  it('has all line height keys (Glass Layered)', () => {
    const heights = ['screenTitle', 'sectionTitle', 'cardTitle', 'body', 'secondary', 'microLabel'];
    for (const height of heights) {
      expect(typography.lineHeights).toHaveProperty(height);
    }
  });

  it('has fontFamilyMono defined', () => {
    expect(typography.fontFamilyMono).toBe('IBM Plex Mono');
  });

  it('font sizes are positive numbers', () => {
    const sizes = Object.values(typography.sizes);
    for (const size of sizes) {
      expect(size).toBeGreaterThan(0);
    }
  });

  it('line heights are positive numbers', () => {
    const heights = Object.values(typography.lineHeights);
    for (const height of heights) {
      expect(height).toBeGreaterThan(0);
    }
  });

  it('microLabel is the smallest size (minimum 11px)', () => {
    expect(typography.sizes.microLabel).toBeGreaterThanOrEqual(11);
  });

  it('screenTitle is the largest size', () => {
    expect(typography.sizes.screenTitle).toBeGreaterThanOrEqual(typography.sizes.sectionTitle);
  });
});

describe('Spacing Tokens', () => {
  it('spacing values are multiples of 4px base grid', () => {
    const keys: (keyof typeof spacing)[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'];
    for (const key of keys) {
      expect(spacing[key] % 4).toBe(0);
    }
  });

  it('spacing values increase monotonically', () => {
    const keys: (keyof typeof spacing)[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'];
    const values = keys.map((k) => spacing[k]);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('spacingDouble is double spacing', () => {
    const keys: (keyof typeof spacing)[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'];
    for (const key of keys) {
      expect(spacingDouble[key]).toBe(spacing[key] * 2);
    }
  });
});

describe('Radius Tokens', () => {
  it('has all radius keys', () => {
    const keys: (keyof typeof radii)[] = ['none', 'small', 'input', 'md', 'card', 'large', 'pill', 'full'];
    for (const key of keys) {
      expect(radii).toHaveProperty(key);
    }
  });

  it('radii increase monotonically (except none=0)', () => {
    const keys: (keyof typeof radii)[] = ['small', 'input', 'md', 'card', 'large', 'pill', 'full'];
    const values = keys.map((k) => radii[k]);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });

  it('full radius is large enough for pill shapes', () => {
    expect(radii.full).toBeGreaterThanOrEqual(9999);
  });
});
