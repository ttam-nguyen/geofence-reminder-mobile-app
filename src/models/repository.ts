// Reminder repository interface and in-memory implementation.

import { Reminder, ReminderStatus } from "../types/Reminder";

/** Repository interface for reminder persistence. */
export interface ReminderRepository {
  /** Find a single reminder by its ID. Returns undefined if not found. */
  findById(id: string): Promise<Reminder | undefined>;

  /** Find all reminders, optionally filtered by status. */
  findAll(statusFilter?: ReminderStatus): Promise<Reminder[]>;

  /** Save (create or update) a reminder. Returns the saved reminder. */
  save(reminder: Reminder): Promise<Reminder>;

  /** Delete a reminder by ID. Returns true if deleted, false if not found. */
  deleteById(id: string): Promise<boolean>;

  /** Find all reminders that are active (not COMPLETED, CANCELLED, or DELETED). */
  findActive(): Promise<Reminder[]>;

  /** Find all reminders in a specific status. */
  findByStatus(status: ReminderStatus): Promise<Reminder[]>;

  /** Clear all reminders (useful for testing). */
  clear(): Promise<void>;

  /** Update the last stationary reading for crash-safety recovery. */
  updateStationaryReading(
    id: string,
    reading: { readingAt: string; latitude: number; longitude: number },
  ): Promise<Reminder | undefined>;
}

/** In-memory reminder repository implementation. */
export class InMemoryReminderRepository implements ReminderRepository {
  private store: Map<string, Reminder> = new Map();

  async findById(id: string): Promise<Reminder | undefined> {
    return this.store.get(id);
  }

  async findAll(statusFilter?: ReminderStatus): Promise<Reminder[]> {
    let reminders = Array.from(this.store.values());
    if (statusFilter) {
      reminders = reminders.filter(r => r.status === statusFilter);
    }
    console.log("[Store] findAll() returning items count:", reminders.length, reminders);
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
        notificationId: reminder.notificationId ?? existing.notificationId,
      };
      // Only update triggeredAt if explicitly provided in the reminder
      if (reminder.triggeredAt !== undefined) {
        updated.triggeredAt = reminder.triggeredAt;
      }
      this.store.set(reminder.id, updated);
      console.log("[Store] Saving reminder:", reminder);
      return updated;
    } else {
      const newReminder: Reminder = {
        ...reminder,
        createdAt: now,
        updatedAt: now,
      };
      this.store.set(reminder.id, newReminder);
      console.log("[Store] Saving reminder:", newReminder);
      return newReminder;
    }
  }

  async deleteById(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async findActive(): Promise<Reminder[]> {
    const inactiveStatuses: ReminderStatus[] = [
      ReminderStatus.COMPLETED,
      ReminderStatus.CANCELLED,
      ReminderStatus.DELETED,
    ];
    return (await this.findAll()).filter(r => !inactiveStatuses.includes(r.status));
  }

  async findByStatus(status: ReminderStatus): Promise<Reminder[]> {
    return this.findAll(status);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async updateStationaryReading(
    id: string,
    reading: { readingAt: string; latitude: number; longitude: number },
  ): Promise<Reminder | undefined> {
    const existing = this.store.get(id);
    if (!existing) return undefined;

    const updated: Reminder = {
      ...existing,
      lastStationaryReadingAt: reading.readingAt,
      lastStationaryReadingLat: reading.latitude,
      lastStationaryReadingLon: reading.longitude,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, updated);
    return updated;
  }
}
