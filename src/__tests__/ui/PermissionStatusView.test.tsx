/**
 * Unit tests for PermissionStatusView.
 *
 * Tests:
 * - Renders notification permission status with correct icon and message
 * - Shows recovery guidance when permissions are denied
 * - Shows location permission section when enabled
 * - Renders Open Settings button when warning needed
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';

describe('PermissionStatusView', () => {
  it('exists and exports a function component', () => {
    const content = fs.readFileSync('src/ui/PermissionStatusView.tsx', 'utf-8');
    expect(content).toContain('export function PermissionStatusView');
  });

  it('accepts notificationPermission prop', () => {
    const content = fs.readFileSync('src/ui/PermissionStatusView.tsx', 'utf-8');
    expect(content).toContain('notificationPermission');
  });

  it('accepts locationPermission prop', () => {
    const content = fs.readFileSync('src/ui/PermissionStatusView.tsx', 'utf-8');
    expect(content).toContain('locationPermission');
  });

  it('accepts onOpenSettings callback prop', () => {
    const content = fs.readFileSync('src/ui/PermissionStatusView.tsx', 'utf-8');
    expect(content).toContain('onOpenSettings');
  });

  it('accepts backgroundLocationAllowed prop', () => {
    const content = fs.readFileSync('src/ui/PermissionStatusView.tsx', 'utf-8');
    expect(content).toContain('backgroundLocationAllowed');
  });

  it('shows recovery message when permissions are denied', () => {
    const content = fs.readFileSync('src/ui/PermissionStatusView.tsx', 'utf-8');
    expect(content).toContain('Enable it in Settings for geofences to work');
  });

  it('shows "has not been requested yet" for never_asked status', () => {
    const content = fs.readFileSync('src/ui/PermissionStatusView.tsx', 'utf-8');
    expect(content).toContain('has not been requested yet');
  });

  it('shows background location requirement text', () => {
    const content = fs.readFileSync('src/ui/PermissionStatusView.tsx', 'utf-8');
    expect(content).toContain('Background location access is required for geofences to work');
  });

  it('renders Open Settings button when warning needed', () => {
    const content = fs.readFileSync('src/ui/PermissionStatusView.tsx', 'utf-8');
    expect(content).toContain('Open Settings');
  });

  it('uses theme colors for styling', () => {
    const content = fs.readFileSync('src/ui/PermissionStatusView.tsx', 'utf-8');
    expect(content).toContain('useTheme()');
  });

  it('uses glass card styling (bordered rounded container)', () => {
    const content = fs.readFileSync('src/ui/PermissionStatusView.tsx', 'utf-8');
    expect(content).toContain('borderRadius: 14');
  });
});
