/**
 * Repository interfaces — storage abstraction layer.
 *
 * Defines the contract for all data access. Implementations swap in/out
 * (SQLite, in-memory for tests, cloud sync, etc.).
 */

import type { Reminder } from '../models/Reminder';
import type { ReminderStatus } from '../models/ReminderStatus';
import type { ReminderEvent } from '../models/ReminderEvent';
import type { NotificationDeliveryRecord } from '../models/NotificationDeliveryRecord';

/** Reminder data access port. */
export interface ReminderRepository {
  /** Get a single reminder by ID. */
  getById(id: string): Promise<Reminder | null>;

  /** Get all reminders. */
  getAll(): Promise<Reminder[]>;

  /** Get active reminders (ARMED or WAITING_FOR_EXIT). */
  getActive(): Promise<Reminder[]>;

  /** Create a new reminder. Generates UUID and timestamps. */
  create(reminder: Omit<Reminder, 'id' | 'createdAt' | 'updatedAt'>): Promise<Reminder>;

  /** Update an existing reminder by ID. Returns null if not found. */
  update(id: string, changes: Partial<Reminder>): Promise<Reminder | null>;

  /** Delete a reminder by ID. Returns true if deleted, false if not found. */
  delete(id: string): Promise<boolean>;

  /** Get reminders by status. */
  getByStatus(status: ReminderStatus): Promise<Reminder[]>;
}

/** Event log data access port. */
export interface EventRepository {
  /** Create a new event record. Generates UUID and timestamp. */
  create(event: Omit<ReminderEvent, 'id'>): Promise<ReminderEvent>;

  /** Get all events for a reminder. */
  getByReminderId(reminderId: string): Promise<ReminderEvent[]>;

  /** Delete all events for a reminder (cleanup on delete). */
  deleteByReminderId(reminderId: string): Promise<boolean>;
}

/** Notification delivery log data access port. */
export interface NotificationLogRepository {
  /** Create a new delivery record. Generates UUID. */
  create(record: Omit<NotificationDeliveryRecord, 'id'>): Promise<NotificationDeliveryRecord>;

  /** Get a single delivery record by ID. */
  getById(id: string): Promise<NotificationDeliveryRecord | null>;

  /** Get all delivery records for a reminder. */
  getByReminderId(reminderId: string): Promise<NotificationDeliveryRecord[]>;

  /** Get pending (undelivered) notifications. */
  getPending(): Promise<NotificationDeliveryRecord[]>;
}
