// Reminder repository interface and in-memory implementation.

import { Reminder, ReminderStatus } from '../types/Reminder';

/** Repository interface for reminder persistence. */
export interface ReminderRepository {
  /** Find a single reminder by its ID. Returns undefined if not found. */
  findById(id: string): Reminder | undefined;

  /** Find all reminders, optionally filtered by status. */
  findAll(statusFilter?: ReminderStatus): Reminder[];

  /** Save (create or update) a reminder. Returns the saved reminder. */
  save(reminder: Reminder): Promise<Reminder>;

  /** Delete a reminder by ID. Returns true if deleted, false if not found. */
  deleteById(id: string): Promise<boolean>;

  /** Find all reminders that are active (not COMPLETED, CANCELLED, or DELETED). */
  findActive(): Reminder[];

  /** Find all reminders in a specific status. */
  findByStatus(status: ReminderStatus): Reminder[];

  /** Clear all reminders (useful for testing). */
  clear(): Promise<void>;
}

/** In-memory reminder repository implementation. */
export class InMemoryReminderRepository implements ReminderRepository {
  private store: Map<string, Reminder> = new Map();

  findById(id: string): Reminder | undefined {
    return this.store.get(id);
  }

  findAll(statusFilter?: ReminderStatus): Reminder[] {
    let reminders = Array.from(this.store.values());
    if (statusFilter) {
      reminders = reminders.filter((r) => r.status === statusFilter);
    }
    return reminders;
  }

  async save(reminder: Reminder): Promise<Reminder> {
    const now = new Date().toISOString();
    const existing = this.store.get(reminder.id);

    if (existing) {
      // Preserve createdAt, preserve triggeredAt if already set and not being reset
      const updated: Reminder = {
        ...existing,
        ...reminder,
        updatedAt: now,
        createdAt: existing.createdAt,
      };
      // Only update triggeredAt if explicitly provided in the reminder
      if (reminder.triggeredAt !== undefined) {
        updated.triggeredAt = reminder.triggeredAt;
      }
      this.store.set(reminder.id, updated);
      return updated;
    } else {
      const newReminder: Reminder = {
        ...reminder,
        createdAt: now,
        updatedAt: now,
      };
      this.store.set(reminder.id, newReminder);
      return newReminder;
    }
  }

  async deleteById(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  findActive(): Reminder[] {
    const inactiveStatuses: ReminderStatus[] = [
      ReminderStatus.COMPLETED,
      ReminderStatus.CANCELLED,
      ReminderStatus.DELETED,
    ];
    return this.findAll().filter(
      (r) => !inactiveStatuses.includes(r.status),
    );
  }

  findByStatus(status: ReminderStatus): Reminder[] {
    return this.findAll(status);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }
}
