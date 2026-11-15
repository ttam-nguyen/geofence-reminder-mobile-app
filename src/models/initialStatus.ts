// Determine the initial status of a reminder based on user's current position.

import { ReminderStatus } from '../types/Reminder';
import { haversineDistance } from './haversine';

/**
 * Determine the initial status of a reminder given the user's current GPS position.
 * - Inside or on boundary (distance <= radius) → WAITING_FOR_EXIT
 * - Outside (distance > radius) → ARMED
 * @param userLat - User's current latitude
 * @param userLon - User's current longitude
 * @param reminderLat - Reminder target latitude
 * @param reminderLon - Reminder target longitude
 * @param radiusMeters - Reminder geofence radius in meters
 * @returns The initial ReminderStatus
 */
export function determineInitialStatus(
  userLat: number,
  userLon: number,
  reminderLat: number,
  reminderLon: number,
  radiusMeters: number,
): ReminderStatus {
  const distance = haversineDistance(userLat, userLon, reminderLat, reminderLon);
  return distance <= radiusMeters
    ? ReminderStatus.WAITING_FOR_EXIT
    : ReminderStatus.ARMED;
}
