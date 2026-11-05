/**
 * State machine for reminder lifecycle transitions.
 *
 * Implements spec §3.4 transition table exactly:
 *   DRAFT → ARMED, WAITING_FOR_EXIT, COMPLETED, CANCELLED
 *   WAITING_FOR_EXIT → ARMED (on exit), CANCELLED
 *   ARMED → TRIGGERED (on entry), COMPLETED, CANCELLED
 *   TRIGGERED → COMPLETED (manual)
 *   COMPLETED → (terminal)
 *   CANCELLED → (terminal)
 */

import { ReminderStatus } from '../models/ReminderStatus';

/** Valid transitions: key = source state, value = allowed target states. */
export const validTransitions: Record<ReminderStatus, ReminderStatus[]> = {
  [ReminderStatus.DRAFT]: [
    ReminderStatus.ARMED,
    ReminderStatus.WAITING_FOR_EXIT,
    ReminderStatus.COMPLETED,
    ReminderStatus.CANCELLED,
  ],
  [ReminderStatus.WAITING_FOR_EXIT]: [
    ReminderStatus.ARMED,
    ReminderStatus.CANCELLED,
  ],
  [ReminderStatus.ARMED]: [
    ReminderStatus.TRIGGERED,
    ReminderStatus.COMPLETED,
    ReminderStatus.CANCELLED,
  ],
  [ReminderStatus.TRIGGERED]: [
    ReminderStatus.COMPLETED,
  ],
  [ReminderStatus.COMPLETED]: [],
  [ReminderStatus.CANCELLED]: [],
};

/** Checks if a state transition is valid. */
export function canTransition(from: ReminderStatus, to: ReminderStatus): boolean {
  const allowed = validTransitions[from];
  return allowed !== undefined && allowed.includes(to);
}

/**
 * Calculates haversine distance between two GPS coordinates.
 * Returns distance in meters.
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Determines the initial status based on user's current position relative to the geofence.
 *
 * - If distance ≤ radius → WAITING_FOR_EXIT (user is inside)
 * - If distance > radius → ARMED (user is outside, waiting for entry)
 * - If location unavailable (NaN coordinates) → DRAFT with error flag
 */
export function determineInitialStatus(
  currentLat: number,
  currentLng: number,
  targetLat: number,
  targetLng: number,
  radiusMeters: number,
): ReminderStatus {
  // If coordinates are invalid/unavailable, return DRAFT
  if (
    isNaN(currentLat) || isNaN(currentLng) ||
    isNaN(targetLat) || isNaN(targetLng)
  ) {
    return ReminderStatus.DRAFT;
  }

  const distance = haversineDistance(currentLat, currentLng, targetLat, targetLng);

  // Inside or on the boundary → WAITING_FOR_EXIT
  if (distance <= radiusMeters) {
    return ReminderStatus.WAITING_FOR_EXIT;
  }

  // Outside → ARMED (waiting for entry)
  return ReminderStatus.ARMED;
}
