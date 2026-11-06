/**
 * Geofence Event Processor — processes native geofence events.
 *
 * Converts ENTER/EXIT events into state machine transitions:
 *   WAITING_FOR_EXIT + EXIT → ARMED (re-register geofence)
 *   ARMED + ENTER → TRIGGERED (fire notification, unregister geofence)
 *   ARMED + EXIT → no transition (exit-only reminders don't trigger)
 *
 * Idempotency: TRIGGERED reminders produce exactly one notification,
 * duplicate OS events are ignored.
 */

import type { Reminder } from '../models/Reminder';
import { ReminderStatus } from '../models/ReminderStatus';
import type { GeofenceEvent } from '../native/GeofencingModule';
import type { ReminderRepository } from '../services/ReminderRepository';
import { canTransition, validTransitions } from '../services/StateMachine';

export class GeofenceEventProcessor {
  constructor(
    private repository: ReminderRepository,
  ) {}

  /** Process a native geofence event (ENTER or EXIT). */
  async processEvent(event: GeofenceEvent): Promise<void> {
    const reminder = await this.repository.getById(event.requestId);

    if (!reminder) {
      // Reminder no longer exists (deleted), ignore event
      return;
    }

    // Idempotency: if already triggered, ignore further events
    if (reminder.status === ReminderStatus.TRIGGERED) {
      return;
    }

    // If reminder is COMPLETED or CANCELLED, ignore events
    if (
      reminder.status === ReminderStatus.COMPLETED ||
      reminder.status === ReminderStatus.CANCELLED
    ) {
      return;
    }

    // Process based on event type and current status
    if (event.eventType === 'ENTER') {
      await this.handleEnterEvent(reminder);
    } else if (event.eventType === 'EXIT') {
      await this.handleExitEvent(reminder);
    }
  }

  /** Handle an ENTER event. */
  private async handleEnterEvent(reminder: Reminder): Promise<void> {
    // WAITING_FOR_EXIT reminders ignore ENTER (already inside, waiting for exit)
    if (reminder.status === ReminderStatus.WAITING_FOR_EXIT) {
      return;
    }

    // ARMED reminders trigger on ENTER
    if (reminder.status === ReminderStatus.ARMED) {
      if (!canTransition(ReminderStatus.ARMED, ReminderStatus.TRIGGERED)) {
        return; // Invalid transition (shouldn't happen with valid state machine)
      }

      // Mark as triggered (idempotent — only first ENTER transitions)
      await this.repository.update(reminder.id, {
        status: ReminderStatus.TRIGGERED,
        triggeredAt: new Date().toISOString(),
      });

      return;
    }

    // DRAFT reminders: ENTER means user walked inside target radius
    if (reminder.status === ReminderStatus.DRAFT) {
      // Transition to WAITING_FOR_EXIT (spec §3.3: inside → wait for exit)
      if (canTransition(ReminderStatus.DRAFT, ReminderStatus.WAITING_FOR_EXIT)) {
        await this.repository.update(reminder.id, {
          status: ReminderStatus.WAITING_FOR_EXIT,
        });
      }
    }
  }

  /** Handle an EXIT event. */
  private async handleExitEvent(reminder: Reminder): Promise<void> {
    // WAITING_FOR_EXIT reminders transition to ARMED on EXIT (spec §3.3)
    if (reminder.status === ReminderStatus.WAITING_FOR_EXIT) {
      if (!canTransition(ReminderStatus.WAITING_FOR_EXIT, ReminderStatus.ARMED)) {
        return;
      }

      await this.repository.update(reminder.id, {
        status: ReminderStatus.ARMED,
      });

      return;
    }

    // ARMED reminders: EXIT doesn't trigger (entry-only)
    // No state change for ARMED + EXIT (spec §3.4)
  }

  /** Check if a reminder has already been triggered (idempotency). */
  async isAlreadyTriggered(reminderId: string): Promise<boolean> {
    const reminder = await this.repository.getById(reminderId);
    return reminder?.status === ReminderStatus.TRIGGERED;
  }

  /** Get valid transitions for a reminder's current status. */
  getValidTransitions(reminder: Reminder): ReminderStatus[] {
    return validTransitions[reminder.status] || [];
  }
}
