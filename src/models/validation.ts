// Input validation for reminder creation and editing.

import { ReminderStatus } from '../types/Reminder';

/** Validation error for a single field. */
export interface ValidationError {
  field: string;
  message: string;
}

/** Result of validating a reminder payload. */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/** Maximum allowed radius in meters. */
export const MAX_RADIUS_METERS = 500;

/** Minimum allowed radius in meters. */
export const MIN_RADIUS_METERS = 10;

/** Maximum title length. */
export const MAX_TITLE_LENGTH = 100;

/** Maximum description length. */
export const MAX_DESCRIPTION_LENGTH = 500;

/** Latitude bounds. */
export const MIN_LATITUDE = -90;
export const MAX_LATITUDE = 90;

/** Longitude bounds. */
export const MIN_LONGITUDE = -180;
export const MAX_LONGITUDE = 180;

/**
 * Validate a reminder title.
 * @param title - The title string
 * @returns Error object or null if valid
 */
export function validateTitle(title: string): ValidationError | null {
  if (!title || title.trim().length === 0) {
    return { field: 'title', message: 'Title is required.' };
  }
  if (title.length > MAX_TITLE_LENGTH) {
    return { field: 'title', message: `Title must be ${MAX_TITLE_LENGTH} characters or fewer.` };
  }
  return null;
}

/**
 * Validate a reminder description.
 * @param description - The description string (optional, defaults to empty)
 * @returns Error object or null if valid
 */
export function validateDescription(description?: string): ValidationError | null {
  const text = description ?? '';
  if (text.length > MAX_DESCRIPTION_LENGTH) {
    return { field: 'description', message: `Description must be ${MAX_DESCRIPTION_LENGTH} characters or fewer.` };
  }
  return null;
}

/**
 * Validate a latitude value.
 * @param lat - The latitude number
 * @returns Error object or null if valid
 */
export function validateLatitude(lat: number): ValidationError | null {
  if (typeof lat !== 'number' || Number.isNaN(lat)) {
    return { field: 'latitude', message: 'Latitude must be a valid number.' };
  }
  if (lat < MIN_LATITUDE || lat > MAX_LATITUDE) {
    return { field: 'latitude', message: `Latitude must be between ${MIN_LATITUDE} and ${MAX_LATITUDE}.` };
  }
  return null;
}

/**
 * Validate a longitude value.
 * @param lon - The longitude number
 * @returns Error object or null if valid
 */
export function validateLongitude(lon: number): ValidationError | null {
  if (typeof lon !== 'number' || Number.isNaN(lon)) {
    return { field: 'longitude', message: 'Longitude must be a valid number.' };
  }
  if (lon < MIN_LONGITUDE || lon > MAX_LONGITUDE) {
    return { field: 'longitude', message: `Longitude must be between ${MIN_LONGITUDE} and ${MAX_LONGITUDE}.` };
  }
  return null;
}

/**
 * Clamp a radius to the allowed range [MIN_RADIUS_METERS, MAX_RADIUS_METERS].
 * @param radius - The requested radius in meters (must be positive)
 * @returns The clamped radius value
 */
export function clampRadius(radius: number): number {
  if (typeof radius !== 'number' || Number.isNaN(radius) || radius <= 0) {
    return MIN_RADIUS_METERS;
  }
  if (radius < MIN_RADIUS_METERS) return MIN_RADIUS_METERS;
  if (radius > MAX_RADIUS_METERS) return MAX_RADIUS_METERS;
  return radius;
}

/**
 * Validate a radius value (returns error if outside allowed range).
 * @param radius - The requested radius in meters
 * @returns Error object or null if valid
 */
export function validateRadius(radius: number): ValidationError | null {
  if (typeof radius !== 'number' || Number.isNaN(radius)) {
    return { field: 'radius', message: 'Radius must be a valid number.' };
  }
  if (radius < MIN_RADIUS_METERS) {
    return { field: 'radius', message: `Radius must be at least ${MIN_RADIUS_METERS} meters.` };
  }
  if (radius > MAX_RADIUS_METERS) {
    return { field: 'radius', message: `Radius must be at most ${MAX_RADIUS_METERS} meters.` };
  }
  return null;
}

/**
 * Validate all fields of a reminder creation/edit payload.
 * @param title - Reminder title
 * @param description - Reminder description (optional)
 * @param latitude - Target latitude
 * @param longitude - Target longitude
 * @param radiusMeters - Geofence radius in meters
 * @returns ValidationResult with all field errors collected
 */
export function validateReminderPayload(
  title: string,
  description?: string,
  latitude?: number,
  longitude?: number,
  radiusMeters?: number,
): ValidationResult {
  const errors: ValidationError[] = [];

  const titleErr = validateTitle(title);
  if (titleErr) errors.push(titleErr);

  const descErr = validateDescription(description);
  if (descErr) errors.push(descErr);

  const latErr = validateLatitude(latitude ?? NaN);
  if (latErr) errors.push(latErr);

  const lonErr = validateLongitude(longitude ?? NaN);
  if (lonErr) errors.push(lonErr);

  const radiusErr = validateRadius(radiusMeters ?? NaN);
  if (radiusErr) errors.push(radiusErr);

  return { valid: errors.length === 0, errors };
}
