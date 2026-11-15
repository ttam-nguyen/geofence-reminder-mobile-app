// Geofence event processor — pure service that processes geofence events into state transitions.

import { ReminderStatus } from '../types/Reminder';
import { validateTransition } from './stateMachine';

/** Geofence event types from native modules. */
export enum GeofenceEventType {
  ENTER = 'ENTER',
  EXIT = 'EXIT',
}

/** Result of processing a geofence event. */
export interface EventProcessingResult {
  /** The new reminder status (may be unchanged if the event is ignored). */
  newStatus: ReminderStatus;
  /** Whether a transition actually occurred. */
  transitioned: boolean;
  /** The previous status before processing. */
  previousStatus: ReminderStatus;
}

/**
 * Process a geofence event for a reminder and return the resulting state transition.
 * Idempotent: TRIGGERED reminders ignore all events (exactly one notification per trigger).
 *
 * Transition rules:
 * - DRAFT + ENTER → WAITING_FOR_EXIT (user walked inside target radius)
 * - DRAFT + EXIT → no transition (stays DRAFT)
 * - WAITING_FOR_EXIT + EXIT → ARMED (user left, re-register for entry)
 * - WAITING_FOR_EXIT + ENTER → no transition (stays WAITING_FOR_EXIT)
 * - ARMED + ENTER → ARRIVAL_PENDING (user entered; start arrival qualification)
 * - ARMED + EXIT → no transition (entry-only reminders don't trigger on exit)
 * - ARRIVAL_PENDING + EXIT → ARMED (user left before confirmation; cancel candidate)
 * - ARRIVAL_PENDING + ENTER → no transition (stays ARRIVAL_PENDING; timer continues)
 * - TRIGGERED + any → no transition (terminal; ignore duplicate events)
 */
export function processGeofenceEvent(
  currentStatus: ReminderStatus,
  eventType: GeofenceEventType,
): EventProcessingResult {
  let newStatus: ReminderStatus = currentStatus;
  let transitioned = false;

  switch (currentStatus) {
    case ReminderStatus.DRAFT: {
      if (eventType === GeofenceEventType.ENTER) {
        newStatus = validateTransition(currentStatus, ReminderStatus.WAITING_FOR_EXIT);
        transitioned = true;
      }
      // DRAFT + EXIT → no transition (stays DRAFT)
      break;
    }

    case ReminderStatus.WAITING_FOR_EXIT: {
      if (eventType === GeofenceEventType.EXIT) {
        newStatus = validateTransition(currentStatus, ReminderStatus.ARMED);
        transitioned = true;
      }
      // WAITING_FOR_EXIT + ENTER → no transition
      break;
    }

    case ReminderStatus.ARMED: {
      if (eventType === GeofenceEventType.ENTER) {
        newStatus = validateTransition(currentStatus, ReminderStatus.ARRIVAL_PENDING);
        transitioned = true;
      }
      // ARMED + EXIT → no transition (entry-only reminders don't trigger)
      break;
    }

    case ReminderStatus.ARRIVAL_PENDING: {
      if (eventType === GeofenceEventType.EXIT) {
        newStatus = validateTransition(currentStatus, ReminderStatus.ARMED);
        transitioned = true;
      }
      // ARRIVAL_PENDING + ENTER → no transition (timer continues)
      break;
    }

    case ReminderStatus.TRIGGERED: {
      // Terminal state: ignore all events (idempotent — exactly one notification)
      break;
    }

    case ReminderStatus.COMPLETED:
    case ReminderStatus.PAUSED:
    case ReminderStatus.CANCELLED:
    case ReminderStatus.DELETED: {
      // These states don't process geofence events.
      break;
    }
  }

  return {
    newStatus,
    transitioned,
    previousStatus: currentStatus,
  };
}
