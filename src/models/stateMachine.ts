// State machine — transition validator for the Reminder lifecycle.
// Defines all 21 valid state transitions from the product spec.

import { ReminderStatus } from '../types/Reminder';

/**
 * All valid transitions for a reminder.
 * Key: source state, Value: array of allowed destination states.
 */
export const VALID_TRANSITIONS: Record<ReminderStatus, ReadonlySet<ReminderStatus>> = {
  [ReminderStatus.DRAFT]: new Set([
    ReminderStatus.ARMED,
    ReminderStatus.WAITING_FOR_EXIT,
    ReminderStatus.COMPLETED,
    ReminderStatus.CANCELLED,
    ReminderStatus.PAUSED,
  ]),
  [ReminderStatus.WAITING_FOR_EXIT]: new Set([
    ReminderStatus.ARMED,
    ReminderStatus.COMPLETED,
    ReminderStatus.CANCELLED,
    ReminderStatus.PAUSED,
  ]),
  [ReminderStatus.ARMED]: new Set([
    ReminderStatus.TRIGGERED,
    ReminderStatus.ARRIVAL_PENDING,
    ReminderStatus.COMPLETED,
    ReminderStatus.CANCELLED,
    ReminderStatus.PAUSED,
  ]),
  [ReminderStatus.ARRIVAL_PENDING]: new Set([
    ReminderStatus.TRIGGERED,
    ReminderStatus.ARMED,
  ]),
  [ReminderStatus.TRIGGERED]: new Set([
    ReminderStatus.COMPLETED,
  ]),
  [ReminderStatus.COMPLETED]: new Set([
    ReminderStatus.DRAFT,
    ReminderStatus.CANCELLED,
  ]),
  [ReminderStatus.CANCELLED]: new Set([
    ReminderStatus.DRAFT,
  ]),
  [ReminderStatus.PAUSED]: new Set([
    ReminderStatus.ARMED,
    ReminderStatus.WAITING_FOR_EXIT,
    ReminderStatus.COMPLETED,
    ReminderStatus.CANCELLED,
  ]),
  // DELETED is an alias for CANCELLED; same transitions apply.
  [ReminderStatus.DELETED]: new Set([
    ReminderStatus.DRAFT,
  ]),
};

/**
 * Check whether a state transition is valid.
 * @param from - Current reminder status
 * @param to - Proposed next status
 * @returns true if the transition is allowed by the state machine
 */
export function isValidTransition(from: ReminderStatus, to: ReminderStatus): boolean {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.has(to);
}

/**
 * Attempt a state transition. Throws if invalid.
 * @param from - Current reminder status
 * @param to - Proposed next status
 * @returns The destination state (for chaining)
 * @throws Error if the transition is not allowed
 */
export function validateTransition(from: ReminderStatus, to: ReminderStatus): ReminderStatus {
  if (!isValidTransition(from, to)) {
    throw new Error(
      `Invalid state transition: ${from} → ${to}. ` +
        `Allowed transitions from ${from}: [${[...VALID_TRANSITIONS[from]].join(', ')}]`,
    );
  }
  return to;
}
