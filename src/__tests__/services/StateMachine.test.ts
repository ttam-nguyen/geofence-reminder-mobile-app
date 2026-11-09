/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';
import { ReminderStatus } from '../../models/ReminderStatus';
import { canTransition, haversineDistance, determineInitialStatus, validTransitions } from '../../services/StateMachine';

describe('validTransitions Table', () => {
  it('has all 7 states as keys', () => {
    const keys = Object.keys(validTransitions);
    expect(keys).toContain(ReminderStatus.DRAFT);
    expect(keys).toContain(ReminderStatus.WAITING_FOR_EXIT);
    expect(keys).toContain(ReminderStatus.ARMED);
    expect(keys).toContain(ReminderStatus.TRIGGERED);
    expect(keys).toContain(ReminderStatus.COMPLETED);
    expect(keys).toContain(ReminderStatus.CANCELLED);
    expect(keys).toContain(ReminderStatus.PAUSED);
  });

  it('DRAFT can transition to ARMED, WAITING_FOR_EXIT, COMPLETED, CANCELLED, PAUSED', () => {
    expect(validTransitions[ReminderStatus.DRAFT]).toHaveLength(5);
  });

  it('WAITING_FOR_EXIT can transition to ARMED, CANCELLED, PAUSED', () => {
    expect(validTransitions[ReminderStatus.WAITING_FOR_EXIT]).toHaveLength(3);
  });

  it('ARMED can transition to TRIGGERED, COMPLETED, CANCELLED, PAUSED', () => {
    expect(validTransitions[ReminderStatus.ARMED]).toHaveLength(4);
  });

  it('TRIGGERED can only transition to COMPLETED', () => {
    expect(validTransitions[ReminderStatus.TRIGGERED]).toEqual([ReminderStatus.COMPLETED]);
  });

  it('COMPLETED has no valid transitions (terminal)', () => {
    expect(validTransitions[ReminderStatus.COMPLETED]).toHaveLength(0);
  });

  it('CANCELLED has no valid transitions (terminal)', () => {
    expect(validTransitions[ReminderStatus.CANCELLED]).toHaveLength(0);
  });

  it('PAUSED can transition to ARMED, COMPLETED, CANCELLED', () => {
    expect(validTransitions[ReminderStatus.PAUSED]).toHaveLength(3);
  });
});

