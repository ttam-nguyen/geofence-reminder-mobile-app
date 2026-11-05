/**
 * Basic sanity test for project setup (Plan 0).
 * Verifies TypeScript compilation and basic module structure.
 */

import { describe, it, expect } from 'vitest';

describe('Project Setup (Plan 0)', () => {
  it('should have valid package.json with required dependencies', () => {
    const pkg = require('../../package.json');
    
    expect(pkg.name).toBe('GPSReminder');
    expect(pkg.version).toMatch(/^0\./);
    
    // Core dependencies
    expect(pkg.dependencies).toHaveProperty('react');
    expect(pkg.dependencies).toHaveProperty('react-native');
    expect(pkg.dependencies).toHaveProperty('zustand');
    
    // Development dependencies
    expect(pkg.devDependencies).toHaveProperty('typescript');
    expect(pkg.devDependencies).toHaveProperty('vitest');
    expect(pkg.devDependencies).toHaveProperty('eslint');
    expect(pkg.devDependencies).toHaveProperty('prettier');
  });

  it('should have TypeScript configured with strict mode', () => {
    const tsConfig = require('../../tsconfig.json');
    
    expect(tsConfig.compilerOptions).toHaveProperty('strict', true);
    expect(tsConfig.compilerOptions).toHaveProperty('noImplicitAny', true);
    expect(tsConfig.compilerOptions).toHaveProperty('strictNullChecks', true);
  });

  it('should have ESLint configured with TypeScript support', () => {
    const eslintConfig = require('../../.eslintrc.js');
    
    expect(eslintConfig.parser).toBe('@typescript-eslint/parser');
    expect(eslintConfig.plugins).toContain('@typescript-eslint');
  });

  it('should have Prettier configured', () => {
    const fs = require('fs');
    const path = require('path');
    
    const prettierPath = path.join(__dirname, '..', '..', '.prettierrc.json');
    expect(fs.existsSync(prettierPath)).toBe(true);
    
    const prettierConfig = require('../../.prettierrc.json');
    expect(prettierConfig).toHaveProperty('semi', true);
    expect(prettierConfig).toHaveProperty('trailingComma', 'all');
  });

  it('should have vitest configured', () => {
    const vitestConfig = require('../../vitest.config.ts');
    
    expect(vitestConfig).toBeDefined();
  });

  it('should have source directory structure', () => {
    const fs = require('fs');
    const path = require('path');
    
    const srcDir = path.join(__dirname, '..');
    expect(fs.existsSync(path.join(srcDir, 'app.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(srcDir, 'index.ts'))).toBe(true);
  });
});
