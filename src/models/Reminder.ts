/**
 * Reminder entity — core domain model.
 *
 * Contains all fields from spec §3.1 + lifecycle states.
 * Factory function creates valid reminders; update function applies partial changes.
 */

import { ReminderStatus } from './ReminderStatus';
import { LocationSource } from './LocationSource';

export interface Reminder {
  /** UUID v4 identifier */
  id: string;

  /** Display title (1-100 chars) */
  title: string;

  /** Optional description (0-500 chars) */
  description: string | null;

  /** Center latitude (-90 to 90) */
  latitude: number;

  /** Center longitude (-180 to 180) */
  longitude: number;

  /** Human-readable location name (e.g., "Home", "Office") */
  locationName: string | null;

  /** Geofence radius in meters (10-500) */
  radiusMeters: number;

  /** How coordinates were obtained */
  locationSource: LocationSource;

  /** Current lifecycle state */
  status: ReminderStatus;

  /** Creation timestamp (ISO 8601) */
  createdAt: string;

  /** Last update timestamp (ISO 8601) */
  updatedAt: string;

  /** When the reminder was triggered (ISO 8601, null if never) */
  triggeredAt: string | null;

  /** When the reminder was completed (ISO 8601, null if never) */
  completedAt: string | null;

  /** Whether to play notification sound */
  notificationSoundEnabled: boolean;

  /** Whether to vibrate on notification */
  notificationVibrationEnabled: boolean;
}

/** Validation errors returned by validateReminder(). */
export interface ValidationError {
  field: string;
  message: string;
}

/** Validates a Reminder object against spec constraints. */
export function validateReminder(reminder: Partial<Reminder>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!reminder.title || typeof reminder.title !== 'string' || reminder.title.trim().length === 0) {
    errors.push({ field: 'title', message: 'Title is required and must be non-empty' });
  } else if (reminder.title.length > 100) {
    errors.push({ field: 'title', message: 'Title must be 100 characters or fewer' });
  }

  if (reminder.description !== null && reminder.description !== undefined) {
    if (typeof reminder.description === 'string' && reminder.description.length > 500) {
      errors.push({ field: 'description', message: 'Description must be 500 characters or fewer' });
    } else if (reminder.description !== null && typeof reminder.description !== 'string') {
      errors.push({ field: 'description', message: 'Description must be a string or null' });
    }
  }

  if (
    reminder.latitude === undefined ||
    reminder.latitude === null ||
    typeof reminder.latitude !== 'number' ||
    isNaN(reminder.latitude)
  ) {
    errors.push({ field: 'latitude', message: 'Latitude is required' });
  } else if (reminder.latitude < -90 || reminder.latitude > 90) {
    errors.push({ field: 'latitude', message: 'Latitude must be between -90 and 90' });
  }

  if (
    reminder.longitude === undefined ||
    reminder.longitude === null ||
    typeof reminder.longitude !== 'number' ||
    isNaN(reminder.longitude)
  ) {
    errors.push({ field: 'longitude', message: 'Longitude is required' });
  } else if (reminder.longitude < -180 || reminder.longitude > 180) {
    errors.push({ field: 'longitude', message: 'Longitude must be between -180 and 180' });
  }

  if (
    reminder.radiusMeters === undefined ||
    reminder.radiusMeters === null ||
    typeof reminder.radiusMeters !== 'number' ||
    isNaN(reminder.radiusMeters)
  ) {
    errors.push({ field: 'radiusMeters', message: 'Radius is required' });
  } else if (reminder.radiusMeters < 10 || reminder.radiusMeters > 500) {
    errors.push({ field: 'radiusMeters', message: 'Radius must be between 10 and 500 meters' });
  }

  return errors;
}

/** Creates a valid Reminder with defaults. */
export function createReminder(overrides: Partial<Reminder> = {}): Reminder {
  const now = new Date().toISOString();

  const reminder: Reminder = {
    id: overrides.id || '', // UUID assigned by caller or store
    title: overrides.title || 'Untitled Reminder',
    description: overrides.description ?? null,
    latitude: typeof overrides.latitude === 'number' ? overrides.latitude : 0,
    longitude: typeof overrides.longitude === 'number' ? overrides.longitude : 0,
    locationName: overrides.locationName ?? null,
    radiusMeters: typeof overrides.radiusMeters === 'number' ? overrides.radiusMeters : 50,
    locationSource: overrides.locationSource || LocationSource.CURRENT_GPS,
    status: overrides.status || ReminderStatus.DRAFT,
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    triggeredAt: overrides.triggeredAt ?? null,
    completedAt: overrides.completedAt ?? null,
    notificationSoundEnabled: overrides.notificationSoundEnabled ?? true,
    notificationVibrationEnabled: overrides.notificationVibrationEnabled ?? true,
  };

  return reminder;
}

/** Updates a Reminder with partial changes. Returns new Reminder (immutable). */
export function updateReminder(
  existing: Reminder,
  changes: Partial<Pick<Reminder, 'title' | 'description' | 'latitude' | 'longitude' | 'locationName' | 'radiusMeters' | 'notificationSoundEnabled' | 'notificationVibrationEnabled'>>,
): Reminder {
  return {
    ...existing,
    ...changes,
    updatedAt: new Date().toISOString(),
  };
}
