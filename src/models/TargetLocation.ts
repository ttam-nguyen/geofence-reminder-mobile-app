/**
 * Canonical target location model.
 *
 * All three location selection methods (current GPS, map pin, place search)
 * produce this identical model shape. Used by reminder creation and editing.
 */

import { LocationSource } from './LocationSource';

export interface TargetLocation {
  /** Center latitude (-90 to 90) */
  latitude: number;
  /** Center longitude (-180 to 180) */
  longitude: number;
  /** Horizontal accuracy in meters (from GPS, optional for map/search) */
  accuracy?: number;
  /** Human-readable location name (from geocoding or manual entry) */
  locationName?: string;
  /** Source of the location data */
  source: LocationSource;
  /** Epoch milliseconds when location was captured */
  timestamp: number;
}

/** Validation errors for TargetLocation. */
export interface ValidationError {
  field: string;
  message: string;
}

/** Validates a TargetLocation object. */
export function validateTargetLocation(
  location: Partial<TargetLocation>,
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (
    location.latitude === undefined ||
    location.latitude === null ||
    typeof location.latitude !== 'number' ||
    isNaN(location.latitude)
  ) {
    errors.push({ field: 'latitude', message: 'Latitude is required' });
  } else if (location.latitude < -90 || location.latitude > 90) {
    errors.push({ field: 'latitude', message: 'Latitude must be between -90 and 90' });
  }

  if (
    location.longitude === undefined ||
    location.longitude === null ||
    typeof location.longitude !== 'number' ||
    isNaN(location.longitude)
  ) {
    errors.push({ field: 'longitude', message: 'Longitude is required' });
  } else if (location.longitude < -180 || location.longitude > 180) {
    errors.push({ field: 'longitude', message: 'Longitude must be between -180 and 180' });
  }

  if (location.source && !Object.values(LocationSource).includes(location.source)) {
    errors.push({ field: 'source', message: `Invalid source: ${location.source}` });
  }

  if (location.accuracy !== undefined && location.accuracy !== null) {
    if (typeof location.accuracy !== 'number' || location.accuracy < 0) {
      errors.push({ field: 'accuracy', message: 'Accuracy must be a non-negative number' });
    }
  }

  return errors;
}

/** Creates a valid TargetLocation from partial data. */
export function createTargetLocation(overrides: Partial<TargetLocation> = {}): TargetLocation {
  const now = Date.now();

  return {
    latitude: typeof overrides.latitude === 'number' ? overrides.latitude : 0,
    longitude: typeof overrides.longitude === 'number' ? overrides.longitude : 0,
    accuracy: overrides.accuracy,
    locationName: overrides.locationName,
    source: overrides.source || LocationSource.CURRENT_GPS,
    timestamp: overrides.timestamp || now,
  };
}
