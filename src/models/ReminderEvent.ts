/**
 * ReminderEvent — diagnostic event record for reminders.
 *
 * Tracks lifecycle events: CREATED, STATUS_CHANGED, TRIGGERED, COMPLETED, CANCELLED, EDITED.
 */

import { ReminderStatus } from './ReminderStatus';

export type ReminderEventType = 'CREATED' | 'STATUS_CHANGED' | 'TRIGGERED' | 'COMPLETED' | 'CANCELLED' | 'EDITED';

export type EventOutcome = 'SUCCESS' | 'FAILED' | 'PENDING';

export interface ReminderEvent {
  /** UUID v4 identifier */
  id: string;

  /** Parent reminder ID */
  reminderId: string;

  /** Event type */
  eventType: ReminderEventType;

  /** Event timestamp (ISO 8601) */
  timestamp: string;

  /** Status before this event (null for CREATED) */
  previousStatus: ReminderStatus | null;

  /** Status after this event (null for CANCELLED) */
  newStatus: ReminderStatus | null;

  /** Event outcome */
  outcome: EventOutcome;

  /** Additional event details (key-value pairs) */
  details?: Record<string, unknown>;
}

/** Creates a ReminderEvent with defaults. */
export function createReminderEvent(overrides: Partial<ReminderEvent> = {}): ReminderEvent {
  return {
    id: overrides.id || '',
    reminderId: overrides.reminderId || '',
    eventType: overrides.eventType || 'STATUS_CHANGED',
    timestamp: overrides.timestamp || new Date().toISOString(),
    previousStatus: overrides.previousStatus ?? null,
    newStatus: overrides.newStatus ?? null,
    outcome: overrides.outcome || 'PENDING',
    details: overrides.details,
  };
}