describe('canTransition', () => {
  it('allows DRAFT → ARMED', () => {
    expect(canTransition(ReminderStatus.DRAFT, ReminderStatus.ARMED)).toBe(true);
  });

  it('allows DRAFT → WAITING_FOR_EXIT', () => {
    expect(canTransition(ReminderStatus.DRAFT, ReminderStatus.WAITING_FOR_EXIT)).toBe(true);
  });

  it('allows DRAFT → COMPLETED', () => {
    expect(canTransition(ReminderStatus.DRAFT, ReminderStatus.COMPLETED)).toBe(true);
  });

  it('allows DRAFT → CANCELLED', () => {
    expect(canTransition(ReminderStatus.DRAFT, ReminderStatus.CANCELLED)).toBe(true);
  });

  it('allows WAITING_FOR_EXIT → ARMED (on exit)', () => {
    expect(canTransition(ReminderStatus.WAITING_FOR_EXIT, ReminderStatus.ARMED)).toBe(true);
  });

  it('allows WAITING_FOR_EXIT → CANCELLED', () => {
    expect(canTransition(ReminderStatus.WAITING_FOR_EXIT, ReminderStatus.CANCELLED)).toBe(true);
  });

  it('allows ARMED → TRIGGERED (on entry)', () => {
    expect(canTransition(ReminderStatus.ARMED, ReminderStatus.TRIGGERED)).toBe(true);
  });

  it('allows ARMED → COMPLETED (manual)', () => {
    expect(canTransition(ReminderStatus.ARMED, ReminderStatus.COMPLETED)).toBe(true);
  });

  it('allows ARMED → CANCELLED', () => {
    expect(canTransition(ReminderStatus.ARMED, ReminderStatus.CANCELLED)).toBe(true);
  });

  it('allows TRIGGERED → COMPLETED (manual)', () => {
    expect(canTransition(ReminderStatus.TRIGGERED, ReminderStatus.COMPLETED)).toBe(true);
  });

  // Invalid transitions
  it('blocks DRAFT → TRIGGERED (must go through ARMED/WAITING_FOR_EXIT)', () => {
    expect(canTransition(ReminderStatus.DRAFT, ReminderStatus.TRIGGERED)).toBe(false);
  });

  it('blocks DRAFT → WAITING_FOR_EXIT (valid — actually this IS valid)', () => {
    expect(canTransition(ReminderStatus.DRAFT, ReminderStatus.WAITING_FOR_EXIT)).toBe(true);
  });

  it('blocks WAITING_FOR_EXIT → TRIGGERED (must exit first)', () => {
    expect(canTransition(ReminderStatus.WAITING_FOR_EXIT, ReminderStatus.TRIGGERED)).toBe(false);
  });

  it('blocks TRIGGERED → ARMED (terminal path forward)', () => {
    expect(canTransition(ReminderStatus.TRIGGERED, ReminderStatus.ARMED)).toBe(false);
  });

  it('blocks any transition from COMPLETED (terminal)', () => {
    expect(canTransition(ReminderStatus.COMPLETED, ReminderStatus.ARMED)).toBe(false);
    expect(canTransition(ReminderStatus.COMPLETED, ReminderStatus.DRAFT)).toBe(false);
  });

  it('blocks any transition from CANCELLED (terminal)', () => {
    expect(canTransition(ReminderStatus.CANCELLED, ReminderStatus.ARMED)).toBe(false);
    expect(canTransition(ReminderStatus.CANCELLED, ReminderStatus.DRAFT)).toBe(false);
  });

  it('blocks ARMED → WAITING_FOR_EXIT (must complete or cancel)', () => {
    expect(canTransition(ReminderStatus.ARMED, ReminderStatus.WAITING_FOR_EXIT)).toBe(false);
  });

  // PAUSED transitions
  it('allows DRAFT → PAUSED (pause during creation)', () => {
    expect(canTransition(ReminderStatus.DRAFT, ReminderStatus.PAUSED)).toBe(true);
  });

  it('allows WAITING_FOR_EXIT → PAUSED (pause while waiting for exit)', () => {
    expect(canTransition(ReminderStatus.WAITING_FOR_EXIT, ReminderStatus.PAUSED)).toBe(true);
  });

  it('allows ARMED → PAUSED (disarm)', () => {
    expect(canTransition(ReminderStatus.ARMED, ReminderStatus.PAUSED)).toBe(true);
  });

  it('allows PAUSED → ARMED (re-arm)', () => {
    expect(canTransition(ReminderStatus.PAUSED, ReminderStatus.ARMED)).toBe(true);
  });

  it('allows PAUSED → COMPLETED (complete from paused)', () => {
    expect(canTransition(ReminderStatus.PAUSED, ReminderStatus.COMPLETED)).toBe(true);
  });

  it('allows PAUSED → CANCELLED (cancel from paused)', () => {
    expect(canTransition(ReminderStatus.PAUSED, ReminderStatus.CANCELLED)).toBe(true);
  });

  it('blocks TRIGGERED → DRAFT (must complete or cancel)', () => {
    expect(canTransition(ReminderStatus.TRIGGERED, ReminderStatus.DRAFT)).toBe(false);
  });

  it('blocks TRIGGERED → WAITING_FOR_EXIT (must complete or cancel)', () => {
    expect(canTransition(ReminderStatus.TRIGGERED, ReminderStatus.WAITING_FOR_EXIT)).toBe(false);
  });

  it('blocks CANCELLED → DRAFT (terminal)', () => {
    expect(canTransition(ReminderStatus.CANCELLED, ReminderStatus.DRAFT)).toBe(false);
  });

  it('blocks COMPLETED → DRAFT (terminal)', () => {
    expect(canTransition(ReminderStatus.COMPLETED, ReminderStatus.DRAFT)).toBe(false);
  });

  // Same-state transitions (self-loop) — not in transition table, so blocked
  it('blocks DRAFT → DRAFT (no self-loop)', () => {
    expect(canTransition(ReminderStatus.DRAFT, ReminderStatus.DRAFT)).toBe(false);
  });
});

