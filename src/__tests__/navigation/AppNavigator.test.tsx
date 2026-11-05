import { describe, it, expect } from 'vitest';

// Test that navigationTypes module loads without errors
const typesModule = await import('../../navigation/navigationTypes');

describe('Navigation Types', () => {
  it('navigationTypes module loads without errors', () => {
    expect(typesModule).toBeDefined();
  });

  it('NavigationTypes object is exported', () => {
    expect(typesModule.NavigationTypes).toBeDefined();
  });
});
