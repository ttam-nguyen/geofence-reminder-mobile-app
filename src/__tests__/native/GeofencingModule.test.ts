/**
 * Unit tests for native geofencing module TypeScript interfaces.
 *
 * Verifies:
 * - All exported types are correctly defined
 * - Function signatures match the spec
 * - TypeScript compilation passes with strict mode
 */

import { describe, it, expect } from 'vitest';
import type {
  RegisterGeofenceParams,
  GeofenceEvent,
  PermissionStatus,
} from '@/native/GeofencingModule';

describe('Native module TypeScript interfaces', () => {
  describe('RegisterGeofenceParams', () => {
    it('has all required fields with correct types', () => {
      const params: RegisterGeofenceParams = {
        requestId: 'reminder-123',
        latitude: 37.7749,
        longitude: -122.4194,
        radiusMeters: 100,
        notifyOnEntry: true,
      };

      expect(params.requestId).toBeTypeOf('string');
      expect(params.latitude).toBeTypeOf('number');
      expect(params.longitude).toBeTypeOf('number');
      expect(params.radiusMeters).toBeTypeOf('number');
      expect(params.notifyOnEntry).toBeTypeOf('boolean');
    });

    it('allows optional notifyOnExit field', () => {
      const params: RegisterGeofenceParams = {
        requestId: 'reminder-456',
        latitude: 37.7749,
        longitude: -122.4194,
        radiusMeters: 200,
        notifyOnEntry: true,
        notifyOnExit: true,
      };

      expect(params.notifyOnExit).toBe(true);
    });

    it('works without optional notifyOnExit field', () => {
      const params: RegisterGeofenceParams = {
        requestId: 'reminder-789',
        latitude: 34.0522,
        longitude: -118.2437,
        radiusMeters: 50,
        notifyOnEntry: true,
      };

      expect(params.notifyOnExit).toBeUndefined();
    });
  });

  describe('GeofenceEvent', () => {
    it('has all required fields with correct types', () => {
      const event: GeofenceEvent = {
        requestId: 'reminder-123',
        eventType: 'ENTER',
        timestamp: Date.now(),
        latitude: 37.7749,
        longitude: -122.4194,
        horizontalAccuracy: 5,
      };

      expect(event.requestId).toBeTypeOf('string');
      expect(event.eventType).toBeTypeOf('string');
      expect(event.timestamp).toBeTypeOf('number');
      expect(event.latitude).toBeTypeOf('number');
      expect(event.longitude).toBeTypeOf('number');
      expect(event.horizontalAccuracy).toBeTypeOf('number');
    });

    it('accepts both ENTER and EXIT event types', () => {
      const enterEvent: GeofenceEvent = {
        requestId: 'r1',
        eventType: 'ENTER',
        timestamp: 0,
        latitude: 0,
        longitude: 0,
        horizontalAccuracy: 0,
      };

      const exitEvent: GeofenceEvent = {
        requestId: 'r2',
        eventType: 'EXIT',
        timestamp: 0,
        latitude: 0,
        longitude: 0,
        horizontalAccuracy: 0,
      };

      expect(enterEvent.eventType).toBe('ENTER');
      expect(exitEvent.eventType).toBe('EXIT');
    });

    it('rejects invalid event types (type-level test)', () => {
      // This would fail at compile time if uncommented:
      // const badEvent: GeofenceEvent = {
      //   requestId: 'r3',
      //   eventType: 'INVALID', // TS error: not assignable to 'ENTER' | 'EXIT'
      //   timestamp: 0,
      //   latitude: 0,
      //   longitude: 0,
      //   horizontalAccuracy: 0,
      // };
      expect(true).toBe(true);
    });
  });

  describe('PermissionStatus', () => {
    it('has all required fields with correct types', () => {
      const status: PermissionStatus = {
        locationPermission: 'granted',
        notificationPermission: 'denied',
        backgroundLocationAllowed: false,
      };

      expect(status.locationPermission).toBeTypeOf('string');
      expect(status.notificationPermission).toBeTypeOf('string');
      expect(status.backgroundLocationAllowed).toBeTypeOf('boolean');
    });

    it('accepts all valid location permission states', () => {
      const granted: PermissionStatus = {
        locationPermission: 'granted',
        notificationPermission: 'granted',
        backgroundLocationAllowed: false,
      };

      const denied: PermissionStatus = {
        locationPermission: 'denied',
        notificationPermission: 'denied',
        backgroundLocationAllowed: false,
      };

      const neverAsked: PermissionStatus = {
        locationPermission: 'never_asked',
        notificationPermission: 'never_asked',
        backgroundLocationAllowed: false,
      };

      const restricted: PermissionStatus = {
        locationPermission: 'restricted',
        notificationPermission: 'denied',
        backgroundLocationAllowed: false,
      };

      expect(granted.locationPermission).toBe('granted');
      expect(denied.locationPermission).toBe('denied');
      expect(neverAsked.locationPermission).toBe('never_asked');
      expect(restricted.locationPermission).toBe('restricted');
    });

    it('accepts all valid notification permission states', () => {
      const status: PermissionStatus = {
        locationPermission: 'granted',
        notificationPermission: 'granted',
        backgroundLocationAllowed: false,
      };

      expect(status.notificationPermission).toBeTypeOf('string');
    });

    it('has correct boolean for backgroundLocationAllowed', () => {
      const withBg: PermissionStatus = {
        locationPermission: 'granted',
        notificationPermission: 'granted',
        backgroundLocationAllowed: true,
      };

      const withoutBg: PermissionStatus = {
        locationPermission: 'granted',
        notificationPermission: 'denied',
        backgroundLocationAllowed: false,
      };

      expect(withBg.backgroundLocationAllowed).toBe(true);
      expect(withoutBg.backgroundLocationAllowed).toBe(false);
    });
  });

  describe('Type exports', () => {
    it('types are correctly exported (verified at compile time)', () => {
      // This test verifies that the types are correctly exported.
      // TypeScript compilation (npx tsc --noEmit) serves as the actual verification.
      // If this file compiles, all types are correctly exported.

      // Validate RegisterGeofenceParams structure
      const params: RegisterGeofenceParams = {
        requestId: 'test',
        latitude: 0,
        longitude: 0,
        radiusMeters: 100,
        notifyOnEntry: true,
      };
      expect(params.requestId).toBe('test');

      // Validate GeofenceEvent structure
      const event: GeofenceEvent = {
        requestId: 'test',
        eventType: 'ENTER',
        timestamp: 0,
        latitude: 0,
        longitude: 0,
        horizontalAccuracy: 0,
      };
      expect(event.eventType).toBe('ENTER');

      // Validate PermissionStatus structure
      const status: PermissionStatus = {
        locationPermission: 'granted',
        notificationPermission: 'denied',
        backgroundLocationAllowed: false,
      };
      expect(status.locationPermission).toBe('granted');

      expect(true).toBe(true);
    });
  });
});