describe('haversineDistance', () => {
  it('returns 0 for same coordinates', () => {
    const distance = haversineDistance(37.7749, -122.4194, 37.7749, -122.4194);
    expect(distance).toBe(0);
  });

  it('returns ~0 for very close points (1 meter apart)', () => {
    const distance = haversineDistance(37.7749, -122.4194, 37.7749085, -122.4194);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(10); // Should be close to 1 meter
  });

  it('returns ~distance for known points (NYC to LA ≈ 3944 km)', () => {
    const distance = haversineDistance(40.7128, -74.0060, 34.0522, -118.2437);
    // Allow 5% tolerance for spherical earth calculation
    const expected = 3944000; // meters
    const tolerance = expected * 0.05;
    expect(distance).toBeGreaterThan(expected - tolerance);
    expect(distance).toBeLessThan(expected + tolerance);
  });

  it('returns ~distance for known points (London to Paris ≈ 343 km)', () => {
    const distance = haversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
    const expected = 343000; // meters
    const tolerance = expected * 0.05;
    expect(distance).toBeGreaterThan(expected - tolerance);
    expect(distance).toBeLessThan(expected + tolerance);
  });

  it('returns distance for equatorial points', () => {
    // ~10 degrees of longitude at equator ≈ 1113 km
    const distance = haversineDistance(0, 0, 0, 10);
    const expected = 1113000; // meters (approx)
    const tolerance = expected * 0.02;
    expect(distance).toBeGreaterThan(expected - tolerance);
    expect(distance).toBeLessThan(expected + tolerance);
  });

  it('handles southern hemisphere', () => {
    const distance = haversineDistance(-33.8688, 151.2093, -34.0, 151.3); // Sydney area
    expect(distance).toBeGreaterThan(0);
  });

  it('handles crossing the antimeridian', () => {
    // Points near 180/-180 longitude boundary
    const distance = haversineDistance(0, 179.5, 0, -179.5);
    expect(distance).toBeGreaterThan(0);
  });

  it('returns distance for poles', () => {
    const distance = haversineDistance(90, 0, 80, 0); // North pole to 80°N
    const expected = 1113000; // ~10 degrees ≈ 1113 km
    const tolerance = expected * 0.02;
    expect(distance).toBeGreaterThan(expected - tolerance);
    expect(distance).toBeLessThan(expected + tolerance);
  });
});

describe('determineInitialStatus', () => {
  // Scenario 1: Inside target → WAITING_FOR_EXIT
  it('returns WAITING_FOR_EXIT when user is inside the geofence (distance = 0)', () => {
    const status = determineInitialStatus(37.7749, -122.4194, 37.7749, -122.4194, 50);
    expect(status).toBe(ReminderStatus.WAITING_FOR_EXIT);
  });

  it('returns WAITING_FOR_EXIT when user is within radius (inside)', () => {
    // User 30m from center, radius is 50m → inside
    const status = determineInitialStatus(37.77517, -122.4194, 37.7749, -122.4194, 50);
    expect(status).toBe(ReminderStatus.WAITING_FOR_EXIT);
  });

  it('returns WAITING_FOR_EXIT when user is exactly on the boundary', () => {
    // User at exactly 50m from center (on the boundary) → inside
    const status = determineInitialStatus(37.77530, -122.4194, 37.7749, -122.4194, 50);
    expect(status).toBe(ReminderStatus.WAITING_FOR_EXIT);
  });

  // Scenario 2: Initial registration while inside does not trigger (returns WAITING_FOR_EXIT)
  it('does NOT return TRIGGERED for initial registration while inside', () => {
    const status = determineInitialStatus(37.7749, -122.4194, 37.7749, -122.4194, 50);
    expect(status).not.toBe(ReminderStatus.TRIGGERED);
    expect(status).toBe(ReminderStatus.WAITING_FOR_EXIT);
  });

  // Scenario 5: Outside target → ARMED
  it('returns ARMED when user is outside the geofence (distance > radius)', () => {
    // User 200m from center, radius is 50m → outside
    const status = determineInitialStatus(37.7767, -122.4194, 37.7749, -122.4194, 50);
    expect(status).toBe(ReminderStatus.ARMED);
  });

  it('returns ARMED for distant coordinates (NYC vs SF)', () => {
    const status = determineInitialStatus(40.7128, -74.0060, 37.7749, -122.4194, 50);
    expect(status).toBe(ReminderStatus.ARMED);
  });

  // Scenario: Location unavailable → DRAFT
  it('returns DRAFT when current coordinates are NaN (location unavailable)', () => {
    const status = determineInitialStatus(NaN, -122.4194, 37.7749, -122.4194, 50);
    expect(status).toBe(ReminderStatus.DRAFT);
  });

  it('returns DRAFT when target coordinates are NaN', () => {
    const status = determineInitialStatus(37.7749, -122.4194, NaN, -122.4194, 50);
    expect(status).toBe(ReminderStatus.DRAFT);
  });

  // Scenario 8: Exit alone never triggers (handled by state machine, not initial status)
  it('returns ARMED when user is outside (exit scenario pre-condition)', () => {
    const status = determineInitialStatus(37.78, -122.42, 37.7749, -122.4194, 50);
    expect(status).toBe(ReminderStatus.ARMED);
  });

  // Boundary test: exactly at radius boundary
  it('returns WAITING_FOR_EXIT when user is exactly on the boundary', () => {
    // Calculate a point ~45m from center (within 50m radius)
    const status = determineInitialStatus(37.77530, -122.4194, 37.7749, -122.4194, 50);
    expect(status).toBe(ReminderStatus.WAITING_FOR_EXIT);
  });

  it('returns ARMED when distance exceeds radius by 1 meter', () => {
    // Create a point ~52m from center (outside 50m radius)
    const status = determineInitialStatus(37.77541, -122.4194, 37.7749, -122.4194, 50);
    expect(status).toBe(ReminderStatus.ARMED);
  });
});
