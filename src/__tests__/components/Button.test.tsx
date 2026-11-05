import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const componentsDir = path.resolve(__dirname, '../../components');

describe('Component Files', () => {
  it('Button.tsx exists and exports a function', () => {
    const content = fs.readFileSync(path.join(componentsDir, 'Button.tsx'), 'utf-8');
    expect(content).toContain('export const Button');
  });

  it('Input.tsx exists and exports a function', () => {
    const content = fs.readFileSync(path.join(componentsDir, 'Input.tsx'), 'utf-8');
    expect(content).toContain('export const Input');
  });

  it('Card.tsx exists and exports a function', () => {
    const content = fs.readFileSync(path.join(componentsDir, 'Card.tsx'), 'utf-8');
    expect(content).toContain('export const Card');
  });

  it('Badge.tsx exists and exports a function', () => {
    const content = fs.readFileSync(path.join(componentsDir, 'Badge.tsx'), 'utf-8');
    expect(content).toContain('export const Badge');
  });

  it('Divider.tsx exists and exports a function', () => {
    const content = fs.readFileSync(path.join(componentsDir, 'Divider.tsx'), 'utf-8');
    expect(content).toContain('export const Divider');
  });

  it('SafeAreaWrapper.tsx exists and exports a function', () => {
    const content = fs.readFileSync(path.join(componentsDir, 'SafeAreaWrapper.tsx'), 'utf-8');
    expect(content).toContain('export const SafeAreaWrapper');
  });

  it('components/index.ts re-exports all components', () => {
    const content = fs.readFileSync(path.join(componentsDir, 'index.ts'), 'utf-8');
    expect(content).toContain("from './Button'");
    expect(content).toContain("from './Input'");
    expect(content).toContain("from './Card'");
    expect(content).toContain("from './Badge'");
    expect(content).toContain("from './Divider'");
    expect(content).toContain("from './SafeAreaWrapper'");
  });
});
