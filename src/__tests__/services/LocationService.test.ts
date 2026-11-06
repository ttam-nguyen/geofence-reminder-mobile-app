/**
 * Unit tests for TargetLocation model.
 *
 * Tests validation, factory function, and shape consistency across all 3 methods.
 */

import { describe, it, expect } from 'vitest';
import { createTargetLocation, validateTargetLocation } from '@/models/TargetLocation';
import { LocationSource } from '@/models/LocationSource';

describe('TargetLocation', () => {
  describe('createTargetLocation', () => {
    it('creates a valid TargetLocation with all fields', () => {
      const location = createTargetLocation({
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        locationName: 'Home',
        source: LocationSource.CURRENT_GPS,
      });

      expect(location.latitude).toBe(37.7749);
      expect(location.longitude).toBe(-122.4194);
      expect(location.accuracy).toBe(10);
      expect(location.locationName).toBe('Home');
      expect(location.source).toBe(LocationSource.CURRENT_GPS);
      expect(typeof location.timestamp).toBe('number');
    });

    it('creates with defaults when no overrides', () => {
      const location = createTargetLocation();

      expect(location.latitude).toBe(0);
      expect(location.longitude).toBe(0);
      expect(location.accuracy).toBeUndefined();
      expect(location.locationName).toBeUndefined();
      expect(location.source).toBe(LocationSource.CURRENT_GPS);
      expect(typeof location.timestamp).toBe('number');
    });

    it('accepts partial overrides', () => {
      const location = createTargetLocation({
        latitude: 34.0522,
        longitude: -118.2437,
      });

      expect(location.latitude).toBe(34.0522);
      expect(location.longitude).toBe(-118.2437);
      expect(location.accuracy).toBeUndefined();
    });

    it('uses provided timestamp', () => {
      const ts = 1700000000000;
      const location = createTargetLocation({ timestamp: ts });

      expect(location.timestamp).toBe(ts);
    });
  });

  describe('validateTargetLocation', () => {
    it('returns no errors for valid location', () => {
      const errors = validateTargetLocation({
        latitude: 37.7749,
        longitude: -122.4194,
      });

      expect(errors).toEqual([]);
    });

    it('errors when latitude missing', () => {
      const errors = validateTargetLocation({ longitude: -122.4194 });

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('latitude');
    });

    it('errors when latitude out of range', () => {
      const errors = validateTargetLocation({ latitude: 100, longitude: 0 });

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('latitude');
    });

    it('errors when longitude out of range', () => {
      const errors = validateTargetLocation({ latitude: 0, longitude: 200 });

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('longitude');
    });

    it('errors when accuracy is negative', () => {
      const errors = validateTargetLocation({ latitude: 0, longitude: 0, accuracy: -5 });

      expect(errors).toHaveLength(1);
      expect(errors[0].field).toBe('accuracy');
    });

    it('accepts zero accuracy (valid)', () => {
      const errors = validateTargetLocation({ latitude: 0, longitude: 0, accuracy: 0 });

      expect(errors).toEqual([]);
    });

    it('accepts null accuracy (optional field)', () => {
      const errors = validateTargetLocation({ latitude: 0, longitude: 0 });

      expect(errors).toEqual([]);
    });
  });

  describe('Three-method consistency', () => {
    it('GPS produces same shape as map pin', () => {
      const gps = createTargetLocation({
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        source: LocationSource.CURRENT_GPS,
      });

      const mapPin = createTargetLocation({
        latitude: 37.7849,
        longitude: -122.4094,
        source: LocationSource.MAP_PIN,
      });

      // Both have same required fields
      expect(gps.latitude).toBeTypeOf('number');
      expect(gps.longitude).toBeTypeOf('number');
      expect(mapPin.latitude).toBeTypeOf('number');
      expect(mapPin.longitude).toBeTypeOf('number');

      // Both have timestamp
      expect(typeof gps.timestamp).toBe('number');
      expect(typeof mapPin.timestamp).toBe('number');

      // GPS has accuracy, map pin may not — both valid
      expect(gps.accuracy).toBeDefined();
    });

    it('search produces same shape as GPS', () => {
      const gps = createTargetLocation({
        latitude: 37.7749,
        longitude: -122.4194,
        accuracy: 10,
        source: LocationSource.CURRENT_GPS,
      });

      const search = createTargetLocation({
        latitude: 37.7649,
        longitude: -122.4294,
        locationName: 'Golden Gate Park',
        source: LocationSource.PLACE_SEARCH,
      });

      // Both have required fields
      expect(gps.latitude).toBeTypeOf('number');
      expect(gps.longitude).toBeTypeOf('number');
      expect(search.latitude).toBeTypeOf('number');
      expect(search.longitude).toBeTypeOf('number');

      // Both have timestamp
      expect(typeof gps.timestamp).toBe('number');
      expect(typeof search.timestamp).toBe('number');

      // Search has locationName, GPS may not — both valid
      expect(search.locationName).toBeDefined();
    });
  });
});
