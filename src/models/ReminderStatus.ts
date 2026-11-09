/**
 * Reminder status enum — strict lifecycle states.
 *
 * Matches spec §3.4 exactly: DRAFT → WAITING_FOR_EXIT/ARMED/TRIGGERED → COMPLETED/CANCELLED.
 */

export enum ReminderStatus {
  /** User created reminder but hasn't registered geofence yet */
  DRAFT = 'DRAFT',

  /** User is currently inside the geofence; waiting for exit */
  WAITING_FOR_EXIT = 'WAITING_FOR_EXIT',

  /** User is outside the geofence; registered to trigger on entry */
  ARMED = 'ARMED',

  /** User entered the geofence; notification sent */
  TRIGGERED = 'TRIGGERED',

  /** User manually completed the reminder (dismissed) */
  COMPLETED = 'COMPLETED',

  /** User cancelled the reminder (deleted from active set) */
  CANCELLED = 'CANCELLED',

  /** User paused monitoring; reminder is inactive but preserved */
  PAUSED = 'PAUSED',
}
